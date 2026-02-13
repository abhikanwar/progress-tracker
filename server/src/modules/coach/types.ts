export type CoachSource = "ai" | "rules";

export type CoachPriorityItem = {
  goalId: string;
  title: string;
  reason: string;
  score: number;
};

export type CoachRiskSeverity = "low" | "medium" | "high";

export type CoachRiskItem = {
  goalId: string;
  title: string;
  category: "schedule" | "execution" | "consistency";
  severity: CoachRiskSeverity;
  reason: string;
};

export type CoachActionItem = {
  goalId: string;
  action: string;
  why: string;
};

export type CoachConfidenceBand = "low" | "medium" | "high";

export type CoachSummary = {
  topPriorities: CoachPriorityItem[];
  risks: CoachRiskItem[];
  nextActions: CoachActionItem[];
  confidence: {
    value: number;
    band: CoachConfidenceBand;
  };
  meta: {
    generatedAt: string;
    source: CoachSource;
    engineVersion: string;
    dataWindowDays: number;
  };
};

export type CoachInsightDto = {
  id: string;
  source: CoachSource;
  summary: CoachSummary;
  createdAt: string;
  expiresAt: string;
};

export type CoachActionCompletionRate = {
  windowDays: number;
  suggestedActions: number;
  completedActions: number;
  rate: number;
};

export type CoachChatRole = "user" | "assistant";

export type CoachActionType = "create_goal" | "delete_goal" | "update_goal";

export type CoachActionRiskLevel = "low" | "high";

export type CoachCreateGoalActionPayload = {
  title: string;
  details?: string;
  targetDate?: string;
};

export type CoachDeleteGoalActionPayload = {
  goalId: string;
  goalTitle: string;
  previousStatus?: "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

export type CoachUpdateGoalActionPayload = {
  goalId: string;
  goalTitle: string;
  title?: string;
  details?: string;
  targetDate?: string;
};

export type CoachActionProposalPayload =
  | CoachCreateGoalActionPayload
  | CoachDeleteGoalActionPayload
  | CoachUpdateGoalActionPayload;

type CoachActionProposalBase = {
  id: string;
  label: string;
  riskLevel: CoachActionRiskLevel;
  expiresAt: string;
  status: "pending" | "executed" | "expired" | "cancelled";
};

export type CoachActionProposalDto =
  | (CoachActionProposalBase & {
      type: "create_goal";
      payload: CoachCreateGoalActionPayload;
    })
  | (CoachActionProposalBase & {
      type: "delete_goal";
      payload: CoachDeleteGoalActionPayload;
    })
  | (CoachActionProposalBase & {
      type: "update_goal";
      payload: CoachUpdateGoalActionPayload;
    });

export type CoachConversationDto = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type CoachMessageDto = {
  id: string;
  conversationId: string;
  role: CoachChatRole;
  content: string;
  createdAt: string;
  proposedActions?: CoachActionProposalDto[];
};

export type CoachChatReplyDto = {
  conversation: CoachConversationDto;
  userMessage: CoachMessageDto;
  assistantMessage: CoachMessageDto;
  proposedActions: CoachActionProposalDto[];
};

export type ExecuteCoachActionResultDto = {
  resultType: "goal_created" | "goal_deleted" | "goal_updated";
  proposalStatus: "executed";
  goal?: unknown;
  goalId?: string;
  undoExpiresAt?: string;
};
