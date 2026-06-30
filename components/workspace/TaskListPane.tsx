"use client";

import { useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Filter,
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
import {
  type TaskGroup,
  type TaskRow,
  type TaskStatus,
  type StatusStats,
} from "@/lib/schema";
import { DeleteConfirmDialog } from "@/components/workspace/DeleteConfirmDialog";
import { SortableTaskRow } from "@/components/workspace/SortableTaskRow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AddItemDialog } from "@/components/workspace/AddItemDialog";
import { AddTaskDialog } from "@/components/workspace/AddTaskDialog";
import { TASK_STATUS_LABELS } from "@/lib/labels";

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: "bg-zinc-400",
  in_progress: "bg-blue-500",
  blocked: "bg-amber-400",
  done: "bg-emerald-500",
};

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    "Space または Enter でタスクを持ち上げ、矢印キーで移動、Space で確定、Esc でキャンセルします。",
};

type TaskListPaneProps = {
  categoryTitle: string;
  isFiltered?: boolean;
  groups: TaskGroup[];
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  /** status グループ用（フィルター時） */
  onAddTaskByStatus: (status: TaskStatus, title: string) => void;
  /** subCategory グループ用（目標ビュー通常時） */
  onAddTask: (title: string, subCategory?: string) => void;
  /** subCategory の候補一覧（datalist 用） */
  subCategoryOptions: string[];
  onArchiveTask: (id: string) => void;
  onRestoreTask: (id: string) => void;
  onMoveTask: (id: string, toStatus: TaskStatus, toIndex: number) => void;
  viewMode: "goal" | "member";
};

