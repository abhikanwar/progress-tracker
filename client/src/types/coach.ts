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
};

export type CoachChatReply = {
  conversation: CoachConversation;
  userMessage: CoachChatMessage;
  assistantMessage: CoachChatMessage;
};
