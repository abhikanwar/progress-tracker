import type { Goal } from "./goals";

export type GoalTemplateMilestone = {
  id: string;
  templateId: string;
  title: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalTemplateTag = {
  id: string;
  templateId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type GoalTemplate = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category: string;
  defaultTargetDays?: number | null;
  createdAt: string;
  updatedAt: string;
  milestones: GoalTemplateMilestone[];
  tags: GoalTemplateTag[];
};

export type ApplyTemplateInput = {
  titleOverride?: string;
  detailsOverride?: string;
  targetDateOverride?: string;
};

export type ApplyTemplateResponse = Goal;
