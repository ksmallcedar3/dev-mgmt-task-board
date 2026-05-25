"use client";

/**
 * Workspace: タスク管理 4 ペイン。
 * Pane 1 カテゴリー → Pane 2 ステータス別タスク → Pane 3 状況・次の一手 → Pane 4 備考。
 */

import { useState, useCallback, useMemo } from "react";

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
  initialMembers: Member[];
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialDepartments,
  initialTasks,
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

  const firstPos = defaultPositionId(initialDepartments);
  const [selectedCategoryId, setSelectedCategoryId] = useState(firstPos);

  const firstTaskIdInDefaultCat =
    initialTasks.find(
      (t) => t.categoryId === firstPos && !t.archived,
    )?.id ??
    initialTasks.find((t) => !t.archived)?.id ??
    "";

  const [selectedTaskId, setSelectedTaskId] = useState(firstTaskIdInDefaultCat);
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
  const departmentTitle = meta?.departmentTitle ?? "";
  const positionTitle = meta?.positionTitle ?? "";

  /** ヘッダーに表示するサマリ統計（全タスク対象） */
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
    () =>
      tasks.filter(
        (t) => t.categoryId === selectedCategoryId && !t.archived,
      ),
    [tasks, selectedCategoryId],
  );

  /** 課員ビュー用：選択された課員のタスク */
  const tasksForMember = useMemo(() => {
    if (!selectedMemberId) return [];
    const member = initialMembers.find((m) => m.id === selectedMemberId);
    if (!member) return [];
    return tasks.filter((t) => !t.archived && t.assignee === member.name);
  }, [tasks, selectedMemberId, initialMembers]);

  /** 課員ごとのタスク件数・警告件数 */
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

  /** 表示対象タスク（ビューに応じて切り替え） */
  const activeTasks = viewMode === "goal" ? tasksInCategory : tasksForMember;

  /** カテゴリー内で選択 ID が無効なら先頭タスクを代表表示する（effect で state を直さない） */
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
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
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
        .map((t) => ({ id: t.id, title: t.title, assignee: t.assignee, dueDate: t.dueDate })),
    }));

    const archivedItems =
      viewMode === "goal"
        ? tasks
            .filter((t) => t.archived && t.categoryId === selectedCategoryId)
            .map((t) => ({ id: t.id, title: t.title, assignee: t.assignee, dueDate: t.dueDate }))
        : [];

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      {
        kind: "archived" as const,
        label: ARCHIVED_GROUP_LABEL,
        items: archivedItems,
      },
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
    },
    [selectedCategoryId],
  );

  const archiveTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, archived: true } : t)),
    );
    setSelectedTaskId((prevId) => (prevId === id ? "" : prevId));
    setPane4ManuallyClosed(false);
  }, []);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, archived: false } : t)),
    );
  }, []);

  const moveTask = useCallback(
    (id: string, toStatus: TaskStatus, toIndex: number) => {
      setTasks((prev) => {
        const subjectIndex = prev.findIndex((t) => t.id === id);
        if (subjectIndex < 0) return prev;
        const subject = prev[subjectIndex];
        if (subject.archived) return prev;
        if (subject.categoryId !== selectedCategoryId) return prev;

        const without = prev.filter((_, i) => i !== subjectIndex);
        const updated: Task = { ...subject, status: toStatus };

        let count = 0;
        let absInsertAt = without.length;
        for (let i = 0; i < without.length; i++) {
          const t = without[i];
          if (
            !t.archived &&
            t.categoryId === selectedCategoryId &&
            t.status === toStatus
          ) {
            if (count === toIndex) {
              absInsertAt = i;
              break;
            }
            count++;
          }
        }
        return [
          ...without.slice(0, absInsertAt),
          updated,
          ...without.slice(absInsertAt),
        ];
      });
    },
    [selectedCategoryId],
  );

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
          ? {
              ...d,
              positions: [
                ...d.positions,
                { id: `p-${Date.now()}`, name: posName, count: 0 },
              ],
            }
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

  const breadcrumbTaskTitle = activeTask?.title ?? "タスク未選択";

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
          departmentTitle={departmentTitle}
          positionTitle={positionTitle}
          taskTitle={breadcrumbTaskTitle}
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
          stats={stats}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex min-h-0 flex-1">
          <TaskListPane
            categoryTitle={positionTitle || "カテゴリー"}
            groups={taskGroups}
            selectedTaskId={activeTask?.id ?? ""}
            onSelectTask={selectTask}
            onAddTask={addTask}
            onArchiveTask={archiveTask}
            onRestoreTask={restoreTask}
            onMoveTask={moveTask}
          />
          <TaskDashboardPane
            task={activeTask}
            onUpdateStatus={(status) =>
              activeTask && updateTask(activeTask.id, { status })
            }
            onUpdateNextAction={(nextAction) =>
              activeTask && updateTask(activeTask.id, { nextAction })
            }
            onUpdateAssignee={(assignee) =>
              activeTask && updateTask(activeTask.id, { assignee })
            }
            onUpdateDueDate={(dueDate) =>
              activeTask && updateTask(activeTask.id, { dueDate })
            }
          />
          <TaskNotesPane
            task={activeTask}
            pane4Open={pane4Open}
            onTogglePane4={togglePane4}
            onUpdateNotes={(notes) =>
              activeTask && updateTask(activeTask.id, { notes })
            }
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
