"use client";

/**
 * Workspace: タスク管理 4 ペイン。
 * Pane 1 カテゴリー → Pane 2 ステータス別タスク → Pane 3 状況・次の一手 → Pane 4 備考。
 * データの永続化は Neon DB（/api/tasks）が担う。
 */

import { useState, useCallback, useMemo } from "react";

/** 選択中タスク ID を Cookie に保存するキー（SSR で読み取りフラッシュを防ぐ） */
const SELECTED_TASK_COOKIE = "dmtb_selectedTaskId";

function saveSelectedTaskCookie(id: string) {
  document.cookie = `${SELECTED_TASK_COOKIE}=${id};path=/;max-age=86400;SameSite=Lax`;
}

import {
  type Task,
  type TaskStatus,
  type Department,
  type Member,
  type TaskGroup,
  TASK_STATUS_ORDER,
} from "@/lib/schema";
import { createMinimalTask } from "@/lib/data/factories";
import { ARCHIVED_GROUP_LABEL, TASK_STATUS_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { MemberPane } from "@/components/workspace/MemberPane";
import { TaskListPane } from "@/components/workspace/TaskListPane";
import { TaskDashboardPane } from "@/components/workspace/TaskDashboardPane";
import { TaskNotesPane } from "@/components/workspace/TaskNotesPane";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";

export type ViewMode = "goal" | "member";

function findPositionMeta(
  departments: Department[],
  positionId: string,
): { departmentTitle: string; positionTitle: string } | null {
  for (const d of departments) {
    const p = d.positions.find((x) => x.id === positionId);
    if (p) return { departmentTitle: d.name, positionTitle: p.name };
  }
  return null;
}

function defaultPositionId(departments: Department[]): string {
  return departments[0]?.positions[0]?.id ?? "";
}

type WorkspaceProps = {
  initialDepartments: Department[];
  initialTasks: Task[];
  /** Cookie から復元した前回選択タスク ID（サーバー側で読み取り、フラッシュ防止） */
  initialSelectedTaskId?: string;
  initialMembers: Member[];
  workspace: { name: string; icon: string };
};

// ===== API ヘルパー（fire-and-forget。楽観的更新と組み合わせる） =====

async function apiPatch(id: string, patch: Partial<Task>) {
  try {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  } catch (err) {
    console.error("[apiPatch]", err);
  }
}

async function apiCreate(task: Task) {
  try {
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
  } catch (err) {
    console.error("[apiCreate]", err);
  }
}

export function Workspace({
  initialDepartments,
  initialTasks,
  initialSelectedTaskId,
  initialMembers,
  workspace,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // ===== ビューモード =====
  const [viewMode, setViewMode] = useState<ViewMode>("goal");
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    initialMembers[0]?.id ?? "",
  );

  // ===== ヘッダーフィルター =====
  const [activeFilter, setActiveFilter] = useState<"unassigned" | "inProgress" | "alert" | "done" | null>(null);
  const toggleFilter = useCallback((key: "unassigned" | "inProgress" | "alert" | "done") => {
    setActiveFilter((prev) => (prev === key ? null : key));
  }, []);

  const firstPos = defaultPositionId(initialDepartments);

  const firstTaskIdInDefaultCat =
    initialTasks.find(
      (t) => t.categoryId === firstPos && !t.archived,
    )?.id ??
    initialTasks.find((t) => !t.archived)?.id ??
    "";

  // Cookie から復元したタスクが有効なら、そのタスクとカテゴリを初期値にする
  const restoredTask = initialSelectedTaskId
    ? initialTasks.find((t) => t.id === initialSelectedTaskId && !t.archived)
    : null;

  const resolvedInitialTaskId = restoredTask?.id ?? firstTaskIdInDefaultCat;
  const resolvedInitialCategoryId = restoredTask?.categoryId ?? firstPos;

  const [selectedCategoryId, setSelectedCategoryId] = useState(resolvedInitialCategoryId);
  const [selectedTaskId, setSelectedTaskId] = useState(resolvedInitialTaskId);
  const [pane4ManuallyClosed, setPane4ManuallyClosed] = useState(false);

  const departmentsWithCounts = useMemo(() => {
    return departments.map((d) => ({
      ...d,
      positions: d.positions.map((p) => ({
        ...p,
        count: tasks.filter(
          (t) => t.categoryId === p.id && !t.archived,
        ).length,
      })),
    }));
  }, [departments, tasks]);

  const meta = findPositionMeta(departmentsWithCounts, selectedCategoryId);
  const positionTitle = meta?.positionTitle ?? "";

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const active = tasks.filter((t) => !t.archived);
    return {
      unassigned: active.filter((t) => !t.assignee && t.status !== "done").length,
      inProgress: active.filter((t) => t.status === "in_progress").length,
      alert: active.filter((t) => {
        if (t.status === "done" || !t.dueDate) return false;
        const days = Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / 86_400_000);
        return days <= 7;
      }).length,
      done: active.filter((t) => t.status === "done").length,
    };
  }, [tasks]);

  const tasksInCategory = useMemo(
    () => tasks.filter((t) => t.categoryId === selectedCategoryId && !t.archived),
    [tasks, selectedCategoryId],
  );

  const tasksForMember = useMemo(() => {
    if (!selectedMemberId) return [];
    const member = initialMembers.find((m) => m.id === selectedMemberId);
    if (!member) return [];
    return tasks.filter((t) => !t.archived && t.assignee === member.name);
  }, [tasks, selectedMemberId, initialMembers]);

  const memberTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const alerts: Record<string, number> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const member of initialMembers) {
      const memberTasks = tasks.filter(
        (t) => !t.archived && t.assignee === member.name && t.status !== "done",
      );
      counts[member.id] = memberTasks.length;
      alerts[member.id] = memberTasks.filter((t) => {
        if (!t.dueDate) return false;
        const days = Math.ceil(
          (new Date(t.dueDate).getTime() - today.getTime()) / 86_400_000,
        );
        return days <= 7;
      }).length;
    }
    return { counts, alerts };
  }, [tasks, initialMembers]);

  const baseActiveTasks = viewMode === "goal" ? tasksInCategory : tasksForMember;

  const activeTasks = useMemo(() => {
    if (!activeFilter) return baseActiveTasks;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tasks.filter((t) => {
      if (t.archived) return false;
      switch (activeFilter) {
        case "unassigned": return !t.assignee && t.status !== "done";
        case "inProgress": return t.status === "in_progress";
        case "alert": {
          if (t.status === "done" || !t.dueDate) return false;
          const days = Math.ceil((new Date(t.dueDate).getTime() - today.getTime()) / 86_400_000);
          return days <= 7;
        }
        case "done": return t.status === "done";
        default: return true;
      }
    });
  }, [activeFilter, baseActiveTasks, tasks]);

  const activeTask = useMemo(() => {
    const picked = activeTasks.find((t) => t.id === selectedTaskId);
    if (picked) return picked;
    return activeTasks[0] ?? null;
  }, [activeTasks, selectedTaskId]);

  const pane4Open = activeTask !== null && !pane4ManuallyClosed;

  const selectCategory = useCallback((positionId: string) => {
    setSelectedCategoryId(positionId);
    setPane4ManuallyClosed(false);
  }, []);

  const selectTask = useCallback((id: string) => {
    setSelectedTaskId(id);
    setPane4ManuallyClosed(false);
    saveSelectedTaskCookie(id);
  }, []);

  // ===== タスク更新（楽観的更新 + API 保存） =====
  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
      apiPatch(id, patch);
    },
    [],
  );

  const taskGroups: TaskGroup[] = useMemo(() => {
    const filtered = activeTasks;
    const stageGroups: TaskGroup[] = TASK_STATUS_ORDER.map((status) => ({
      kind: "status" as const,
      status,
      label: TASK_STATUS_LABELS[status],
      items: filtered
        .filter((t) => t.status === status)
        .map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          assignee: t.assignee,
          startDate: t.startDate,
          dueDate: t.dueDate,
          priority: t.priority,
          hasIssue: !!(t.issue?.trim()),
        })),
    }));

    const archivedItems =
      viewMode === "goal"
        ? tasks
            .filter((t) => t.archived && t.categoryId === selectedCategoryId)
            .map((t) => ({ id: t.id, title: t.title, status: t.status, assignee: t.assignee, startDate: t.startDate, dueDate: t.dueDate }))
        : [];

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      { kind: "archived" as const, label: ARCHIVED_GROUP_LABEL, items: archivedItems },
    ];
  }, [activeTasks, viewMode, tasks, selectedCategoryId]);

  const addTask = useCallback(
    (status: TaskStatus, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      const newTask = createMinimalTask(selectedCategoryId, trimmed, status);
      setTasks((prev) => [...prev, newTask]);
      setSelectedTaskId(newTask.id);
      setPane4ManuallyClosed(false);
      apiCreate(newTask);
    },
    [selectedCategoryId],
  );

  const archiveTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archived: true } : t)));
    setSelectedTaskId((prevId) => (prevId === id ? "" : prevId));
    setPane4ManuallyClosed(false);
    apiPatch(id, { archived: true });
  }, []);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, archived: false } : t)));
    apiPatch(id, { archived: false });
  }, []);

  const moveTask = useCallback(
    (id: string, toStatus: TaskStatus, toIndex: number) => {
      setTasks((prev) => {
        const subjectIndex = prev.findIndex((t) => t.id === id);
        if (subjectIndex < 0) return prev;
        const subject = prev[subjectIndex];
        if (subject.archived) return prev;

        // 目標ビューでは選択カテゴリー内のみ並び替え対象、課員ビューはカテゴリー横断
        const categoryFilter = viewMode === "goal"
          ? (t: Task) => !t.archived && t.categoryId === subject.categoryId && t.status === toStatus
          : (t: Task) => !t.archived && t.status === toStatus;

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Task = { ...subject, status: toStatus };

        let count = 0;
        let absInsertAt = without.length;
        for (let i = 0; i < without.length; i++) {
          if (categoryFilter(without[i])) {
            if (count === toIndex) { absInsertAt = i; break; }
            count++;
          }
        }
        return [...without.slice(0, absInsertAt), updated, ...without.slice(absInsertAt)];
      });
      // ステータス変更のみ DB に保存（並び順は Phase 2 対応）
      apiPatch(id, { status: toStatus });
    },
    [viewMode],
  );

  // ===== 部署管理 =====
  const addDepartment = useCallback((name: string) => {
    setDepartments((prev) => [
      ...prev,
      { id: `d-${Date.now()}`, name, positions: [] },
    ]);
  }, []);

  const deleteDepartment = useCallback((deptId: string) => {
    setDepartments((prev) => prev.filter((d) => d.id !== deptId));
  }, []);

  const addPosition = useCallback((deptId: string, posName: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, positions: [...d.positions, { id: `p-${Date.now()}`, name: posName, count: 0 }] }
          : d,
      ),
    );
  }, []);

  const deletePosition = useCallback((deptId: string, posId: string) => {
    setDepartments((prev) =>
      prev.map((d) =>
        d.id === deptId
          ? { ...d, positions: d.positions.filter((p) => p.id !== posId) }
          : d,
      ),
    );
  }, []);

  const togglePane4 = useCallback(() => setPane4ManuallyClosed((v) => !v), []);
  return (
    <SidebarProvider
      defaultOpen
      className="h-screen w-full overflow-hidden bg-background text-foreground"
    >
      {viewMode === "goal" ? (
        <PositionPane
          workspaceName={workspace.name}
          departments={departmentsWithCounts}
          selectedPositionId={selectedCategoryId}
          onSelectPosition={selectCategory}
          onAddPosition={addPosition}
          onDeletePosition={deletePosition}
        />
      ) : (
        <MemberPane
          members={initialMembers}
          taskCounts={memberTaskCounts.counts}
          alertCounts={memberTaskCounts.alerts}
          selectedMemberId={selectedMemberId}
          onSelectMember={setSelectedMemberId}
        />
      )}
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
          stats={stats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          activeFilter={activeFilter}
          onFilterChange={toggleFilter}
        />

        {/* 未割当バナー */}
        {stats.unassigned > 0 && (
          <div
            className="flex shrink-0 items-center gap-2 px-5 py-1.5"
            style={{ background: "#fef7f4", borderBottom: "1px solid #f4c5b0" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7c2d12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span className="text-[12px] font-bold" style={{ color: "#7c2d12" }}>
              未割当タスク {stats.unassigned} 件
            </span>
            <span className="text-[12px]" style={{ color: "#9a3515" }}>
              — 担当者が決まっていないタスクがあります。タスク一覧で確認して割り当ててください。
            </span>
          </div>
        )}

        {/* フィルターバー */}
        {activeFilter && (
          <div
            className="flex shrink-0 items-center gap-2 px-5 py-1.5"
            style={{ background: "#1a1a30", borderBottom: "1px solid #2d2850" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <span className="text-[11px] font-bold" style={{ color: "#c9a84c" }}>
              {{ unassigned: "未割当", inProgress: "進行中", alert: "期日警告", done: "完了" }[activeFilter]}
            </span>
            <span className="text-[11px]" style={{ color: "#6b6490" }}>のタスクを全件表示中</span>
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className="ml-auto flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] transition-colors"
              style={{ borderColor: "#3d3a5e", color: "#a09880", background: "transparent" }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              クリア
            </button>
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize={30} minSize={15} maxSize={55}>
              <TaskListPane
                categoryTitle={
                  activeFilter
                    ? `${{ unassigned: "未割当", inProgress: "進行中", alert: "期日警告", done: "完了" }[activeFilter]} — 全カテゴリー`
                    : viewMode === "member"
                      ? (initialMembers.find((m) => m.id === selectedMemberId)?.name ?? "課員")
                      : positionTitle || "カテゴリー"
                }
                isFiltered={!!activeFilter}
                groups={taskGroups}
                selectedTaskId={activeTask?.id ?? ""}
                onSelectTask={selectTask}
                onAddTask={addTask}
                onArchiveTask={archiveTask}
                onRestoreTask={restoreTask}
                onMoveTask={moveTask}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={70} minSize={30}>
              <TaskDashboardPane
                task={activeTask}
                members={initialMembers}
                onUpdateTitle={(title) => activeTask && updateTask(activeTask.id, { title })}
                onUpdateStatus={(status) => {
                  if (!activeTask) return;
                  const patch: Partial<Task> = { status };
                  if (status === "in_progress" && activeTask.status !== "in_progress" && !activeTask.startDate) {
                    patch.startDate = new Date().toISOString().slice(0, 10);
                  }
                  updateTask(activeTask.id, patch);
                }}
                onUpdateNextAction={(nextAction) => activeTask && updateTask(activeTask.id, { nextAction })}
                onUpdateAssignee={(assignee) => activeTask && updateTask(activeTask.id, { assignee })}
                onUpdateStartDate={(startDate) => activeTask && updateTask(activeTask.id, { startDate })}
                onUpdateDueDate={(dueDate) => activeTask && updateTask(activeTask.id, { dueDate })}
                onUpdateStatusDetail={(statusDetail) => activeTask && updateTask(activeTask.id, { statusDetail })}
                onUpdateIssue={(issue) => activeTask && updateTask(activeTask.id, { issue })}
                onUpdatePriority={(priority) => activeTask && updateTask(activeTask.id, { priority })}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
          <TaskNotesPane
            task={activeTask}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
            onUpdateNotes={(notes) => activeTask && updateTask(activeTask.id, { notes })}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
