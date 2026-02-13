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
};
