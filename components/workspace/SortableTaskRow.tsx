"use client";

import { type CSSProperties, type ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, GripVertical, MoreHorizontal, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { type TaskRow, type TaskStatus } from "@/lib/schema";
import { Button } from "@/components/ui/button";

/** 今日から何日後かを返す。過去は負の値。日付なしは null */
function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SortableTaskRow({
  task,
  status,
  selected,
  onSelect,
  actions,
}: {
  task: TaskRow;
  status: TaskStatus;
  selected: boolean;
  onSelect: (id: string) => void;
  actions: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { containerId: status, name: task.title },
  });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/task relative flex items-stretch",
        isDragging && "pointer-events-none opacity-50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(task.id)}
        style={selected ? { background: "linear-gradient(135deg, #111125, #1a1a38)", borderColor: "rgba(201,168,76,0.35)" } : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md border border-transparent px-2.5 py-2.5 text-left transition-colors",
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          selected
            ? "text-[#e8d9a8]"
            : "text-foreground hover:bg-muted",
        )}
      >
        <span
          {...attributes}
          {...listeners}
          aria-label={`${task.title} の並び替え`}
          className={cn(
            "flex size-5 shrink-0 cursor-grab items-center justify-center rounded",
            "opacity-0 transition-opacity group-focus-within/task:opacity-100 group-hover/task:opacity-100",
            "active:cursor-grabbing",
            "outline-none focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50",
            selected ? "text-[#a09880] hover:text-[#e8d9a8]" : "text-muted-foreground hover:text-foreground",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            <p className={cn("truncate text-sm", selected && "font-semibold")}>{task.title}</p>
            {task.priority && (
              <Star
                aria-label="要確認"
                className="size-3 shrink-0 fill-amber-500 text-amber-500"
              />
            )}
            {task.hasIssue && (
              <AlertTriangle
                aria-label="課題あり"
                className={cn("size-3 shrink-0", selected ? "text-red-400" : "text-destructive")}
              />
            )}
          </div>
          {/* 担当者・期日の補助情報 */}
          <div className="mt-0.5 flex items-center gap-2 text-xs">
            {/* 担当者 */}
            {task.assignee ? (
              <span className={cn("truncate", selected ? "text-[#a09880]" : "text-muted-foreground")}>{task.assignee}</span>
            ) : (
              <span className="font-medium text-destructive">未割当</span>
            )}
            {/* 期日バッジ */}
            {(() => {
              const dueDays = daysUntil(task.dueDate);
              const startDays = daysUntil(task.startDate);

              if (dueDays !== null && dueDays < 0)
                return <span className="ml-auto shrink-0 font-medium text-destructive">終了超過</span>;
              if (startDays !== null && startDays < 0 && task.status === "todo")
                return <span className="ml-auto shrink-0 font-medium text-amber-600">開始超過</span>;
              if (dueDays !== null && dueDays <= 7)
                return <span className="ml-auto shrink-0 font-medium text-destructive">{dueDays}日後</span>;
              if (dueDays !== null && dueDays <= 14)
                return <span className="ml-auto shrink-0 text-amber-600">{dueDays}日後</span>;
              if (dueDays !== null)
                return <span className={cn("ml-auto shrink-0", selected ? "text-[#a09880]" : "text-muted-foreground")}>{task.dueDate}</span>;
              return null;
            })()}
          </div>
        </div>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className={cn(
                "my-1 mr-1 shrink-0 self-center",
                "text-muted-foreground hover:text-foreground",
                selected && "text-[#a09880] hover:text-[#e8d9a8]",
              )}
              aria-label={`${task.title} の操作`}
            >
              <MoreHorizontal />
            </Button>
          }
        />
        <DropdownMenuContent side="right" align="start">
          <DropdownMenuGroup>{actions}</DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
