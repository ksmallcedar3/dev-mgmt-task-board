"use client";

/**
 * Pane 3: タスクの「状況」と「次の一手」（公式）。
 */

import { type Task, type TaskStatus, TASK_STATUS_ORDER } from "@/lib/schema";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { InlineTextareaField, SectionLabel } from "@/components/primitives";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarDays, UserRound, Save, Check } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

type TaskDashboardPaneProps = {
  task: Task | null;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateNextAction: (nextAction: string) => void;
  onUpdateAssignee: (assignee: string) => void;
  onUpdateDueDate: (dueDate: string) => void;
};

export function TaskDashboardPane({
  task,
  onUpdateStatus,
  onUpdateNextAction,
  onUpdateAssignee,
  onUpdateDueDate,
}: TaskDashboardPaneProps) {
  const [assignee, setAssignee] = useState(task?.assignee ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [nextAction, setNextAction] = useState(task?.nextAction ?? "");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // タスクが切り替わったときにローカル state を同期
  useEffect(() => {
    setAssignee(task?.assignee ?? "");
    setDueDate(task?.dueDate ?? "");
    setNextAction(task?.nextAction ?? "");
    setSavedAt(null);
  }, [task?.id]);

  // localStorage 復元など外部から値が変わった場合も同期
  useEffect(() => { setAssignee(task?.assignee ?? ""); }, [task?.assignee]);
  useEffect(() => { setDueDate(task?.dueDate ?? ""); }, [task?.dueDate]);
  useEffect(() => { setNextAction(task?.nextAction ?? ""); }, [task?.nextAction]);

  const isDirty =
    assignee !== (task?.assignee ?? "") ||
    dueDate !== (task?.dueDate ?? "") ||
    nextAction !== (task?.nextAction ?? "");

  const handleSave = useCallback(() => {
    if (!task) return;
    if (assignee !== (task.assignee ?? "")) onUpdateAssignee(assignee);
    if (dueDate !== (task.dueDate ?? "")) onUpdateDueDate(dueDate);
    if (nextAction !== (task.nextAction ?? "")) onUpdateNextAction(nextAction);
    setSavedAt(Date.now());
  }, [task, assignee, dueDate, nextAction, onUpdateAssignee, onUpdateDueDate, onUpdateNextAction]);

  if (!task) {
    return (
      <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-muted/10">
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <p className="text-center text-sm text-muted-foreground">
            左のリストからタスクを選択してください。
          </p>
        </div>
      </section>
    );
  }

  const justSaved = savedAt !== null && !isDirty;

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-muted/10">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold leading-snug text-foreground">
              {task.title}
            </h2>
            {/* 担当者・期日バッジ */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {task.assignee ? (
                <Badge variant="secondary" className="gap-1 font-normal">
                  <UserRound className="size-3" />
                  {task.assignee}
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1 font-normal">
                  <UserRound className="size-3" />
                  未割当
                </Badge>
              )}
              {task.dueDate && (
                <Badge variant="outline" className="gap-1 font-normal">
                  <CalendarDays className="size-3" />
                  {task.dueDate}
                </Badge>
              )}
            </div>
          </div>

          {/* 担当者・期日の編集欄 */}
          <Card>
            <CardHeader className="gap-1 pb-3">
              <CardTitle className="text-base">担当者・期日</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-assignee" className="text-xs text-muted-foreground">
                  担当者
                </Label>
                <InlineTextareaField
                  ariaLabel="担当者"
                  value={assignee}
                  onSave={onUpdateAssignee}
                  onChange={setAssignee}
                  placeholder="担当者名を入力（空欄 = 未割当）"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due-date" className="text-xs text-muted-foreground">
                  期日
                </Label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  onBlur={(e) => onUpdateDueDate(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-1 pb-3">
              <CardTitle className="text-base">状況</CardTitle>
              <CardDescription>
                いまの状態（未着手 / 進行中 / 保留 / 完了）
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 pt-0">
              <Label htmlFor="task-status-select" className="sr-only">
                ステータス
              </Label>
              <Select
                value={task.status}
                onValueChange={(v) => onUpdateStatus(v as TaskStatus)}
              >
                <SelectTrigger
                  id="task-status-select"
                  className="h-8 w-full bg-card hover:bg-accent/40"
                >
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent align="start">
                  {TASK_STATUS_ORDER.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TASK_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Separator />

          <div className="flex flex-col gap-2">
            <SectionLabel id="next-action-label">次の一手</SectionLabel>
            {(nextAction || task.nextAction) ? (
              <div
                className="rounded-xl p-4 text-sm leading-relaxed"
                style={{
                  background: "linear-gradient(135deg, #111125, #1a1a38)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  color: "#e8d9a8",
                }}
              >
                <InlineTextareaField
                  ariaLabel="次の一手"
                  value={nextAction}
                  onSave={onUpdateNextAction}
                  onChange={setNextAction}
                  placeholder="次に取る行動を一文で"
                  className="bg-transparent text-[#e8d9a8] placeholder:text-[#a09880]"
                />
              </div>
            ) : (
              <div
                className="rounded-xl p-4"
                style={{
                  border: "1px dashed #d5cfc4",
                  background: "#faf8f2",
                }}
              >
                <InlineTextareaField
                  ariaLabel="次の一手"
                  value={nextAction}
                  onSave={onUpdateNextAction}
                  onChange={setNextAction}
                  placeholder="次に取る行動を一文で（公式・Pane 4 の備考とは別）"
                  className="text-sm italic text-muted-foreground"
                />
              </div>
            )}
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center justify-end gap-2 pt-1 pb-2">
            {justSaved && (
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <Check className="size-3" />
                保存済み
              </span>
            )}
            <Button
              size="sm"
              disabled={!isDirty}
              onClick={handleSave}
              className="gap-1.5"
            >
              <Save className="size-3.5" />
              保存
            </Button>
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
