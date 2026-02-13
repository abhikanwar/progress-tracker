import { prisma } from "../../db/prisma.js";
const mapInsight = (insight) => ({
    id: insight.id,
    source: insight.source,
    summary: insight.summary,
    createdAt: insight.createdAt.toISOString(),
    expiresAt: insight.expiresAt.toISOString(),
});
const mapConversation = (conversation) => ({
    id: conversation.id,
    title: conversation.title ?? "New conversation",
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
});
const mapMessage = (message) => ({
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
});
export const coachRepo = {
    getGoalsForCoach: (userId) => prisma.goal.findMany({
        where: { userId },
        include: {
            progressEvents: { orderBy: { createdAt: "desc" }, take: 5 },
            milestones: { orderBy: { createdAt: "asc" } },
            goalTags: {
                orderBy: { createdAt: "asc" },
                include: { tag: true },
            },
        },
    }),
    getLatestValidInsight: async (userId, now) => {
        const insight = await prisma.coachInsight.findFirst({
            where: { userId, expiresAt: { gt: now } },
        });
        return insight ? mapInsight(insight) : null;
    },
    upsertInsight: async (userId, source, summary, expiresAt) => {
        const insight = await prisma.coachInsight.upsert({
            where: { userId },
            update: {
                source,
                summary: summary,
                expiresAt,
            },
            create: {
                userId,
                source,
                summary: summary,
                expiresAt,
            },
        });
        return mapInsight(insight);
    },
    createActionCompletion: async (input) => {
        const insight = await prisma.coachInsight.findFirst({
            where: { id: input.insightId, userId: input.userId },
            select: { id: true },
        });
        if (!insight) {
            throw new Error("Coach insight not found");
        }
        const goal = await prisma.goal.findUnique({
            where: { id_userId: { id: input.goalId, userId: input.userId } },
            select: { id: true },
        });
        if (!goal) {
            throw new Error("Goal not found");
        }
        await prisma.coachActionCompletion.create({
            data: {
                userId: input.userId,
                goalId: input.goalId,
                insightId: input.insightId,
            },
        });
    },
    getActionCompletionRate: async (userId, windowDays) => {
        const windowStart = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
        const insights = await prisma.coachInsight.findMany({
            where: { userId, createdAt: { gte: windowStart } },
            select: { id: true, summary: true },
        });
        const suggestedActions = insights.reduce((sum, insight) => {
            const summary = insight.summary;
            return sum + (summary.nextActions?.length ?? 0);
        }, 0);
        const completions = await prisma.coachActionCompletion.count({
            where: { userId, completedAt: { gte: windowStart } },
        });
        const rate = suggestedActions > 0 ? Math.round((completions / suggestedActions) * 100) : 0;
        return {
            windowDays,
            suggestedActions,
            completedActions: completions,
            rate,
        };
    },
    listConversations: async (userId) => {
        const conversations = await prisma.coachConversation.findMany({
            where: { userId },
            orderBy: [{ updatedAt: "desc" }],
            select: { id: true, title: true, createdAt: true, updatedAt: true },
        });
        return conversations.map(mapConversation);
    },
    getConversationById: async (userId, id) => {
        const conversation = await prisma.coachConversation.findFirst({
            where: { id, userId },
            select: { id: true, title: true, createdAt: true, updatedAt: true },
        });
        return conversation ? mapConversation(conversation) : null;
    },
    createConversation: async (userId, title) => {
        const conversation = await prisma.coachConversation.create({
            data: { userId, title: title?.trim() || null },
            select: { id: true, title: true, createdAt: true, updatedAt: true },
        });
        return mapConversation(conversation);
    },
    listMessages: async (userId, conversationId) => {
        const conversation = await prisma.coachConversation.findFirst({
            where: { id: conversationId, userId },
            select: {
                id: true,
                messages: {
                    orderBy: { createdAt: "asc" },
                    select: {
                        id: true,
                        conversationId: true,
                        role: true,
                        content: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        return conversation.messages.map(mapMessage);
    },
    addMessage: async (userId, conversationId, input) => {
        const conversation = await prisma.coachConversation.findFirst({
            where: { id: conversationId, userId },
            select: { id: true },
        });
        if (!conversation) {
            throw new Error("Conversation not found");
        }
        const message = await prisma.$transaction(async (tx) => {
            const created = await tx.coachMessage.create({
                data: {
                    conversationId,
                    role: input.role,
                    content: input.content,
                },
                select: {
                    id: true,
                    conversationId: true,
                    role: true,
                    content: true,
                    createdAt: true,
                },
            });
            await tx.coachConversation.update({
                where: { id: conversationId },
                data: {
                    updatedAt: new Date(),
                    title: input.role === "user"
                        ? input.content.slice(0, 60)
                        : undefined,
                },
            });
            return created;
        });
        return mapMessage(message);
    },
};
