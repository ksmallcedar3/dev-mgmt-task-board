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
  type TaskGroup,
  TASK_STATUS_ORDER,
} from "@/lib/schema";
import { createMinimalTask } from "@/lib/data/factories";
import { ARCHIVED_GROUP_LABEL, TASK_STATUS_LABELS } from "@/lib/labels";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { GlobalHeader } from "@/components/workspace/GlobalHeader";
import { PositionPane } from "@/components/workspace/PositionPane";
import { TaskListPane } from "@/components/workspace/TaskListPane";
import { TaskDashboardPane } from "@/components/workspace/TaskDashboardPane";
import { TaskNotesPane } from "@/components/workspace/TaskNotesPane";

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
  workspace: { name: string; icon: string };
};

export function Workspace({
  initialDepartments,
  initialTasks,
  workspace,
}: WorkspaceProps) {
  const [departments, setDepartments] =
    useState<Department[]>(initialDepartments);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

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

  const tasksInCategory = useMemo(
    () =>
      tasks.filter(
        (t) => t.categoryId === selectedCategoryId && !t.archived,
      ),
    [tasks, selectedCategoryId],
  );

  /** カテゴリー内で選択 ID が無効なら先頭タスクを代表表示する（effect で state を直さない） */
  const activeTask = useMemo(() => {
    const picked = tasksInCategory.find((t) => t.id === selectedTaskId);
    if (picked) return picked;
    return tasksInCategory[0] ?? null;
  }, [tasksInCategory, selectedTaskId]);

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
    const byCat = tasks.filter(
      (t) => t.categoryId === selectedCategoryId && !t.archived,
    );
    const stageGroups: TaskGroup[] = TASK_STATUS_ORDER.map((status) => ({
      kind: "status" as const,
      status,
      label: TASK_STATUS_LABELS[status],
      items: byCat
        .filter((t) => t.status === status)
        .map((t) => ({ id: t.id, title: t.title })),
    }));

    const archivedItems = tasks
      .filter((t) => t.archived && t.categoryId === selectedCategoryId)
      .map((t) => ({ id: t.id, title: t.title }));

    if (archivedItems.length === 0) return stageGroups;
    return [
      ...stageGroups,
      {
        kind: "archived" as const,
        label: ARCHIVED_GROUP_LABEL,
        items: archivedItems,
      },
    ];
  }, [tasks, selectedCategoryId]);

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
      <PositionPane
        workspaceName={workspace.name}
        departments={departmentsWithCounts}
        selectedPositionId={selectedCategoryId}
        onSelectPosition={selectCategory}
        onAddPosition={addPosition}
        onDeletePosition={deletePosition}
      />
      <SidebarInset className="flex min-w-0 flex-col bg-background">
        <GlobalHeader
          departmentTitle={departmentTitle}
          positionTitle={positionTitle}
          taskTitle={breadcrumbTaskTitle}
          departments={departments}
          onAddDepartment={addDepartment}
          onDeleteDepartment={deleteDepartment}
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
