"use client";

/**
 * Workspace: タスク管理 4 ペイン。
 * Pane 1 カテゴリー → Pane 2 ステータス別タスク → Pane 3 状況・次の一手 → Pane 4 備考。
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { tasksFileSchema } from "@/lib/schema";

/** localStorage に保存する形式: { updatedAt, tasks } */
const STORAGE_KEY = "dev-mgmt-task-board:tasks:v2";

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
  /** tasks.json の updatedAt（デプロイ時のタイムスタンプ）。自動同期の比較に使う */
  serverUpdatedAt: string;
  initialMembers: Member[];
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialDepartments,
  initialTasks,
  serverUpdatedAt,
  initialMembers,
  workspace,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);

  // サーバーとクライアントで初期値を揃えるため、まず initialTasks で初期化する
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // マウント後（クライアント側のみ）に localStorage から復元 / 自動同期する
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const result = tasksFileSchema.safeParse(JSON.parse(raw));
      if (!result.success || result.data.tasks.length === 0) return;
      // localStorage と tasks.json のどちらが新しいか比較して新しい方を採用
      const localTs = new Date(result.data.updatedAt).getTime();
      const serverTs = new Date(serverUpdatedAt).getTime();
      if (localTs >= serverTs) {
        setTasks(result.data.tasks);
      }
      // serverTs > localTs の場合は initialTasks（サーバー側）をそのまま使う
    } catch {
      // 壊れたデータは無視
    }
  }, []); // マウント時のみ実行

  // ===== エクスポート =====
  const handleExport = useCallback(() => {
    const now = new Date().toISOString();
    const payload = JSON.stringify({ updatedAt: now, tasks }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = now.slice(0, 10).replace(/-/g, "");
    a.href = url;
    a.download = `tasks-${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [tasks]);

  // ===== インポート =====
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const result = tasksFileSchema.safeParse(
            JSON.parse(ev.target?.result as string),
          );
          if (!result.success) {
            alert(
              `インポート失敗: JSONの形式が正しくありません。\n${result.error.issues[0]?.message}`,
            );
            return;
          }
          const { updatedAt, tasks: imported } = result.data;
          setTasks(imported);
          try {
            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify({ updatedAt, tasks: imported }),
            );
          } catch {}
        } catch {
          alert("インポート失敗: ファイルを読み込めませんでした。");
        }
      };
      reader.readAsText(file);
      // 同じファイルを再選択できるよう value をリセット
      e.target.value = "";
    },
    [],
  );


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
  const baseActiveTasks = viewMode === "goal" ? tasksInCategory : tasksForMember;

  /** フィルター適用後のタスク（全タスクから絞り込み） */
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

  const saveToStorage = useCallback((tasks: Task[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ updatedAt: new Date().toISOString(), tasks }),
      );
    } catch {}
  }, []);

  const updateTask = useCallback(
    (id: string, patch: Partial<Task>) => {
      setTasks((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...patch } : t));
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage],
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
          assignee: t.assignee,
          dueDate: t.dueDate,
          priority: t.priority,
          hasIssue: !!(t.issue?.trim()),
        })),
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
      setTasks((prev) => {
        const next = [...prev, newTask];
        saveToStorage(next);
        return next;
      });
      setSelectedTaskId(newTask.id);
      setPane4ManuallyClosed(false);
    },
    [selectedCategoryId, saveToStorage],
  );

  const archiveTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, archived: true } : t));
      saveToStorage(next);
      return next;
    });
    setSelectedTaskId((prevId) => (prevId === id ? "" : prevId));
    setPane4ManuallyClosed(false);
  }, [saveToStorage]);

  const restoreTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === id ? { ...t, archived: false } : t));
      saveToStorage(next);
      return next;
    });
  }, [saveToStorage]);

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
        const next = [
          ...without.slice(0, absInsertAt),
          updated,
          ...without.slice(absInsertAt),
        ];
        saveToStorage(next);
        return next;
      });
    },
    [selectedCategoryId, saveToStorage],
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
        {/* 隠しファイル入力（インポート用） */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={handleImportFile}
          aria-hidden="true"
        />

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
          activeFilter={activeFilter}
          onFilterChange={toggleFilter}
          onExport={handleExport}
          onImport={handleImportClick}
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
            onUpdateStatus={(status) => {
              if (!activeTask) return;
              // 未着手/保留 → 進行中 に変えたとき、開始日が未設定なら今日の日付を自動セット
              const patch: Partial<typeof activeTask> = { status };
              if (
                status === "in_progress" &&
                activeTask.status !== "in_progress" &&
                !activeTask.startDate
              ) {
                patch.startDate = new Date().toISOString().slice(0, 10);
              }
              updateTask(activeTask.id, patch);
            }}
            onUpdateNextAction={(nextAction) =>
              activeTask && updateTask(activeTask.id, { nextAction })
            }
            onUpdateAssignee={(assignee) =>
              activeTask && updateTask(activeTask.id, { assignee })
            }
            onUpdateStartDate={(startDate) =>
              activeTask && updateTask(activeTask.id, { startDate })
            }
            onUpdateDueDate={(dueDate) =>
              activeTask && updateTask(activeTask.id, { dueDate })
            }
            onUpdateStatusDetail={(statusDetail) =>
              activeTask && updateTask(activeTask.id, { statusDetail })
            }
            onUpdateIssue={(issue) =>
              activeTask && updateTask(activeTask.id, { issue })
            }
            onUpdatePriority={(priority) =>
              activeTask && updateTask(activeTask.id, { priority })
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
