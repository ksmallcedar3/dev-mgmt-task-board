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
import { InlineTextareaField, InlineTextField, SectionLabel } from "@/components/primitives";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { CalendarDays, UserRound, Star, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type TaskDashboardPaneProps = {
  task: Task | null;
  onUpdateTitle: (title: string) => void;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateNextAction: (nextAction: string) => void;
  onUpdateAssignee: (assignee: string) => void;
  onUpdateStartDate: (startDate: string) => void;
  onUpdateDueDate: (dueDate: string) => void;
  onUpdateStatusDetail: (statusDetail: string) => void;
  onUpdateIssue: (issue: string) => void;
  onUpdatePriority: (priority: boolean) => void;
};

export function TaskDashboardPane({
  task,
  onUpdateTitle,
  onUpdateStatus,
  onUpdateNextAction,
  onUpdateAssignee,
  onUpdateStartDate,
  onUpdateDueDate,
  onUpdateStatusDetail,
  onUpdateIssue,
  onUpdatePriority,
}: TaskDashboardPaneProps) {
  const [assignee, setAssignee] = useState(task?.assignee ?? "");
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [statusDetail, setStatusDetail] = useState(task?.statusDetail ?? "");
  const [issue, setIssue] = useState(task?.issue ?? "");
  const [nextAction, setNextAction] = useState(task?.nextAction ?? "");
  const scrollRef = useRef<HTMLDivElement>(null);

  // タスクが切り替わったときにローカル state を同期 & スクロール先頭へ
  useEffect(() => {
    setAssignee(task?.assignee ?? "");
    setStartDate(task?.startDate ?? "");
    setDueDate(task?.dueDate ?? "");
    setStatusDetail(task?.statusDetail ?? "");
    setIssue(task?.issue ?? "");
    setNextAction(task?.nextAction ?? "");
    scrollRef.current
      ?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
      ?.scrollTo({ top: 0 });
  }, [task?.id]);

  // localStorage 復元など外部から値が変わった場合も同期
  useEffect(() => { setAssignee(task?.assignee ?? ""); }, [task?.assignee]);
  useEffect(() => { setStartDate(task?.startDate ?? ""); }, [task?.startDate]);
  useEffect(() => { setDueDate(task?.dueDate ?? ""); }, [task?.dueDate]);
  useEffect(() => { setStatusDetail(task?.statusDetail ?? ""); }, [task?.statusDetail]);
  useEffect(() => { setIssue(task?.issue ?? ""); }, [task?.issue]);
  useEffect(() => { setNextAction(task?.nextAction ?? ""); }, [task?.nextAction]);

  if (!task) {
    return (
      <section className="flex h-full w-full flex-col border-r border-border bg-muted/10">
        <div className="flex min-h-0 flex-1 items-center justify-center px-6">
          <p className="text-center text-sm text-muted-foreground">
            左のリストからタスクを選択してください。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="flex h-full w-full flex-col border-r border-border bg-muted/10">
      <ScrollArea ref={scrollRef} className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1">
            <InlineTextField
              value={task.title}
              onSave={onUpdateTitle}
              ariaLabel="タスク名"
              placeholder="タスク名を入力"
              className="h-auto border-transparent bg-transparent px-0 text-lg font-semibold leading-snug text-foreground shadow-none hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card"
            />
            {/* 担当者・期日・優先度バッジ */}
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
              {task.priority && (
                <Badge className="gap-1 font-normal bg-amber-500/15 text-amber-700 border-amber-400/40">
                  <Star className="size-3 fill-amber-500 text-amber-500" />
                  要確認
                </Badge>
              )}
              {task.issue?.trim() && (
                <Badge className="gap-1 font-normal bg-destructive/10 text-destructive border-destructive/30">
                  <AlertTriangle className="size-3" />
                  課題あり
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
                <Label className="text-xs text-muted-foreground">担当者</Label>
                <InlineTextField
                  ariaLabel="担当者"
                  value={assignee}
                  onSave={onUpdateAssignee}
                  onChange={setAssignee}
                  placeholder="担当者名を入力（空欄 = 未割当）"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-start-date" className="text-xs text-muted-foreground">
                  開始期日
                </Label>
                <input
                  id="task-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onBlur={(e) => onUpdateStartDate(e.target.value)}
                  className="h-8 w-full rounded-md border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="task-due-date" className="text-xs text-muted-foreground">
                  終了期日
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

          {/* 状況カード */}
          <Card>
            <CardHeader className="gap-1 pb-3">
              <CardTitle className="text-base">状況</CardTitle>
              <CardDescription>
                いまの状態（未着手 / 進行中 / 保留 / 完了）
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-0">
              <div>
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
                    <SelectValue placeholder="ステータスを選択">
                      {TASK_STATUS_LABELS[task.status]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent align="start">
                    {TASK_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TASK_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* 重要度フラグ */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">重要度（要確認フラグ）</Label>
                <Toggle
                  pressed={task.priority}
                  onPressedChange={onUpdatePriority}
                  size="sm"
                  aria-label="重要度フラグを切り替え"
                  className="gap-1.5 data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-700"
                >
                  <Star className="size-3.5" />
                  {task.priority ? "要確認" : "通常"}
                </Toggle>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* 状況詳細（必須） */}
          <div className="flex flex-col gap-2">
            <SectionLabel id="status-detail-label">
              状況詳細
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">必須</span>
            </SectionLabel>
            <div className="rounded-lg border border-input bg-card px-3 py-2">
              <InlineTextareaField
                ariaLabel="状況詳細"
                value={statusDetail}
                onSave={onUpdateStatusDetail}
                onChange={setStatusDetail}
                placeholder="報告日時点の現在状況を記入してください"
                className="text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 課題（任意） */}
          <div className="flex flex-col gap-2">
            <SectionLabel id="issue-label">
              課題
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">任意</span>
            </SectionLabel>
            <div
              className="rounded-lg px-3 py-2"
              style={{
                border: issue?.trim()
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid hsl(var(--border))",
                background: issue?.trim() ? "rgba(239,68,68,0.04)" : "hsl(var(--card))",
              }}
            >
              <InlineTextareaField
                ariaLabel="課題"
                value={issue}
                onSave={onUpdateIssue}
                onChange={setIssue}
                placeholder="進めるうえでの障壁・困っていることがあれば記入"
                className="text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* 次の一手（必須） */}
          <div className="flex flex-col gap-2">
            <SectionLabel id="next-action-label">
              次の一手
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">必須</span>
            </SectionLabel>
            <div className="rounded-lg border border-input bg-card px-3 py-2">
              <InlineTextareaField
                ariaLabel="次の一手"
                value={nextAction}
                onSave={onUpdateNextAction}
                onChange={setNextAction}
                placeholder="次に取る行動（これからどうするか）を一文で"
                className="text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

        </div>
      </ScrollArea>
    </section>
  );
}
