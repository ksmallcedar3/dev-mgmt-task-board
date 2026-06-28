"use client";

import { Settings, Target, Users, X } from "lucide-react";

import { type Department } from "@/lib/schema";
import { type ViewMode } from "@/components/workspace/Workspace";
import { cn } from "@/lib/utils";
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
  departments: Department[];
  onAddDepartment: (name: string) => void;
  onDeleteDepartment: (deptId: string) => void;
  stats: Stats;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  activeFilter: "unassigned" | "inProgress" | "alert" | "done" | null;
  onFilterChange: (key: "unassigned" | "inProgress" | "alert" | "done") => void;
};

export function GlobalHeader({
  departments,
  onAddDepartment,
  onDeleteDepartment,
  stats,
  viewMode,
  onViewModeChange,
  activeFilter,
  onFilterChange,
}: GlobalHeaderProps) {
  return (
    <header className="shrink-0 border-b" style={{ borderColor: "#2d2850" }}>
      {/* タイトル・タブ・サマリ・アクション（1段） */}
      <div
        className="flex items-center justify-between gap-4 px-5 py-3"
        style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #1c1a30 100%)" }}
      >
        {/* 左：タイトル */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#c9a84c", letterSpacing: "0.15em" }}>
            Task Board
          </p>
          <h1 className="text-[25px] font-black leading-tight tracking-tight text-white">
            開発管理課タスク状況管理（2026）
          </h1>
        </div>

        {/* 右：タブ・サマリ・アクション */}
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          {/* ビュー切替タブ＋アクションボタン */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
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
                    "flex items-center gap-1.5 rounded-full border px-4 py-1 text-[12px] font-bold transition-all",
                    viewMode === id
                      ? "border-[#c9a84c] bg-[#c9a84c] text-[#0d0d1a]"
                      : "border-[#2d2850] bg-transparent text-[#a09880] hover:border-[#c9a84c] hover:text-[#c9a84c]",
                  )}
                >
                  <Icon className="size-3" />
                  {label}
                </button>
              ))}
            </div>

            {/* 区切り */}
            <span className="h-4 w-px" style={{ background: "#2d2850" }} aria-hidden />

            {/* アクション：設定 */}
            <div className="flex items-center gap-0.5">
              <Dialog>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <DialogTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-[#6b6490] hover:text-[#c9a84c]"
                            aria-label="ワークスペース設定"
                          >
                            <Settings className="size-3.5" />
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
            </div>
          </div>

          {/* サマリ統計（クリックでフィルター） */}
          <div className="flex gap-1.5">
            {(
              [
                { key: "unassigned" as const, label: "未割当",   value: stats.unassigned, color: "#f4a488", tooltip: "クリックで未割当タスクを絞り込み" },
                { key: "inProgress" as const, label: "進行中",   value: stats.inProgress, color: "#e8d9a8", tooltip: "クリックで進行中タスクを絞り込み" },
                { key: "alert"      as const, label: "期日警告", value: stats.alert,       color: "#f4a488", tooltip: "クリックで期日警告タスクを絞り込み" },
                { key: "done"       as const, label: "完了",     value: stats.done,        color: "#7ecb97", tooltip: "クリックで完了タスクを絞り込み" },
              ]
            ).map(({ key, label, value, color, tooltip }) => {
              const isActive = activeFilter === key;
              return (
                <Tooltip key={key}>
                  <TooltipTrigger
                    onClick={() => onFilterChange(key)}
                    className={cn(
                      "relative cursor-pointer rounded-lg border-2 px-2 py-1 text-center transition-all hover:border-[rgba(201,168,76,0.4)]",
                      isActive ? "border-[#c9a84c] bg-[rgba(201,168,76,0.08)]" : "border-transparent",
                    )}
                  >
                    {isActive && (
                      <X className="absolute right-0.5 top-0.5 size-2.5" style={{ color: "#c9a84c" }} aria-hidden />
                    )}
                    <div className="text-xl font-black leading-none" style={{ color }}>
                      {value}
                    </div>
                    <div className="mt-0.5 text-[10px]" style={{ color: "#a09880" }}>
                      {label}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {isActive ? "クリックで絞り込みを解除" : tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
