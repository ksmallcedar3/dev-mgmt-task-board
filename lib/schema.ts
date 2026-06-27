/**
 * タスクワークスペースの Zod スキーマと派生型。
 * UI はここから型をインポートする。
 */

import { z } from "zod";

// ===== Pane 1: グループ → カテゴリー（旧: 部署 → ポジション） =====

export const positionSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
});
export type Position = z.infer<typeof positionSchema>;

export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  positions: z.array(positionSchema),
});
export type Department = z.infer<typeof departmentSchema>;

// ===== 課員 =====

export const memberTypeSchema = z.enum(["leader", "member", "external"]);
export type MemberType = z.infer<typeof memberTypeSchema>;

export const memberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  /** leader=係長以上, member=一般課員, external=課外協力者 */
  type: memberTypeSchema,
});
export type Member = z.infer<typeof memberSchema>;

export const membersSchema = z.array(memberSchema);

// ===== タスク =====

export const taskStatusSchema = z.enum([
  "todo",
  "in_progress",
  "blocked",
  "done",
]);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_STATUS_ORDER = taskStatusSchema.options;

export const taskSchema = z.object({
  id: z.string(),
  /** Pane 1 で選ぶカテゴリー（`Position.id` と対応） */
  categoryId: z.string(),
  title: z.string(),
  status: taskStatusSchema,
  /** 担当者名（任意）。空の場合は未割当とみなす */
  assignee: z.string().optional(),
  /** 開始期日。"YYYY-MM-DD" 形式（任意）。進行中に変えた時に自動セット */
  startDate: z.string().optional(),
  /** 終了期日。"YYYY-MM-DD" 形式（任意） */
  dueDate: z.string().optional(),
  /** Pane 3: 報告日時点の現在状況（上書き。必須） */
  statusDetail: z.string().default(""),
  /** Pane 3: 進めるうえでの障壁・困っていること（任意） */
  issue: z.string().optional(),
  /** Pane 3: 公式の「次の一手」（必須） */
  nextAction: z.string(),
  /** 重要度フラグ。true = 課長に要確認 */
  priority: z.boolean().default(false),
  /** Pane 4: 時系列の備考（次の一手は書かない） */
  notes: z.array(z.string()),
  archived: z.boolean().default(false),
});
export type Task = z.infer<typeof taskSchema>;

export const departmentsSchema = z.array(departmentSchema);
export const tasksSchema = z.array(taskSchema);

/**
 * tasks.json / エクスポートファイルの形式。
 * updatedAt で localStorage とサーバー側のどちらが新しいかを比較する。
 */
export const tasksFileSchema = z.object({
  /** ISO 8601 タイムスタンプ。最後に tasks を書き出した日時 */
  updatedAt: z.string(),
  tasks: tasksSchema,
});
export type TasksFile = z.infer<typeof tasksFileSchema>;

export const workspaceSchema = z.object({
  name: z.string(),
  icon: z.string(),
});

/** Pane 4 表示（備考パネル） */
export type SelectedDetail = { type: "notes" } | null;

export type TaskRow = {
  id: string;
  title: string;
  /** 担当者名。空文字 or undefined = 未割当 */
  assignee?: string;
  /** 終了期日。"YYYY-MM-DD" 形式 */
  dueDate?: string;
  /** 重要度フラグ。true = ★ 表示 */
  priority?: boolean;
  /** 課題テキストが入力されているか。true = ⚠ 表示 */
  hasIssue?: boolean;
};

export type TaskGroup =
  | { kind: "status"; status: TaskStatus; label: string; items: TaskRow[] }
  | { kind: "archived"; label: string; items: TaskRow[] };
