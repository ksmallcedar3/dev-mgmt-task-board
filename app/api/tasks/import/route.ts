import { NextResponse } from "next/server";
import { replaceAllTasks } from "@/lib/db/tasks";
import { tasksFileSchema } from "@/lib/schema";

/** POST /api/tasks/import — JSON ファイルからタスクを一括インポート */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = tasksFileSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message },
        { status: 400 },
      );
    }
    await replaceAllTasks(result.data.tasks);
    return NextResponse.json({ ok: true, count: result.data.tasks.length });
  } catch (err) {
    console.error("[POST /api/tasks/import]", err);
    return NextResponse.json(
      { error: "インポートに失敗しました" },
      { status: 500 },
    );
  }
}
