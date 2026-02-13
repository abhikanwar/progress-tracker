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

export type CoachSummary = {
  topPriorities: CoachPriorityItem[];
  risks: CoachRiskItem[];
  nextActions: CoachActionItem[];
  confidence: {
    value: number;
    band: "low" | "medium" | "high";
  };
  meta: {
    generatedAt: string;
    source: CoachSource;
    engineVersion: string;
    dataWindowDays: number;
  };
};

export type CoachInsight = {
  id: string;
  source: CoachSource;
  summary: CoachSummary;
  createdAt: string;
  expiresAt: string;
};

export type CoachCompletionRate = {
  windowDays: number;
  suggestedActions: number;
  completedActions: number;
  rate: number;
};

export type CoachChatRole = "user" | "assistant";

export type CoachActionType = "create_goal" | "delete_goal" | "update_goal";

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

type CoachActionProposalBase = {
  id: string;
  label: string;
  riskLevel: "low" | "high";
  expiresAt: string;
  status: "pending" | "executed" | "expired" | "cancelled";
};

export type CoachActionProposal =
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

export type CoachConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type CoachChatMessage = {
  id: string;
  conversationId: string;
  role: CoachChatRole;
  content: string;
  createdAt: string;
  proposedActions?: CoachActionProposal[];
};

export type CoachChatReply = {
  conversation: CoachConversation;
  userMessage: CoachChatMessage;
  assistantMessage: CoachChatMessage;
  proposedActions: CoachActionProposal[];
};

export type ExecuteCoachActionInput = {
  proposalId: string;
  confirmText?: string;
};

export type ExecuteCoachActionResult = {
  resultType: "goal_created" | "goal_deleted" | "goal_updated";
  proposalStatus: "executed";
  goal?: Goal;
  goalId?: string;
  undoExpiresAt?: string;
};

export type UndoCoachActionInput = {
  proposalId: string;
};
import type { Goal } from "./goals";
