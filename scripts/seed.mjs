/**
 * DB シード: data/tasks.json の内容を Neon に投入する。
 * 実行: node scripts/seed.mjs
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

const env = readFileSync(".env.local", "utf-8");
const url = env.match(/^DATABASE_URL_UNPOOLED="?([^"\n]+)"?$/m)?.[1]?.trim();
if (!url) { console.error("DATABASE_URL_UNPOOLED が見つかりません"); process.exit(1); }

const sql = neon(url);
const { tasks } = JSON.parse(readFileSync("data/tasks.json", "utf-8"));

async function seed() {
  console.log(`シード開始: ${tasks.length} 件`);

  // 既存データをクリア
  await sql`DELETE FROM tasks`;
  console.log("既存データを削除しました");

  for (const t of tasks) {
    await sql`
      INSERT INTO tasks (
        id, category_id, title, status, assignee,
        start_date, due_date, status_detail, issue,
        next_action, priority, archived
      ) VALUES (
        ${t.id}, ${t.categoryId}, ${t.title}, ${t.status},
        ${t.assignee || null},
        ${t.startDate || null}, ${t.dueDate || null},
        ${t.statusDetail ?? ""}, ${t.issue || null},
        ${t.nextAction ?? ""}, ${t.priority ?? false}, ${t.archived ?? false}
      )
      ON CONFLICT (id) DO UPDATE SET
        title         = EXCLUDED.title,
        status        = EXCLUDED.status,
        assignee      = EXCLUDED.assignee,
        start_date    = EXCLUDED.start_date,
        due_date      = EXCLUDED.due_date,
        status_detail = EXCLUDED.status_detail,
        issue         = EXCLUDED.issue,
        next_action   = EXCLUDED.next_action,
        priority      = EXCLUDED.priority,
        archived      = EXCLUDED.archived
    `;

    // notes を task_notes に投入
    if (t.notes?.length > 0) {
      await sql`DELETE FROM task_notes WHERE task_id = ${t.id}`;
      for (const body of t.notes) {
        await sql`
          INSERT INTO task_notes (id, task_id, body)
          VALUES (gen_random_uuid()::text, ${t.id}, ${body})
        `;
      }
    }

    process.stdout.write(`  ✓ ${t.title}\n`);
  }

  const [{ count }] = await sql`SELECT count(*) FROM tasks`;
  console.log(`\nシード完了 ✅  tasks: ${count} 件`);
}

seed().catch((e) => { console.error(e); process.exit(1); });
