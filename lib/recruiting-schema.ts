/**
 * 採用管理ドメイン（レガシー）。`lib/computed/scorecards.ts` と Vitest 向けに保持。
 * アプリのワークスペース UI は `lib/schema.ts` のタスクドメインを使用する。
 */

import { z } from "zod";

export const profileSchema = z.object({
  name: z.string(),
  birthday: z.string(),
  source: z.string(),
  email: z.string(),
  phone: z.string(),
  address: z.string(),
  recruiter: z.string(),
  desiredSalaryMin: z.string(),
  desiredSalaryMax: z.string(),
  availableStartDate: z.string(),
  careerText: z.string(),
  motivationFull: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

export const axisKeySchema = z.enum([
  "achievements",
  "thinkingAbility",
  "communication",
  "cultureFit",
]);
export type AxisKey = z.infer<typeof axisKeySchema>;

export const axisScoresSchema = z.object({
  achievements: z.number().nullable(),
  thinkingAbility: z.number().nullable(),
  communication: z.number().nullable(),
  cultureFit: z.number().nullable(),
});
export type AxisScores = z.infer<typeof axisScoresSchema>;

export const AXIS_ORDER = axisKeySchema.options;

export const stageKeySchema = z.enum(["screening", "first", "second", "final"]);
export type StageKey = z.infer<typeof stageKeySchema>;

export const stageStatusSchema = z.enum(["done", "planned", "pending"]);
export type StageStatus = z.infer<typeof stageStatusSchema>;

const txtAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("txt"),
  name: z.string(),
  size: z.string(),
  previewText: z.string(),
});
const pdfAttachmentSchema = z.object({
  id: z.string(),
  kind: z.literal("pdf"),
  name: z.string(),
  size: z.string(),
});
export const attachmentSchema = z.discriminatedUnion("kind", [
  txtAttachmentSchema,
  pdfAttachmentSchema,
]);
export type Attachment = z.infer<typeof attachmentSchema>;

export const scorecardSchema = z.object({
  stage: stageKeySchema,
  label: z.string(),
  date: z.string(),
  format: z.string(),
  interviewer: z.string(),
  decision: z.string().optional(),
  comment: z.string().optional(),
  summary: z.string().optional(),
  axisScores: axisScoresSchema,
  attachments: z.array(attachmentSchema),
});
export type Scorecard = z.infer<typeof scorecardSchema>;

export const STAGE_ORDER = stageKeySchema.options;

export const candidateSchema = z.object({
  id: z.string(),
  profile: profileSchema,
  scorecards: z.array(scorecardSchema),
  stage: stageKeySchema,
  archived: z.boolean().default(false),
});
export type Candidate = z.infer<typeof candidateSchema>;

export const candidatesSchema = z.array(candidateSchema);

export type SelectedDetail =
  | { type: "stage"; stage: StageKey }
  | null;

export type CandidateRow = {
  id: string;
  name: string;
  averageScore: number | null;
};

export type Group =
  | { kind: "stage"; stage: StageKey; label: string; items: CandidateRow[] }
  | { kind: "archived"; label: string; items: CandidateRow[] };
