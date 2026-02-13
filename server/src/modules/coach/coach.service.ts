import { env } from "../../config/env.js";
import { randomUUID } from "node:crypto";
import { coachRepo } from "./coach.repo.js";
import {
  generateCoachChatReply,
  generateCoachChatReplyStream,
  rewriteSummaryWithAi,
} from "./coach.ai.js";
import { buildRulesSummary } from "./coach.rules.js";
import type {
  CoachActionProposalDto,
  CoachChatReplyDto,
  CoachInsightDto,
  CoachSummary,
  ExecuteCoachActionResultDto,
} from "./types.js";

const getExpiry = () => {
  const now = new Date();
  now.setHours(now.getHours() + Math.max(env.coachCacheTtlHours, 1));
  return now;
};

const actionProposalTtlMs = 15 * 60 * 1000;

const normalize = (value: string) => value.trim().toLowerCase();

const stripPolitePrefix = (value: string): string => {
  const patterns = [
    /^\s*(hi|hey|hello)\b[,\s-]*/i,
    /^\s*(please)\b[,\s-]*/i,
    /^\s*(can you|could you|would you|will you)\b[,\s-]*/i,
    /^\s*(i need to|i want to|i'd like to|i would like to)\b[,\s-]*/i,
  ];

  let next = value.trim();
  for (const pattern of patterns) {
    next = next.replace(pattern, "").trim();
  }
  return next;
};

const parseRelativeTargetDate = (message: string): string | undefined => {
  const match = message.match(
    /\bin\s+(\d{1,3})\s*(day|days|week|weeks|month|months)\b/i
  );
  if (!match) return undefined;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const unit = normalize(match[2]);
  const now = new Date();
  const target = new Date(now);

  if (unit.startsWith("day")) {
    target.setDate(target.getDate() + amount);
  } else if (unit.startsWith("week")) {
    target.setDate(target.getDate() + amount * 7);
  } else {
    target.setMonth(target.getMonth() + amount);
  }

  return target.toISOString();
};

const normalizeGoalTitle = (value: string): string => {
  return value
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/^(called|named)\s+/i, "")
    .replace(/\bin\s+\d{1,3}\s*(day|days|week|weeks|month|months)\b.*$/i, "")
    .replace(/[.?!]+$/g, "")
    .trim();
};

type GoalLite = {
  id: string;
  title: string;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
};

type AmbiguityIntent = "delete_goal" | "update_goal";

const extractQuoted = (value: string): string | null => {
  const match = value.match(/["']([^"']{2,})["']/);
  return match?.[1]?.trim() ?? null;
};

const parseFollowUpIntent = (message: string, history: Array<{ role: string; content: string }>): AmbiguityIntent | null => {
  const quoted = extractQuoted(message);
  if (!quoted) return null;

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index];
    if (item.role !== "assistant") continue;
    const content = normalize(item.content);
    if (content.includes("[intent:delete_goal]")) return "delete_goal";
    if (content.includes("[intent:update_goal]")) return "update_goal";
    if (content.includes("i can delete that goal")) return "delete_goal";
    if (content.includes("i can update that goal")) return "update_goal";
    break;
  }

  return null;
};

const maybeBuildCreateProposal = (message: string): CoachActionProposalDto | null => {
  const text = stripPolitePrefix(message);
  const lowered = normalize(text);

  const hasIntent =
    /\b(create|add|start|set up|setup)\b/.test(lowered) &&
    /\bgoal\b/.test(lowered);
  if (!hasIntent) return null;

  const patterns = [
    /\b(?:create|add|start|set up|setup)\b\s+(?:a\s+)?(?:new\s+)?goal(?:\s+(?:called|named))?\s+(.+)/i,
    /\bgoal\s+(?:called|named)\s+(.+)/i,
    /\bgoal\s+to\s+(.+)/i,
  ];

  let rawTitle = "";
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      rawTitle = match[1].trim();
      break;
    }
  }

  if (!rawTitle) {
    rawTitle = text;
  }

  rawTitle = normalizeGoalTitle(rawTitle);

  if (!rawTitle) return null;

  const title = rawTitle.slice(0, 120);
  const targetDate = parseRelativeTargetDate(text);

  return {
    id: randomUUID(),
    type: "create_goal",
    label: `Create goal: ${title}`,
    payload: {
      title,
      ...(targetDate ? { targetDate } : {}),
    },
    riskLevel: "low",
    expiresAt: new Date(Date.now() + actionProposalTtlMs).toISOString(),
    status: "pending",
  };
};

