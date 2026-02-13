export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type ProgressEvent = {
  id: string;
  goalId: string;
  value: number;
  note?: string | null;
  createdAt: string;
};

export type GoalMilestone = {
  id: string;
  goalId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Tag = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export type GoalTag = {
  id: string;
  goalId: string;
  tagId: string;
  createdAt: string;
  tag: Tag;
};

export type Goal = {
  id: string;
  title: string;
  details?: string | null;
  status: GoalStatus;
  targetDate?: string | null;
  currentProgress: number;
  createdAt: string;
  updatedAt: string;
  progressEvents: ProgressEvent[];
  milestones: GoalMilestone[];
  goalTags: GoalTag[];
};

export type GoalInput = {
  title: string;
  details?: string;
  targetDate?: string;
};

export type GoalUpdate = Partial<GoalInput> & {
  status?: GoalStatus;
  currentProgress?: number;
};

export type ProgressInput = {
  value: number;
  note?: string;
};

export type MilestoneInput = {
  title: string;
};

export type MilestoneUpdate = {
  title?: string;
  completed?: boolean;
};
