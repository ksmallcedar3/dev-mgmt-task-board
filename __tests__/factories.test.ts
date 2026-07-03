import { describe, it, expect } from "vitest";

import { duplicateTask } from "@/lib/data/factories";
import { type Task } from "@/lib/schema";

const source: Task = {
  id: "t-1",
  categoryId: "cat-a",
  title: "週次報告を作成する",
  status: "in_progress",
  subCategory: "定例業務",
  assignee: "山田",
  startDate: "2026-06-01",
  dueDate: "2026-06-30",
  statusDetail: "80%完了",
  issue: "承認待ち",
  nextAction: "課長に確認",
  priority: true,
  notes: ["6/1 着手"],
  archived: false,
};

describe("duplicateTask", () => {
  it("構造・担当・期日は引き継ぎ、進捗系はリセットする", () => {
    const copy = duplicateTask(source);

    expect(copy.id).not.toBe(source.id);
    expect(copy.categoryId).toBe(source.categoryId);
    expect(copy.title).toBe(source.title);
    expect(copy.subCategory).toBe(source.subCategory);
    expect(copy.assignee).toBe(source.assignee);
    expect(copy.startDate).toBe(source.startDate);
    expect(copy.dueDate).toBe(source.dueDate);

    expect(copy.status).toBe("todo");
    expect(copy.statusDetail).toBe("");
    expect(copy.issue).toBeUndefined();
    expect(copy.nextAction).toBe("");
    expect(copy.priority).toBe(false);
    expect(copy.notes).toEqual([]);
    expect(copy.archived).toBe(false);
  });
});
