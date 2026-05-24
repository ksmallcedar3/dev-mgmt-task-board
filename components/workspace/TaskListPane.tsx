"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Plus,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
  type ScreenReaderInstructions,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { cn } from "@/lib/utils";
import { type TaskGroup, type TaskRow, type TaskStatus } from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { SortableTaskRow } from "@/components/workspace/SortableTaskRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { TASK_STATUS_LABELS } from "@/lib/labels";

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter でタスクを持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

type TaskListPaneProps = {
  categoryTitle: string;
  groups: TaskGroup[];
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onAddTask: (status: TaskStatus, title: string) => void;
  onArchiveTask: (id: string) => void;
  onRestoreTask: (id: string) => void;
  onMoveTask: (id: string, toStatus: TaskStatus, toIndex: number) => void;
};

export function TaskListPane({
  categoryTitle,
  groups,
  selectedTaskId,
  onSelectTask,
  onAddTask,
  onArchiveTask,
  onRestoreTask,
  onMoveTask,
}: TaskListPaneProps) {
  const [addDialog, setAddDialog] = useState<{
    status: TaskStatus;
    label: string;
  } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const statusGroups = groups.filter(
    (g): g is Extract<TaskGroup, { kind: "status" }> => g.kind === "status",
  );
  const archivedGroup = groups.find(
    (g): g is Extract<TaskGroup, { kind: "archived" }> => g.kind === "archived",
  );

  const activeDragRow: { row: TaskRow; status: TaskStatus } | null = (() => {
    if (!activeDragId) return null;
    for (const g of statusGroups) {
      const row = g.items.find((r) => r.id === activeDragId);
      if (row) return { row, status: g.status };
    }
    return null;
  })();

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const title =
        (active.data.current?.name as string | undefined) ?? "タスク";
      return `${title}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const title =
        (active.data.current?.name as string | undefined) ?? "タスク";
      if (!over) return `${title}を移動中です。`;
      const overContainer = over.data.current?.containerId as
        | TaskStatus
        | undefined;
      if (overContainer)
        return `${title}を「${TASK_STATUS_LABELS[overContainer]}」の上に移動しました。`;
      return `${title}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const title =
        (active.data.current?.name as string | undefined) ?? "タスク";
      if (!over) return `${title}の移動をキャンセルしました。`;
      const overContainer =
        (over.data.current?.containerId as TaskStatus | undefined) ??
        (typeof over.id === "string" &&
        statusGroups.some((g) => g.status === over.id)
          ? (over.id as TaskStatus)
          : undefined);
      if (!overContainer) return `${title}を確定しました。`;
      return `${title}を「${TASK_STATUS_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const title =
        (active.data.current?.name as string | undefined) ?? "タスク";
      return `${title}の移動をキャンセルしました。`;
    },
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over) return;

    const activeContainer = active.data.current?.containerId as
      | TaskStatus
      | undefined;
    const overContainer =
      (over.data.current?.containerId as TaskStatus | undefined) ??
      (typeof over.id === "string" &&
      statusGroups.some((g) => g.status === over.id)
        ? (over.id as TaskStatus)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = statusGroups.find((g) => g.status === overContainer);
    if (!targetGroup) return;

    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex(
      (r) => r.id === over.id,
    );
    let toIndex: number;
    if (overIndexInTarget >= 0) {
      toIndex = overIndexInTarget;
    } else {
      toIndex = targetGroup.items.length;
    }

    onMoveTask(String(active.id), overContainer, toIndex);
  };

  return (
    <section className="flex w-[280px] shrink-0 flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <h2 className="truncate text-sm font-semibold text-foreground">
          {categoryTitle}
        </h2>
      </header>
      <ScrollArea className="min-h-0 flex-1">
        <DndContext
          id="pane2-task-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{ announcements, screenReaderInstructions }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveDragId(null)}
        >
          <div className="flex flex-col gap-5 px-3 py-4">
            {statusGroups.map((group) => (
              <StatusGroup
                key={`status:${group.status}`}
                status={group.status}
                label={group.label}
                items={group.items}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onAddRequest={() =>
                  setAddDialog({
                    status: group.status,
                    label: group.label,
                  })
                }
                onArchiveRequest={(id, title) =>
                  setArchiveTarget({ id, title })
                }
              />
            ))}
            {archivedGroup && (
              <ArchivedTasksGroup
                label={archivedGroup.label}
                items={archivedGroup.items}
                open={archivedOpen}
                onOpenChange={setArchivedOpen}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onRestore={onRestoreTask}
              />
            )}
          </div>
          <DragOverlay>
            {activeDragRow && (
              <div className="flex items-center gap-2 rounded-md bg-accent px-2.5 py-2.5 text-accent-foreground shadow-lg">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{activeDragRow.row.title}</p>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </ScrollArea>

      {addDialog && (
        <AddItemDialog
          open={addDialog !== null}
          onOpenChange={(open) => {
            if (!open) setAddDialog(null);
          }}
          title="タスクを追加"
          description={`「${addDialog.label}」にタスクを追加します`}
          fieldLabel="タイトル"
          fieldId="task-title"
          placeholder="例: 仕様メモを共有する"
          onAdd={(title) => onAddTask(addDialog.status, title)}
        />
      )}

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title="タスクをアーカイブしますか？"
        itemName={archiveTarget?.title ?? ""}
        description={`「${archiveTarget?.title ?? ""}」をアーカイブします。後で「アーカイブ済み」から復元できます。`}
        actionLabel="アーカイブ"
        onConfirm={() => {
          if (archiveTarget) {
            onArchiveTask(archiveTarget.id);
            setArchiveTarget(null);
          }
        }}
      />
    </section>
  );
}

function StatusGroup({
  status,
  label,
  items,
  selectedTaskId,
  onSelectTask,
  onAddRequest,
  onArchiveRequest,
}: {
  status: TaskStatus;
  label: string;
  items: TaskRow[];
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, title: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `dropzone:${status}`,
    data: { containerId: status },
  });

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center justify-between gap-2 bg-background px-5 py-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={onAddRequest}
          aria-label={`${label} にタスクを追加`}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
      <SortableContext
        id={status}
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          ref={setNodeRef}
          data-status={status}
          className={cn(
            "flex flex-col gap-1",
            items.length === 0 &&
              "min-h-12 rounded-md border border-dashed border-border/70 p-2",
            items.length === 0 && isOver && "border-primary/60 bg-primary/5",
          )}
        >
          {items.length === 0 ? (
            <li
              className={cn(
                "pointer-events-none flex h-8 items-center justify-center text-xs",
                isOver ? "text-primary" : "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              ここへドラッグ
            </li>
          ) : (
            items.map((t) => (
              <SortableTaskRow
                key={t.id}
                task={t}
                status={status}
                selected={t.id === selectedTaskId}
                onSelect={onSelectTask}
                actions={
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => onArchiveRequest(t.id, t.title)}
                  >
                    <Archive />
                    アーカイブ
                  </DropdownMenuItem>
                }
              />
            ))
          )}
        </ul>
      </SortableContext>
    </div>
  );
}

function ArchivedTasksGroup({
  label,
  items,
  open,
  onOpenChange,
  selectedTaskId,
  onSelectTask,
  onRestore,
}: {
  label: string;
  items: TaskRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <CollapsibleTrigger
        nativeButton={false}
        render={
          <div
            className={cn(
              "group/archived-trigger sticky top-0 z-10 -mx-3 mb-2 flex cursor-pointer items-center justify-between gap-2 bg-background px-5 py-1.5",
              "rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            )}
          />
        }
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-xs font-medium text-muted-foreground">
            {label}
          </h3>
          <Badge variant="secondary" size="xs">
            {items.length}
          </Badge>
        </div>
        <ChevronDown
          aria-hidden="true"
          className="size-4 text-muted-foreground transition-[color,transform] group-hover/archived-trigger:text-foreground in-data-[panel-open]:rotate-180"
        />
        <span className="sr-only">{`${label}を開く`}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="flex flex-col gap-1">
          {items.map((t) => (
            <li key={t.id} className="group/task relative">
              <button
                type="button"
                onClick={() => onSelectTask(t.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-2.5 py-2.5 text-left transition-colors",
                  "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  t.id === selectedTaskId
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground hover:bg-muted",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{t.title}</p>
                </div>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className={cn(
                  "absolute top-1/2 right-1 -translate-y-1/2",
                  "opacity-0 group-focus-within/task:opacity-100 group-hover/task:opacity-100",
                  "transition-opacity text-muted-foreground hover:text-foreground",
                )}
                aria-label={`${t.title} を復元`}
                onClick={() => onRestore(t.id)}
              >
                <ArchiveRestore />
              </Button>
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