const maybeBuildDeleteProposal = (
  message: string,
  goals: GoalLite[],
  forceIntent = false
): { proposal: CoachActionProposalDto | null; ambiguityMessage?: string } => {
  const text = stripPolitePrefix(message);
  const lowered = normalize(text);
  const hasIntent =
    forceIntent || (/\b(delete|remove)\b/.test(lowered) && /\bgoal\b/.test(lowered));
  if (!hasIntent) return { proposal: null };

  const quoted = text.match(/["']([^"']{2,})["']/);
  const requested = normalize(quoted?.[1] ?? "");

  const matchingGoals = requested
    ? goals.filter((goal) => normalize(goal.title) === requested)
    : goals.filter((goal) => lowered.includes(normalize(goal.title)));

  if (matchingGoals.length !== 1) {
    const suggestions = goals
      .filter((goal) => {
        if (!requested) return true;
        return normalize(goal.title).includes(requested) || requested.includes(normalize(goal.title));
      })
      .slice(0, 5)
      .map((goal) => `- ${goal.title}`);

    const ambiguityMessage =
      suggestions.length > 0
        ? `I can delete that goal after confirmation, but I found multiple matches. Reply with the exact title in quotes.\n${suggestions.join("\n")}\n[intent:delete_goal]`
        : "I can delete goals, but I could not find an exact match. Reply with the exact goal title in quotes.\n[intent:delete_goal]";

    return { proposal: null, ambiguityMessage };
  }

  const targetGoal = matchingGoals[0];
  return {
    proposal: {
      id: randomUUID(),
      type: "delete_goal",
      label: `Delete goal: ${targetGoal.title}`,
      payload: {
        goalId: targetGoal.id,
        goalTitle: targetGoal.title,
        previousStatus: targetGoal.status,
      },
      riskLevel: "high",
      expiresAt: new Date(Date.now() + actionProposalTtlMs).toISOString(),
      status: "pending",
    },
  };
};

