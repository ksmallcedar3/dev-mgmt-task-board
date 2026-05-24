import { Workspace } from "@/components/workspace/Workspace";
import positionsData from "@/data/positions.json";
import tasksData from "@/data/tasks.json";
import workspaceData from "@/data/workspace.json";
import {
  departmentsSchema,
  tasksSchema,
  workspaceSchema,
} from "@/lib/schema";

export default function Page() {
  const deptResult = departmentsSchema.safeParse(positionsData);
  const tasksResult = tasksSchema.safeParse(tasksData);
  const wsResult = workspaceSchema.safeParse(workspaceData);

  if (!deptResult.success || !tasksResult.success || !wsResult.success) {
    const errors = [
      !deptResult.success &&
        `positions.json: ${deptResult.error.issues[0]?.message}`,
      !tasksResult.success &&
        `tasks.json: ${tasksResult.error.issues[0]?.message}`,
      !wsResult.success &&
        `workspace.json: ${wsResult.error.issues[0]?.message}`,
    ].filter(Boolean);
    throw new Error(`データの形式が正しくありません:\n${errors.join("\n")}`);
  }

  return (
    <Workspace
      initialDepartments={deptResult.data}
      initialTasks={tasksResult.data}
      workspace={wsResult.data}
    />
  );
}
