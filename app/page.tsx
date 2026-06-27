import { cookies } from "next/headers";
import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import tasksData from "@/data/tasks.json";
import membersData from "@/data/members.json";
import workspaceData from "@/data/workspace.json";
import {
  departmentsSchema,
  tasksFileSchema,
  membersSchema,
  workspaceSchema,
} from "@/lib/schema";
import { getAllTasks } from "@/lib/db/tasks";

export default async function Page() {
  const deptResult = departmentsSchema.safeParse(positionsData);
  const membersResult = membersSchema.safeParse(membersData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (!deptResult.success || !membersResult.success || !wsResult.success) {
    const errors = [
      !deptResult.success && `positions.json: ${deptResult.error.issues[0]?.message}`,
      !membersResult.success && `members.json: ${membersResult.error.issues[0]?.message}`,
      !wsResult.success && `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  // DB からタスクを取得。空なら tasks.json をフォールバックとして使用
  let initialTasks = await getAllTasks().catch(() => null);
  if (!initialTasks || initialTasks.length === 0) {
    const fallback = tasksFileSchema.safeParse(tasksData);
    initialTasks = fallback.success ? fallback.data.tasks : [];
  }

  // Cookie から前回選択していたタスク ID を読み出す（SSR 時に正しいタスクを描画するため）
  const cookieStore = await cookies();
  const savedTaskId = cookieStore.get("dmtb_selectedTaskId")?.value;

  return (
    <Workspace
      initialDepartments={deptResult.data}
      initialTasks={initialTasks}
      initialSelectedTaskId={savedTaskId}
      initialMembers={membersResult.data}
      workspace={wsResult.data}
    />
  );
}
