import { type Task, type TaskStatus } from "@/lib/schema";
import {
  type Profile,
  type Scorecard,
  type StageKey,
} from "@/lib/recruiting-schema";
import { STAGE_LABELS } from "@/lib/labels";

/**
 * 未作成ステージをクリックした時に Workspace が自動生成するための最小 Scorecard。
 * （採用ドメインのユニットテスト・レガシー計算用）
 */
export function createMinimalScorecard(stage: StageKey): Scorecard {
  return {
    stage,
    label: STAGE_LABELS[stage],
    date: "",
    format: "",
    interviewer: "",
    axisScores: {
      achievements: null,
      thinkingAbility: null,
      communication: null,
      cultureFit: null,
    },
    attachments: [],
  };
}

export function createMinimalProfile(name: string): Profile {
  return {
    name,
    birthday: "",
    source: "",
    email: "",
    phone: "",
    address: "",
    recruiter: "",
    desiredSalaryMin: "",
    desiredSalaryMax: "",
    availableStartDate: "",
    careerText: "",
    motivationFull: "",
  };
}

export function createMinimalTask(
  categoryId: string,
  title: string,
  status: TaskStatus = "todo",
  subCategory?: string,
): Task {
  return {
    id: `t-${Date.now()}`,
    categoryId,
    title,
    status,
    subCategory: subCategory || undefined,
    statusDetail: "",
    nextAction: "",
    priority: false,
    notes: [],
    archived: false,
  };
}

/** 既存タスクを複製。構造・担当・期日は引き継ぎ、進捗系はリセットする */
export function duplicateTask(source: Task): Task {
  return {
    id: `t-${Date.now()}`,
    categoryId: source.categoryId,
    title: source.title,
    status: "todo",
    subCategory: source.subCategory,
    assignee: source.assignee,
    startDate: source.startDate,
    dueDate: source.dueDate,
    statusDetail: "",
    issue: undefined,
    nextAction: "",
    priority: false,
    notes: [],
    archived: false,
  };
}