const maybeBuildUpdateProposal = (
  message: string,
  goals: GoalLite[],
  forceIntent = false
): { proposal: CoachActionProposalDto | null; ambiguityMessage?: string } => {
  const text = stripPolitePrefix(message);
  const lowered = normalize(text);
  const hasIntent =
    forceIntent || /\b(update|edit|rename|change)\b/.test(lowered);
  if (!hasIntent) return { proposal: null };

  const quotedParts = [...text.matchAll(/["']([^"']{2,})["']/g)].map((match) =>
    match[1].trim()
  );

  let targetTitle = quotedParts[0] ?? "";
  let nextTitle = quotedParts[1] ?? "";

  if (!targetTitle) {
    const mentionedGoals = goals
      .filter((goal) => lowered.includes(normalize(goal.title)))
      .sort((a, b) => b.title.length - a.title.length);
    if (mentionedGoals.length === 1) {
      targetTitle = mentionedGoals[0].title;
    } else if (mentionedGoals.length > 1) {
      const suggestions = mentionedGoals.slice(0, 5).map((goal) => `- ${goal.title}`);
      return {
        proposal: null,
        ambiguityMessage:
          `I can update that goal, but I found multiple matches. Reply with the exact title in quotes and what to change.\n${suggestions.join("\n")}\n[intent:update_goal]`,
      };
    }
  }

  const requested = normalize(targetTitle);
  const matchingGoals = requested
    ? goals.filter((goal) => normalize(goal.title) === requested)
    : [];

  if (matchingGoals.length !== 1) {
    const suggestions = goals
      .filter((goal) => !requested || normalize(goal.title).includes(requested))
      .slice(0, 5)
      .map((goal) => `- ${goal.title}`);

    const ambiguityMessage =
      suggestions.length > 0
        ? `I can update that goal, but I found multiple matches. Reply with the exact title in quotes and what to change.\n${suggestions.join("\n")}\n[intent:update_goal]`
        : "I can update goals, but I could not find an exact match. Reply with the exact goal title in quotes and what to change.\n[intent:update_goal]";
    return { proposal: null, ambiguityMessage };
  }

  const titleFromRenamePattern =
    text.match(/\b(?:rename|title)\s*(?:to|=|:)?\s*["']?([^"';,\n]{2,120})["']?/i)?.[1]?.trim() ??
    text.match(/\b(?:change)\b.+\bto\b\s+["']?([^"';,\n]{2,120})["']?/i)?.[1]?.trim() ??
    "";
  const details =
    text.match(
      /\b(?:details?|description|notes?)\s*(?:to|=|:)\s*["']?(.+?)["']?(?=(?:\s+\b(?:target\s*date|due|rename|title)\b|$))/i
    )?.[1]?.trim() ?? undefined;
  const targetDateRaw =
    text.match(/\btarget\s*date\s*(?:to|=|:)?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ??
    undefined;
  const dueDateRaw =
    text.match(/\bdue\s*(?:on|by)?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? undefined;
  const relativeDateFragment =
    text.match(/\b(?:target\s*date|due)\s*(?:to|=|:|on|by)?\s*(in\s+\d{1,3}\s*(?:day|days|week|weeks|month|months))/i)?.[1] ??
    undefined;
  const targetDate = targetDateRaw
    ? new Date(`${targetDateRaw}T00:00:00.000Z`).toISOString()
    : dueDateRaw
      ? new Date(`${dueDateRaw}T00:00:00.000Z`).toISOString()
      : relativeDateFragment
        ? parseRelativeTargetDate(relativeDateFragment)
        : undefined;

  if (!nextTitle && titleFromRenamePattern) {
    nextTitle = titleFromRenamePattern;
  }

  const updates = {
    ...(nextTitle ? { title: normalizeGoalTitle(nextTitle).slice(0, 120) } : {}),
    ...(details ? { details: details.slice(0, 2000) } : {}),
    ...(targetDate ? { targetDate } : {}),
  };

  if (
    updates.title === undefined &&
    updates.details === undefined &&
    updates.targetDate === undefined
  ) {
    return {
      proposal: null,
      ambiguityMessage:
        `I found "${matchingGoals[0].title}", but I need the change details. Example: "Update goal \\"${matchingGoals[0].title}\\" to \\"New Title\\"".\n[intent:update_goal]`,
    };
  }

  return {
    proposal: {
      id: randomUUID(),
      type: "update_goal",
      label: `Update goal: ${matchingGoals[0].title}`,
      payload: {
        goalId: matchingGoals[0].id,
        goalTitle: matchingGoals[0].title,
        ...updates,
      },
      riskLevel: "low",
      expiresAt: new Date(Date.now() + actionProposalTtlMs).toISOString(),
      status: "pending",
    },
  };
};

const parseServiceError = (error: unknown) => {
  const message = error instanceof Error ? error.message : "Unexpected error";
  const [code, ...rest] = message.split(":");
  if (rest.length === 0) {
    return { code: "INTERNAL", message };
  }
  return {
    code,
    message: rest.join(":").trim() || "Unexpected error",
  };
};

const removeIntentMarkers = (value: string) =>
  value.replace(/\n?\[intent:(delete_goal|update_goal)\]\s*/gi, "").trim();

const buildFallbackReply = (goals: Awaited<ReturnType<typeof coachRepo.getGoalsForCoach>>) => {
  const fallbackSummary: CoachSummary = buildRulesSummary(goals);
  return fallbackSummary.nextActions.length > 0
    ? `Focus this week on: ${fallbackSummary.nextActions
        .slice(0, 3)
        .map((action, index) => `${index + 1}) ${action.action}`)
        .join(" ")}`
    : "Start with one 30-minute planning block and define your next concrete milestone.";
};

const prepareChatContext = async (userId: string, input: { conversationId?: string; message: string }) => {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Message is required");
  }

  const conversation =
    input.conversationId
      ? await coachRepo.getConversationById(userId, input.conversationId)
      : null;

  const targetConversation =
    conversation ?? (await coachRepo.createConversation(userId, message.slice(0, 60)));

  const userMessage = await coachRepo.addMessage(userId, targetConversation.id, {
    role: "user",
    content: message,
  });

  const goals = await coachRepo.getGoalsForCoach(userId);
  const latestInsight = await coachRepo.getLatestValidInsight(userId, new Date());
  const history = await coachRepo.listMessages(userId, targetConversation.id);

  const followUpIntent = parseFollowUpIntent(message, history);
  const goalCandidates = goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    status: goal.status,
  }));

  const createProposal = maybeBuildCreateProposal(message);
  const deleteProposalResult = maybeBuildDeleteProposal(
    message,
    goalCandidates,
    followUpIntent === "delete_goal"
  );
  const updateProposalResult = maybeBuildUpdateProposal(
    message,
    goalCandidates,
    followUpIntent === "update_goal"
  );
  const proposedActions = [createProposal, updateProposalResult.proposal, deleteProposalResult.proposal].filter(
    (proposal): proposal is CoachActionProposalDto => proposal !== null
  );

  const ambiguityMessage =
    deleteProposalResult.ambiguityMessage ?? updateProposalResult.ambiguityMessage;

  return {
    message,
    targetConversation,
    userMessage,
    goals,
    latestInsight,
    history,
    proposedActions,
    ambiguityMessage,
  };
};

