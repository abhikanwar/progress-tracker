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
};

export type CoachChatReplyDto = {
  conversation: CoachConversationDto;
  userMessage: CoachMessageDto;
  assistantMessage: CoachMessageDto;
};