export function TaskListPane({
  categoryTitle,
  isFiltered = false,
  groups,
  selectedTaskId,
  onSelectTask,
  onAddTaskByStatus,
  onAddTask,
  subCategoryOptions,
  onArchiveTask,
  onRestoreTask,
  onMoveTask,
  viewMode,
}: TaskListPaneProps) {
  const [addByStatusDialog, setAddByStatusDialog] = useState<{
    status: TaskStatus;
    label: string;
  } | null>(null);
  const [addTaskDialog, setAddTaskDialog] = useState<{
    subCategory?: string;
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

  const isStatusView = groups.some((g) => g.kind === "status");
  const isSubCategoryView = groups.some((g) => g.kind === "subCategory");

  const statusGroups = groups
    .filter((g): g is Extract<TaskGroup, { kind: "status" }> => g.kind === "status")
    .filter((g) => !isFiltered || g.items.length > 0);
  const subCategoryGroups = groups.filter(
    (g): g is Extract<TaskGroup, { kind: "subCategory" }> => g.kind === "subCategory",
  );
  const goalCategoryGroups = groups.filter(
    (g): g is Extract<TaskGroup, { kind: "goalCategory" }> => g.kind === "goalCategory",
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
      const title = (active.data.current?.name as string | undefined) ?? "タスク";
      return `${title}を持ち上げました。`;
    },
    onDragOver: ({ active, over }) => {
      const title = (active.data.current?.name as string | undefined) ?? "タスク";
      if (!over) return `${title}を移動中です。`;
      const overContainer = over.data.current?.containerId as TaskStatus | undefined;
      if (overContainer)
        return `${title}を「${TASK_STATUS_LABELS[overContainer]}」の上に移動しました。`;
      return `${title}を移動中です。`;
    },
    onDragEnd: ({ active, over }) => {
      const title = (active.data.current?.name as string | undefined) ?? "タスク";
      if (!over) return `${title}の移動をキャンセルしました。`;
      const overContainer =
        (over.data.current?.containerId as TaskStatus | undefined) ??
        (typeof over.id === "string" && statusGroups.some((g) => g.status === over.id)
          ? (over.id as TaskStatus)
          : undefined);
      if (!overContainer) return `${title}を確定しました。`;
      return `${title}を「${TASK_STATUS_LABELS[overContainer]}」に移動しました。`;
    },
    onDragCancel: ({ active }) => {
      const title = (active.data.current?.name as string | undefined) ?? "タスク";
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

    const activeContainer = active.data.current?.containerId as TaskStatus | undefined;
    const overContainer =
      (over.data.current?.containerId as TaskStatus | undefined) ??
      (typeof over.id === "string" && statusGroups.some((g) => g.status === over.id)
        ? (over.id as TaskStatus)
        : undefined);

    if (!activeContainer || !overContainer) return;

    const targetGroup = statusGroups.find((g) => g.status === overContainer);
    if (!targetGroup) return;
    if (active.id === over.id) return;

    const overIndexInTarget = targetGroup.items.findIndex((r) => r.id === over.id);
    const toIndex = overIndexInTarget >= 0 ? overIndexInTarget : targetGroup.items.length;

    onMoveTask(String(active.id), overContainer, toIndex);
  };

  return (
    <section className="flex h-full w-full flex-col border-r border-border bg-background">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-3">
        {isFiltered && (
          <Filter className="size-3.5 shrink-0 text-amber-500" aria-hidden />
        )}
        <h2
          className={cn(
            "truncate text-sm font-semibold",
            isFiltered ? "text-amber-500" : "text-foreground",
          )}
        >
          {categoryTitle}
        </h2>
        {/* 目標ビュー（タスク 0 件のカテゴリーを含む）のときグローバル追加ボタンを表示 */}
        {viewMode === "goal" && !isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="タスクを追加"
            onClick={() => setAddTaskDialog({})}
          >
            <Plus aria-hidden="true" />
          </Button>
        )}
      </header>

      <ScrollArea className="min-h-0 flex-1">
        {/* ── ステータスビュー（フィルター時） ── */}
        {isStatusView && (
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
                    setAddByStatusDialog({ status: group.status, label: group.label })
                  }
                  onArchiveRequest={(id, title) => setArchiveTarget({ id, title })}
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
        )}

        {/* ── 中項目ビュー（目標ビュー通常時） ── */}
        {isSubCategoryView && (
          <div className="flex flex-col gap-2 px-3 py-3">
            {subCategoryGroups.map((group) => (
              <SubCategoryGroup
                key={`subcat:${group.label}`}
                label={group.label}
                items={group.items}
                stats={group.stats}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onAddRequest={() => setAddTaskDialog({ subCategory: group.label === "（未分類）" ? undefined : group.label })}
                onArchiveRequest={(id, title) => setArchiveTarget({ id, title })}
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
            {subCategoryGroups.length === 0 && !archivedGroup && (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                「＋」ボタンでタスクを追加してください
              </div>
            )}
          </div>
        )}

        {/* ── 年度目標ビュー（課員ビュー通常時） ── */}
        {goalCategoryGroups.length > 0 && (
          <div className="flex flex-col gap-2 px-3 py-3">
            {goalCategoryGroups.map((group) => (
              <GoalCategoryGroup
                key={`goal:${group.categoryId}`}
                label={group.label}
                items={group.items}
                stats={group.stats}
                selectedTaskId={selectedTaskId}
                onSelectTask={onSelectTask}
                onArchiveRequest={(id, title) => setArchiveTarget({ id, title })}
              />
            ))}
          </div>
        )}

        {/* ── 空状態 ── */}
        {groups.length === 0 && (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            {viewMode === "member" ? "このメンバーのタスクはありません" : "タスクがありません"}
          </div>
        )}
      </ScrollArea>

      {/* フィルター時の status 別追加ダイアログ */}
      {addByStatusDialog && (
        <AddItemDialog
          open
          onOpenChange={(open) => { if (!open) setAddByStatusDialog(null); }}
          title="タスクを追加"
          description={`「${addByStatusDialog.label}」にタスクを追加します`}
          fieldLabel="タイトル"
          fieldId="task-title"
          placeholder="例: 仕様メモを共有する"
          onAdd={(title) => onAddTaskByStatus(addByStatusDialog.status, title)}
        />
      )}

      {/* 中項目グループの追加ダイアログ */}
      {addTaskDialog !== null && (
        <AddTaskDialog
          open
          onOpenChange={(open) => { if (!open) setAddTaskDialog(null); }}
          defaultSubCategory={addTaskDialog.subCategory}
          subCategoryOptions={subCategoryOptions}
          onAdd={(title, subCategory) => onAddTask(title, subCategory)}
        />
      )}

      <DeleteConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null); }}
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

// ──────────────────────────────────────────────────────────
// ステータスグループ（フィルター時）
// ──────────────────────────────────────────────────────────

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
          <h3 className="truncate text-xs font-medium text-muted-foreground">{label}</h3>
          <Badge variant="secondary" size="xs">{items.length}</Badge>
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

// ──────────────────────────────────────────────────────────
// 中項目グループ（目標ビュー通常時）
// ──────────────────────────────────────────────────────────

function SubCategoryGroup({
  label,
  items,
  stats,
  selectedTaskId,
  onSelectTask,
  onAddRequest,
  onArchiveRequest,
}: {
  label: string;
  items: TaskRow[];
  stats: StatusStats;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onAddRequest: () => void;
  onArchiveRequest: (id: string, title: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-background">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
              />
            }
          >
            <ChevronDown
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground transition-transform in-data-[panel-open]:rotate-0 -rotate-90 in-data-[panel-open]:-rotate-0"
              style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
            />
            <span className="truncate text-xs font-semibold text-foreground">{label}</span>
          </CollapsibleTrigger>

          {/* ステータス集計バッジ */}
          <div className="flex shrink-0 items-center gap-1">
            {stats.in_progress > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700">
                <span className="size-1.5 rounded-full bg-blue-500 inline-block" />
                {stats.in_progress}
              </span>
            )}
            {stats.todo > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600">
                <span className="size-1.5 rounded-full bg-zinc-400 inline-block" />
                {stats.todo}
              </span>
            )}
            {stats.blocked > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
                {stats.blocked}
              </span>
            )}
            {stats.done > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                {stats.done}
              </span>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={(e) => { e.stopPropagation(); onAddRequest(); }}
            aria-label={`${label} にタスクを追加`}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Plus aria-hidden="true" />
          </Button>
        </div>

        {/* タスク行リスト */}
        <CollapsibleContent>
          <ul className="border-t border-border">
            {items.map((t) => (
              <TaskItemRow
                key={t.id}
                task={t}
                selected={t.id === selectedTaskId}
                onSelect={onSelectTask}
                onArchiveRequest={onArchiveRequest}
                showSubCategory={false}
              />
            ))}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ──────────────────────────────────────────────────────────
// 年度目標グループ（課員ビュー通常時）
// ──────────────────────────────────────────────────────────

function GoalCategoryGroup({
  label,
  items,
  stats,
  selectedTaskId,
  onSelectTask,
  onArchiveRequest,
}: {
  label: string;
  items: TaskRow[];
  stats: StatusStats;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  onArchiveRequest: (id: string, title: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="rounded-lg border border-border bg-background">
        {/* ヘッダー */}
        <div className="flex items-center gap-2 px-3 py-2">
          <CollapsibleTrigger
            render={
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded"
              />
            }
          >
            <ChevronDown
              aria-hidden="true"
              style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }}
              className="size-3.5 shrink-0 text-muted-foreground transition-transform"
            />
            <span className="truncate text-xs font-semibold text-foreground">{label}</span>
          </CollapsibleTrigger>

          <div className="flex shrink-0 items-center gap-1">
            {stats.in_progress > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-blue-50 text-blue-700">
                <span className="size-1.5 rounded-full bg-blue-500 inline-block" />
                {stats.in_progress}
              </span>
            )}
            {stats.todo > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-zinc-100 text-zinc-600">
                <span className="size-1.5 rounded-full bg-zinc-400 inline-block" />
                {stats.todo}
              </span>
            )}
            {stats.blocked > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
                {stats.blocked}
              </span>
            )}
            {stats.done > 0 && (
              <span className="flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium bg-emerald-50 text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                {stats.done}
              </span>
            )}
          </div>
        </div>

        {/* タスク行リスト */}
        <CollapsibleContent>
          <ul className="border-t border-border">
            {items.map((t) => (
              <TaskItemRow
                key={t.id}
                task={t}
                selected={t.id === selectedTaskId}
                onSelect={onSelectTask}
                onArchiveRequest={onArchiveRequest}
                showSubCategory
              />
            ))}
          </ul>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ──────────────────────────────────────────────────────────
