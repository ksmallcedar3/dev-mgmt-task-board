import { describe, it, expect } from "vitest";

import {
  departmentsSchema,
  tasksSchema,
  workspaceSchema,
} from "@/lib/schema";

import positionsData from "@/data/positions.json";
import tasksData from "@/data/tasks.json";
import workspaceData from "@/data/workspace.json";

describe("data/*.json schema validation", () => {
  it("data/positions.json は departmentsSchema を満たす", () => {
    const result = departmentsSchema.safeParse(positionsData);
    expect(result.success).toBe(true);
  });

  it("data/tasks.json は tasksSchema を満たす", () => {
    const result = tasksSchema.safeParse(tasksData);
    expect(result.success).toBe(true);
  });

  it("data/workspace.json は workspaceSchema を満たす", () => {
    const result = workspaceSchema.safeParse(workspaceData);
    expect(result.success).toBe(true);
  });
});

describe("schema rejects invalid data", () => {
  it("departmentsSchema は配列を期待する", () => {
    expect(departmentsSchema.safeParse({}).success).toBe(false);
    expect(departmentsSchema.safeParse(null).success).toBe(false);
  });

  it("task は status が TaskStatus でないと不可", () => {
    expect(
      tasksSchema.safeParse([
        {
          id: "x",
          categoryId: "p-fe",
          title: "x",
          status: "unknown",
          nextAction: "",
          notes: [],
        },
      ]).success,
    ).toBe(false);
  });

  it("workspaceSchema は name と icon を要求する", () => {
    expect(workspaceSchema.safeParse({ name: "" }).success).toBe(false);
    expect(workspaceSchema.safeParse({ icon: "" }).success).toBe(false);
  });
});

describe("task.archived の取り扱い", () => {
  const baseTask = {
    id: "t-archived-test",
    categoryId: "p-fe",
    title: "テスト",
    status: "todo" as const,
    nextAction: "",
    notes: [] as string[],
  };

  it("archived 未指定なら false がデフォルトで埋まる", () => {
    const result = tasksSchema.safeParse([baseTask]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(false);
    }
  });

  it("archived: true を許容する", () => {
    const result = tasksSchema.safeParse([{ ...baseTask, archived: true }]);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data[0].archived).toBe(true);
    }
  });

  it("archived が boolean でなければ不可", () => {
    const result = tasksSchema.safeParse([
      { ...baseTask, archived: "yes" },
    ]);
    expect(result.success).toBe(false);
  });
});
