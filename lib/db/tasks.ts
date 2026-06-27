/**
 * tasks / task_notes テーブルへの CRUD 関数。
 * snake_case（DB）↔ camelCase（TypeScript）の変換をここで一元管理する。
 */

import { sql } from "@/lib/db";
import { type Task, type TaskStatus } from "@/lib/schema";

// ===== 型変換ヘルパー =====

/** Postgres の DATE/TIMESTAMPTZ → "YYYY-MM-DD" 文字列 */
function toDateStr(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v.slice(0, 10);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return undefined;
}

/** DB 行 → Task 型 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToTask(row: Record<string, any>): Task {
  return {
    id: row.id as string,
    categoryId: row.category_id as string,
    title: row.title as string,
    status: row.status as TaskStatus,
    assignee: (row.assignee as string) || undefined,
    startDate: toDateStr(row.start_date),
    dueDate: toDateStr(row.due_date),
    statusDetail: (row.status_detail as string) ?? "",
    issue: (row.issue as string) || undefined,
    nextAction: (row.next_action as string) ?? "",
    priority: row.priority as boolean,
    notes: (row.notes as string[]) ?? [],
    archived: row.archived as boolean,
  };
}

// ===== クエリ =====

/** 全タスクを取得（notes を配列で結合） */
export async function getAllTasks(): Promise<Task[]> {
  const rows = await sql`
    SELECT
      t.*,
      COALESCE(
        json_agg(tn.body ORDER BY tn.noted_at ASC)
        FILTER (WHERE tn.id IS NOT NULL),
        '[]'::json
      ) AS notes
    FROM tasks t
    LEFT JOIN task_notes tn ON tn.task_id = t.id
    GROUP BY t.id
    ORDER BY t.created_at ASC
  `;
  return rows.map(rowToTask);
}

/** タスクを1件作成 */
export async function createTask(task: Task): Promise<Task> {
  const [row] = await sql`
    INSERT INTO tasks (
      id, category_id, title, status, assignee,
      start_date, due_date, status_detail, issue,
      next_action, priority, archived
    ) VALUES (
      ${task.id},
      ${task.categoryId},
      ${task.title},
      ${task.status},
      ${task.assignee ?? null},
      ${task.startDate ?? null},
      ${task.dueDate ?? null},
      ${task.statusDetail ?? ""},
      ${task.issue ?? null},
      ${task.nextAction ?? ""},
      ${task.priority ?? false},
      ${task.archived ?? false}
    )
    RETURNING *
  `;
  return rowToTask({ ...row, notes: [] });
}

/** タスクを更新（notes フィールドは別処理） */
export async function updateTask(
  id: string,
  patch: Partial<Task>,
): Promise<void> {
  // notes だけ分離して task_notes テーブルへ
  const { notes, ...fields } = patch;

  if (Object.keys(fields).length > 0) {
    await sql`
      UPDATE tasks SET
        category_id   = COALESCE(${fields.categoryId ?? null}, category_id),
        title         = COALESCE(${fields.title ?? null}, title),
        status        = COALESCE(${fields.status ?? null}, status),
        assignee      = ${fields.assignee !== undefined ? (fields.assignee || null) : sql`assignee`},
        start_date    = ${fields.startDate !== undefined ? (fields.startDate || null) : sql`start_date`},
        due_date      = ${fields.dueDate !== undefined ? (fields.dueDate || null) : sql`due_date`},
        status_detail = COALESCE(${fields.statusDetail ?? null}, status_detail),
        issue         = ${fields.issue !== undefined ? (fields.issue || null) : sql`issue`},
        next_action   = COALESCE(${fields.nextAction ?? null}, next_action),
        priority      = COALESCE(${fields.priority ?? null}, priority),
        archived      = COALESCE(${fields.archived ?? null}, archived)
      WHERE id = ${id}
    `;
  }

  // notes が含まれていたら task_notes を一括置換
  if (notes !== undefined) {
    await replaceNotes(id, notes);
  }
}

/** task_notes を全削除して再挿入（シンプルな一括置換） */
async function replaceNotes(taskId: string, notes: string[]): Promise<void> {
  await sql`DELETE FROM task_notes WHERE task_id = ${taskId}`;
  for (const body of notes) {
    await sql`
      INSERT INTO task_notes (id, task_id, body)
      VALUES (gen_random_uuid()::text, ${taskId}, ${body})
    `;
  }
}

/** 全タスクを削除してから再挿入（インポート用） */
export async function replaceAllTasks(tasks: Task[]): Promise<void> {
  await sql`DELETE FROM tasks`;
  for (const task of tasks) {
    await createTask(task);
    if (task.notes.length > 0) {
      await replaceNotes(task.id, task.notes);
    }
  }
}
