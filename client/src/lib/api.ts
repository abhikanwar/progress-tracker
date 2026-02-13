import type {
  Goal,
  GoalInput,
  GoalMilestone,
  GoalTag,
  Tag,
  GoalUpdate,
  MilestoneInput,
  MilestoneUpdate,
  ProgressEvent,
  ProgressInput,
} from "../types/goals";
import type { ApplyTemplateInput, ApplyTemplateResponse, GoalTemplate } from "../types/templates";
import type {
  ExecuteCoachActionInput,
  ExecuteCoachActionResult,
  UndoCoachActionInput,
  CoachChatMessage,
  CoachChatReply,
  CoachCompletionRate,
  CoachConversation,
  CoachInsight,
} from "../types/coach";
import { authStorage } from "./auth";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const token = authStorage.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new ApiError(res.status, message || res.statusText);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
};

export const goalsApi = {
  list: () => apiFetch<Goal[]>("/goals"),
  create: (payload: GoalInput) =>
    apiFetch<Goal>("/goals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: GoalUpdate) =>
    apiFetch<Goal>(`/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    apiFetch<void>(`/goals/${id}`, {
      method: "DELETE",
    }),
  addProgress: (id: string, payload: ProgressInput) =>
    apiFetch<ProgressEvent>(`/goals/${id}/progress`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addMilestone: (id: string, payload: MilestoneInput) =>
    apiFetch<GoalMilestone>(`/goals/${id}/milestones`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateMilestone: (goalId: string, milestoneId: string, payload: MilestoneUpdate) =>
    apiFetch<GoalMilestone>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  removeMilestone: (goalId: string, milestoneId: string) =>
    apiFetch<void>(`/goals/${goalId}/milestones/${milestoneId}`, {
      method: "DELETE",
    }),
  listTags: () => apiFetch<Tag[]>("/goals/tags"),
  addTag: (goalId: string, name: string) =>
    apiFetch<GoalTag>(`/goals/${goalId}/tags`, {
      method: "POST",
      body: JSON.stringify({ name }),
    }),
  removeTag: (goalId: string, tagId: string) =>
    apiFetch<void>(`/goals/${goalId}/tags/${tagId}`, {
      method: "DELETE",
    }),
};

export const authApi = {
  register: (payload: { email: string; password: string }) =>
    apiFetch<{ token: string; user: { id: string; email: string } }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
  login: (payload: { email: string; password: string }) =>
    apiFetch<{ token: string; user: { id: string; email: string } }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    ),
  me: () =>
    apiFetch<{ id: string; email: string; createdAt: string }>("/auth/me"),
  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiFetch<void>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const goalTemplatesApi = {
  list: (params?: { category?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.set("category", params.category);
    if (params?.search) queryParams.set("search", params.search);

    const query = queryParams.toString();
    return apiFetch<GoalTemplate[]>(`/goal-templates${query ? `?${query}` : ""}`);
  },
  apply: (templateId: string, payload: ApplyTemplateInput) =>
    apiFetch<ApplyTemplateResponse>(`/goal-templates/${templateId}/apply`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};

export const coachApi = {
  getInsight: () => apiFetch<CoachInsight | undefined>("/coach/insight"),
  generateInsight: () =>
    apiFetch<CoachInsight>("/coach/insight/generate", {
      method: "POST",
    }),
  completeAction: (goalId: string, insightId: string) =>
    apiFetch<void>(`/coach/actions/${goalId}/complete`, {
      method: "POST",
      body: JSON.stringify({ insightId }),
    }),
  getCompletionRate: (windowDays = 7) =>
    apiFetch<CoachCompletionRate>(`/coach/actions/completion-rate?windowDays=${windowDays}`),
  listConversations: () => apiFetch<CoachConversation[]>("/coach/chat/conversations"),
  listMessages: (conversationId: string) =>
    apiFetch<CoachChatMessage[]>(`/coach/chat/conversations/${conversationId}/messages`),
  sendMessage: (payload: { conversationId?: string; message: string }) =>
    apiFetch<CoachChatReply>("/coach/chat/message", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  sendMessageStream: async (input: {
    conversationId?: string;
    message: string;
    onToken?: (token: string) => void;
    signal?: AbortSignal;
  }) => {
    const token = authStorage.getToken();
    const res = await fetch(`${API_URL}/coach/chat/message/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        conversationId: input.conversationId,
        message: input.message,
      }),
      signal: input.signal,
    });

    if (!res.ok || !res.body) {
      const message = await res.text();
      throw new ApiError(res.status, message || "Failed to stream coach message");
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalReply: CoachChatReply | null = null;

    const parseEvent = (chunk: string) => {
      const lines = chunk.split(/\r?\n/);
      let event = "message";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith("event:")) {
          event = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          const value = line.startsWith("data: ") ? line.slice(6) : line.slice(5);
          dataLines.push(value);
        }
      }

      return { event, data: dataLines.join("\n") };
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const rawEvent of events) {
        if (!rawEvent.trim()) continue;
        const { event, data } = parseEvent(rawEvent);
        if (!data) continue;

        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (event === "token") {
          const tokenValue = parsed.token;
          if (typeof tokenValue === "string") {
            input.onToken?.(tokenValue);
          }
        } else if (event === "done") {
          finalReply = parsed as unknown as CoachChatReply;
        } else if (event === "error") {
          const message =
            typeof parsed.error === "string" ? parsed.error : "Coach stream failed";
          throw new Error(message);
        }
      }
    }

    if (!finalReply) {
      throw new Error("Coach stream ended without a final reply");
    }

    return finalReply;
  },
  executeChatAction: (payload: ExecuteCoachActionInput) =>
    apiFetch<ExecuteCoachActionResult>(`/coach/chat/actions/${payload.proposalId}/execute`, {
      method: "POST",
      body: JSON.stringify({ confirmText: payload.confirmText }),
    }),
  undoChatAction: (payload: UndoCoachActionInput) =>
    apiFetch<ExecuteCoachActionResult>(`/coach/chat/actions/${payload.proposalId}/undo`, {
      method: "POST",
    }),
};
