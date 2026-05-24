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

type TaskDashboardPaneProps = {
  task: Task | null;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateNextAction: (nextAction: string) => void;
};

export function TaskDashboardPane({
  task,
  onUpdateStatus,
  onUpdateNextAction,
}: TaskDashboardPaneProps) {
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

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-muted/10">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold leading-snug text-foreground">
              {task.title}
            </h2>
            <p className="text-xs text-muted-foreground">タスクの概要と次の一手</p>
          </div>

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
            <InlineTextareaField
              ariaLabel="次の一手"
              value={task.nextAction}
              onSave={onUpdateNextAction}
              placeholder="次に取る行動を一文で（公式・Pane 4 の備考とは別）"
            />
          </div>
        </div>
      </ScrollArea>
    </section>
  );
}
