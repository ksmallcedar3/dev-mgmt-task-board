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
  /** 期日。"YYYY-MM-DD" 形式（任意） */
  dueDate: z.string().optional(),
  /** Pane 3: 公式の「次の一手」 */
  nextAction: z.string(),
  /** Pane 4: 時系列の備考（次の一手は書かない） */
  notes: z.array(z.string()),
  archived: z.boolean().default(false),
});
export type Task = z.infer<typeof taskSchema>;

export const departmentsSchema = z.array(departmentSchema);
export const tasksSchema = z.array(taskSchema);

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
  /** 期日。"YYYY-MM-DD" 形式 */
  dueDate?: string;
};

export type TaskGroup =
  | { kind: "status"; status: TaskStatus; label: string; items: TaskRow[] }
  | { kind: "archived"; label: string; items: TaskRow[] };
