export const queryKeys = {
  goals: {
    list: () => ["goals"] as const,
    tags: () => ["goals", "tags"] as const,
  },
  auth: {
    me: () => ["auth", "me"] as const,
  },
  settings: {
    profile: () => ["settings", "profile"] as const,
  },
  templates: {
    list: (filters?: { category?: string; search?: string }) =>
      ["goal-templates", filters?.category ?? "", filters?.search ?? ""] as const,
  },
  coach: {
    insight: () => ["coach", "insight"] as const,
    completionRate: (windowDays = 7) => ["coach", "completion-rate", windowDays] as const,
    conversations: () => ["coach", "chat", "conversations"] as const,
    messages: (conversationId: string) => ["coach", "chat", "messages", conversationId] as const,
  },
};
