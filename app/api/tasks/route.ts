import { NextResponse } from "next/server";
import { getAllTasks, createTask } from "@/lib/db/tasks";
import { taskSchema } from "@/lib/schema";

/** GET /api/tasks — 全タスク取得 */
export async function GET() {
  try {
    const tasks = await getAllTasks();
    return NextResponse.json(tasks);
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json({ error: "取得に失敗しました" }, { status: 500 });
  }
}

/** POST /api/tasks — タスク作成 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = taskSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message },
        { status: 400 },
      );
    }
    const task = await createTask(result.data);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("[POST /api/tasks]", err);
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
