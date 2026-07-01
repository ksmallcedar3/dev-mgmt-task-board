"use client";

/**
 * Pane 3: タスクの「状況」と「次の一手」（公式）。
 */

import { type Task, type TaskStatus, type Member, TASK_STATUS_ORDER } from "@/lib/schema";
import { TASK_STATUS_LABELS } from "@/lib/labels";
import {
  Card,
  CardContent,
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
import { InlineTextareaField, InlineTextField, SectionLabel } from "@/components/primitives";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { Star } from "lucide-react";
import { useState, useEffect } from "react";

type TaskDashboardPaneProps = {
  task: Task | null;
  members: Member[];
  subCategoryOptions: string[];
  onUpdateTitle: (title: string) => void;
  onUpdateStatus: (status: TaskStatus) => void;
  onUpdateNextAction: (nextAction: string) => void;
  onUpdateAssignee: (assignee: string) => void;
  onUpdateStartDate: (startDate: string) => void;
  onUpdateDueDate: (dueDate: string) => void;
  onUpdateStatusDetail: (statusDetail: string) => void;
  onUpdateIssue: (issue: string) => void;
  onUpdatePriority: (priority: boolean) => void;
  onUpdateSubCategory: (subCategory: string) => void;
};

const reportTextareaClass =
  "field-sizing-fixed h-full min-h-0 flex-1 resize-none overflow-y-auto text-sm text-foreground placeholder:text-muted-foreground";

export function TaskDashboardPane({
  task,
  members,
  subCategoryOptions,
  onUpdateTitle,
  onUpdateStatus,
  onUpdateNextAction,
  onUpdateAssignee,
  onUpdateStartDate,
  onUpdateDueDate,
  onUpdateStatusDetail,
  onUpdateIssue,
  onUpdatePriority,
  onUpdateSubCategory,
}: TaskDashboardPaneProps) {
  const [startDate, setStartDate] = useState(task?.startDate ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? "");
  const [statusDetail, setStatusDetail] = useState(task?.statusDetail ?? "");
  const [issue, setIssue] = useState(task?.issue ?? "");
  const [nextAction, setNextAction] = useState(task?.nextAction ?? "");
  const [subCategory, setSubCategory] = useState(task?.subCategory ?? "");

  useEffect(() => {
    setStartDate(task?.startDate ?? "");
    setDueDate(task?.dueDate ?? "");
    setStatusDetail(task?.statusDetail ?? "");
    setIssue(task?.issue ?? "");
    setNextAction(task?.nextAction ?? "");
    setSubCategory(task?.subCategory ?? "");
  }, [task?.id]);

  useEffect(() => { setStartDate(task?.startDate ?? ""); }, [task?.startDate]);
  useEffect(() => { setDueDate(task?.dueDate ?? ""); }, [task?.dueDate]);
  useEffect(() => { setStatusDetail(task?.statusDetail ?? ""); }, [task?.statusDetail]);
  useEffect(() => { setIssue(task?.issue ?? ""); }, [task?.issue]);
  useEffect(() => { setNextAction(task?.nextAction ?? ""); }, [task?.nextAction]);
  useEffect(() => { setSubCategory(task?.subCategory ?? ""); }, [task?.subCategory]);

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
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-3">
        {/* タスク名 */}
        <div className="shrink-0">
          <InlineTextField
            value={task.title}
            onSave={onUpdateTitle}
            ariaLabel="タスク名"
            placeholder="タスク名を入力"
            className="h-auto border-transparent bg-transparent px-0 text-lg font-semibold leading-snug text-foreground shadow-none hover:border-input hover:bg-card focus-visible:border-input focus-visible:bg-card"
          />
        </div>

        {/* 担当・期日・状況（コンパクト） */}
        <Card size="sm" className="shrink-0">
          <CardHeader className="gap-0 pb-2">
            <CardTitle className="text-sm">担当・期日・状況</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-x-3 gap-y-2 pt-0">
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-subcategory" className="text-xs text-muted-foreground">中項目</Label>
              <input
                id="task-subcategory"
                list="pane3-subcategory-options"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                onBlur={(e) => onUpdateSubCategory(e.target.value)}
                placeholder="例: 資格取得支援制度"
                className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
              {subCategoryOptions.length > 0 && (
                <datalist id="pane3-subcategory-options">
                  {subCategoryOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-assignee" className="text-xs text-muted-foreground">担当者</Label>
              <Select
                value={task.assignee ?? ""}
                onValueChange={(v) => onUpdateAssignee(v === "__unassigned__" ? "" : v as string)}
              >
                <SelectTrigger id="task-assignee" className="h-8 w-full bg-card hover:bg-accent/40">
                  <SelectValue placeholder="未割当" />
                </SelectTrigger>
                <SelectContent align="start">
                  <SelectItem value="__unassigned__">
                    <span className="text-muted-foreground">未割当</span>
                  </SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>
                      {m.name}
                      <span className="ml-1.5 text-xs text-muted-foreground">{m.role}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-start-date" className="text-xs text-muted-foreground">開始期日</Label>
              <input
                id="task-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={(e) => onUpdateStartDate(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-due-date" className="text-xs text-muted-foreground">終了期日</Label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                onBlur={(e) => onUpdateDueDate(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-card px-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="task-status-select" className="text-xs text-muted-foreground">ステータス</Label>
              <Select
                value={task.status}
                onValueChange={(v) => onUpdateStatus(v as TaskStatus)}
              >
                <SelectTrigger id="task-status-select" className="h-8 w-full bg-card hover:bg-accent/40">
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
            <div className="flex flex-col justify-end gap-1">
              <Label className="text-xs text-muted-foreground">重要度</Label>
              <Toggle
                pressed={task.priority}
                onPressedChange={onUpdatePriority}
                size="sm"
                aria-label="重要度フラグを切り替え"
                className="h-8 w-full justify-center gap-1.5 data-[state=on]:bg-amber-500/15 data-[state=on]:text-amber-700"
              >
                <Star className="size-3.5" />
                {task.priority ? "要確認" : "通常"}
              </Toggle>
            </div>
          </CardContent>
        </Card>

        {/* 週次報告欄（残り高さを3等分） */}
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <SectionLabel id="status-detail-label" className="shrink-0 text-xs">
              状況詳細
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">必須</span>
            </SectionLabel>
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-input bg-card px-2 py-1.5">
              <InlineTextareaField
                ariaLabel="状況詳細"
                value={statusDetail}
                onSave={onUpdateStatusDetail}
                placeholder="報告日時点の現在状況を記入してください"
                className={reportTextareaClass}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <SectionLabel id="issue-label" className="shrink-0 text-xs">
              課題
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">任意</span>
            </SectionLabel>
            <div
              className="flex min-h-0 flex-1 flex-col rounded-lg px-2 py-1.5"
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
                placeholder="進めるうえでの障壁・困っていることがあれば記入"
                className={reportTextareaClass}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1">
            <SectionLabel id="next-action-label" className="shrink-0 text-xs">
              次の一手
              <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">必須</span>
            </SectionLabel>
            <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-input bg-card px-2 py-1.5">
              <InlineTextareaField
                ariaLabel="次の一手"
                value={nextAction}
                onSave={onUpdateNextAction}
                placeholder="次に取る行動（これからどうするか）を一文で"
                className={reportTextareaClass}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
