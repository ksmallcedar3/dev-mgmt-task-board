"use client";

import { AlertCircle, CheckCircle2, Loader2, Settings, Target, Users, UserX } from "lucide-react";

import { type Department } from "@/lib/schema";
import { type ViewMode } from "@/components/workspace/Workspace";
import { cn } from "@/lib/utils";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SettingsDialogContent } from "@/components/workspace/SettingsDialog";

type Stats = {
  unassigned: number;
  inProgress: number;
  alert: number;
  done: number;
};

type GlobalHeaderProps = {
  departmentTitle: string;
  positionTitle: string;
  /** 選択中のタスク名（未選択時はプレースホルダ） */
  taskTitle: string;
  departments: Department[];
  onAddDepartment: (name: string) => void;
  onDeleteDepartment: (deptId: string) => void;
  stats: Stats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function GlobalHeader({
  departmentTitle,
  positionTitle,
  taskTitle,
  departments,
  onAddDepartment,
  onDeleteDepartment,
  stats,
  viewMode,
  onViewModeChange,
}: GlobalHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
      <Breadcrumb
        className="min-w-0 flex-1 overflow-hidden"
        aria-label="パンくず"
      >
        <BreadcrumbList className="flex-nowrap text-[11px]">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink>{departmentTitle}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink>{positionTitle}</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem className="min-w-0">
            <BreadcrumbPage className="truncate font-medium">
              {taskTitle}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* ビュー切替タブ */}
      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-muted p-0.5 text-xs">
        {(
          [
            { id: "goal", label: "目標ビュー", icon: Target },
            { id: "member", label: "課員ビュー", icon: Users },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewModeChange(id)}
            className={cn(
              "flex items-center gap-1 rounded px-2.5 py-1 font-medium transition-colors",
              viewMode === id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-3" />
            {label}
          </button>
        ))}
      </div>

      {/* サマリ統計バッジ */}
      <div className="flex shrink-0 items-center gap-3 text-xs">
        <Tooltip>
          <TooltipTrigger
            className={`flex items-center gap-1 font-medium ${stats.unassigned > 0 ? "text-destructive" : "text-muted-foreground"}`}
          >
            <UserX className="size-3.5" aria-hidden="true" />
            <span>{stats.unassigned}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">未割当タスク</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1 font-medium text-muted-foreground">
            <Loader2 className="size-3.5" aria-hidden="true" />
            <span>{stats.inProgress}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">進行中タスク</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            className={`flex items-center gap-1 font-medium ${stats.alert > 0 ? "text-amber-600" : "text-muted-foreground"}`}
          >
            <AlertCircle className="size-3.5" aria-hidden="true" />
            <span>{stats.alert}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">期日警告（7日以内）</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger className="flex items-center gap-1 font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />
            <span>{stats.done}</span>
          </TooltipTrigger>
          <TooltipContent side="bottom">完了タスク</TooltipContent>
        </Tooltip>

        <span className="h-4 w-px bg-border" aria-hidden="true" />
      </div>

      <Dialog>
        <Tooltip>
          <TooltipTrigger
            render={
              <DialogTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="ワークスペース設定"
                  >
                    <Settings />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">ワークスペース設定</TooltipContent>
        </Tooltip>
        <SettingsDialogContent
          departments={departments}
          onAddDepartment={onAddDepartment}
          onDeleteDepartment={onDeleteDepartment}
        />
      </Dialog>
    </header>
  );
}
