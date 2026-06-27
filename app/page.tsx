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

export default function Page() {
  const deptResult = departmentsSchema.safeParse(positionsData);
  const tasksResult = tasksFileSchema.safeParse(tasksData);
  const membersResult = membersSchema.safeParse(membersData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (!deptResult.success || !tasksResult.success || !membersResult.success || !wsResult.success) {
    const errors = [
      !deptResult.success && `positions.json: ${deptResult.error.issues[0]?.message}`,
      !tasksResult.success && `tasks.json: ${tasksResult.error.issues[0]?.message}`,
      !membersResult.success && `members.json: ${membersResult.error.issues[0]?.message}`,
      !wsResult.success && `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialDepartments={deptResult.data}
      initialTasks={tasksResult.data.tasks}
      serverUpdatedAt={tasksResult.data.updatedAt}
      initialMembers={membersResult.data}
      workspace={wsResult.data}
    />
  );
}
