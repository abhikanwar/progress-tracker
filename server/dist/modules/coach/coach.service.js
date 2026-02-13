import { env } from "../../config/env.js";
import { coachRepo } from "./coach.repo.js";
import { generateCoachChatReply, rewriteSummaryWithAi } from "./coach.ai.js";
import { buildRulesSummary } from "./coach.rules.js";
const getExpiry = () => {
    const now = new Date();
    now.setHours(now.getHours() + Math.max(env.coachCacheTtlHours, 1));
    return now;
};
export const coachService = {
    getInsight: (userId) => coachRepo.getLatestValidInsight(userId, new Date()),
    generateInsight: async (userId) => {
        const goals = await coachRepo.getGoalsForCoach(userId);
        const rulesSummary = buildRulesSummary(goals);
        const aiSummary = await rewriteSummaryWithAi(rulesSummary);
        const summary = aiSummary ?? rulesSummary;
        const source = summary.meta.source;
        return coachRepo.upsertInsight(userId, source, summary, getExpiry());
    },
    completeAction: async (userId, goalId, insightId) => {
        await coachRepo.createActionCompletion({ userId, goalId, insightId });
    },
    getCompletionRate: (userId, windowDays = 7) => coachRepo.getActionCompletionRate(userId, Math.max(windowDays, 1)),
    listConversations: (userId) => coachRepo.listConversations(userId),
    listMessages: (userId, conversationId) => coachRepo.listMessages(userId, conversationId),
    sendChatMessage: async (userId, input) => {
        const message = input.message.trim();
        if (!message) {
            throw new Error("Message is required");
        }
        const conversation = input.conversationId
            ? await coachRepo.getConversationById(userId, input.conversationId)
            : null;
        const targetConversation = conversation ?? (await coachRepo.createConversation(userId, message.slice(0, 60)));
        const userMessage = await coachRepo.addMessage(userId, targetConversation.id, {
            role: "user",
            content: message,
        });
        const goals = await coachRepo.getGoalsForCoach(userId);
        const latestInsight = await coachRepo.getLatestValidInsight(userId, new Date());
        const history = await coachRepo.listMessages(userId, targetConversation.id);
        const aiReply = await generateCoachChatReply({
            goals,
            latestSummary: latestInsight?.summary ?? null,
            history,
            userMessage: message,
        });
        const fallbackSummary = buildRulesSummary(goals);
        const fallbackReply = fallbackSummary.nextActions.length > 0
            ? `Focus this week on: ${fallbackSummary.nextActions
                .slice(0, 3)
                .map((action, index) => `${index + 1}) ${action.action}`)
                .join(" ")}`
            : "Start with one 30-minute planning block and define your next concrete milestone.";
        const assistantMessage = await coachRepo.addMessage(userId, targetConversation.id, {
            role: "assistant",
            content: aiReply ?? fallbackReply,
        });
        const updatedConversation = (await coachRepo.getConversationById(userId, targetConversation.id)) ?? targetConversation;
        return {
            conversation: updatedConversation,
            userMessage,
            assistantMessage,
        };
    },
};
