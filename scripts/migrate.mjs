/**
 * DB マイグレーション: tasks / task_notes テーブルを作成する。
 * 実行: node scripts/migrate.mjs
 */

import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

// .env.local から DATABASE_URL_UNPOOLED を読み込む（channel_binding パラメータなし）
const env = readFileSync(".env.local", "utf-8");
const match = env.match(/^DATABASE_URL_UNPOOLED="?([^"\n]+)"?$/m);
if (!match) {
  console.error("DATABASE_URL_UNPOOLED が .env.local に見つかりません");
  process.exit(1);
}
const DATABASE_URL = match[1].trim();

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("マイグレーション開始...");

  // tasks テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id             TEXT        PRIMARY KEY,
      category_id    TEXT        NOT NULL,
      title          TEXT        NOT NULL,
      status         TEXT        NOT NULL DEFAULT 'todo',
      assignee       TEXT,
      start_date     DATE,
      due_date       DATE,
      status_detail  TEXT        NOT NULL DEFAULT '',
      issue          TEXT,
      next_action    TEXT        NOT NULL DEFAULT '',
      priority       BOOLEAN     NOT NULL DEFAULT FALSE,
      archived       BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("✓ tasks テーブル作成");

  // task_notes テーブル
  await sql`
    CREATE TABLE IF NOT EXISTS task_notes (
      id        TEXT        PRIMARY KEY,
      task_id   TEXT        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      body      TEXT        NOT NULL,
      noted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  console.log("✓ task_notes テーブル作成");

  // updated_at を自動更新するトリガー
  await sql`
    CREATE OR REPLACE FUNCTION update_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `;
  await sql`
    DROP TRIGGER IF EXISTS tasks_updated_at ON tasks
  `;
  await sql`
    CREATE TRIGGER tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at()
  `;
  console.log("✓ updated_at トリガー設定");

  // インデックス（検索性能向上）
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tasks_category_id ON tasks(category_id)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_task_notes_task_id ON task_notes(task_id)
  `;
  console.log("✓ インデックス作成");

  console.log("\nマイグレーション完了 ✅");
}

migrate().catch((err) => {
  console.error("マイグレーション失敗:", err);
  process.exit(1);
});
