export type GoalStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED";

export type ProgressEvent = {
  id: string;
  goalId: string;
  value: number;
  note?: string | null;
  createdAt: string;
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
