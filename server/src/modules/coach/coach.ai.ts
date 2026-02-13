import { env } from "../../config/env.js";
import type { CoachGoal } from "./coach.repo.js";
import { coachSummarySchema } from "./coach.validation.js";
import type { CoachMessageDto } from "./types.js";
import type { CoachSummary } from "./types.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const buildRewritePrompt = (summary: CoachSummary) => {
  const payload = {
    topPriorities: summary.topPriorities,
    risks: summary.risks,
    nextActions: summary.nextActions,
    confidence: summary.confidence,
  };

  return [
    "You are a concise execution writing assistant.",
    "Rewrite text fields for clarity and brevity.",
    "Do NOT change item count, ordering, goalId, category, severity, score, confidence values, or action intent.",
    "Do NOT add new items.",
    "Return valid JSON with this exact shape:",
    '{"topPriorities":[{"goalId":"uuid","title":"string","reason":"string","score":number}],"risks":[{"goalId":"uuid","title":"string","category":"schedule|execution|consistency","severity":"low|medium|high","reason":"string"}],"nextActions":[{"goalId":"uuid","action":"string","why":"string"}],"confidence":{"value":0,"band":"low|medium|high"}}',
    "Input JSON:",
    JSON.stringify(payload),
  ].join("\n");
};

const applyMeta = (rewritten: CoachSummary, base: CoachSummary): CoachSummary => ({
  ...rewritten,
  meta: {
    ...base.meta,
    source: "ai",
    generatedAt: new Date().toISOString(),
  },
});

export const rewriteSummaryWithAi = async (
  baseSummary: CoachSummary
): Promise<CoachSummary | null> => {
  if (!env.openRouterApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.clientOrigin,
        "X-Title": "Progress Tracker",
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You rewrite copy only. Never change structure, order, or numeric values.",
          },
          {
            role: "user",
            content: buildRewritePrompt(baseSummary),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const merged = {
      ...parsed,
      meta: {
        ...baseSummary.meta,
        source: "ai",
        generatedAt: new Date().toISOString(),
      },
    };

    const validated = coachSummarySchema.safeParse(merged);
    if (!validated.success) return null;

    const v = validated.data;

    const sameShape =
      v.topPriorities.length === baseSummary.topPriorities.length &&
      v.risks.length === baseSummary.risks.length &&
      v.nextActions.length === baseSummary.nextActions.length &&
      v.topPriorities.every((item, i) => item.goalId === baseSummary.topPriorities[i]?.goalId && item.score === baseSummary.topPriorities[i]?.score) &&
      v.risks.every((item, i) =>
        item.goalId === baseSummary.risks[i]?.goalId &&
        item.category === baseSummary.risks[i]?.category &&
        item.severity === baseSummary.risks[i]?.severity
      ) &&
      v.nextActions.every((item, i) => item.goalId === baseSummary.nextActions[i]?.goalId) &&
      v.confidence.value === baseSummary.confidence.value &&
      v.confidence.band === baseSummary.confidence.band;

    if (!sameShape) return null;

    return applyMeta(v, baseSummary);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const buildChatPrompt = (input: {
  goals: CoachGoal[];
  latestSummary: CoachSummary | null;
  history: CoachMessageDto[];
  userMessage: string;
}) => {
  const compactGoals = input.goals.slice(0, 12).map((goal) => ({
    id: goal.id,
    title: goal.title,
    status: goal.status,
    currentProgress: goal.currentProgress,
    targetDate: goal.targetDate,
    latestProgress: goal.progressEvents[0]
      ? {
          value: goal.progressEvents[0].value,
          createdAt: goal.progressEvents[0].createdAt,
          note: goal.progressEvents[0].note,
        }
      : null,
    nextMilestone:
      goal.milestones.find((milestone) => !milestone.completed)?.title ?? null,
    tags: goal.goalTags.map((goalTag) => goalTag.tag.name),
  }));

  return [
    "You are a personalized execution coach.",
    "Use only the provided user data context. Be concise and specific.",
    "Always provide practical next steps tied to the user's goals.",
    "Do not mention data that is not in context.",
    "Context goals:",
    JSON.stringify(compactGoals),
    "Latest coach summary (if any):",
    JSON.stringify(input.latestSummary),
    "Recent conversation history:",
    JSON.stringify(input.history.slice(-12)),
    "User message:",
    input.userMessage,
  ].join("\n");
};

export const generateCoachChatReply = async (input: {
  goals: CoachGoal[];
  latestSummary: CoachSummary | null;
  history: CoachMessageDto[];
  userMessage: string;
}): Promise<string | null> => {
  if (!env.openRouterApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.clientOrigin,
        "X-Title": "Progress Tracker",
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are an execution-first personal coach. Keep replies under 180 words and action-oriented.",
          },
          {
            role: "user",
            content: buildChatPrompt(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    return content;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const extractStreamToken = (line: string): string | null => {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return null;
  const payload = trimmed.slice("data:".length).trim();
  if (!payload || payload === "[DONE]") return null;

  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.delta?.content ?? parsed.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
};

export const generateCoachChatReplyStream = async (
  input: {
    goals: CoachGoal[];
    latestSummary: CoachSummary | null;
    history: CoachMessageDto[];
    userMessage: string;
  },
  onToken: (token: string) => void
): Promise<string | null> => {
  if (!env.openRouterApiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.openRouterApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.clientOrigin,
        "X-Title": "Progress Tracker",
      },
      body: JSON.stringify({
        model: env.openRouterModel,
        temperature: 0.3,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are an execution-first personal coach. Keep replies under 180 words and action-oriented.",
          },
          {
            role: "user",
            content: buildChatPrompt(input),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) return null;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let raw = "";
    let content = "";
    let tokenCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      raw += chunk;
      buffer += chunk;

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const token = extractStreamToken(line);
        if (!token) continue;
        content += token;
        tokenCount += 1;
        onToken(token);
      }
    }

    const tailToken = extractStreamToken(buffer);
    if (tailToken) {
      content += tailToken;
      tokenCount += 1;
      onToken(tailToken);
    }

    if (tokenCount === 0) {
      try {
        const parsed = JSON.parse(raw) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const fallbackContent = parsed.choices?.[0]?.message?.content?.trim();
        if (fallbackContent) {
          const chunks = fallbackContent.split(/(\s+)/).filter((part) => part.length > 0);
          for (const chunk of chunks) {
            onToken(chunk);
          }
          return fallbackContent;
        }
      } catch {
        // no-op: keep null fallback below
      }
    }

    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};
