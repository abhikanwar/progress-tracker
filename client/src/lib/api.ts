import type { Goal, GoalInput, GoalUpdate, ProgressEvent, ProgressInput } from "../types/goals";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
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
};