// 共通タスク行（中項目ビュー・年度目標ビュー）
// ──────────────────────────────────────────────────────────

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86_400_000);
}

function TaskItemRow({
  task,
  selected,
  onSelect,
  onArchiveRequest,
  showSubCategory,
}: {
  task: TaskRow;
  selected: boolean;
  onSelect: (id: string) => void;
  onArchiveRequest: (id: string, title: string) => void;
  showSubCategory: boolean;
}) {
  const dueDays = daysUntil(task.dueDate);

  return (
    <li className="group/task relative">
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        className={cn(
          "flex w-full items-start gap-0 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "bg-[linear-gradient(135deg,#111125,#1a1a38)]"
            : "hover:bg-muted/60",
        )}
      >
        {/* ステータス色帯 */}
        <span
          className={cn("mt-0 h-full w-1 shrink-0 self-stretch rounded-l-sm", STATUS_COLOR[task.status])}
          style={{ minHeight: "100%" }}
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-2.5 py-2">
          {/* 中項目 › タスク名（課員ビュー） */}
          {showSubCategory && task.subCategory && (
            <span className={cn("truncate text-[10px]", selected ? "text-[#8888aa]" : "text-muted-foreground")}>
              {task.subCategory}
            </span>
          )}
          {/* タスク名 */}
          <p className={cn("truncate text-sm leading-tight", selected ? "font-semibold text-[#e8d9a8]" : "text-foreground")}>
            {task.title}
          </p>
          {/* サブ情報行 */}
          <div className="flex items-center gap-2 text-xs">
            {/* ステータスバッジ */}
            <span
              className={cn(
                "shrink-0 rounded px-1 py-0.5 text-[10px] font-medium",
                task.status === "in_progress" && "bg-blue-50 text-blue-700",
                task.status === "todo" && "bg-zinc-100 text-zinc-600",
                task.status === "blocked" && "bg-amber-50 text-amber-700",
                task.status === "done" && "bg-emerald-50 text-emerald-700",
              )}
            >
              {TASK_STATUS_LABELS[task.status]}
            </span>
            {/* 担当者 */}
            {task.assignee ? (
              <span className={cn("truncate", selected ? "text-[#a09880]" : "text-muted-foreground")}>
                {task.assignee}
              </span>
            ) : (
              <span className="font-medium text-destructive">未割当</span>
            )}
            {/* 期日 */}
            {(() => {
              if (dueDays === null) return null;
              if (dueDays < 0) return <span className="ml-auto shrink-0 font-medium text-destructive">終了超過</span>;
              if (dueDays <= 7) return <span className="ml-auto shrink-0 font-medium text-destructive">{dueDays}日後</span>;
              if (dueDays <= 14) return <span className="ml-auto shrink-0 text-amber-600">{dueDays}日後</span>;
              return <span className={cn("ml-auto shrink-0", selected ? "text-[#a09880]" : "text-muted-foreground")}>{task.dueDate}</span>;
            })()}
          </div>
        </div>
      </button>
      {/* アーカイブボタン */}
      <button
        type="button"
        onClick={() => onArchiveRequest(task.id, task.title)}
        className={cn(
          "absolute top-1 right-1 rounded p-0.5",
          "opacity-0 group-focus-within/task:opacity-100 group-hover/task:opacity-100",
          "transition-opacity text-muted-foreground hover:text-foreground",
        )}
        aria-label={`${task.title} をアーカイブ`}
      >
        <Archive className="size-3.5" />
      </button>
    </li>
  );
}

// ──────────────────────────────────────────────────────────
// アーカイブ済みグループ
// ──────────────────────────────────────────────────────────

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
          <h3 className="truncate text-xs font-medium text-muted-foreground">{label}</h3>
          <Badge variant="secondary" size="xs">{items.length}</Badge>
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
