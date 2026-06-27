import { NextResponse } from "next/server";
import { updateTask } from "@/lib/db/tasks";
import { taskSchema } from "@/lib/schema";

/** PATCH /api/tasks/[id] — タスク部分更新 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = taskSchema.partial().safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message },
        { status: 400 },
      );
    }
    await updateTask(id, result.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/tasks/[id]]", err);
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