const persistAssistantReply = async (
  userId: string,
  input: {
    conversationId: string;
    assistantContent: string;
    proposedActions: CoachActionProposalDto[];
  }
) => {
  const assistantMessage = await coachRepo.addMessage(userId, input.conversationId, {
    role: "assistant",
    content: input.assistantContent,
  });

  const persistedProposals = await coachRepo.createActionProposals(userId, {
    conversationId: input.conversationId,
    messageId: assistantMessage.id,
    proposals: input.proposedActions.map((proposal) => ({
      type: proposal.type,
      label: proposal.label,
      payload: proposal.payload,
      riskLevel: proposal.riskLevel,
      expiresAt: new Date(proposal.expiresAt),
    })),
  });

  return {
    ...assistantMessage,
    proposedActions: persistedProposals,
  };
};

export const coachService = {
  getInsight: (userId: string): Promise<CoachInsightDto | null> =>
    coachRepo.getLatestValidInsight(userId, new Date()),

  generateInsight: async (userId: string): Promise<CoachInsightDto> => {
    const goals = await coachRepo.getGoalsForCoach(userId);
    const rulesSummary = buildRulesSummary(goals);
    const aiSummary = await rewriteSummaryWithAi(rulesSummary);
    const summary = aiSummary ?? rulesSummary;
    const source = summary.meta.source;

    return coachRepo.upsertInsight(userId, source, summary, getExpiry());
  },

  completeAction: async (userId: string, goalId: string, insightId: string) => {
    await coachRepo.createActionCompletion({ userId, goalId, insightId });
  },

  getCompletionRate: (userId: string, windowDays = 7) =>
    coachRepo.getActionCompletionRate(userId, Math.max(windowDays, 1)),

  listConversations: (userId: string) => coachRepo.listConversations(userId),

  listMessages: (userId: string, conversationId: string) =>
    coachRepo.listMessages(userId, conversationId),

  sendChatMessage: async (
    userId: string,
    input: { conversationId?: string; message: string }
  ): Promise<CoachChatReplyDto> => {
    const context = await prepareChatContext(userId, input);

    const aiReply = await generateCoachChatReply({
      goals: context.goals,
      latestSummary: context.latestInsight?.summary ?? null,
      history: context.history,
      userMessage: context.message,
    });

    const fallbackReply = buildFallbackReply(context.goals);

    let assistantContent = aiReply ?? fallbackReply;
    if (context.ambiguityMessage) {
      assistantContent = removeIntentMarkers(context.ambiguityMessage);
    }

    const assistantMessageWithActions = await persistAssistantReply(userId, {
      conversationId: context.targetConversation.id,
      assistantContent,
      proposedActions: context.proposedActions,
    });

    const updatedConversation =
      (await coachRepo.getConversationById(userId, context.targetConversation.id)) ??
      context.targetConversation;

    return {
      conversation: updatedConversation,
      userMessage: context.userMessage,
      assistantMessage: assistantMessageWithActions,
      proposedActions: assistantMessageWithActions.proposedActions ?? [],
    };
  },

  sendChatMessageStream: async (
    userId: string,
    input: { conversationId?: string; message: string },
    onToken: (token: string) => void
  ): Promise<CoachChatReplyDto> => {
    const context = await prepareChatContext(userId, input);
    const fallbackReply = context.ambiguityMessage
      ? removeIntentMarkers(context.ambiguityMessage)
      : buildFallbackReply(context.goals);

    let assistantContent = fallbackReply;
    if (!context.ambiguityMessage) {
      const streamed = await generateCoachChatReplyStream(
        {
          goals: context.goals,
          latestSummary: context.latestInsight?.summary ?? null,
          history: context.history,
          userMessage: context.message,
        },
        onToken
      );
      assistantContent = streamed ?? fallbackReply;
      if (!streamed) {
        onToken(assistantContent);
      }
    } else {
      onToken(assistantContent);
    }

    const assistantMessageWithActions = await persistAssistantReply(userId, {
      conversationId: context.targetConversation.id,
      assistantContent,
      proposedActions: context.proposedActions,
    });

    const updatedConversation =
      (await coachRepo.getConversationById(userId, context.targetConversation.id)) ??
      context.targetConversation;

    return {
      conversation: updatedConversation,
      userMessage: context.userMessage,
      assistantMessage: assistantMessageWithActions,
      proposedActions: assistantMessageWithActions.proposedActions ?? [],
    };
  },

  executeChatAction: async (
    userId: string,
    proposalId: string,
    confirmText?: string
  ): Promise<ExecuteCoachActionResultDto> => {
    try {
      const result = await coachRepo.executeActionProposal({
        userId,
        proposalId,
        confirmText,
        now: new Date(),
      });

      if (result.resultType === "goal_created") {
        return {
          resultType: "goal_created",
          proposalStatus: "executed",
          goal: result.goal,
        };
      }

      if (result.resultType === "goal_updated") {
        return {
          resultType: "goal_updated",
          proposalStatus: "executed",
          goal: result.goal,
          goalId: result.goalId,
        };
      }

      return {
        resultType: "goal_deleted",
        proposalStatus: "executed",
        goalId: result.goalId,
        undoExpiresAt: result.undoExpiresAt,
      };
    } catch (error) {
      const parsed = parseServiceError(error);
      if (parsed.code === "BAD_REQUEST") {
        throw new Error(`BAD_REQUEST:${parsed.message}`);
      }
      if (parsed.code === "NOT_FOUND") {
        throw new Error(`NOT_FOUND:${parsed.message}`);
      }
      if (parsed.code === "CONFLICT") {
        throw new Error(`CONFLICT:${parsed.message}`);
      }
      throw error;
    }
  },

  undoChatAction: async (
    userId: string,
    proposalId: string
  ): Promise<ExecuteCoachActionResultDto> => {
    try {
      const result = await coachRepo.undoDeleteActionProposal({
        userId,
        proposalId,
        now: new Date(),
      });

      return {
        resultType: "goal_updated",
        proposalStatus: "executed",
        goal: result.goal,
        goalId: result.goalId,
      };
    } catch (error) {
      const parsed = parseServiceError(error);
      if (parsed.code === "BAD_REQUEST") {
        throw new Error(`BAD_REQUEST:${parsed.message}`);
      }
      if (parsed.code === "NOT_FOUND") {
        throw new Error(`NOT_FOUND:${parsed.message}`);
      }
      if (parsed.code === "CONFLICT") {
        throw new Error(`CONFLICT:${parsed.message}`);
      }
      throw error;
    }
  },
};
