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
    proposedActions: message.actionProposals?.map(mapActionProposal) ?? [],
});
const mapActionProposal = (proposal) => {
    if (proposal.type === "update_goal") {
        const payload = proposal.payload;
        return {
            id: proposal.id,
            type: "update_goal",
            label: proposal.label,
            payload,
            riskLevel: proposal.riskLevel ?? "low",
            expiresAt: proposal.expiresAt.toISOString(),
            status: proposal.status ?? "pending",
        };
    }
    if (proposal.type === "delete_goal") {
        const payload = proposal.payload;
        return {
            id: proposal.id,
            type: "delete_goal",
            label: proposal.label,
            payload,
            riskLevel: proposal.riskLevel ?? "high",
            expiresAt: proposal.expiresAt.toISOString(),
            status: proposal.status ?? "pending",
        };
    }
    const payload = proposal.payload;
    return {
        id: proposal.id,
        type: "create_goal",
        label: proposal.label,
        payload,
        riskLevel: proposal.riskLevel ?? "low",
        expiresAt: proposal.expiresAt.toISOString(),
        status: proposal.status ?? "pending",
    };
};
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
                        actionProposals: {
                            orderBy: { createdAt: "asc" },
                            select: {
                                id: true,
                                type: true,
                                label: true,
                                payload: true,
                                riskLevel: true,
                                expiresAt: true,
                                status: true,
                            },
                        },
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
    createActionProposals: async (userId, input) => {
        if (input.proposals.length === 0)
            return [];
        const proposals = await prisma.$transaction(async (tx) => {
            const conversation = await tx.coachConversation.findFirst({
                where: { id: input.conversationId, userId },
                select: { id: true },
            });
            if (!conversation) {
                throw new Error("Conversation not found");
            }
            const message = await tx.coachMessage.findFirst({
                where: { id: input.messageId, conversationId: input.conversationId },
                select: { id: true },
            });
            if (!message) {
                throw new Error("Assistant message not found");
            }
            const created = await Promise.all(input.proposals.map((proposal) => tx.coachActionProposal.create({
                data: {
                    userId,
                    conversationId: input.conversationId,
                    messageId: input.messageId,
                    type: proposal.type,
                    label: proposal.label,
                    payload: proposal.payload,
                    riskLevel: proposal.riskLevel,
                    expiresAt: proposal.expiresAt,
                },
                select: {
                    id: true,
                    type: true,
                    label: true,
                    payload: true,
                    riskLevel: true,
                    expiresAt: true,
                    status: true,
                },
            })));
            return created;
        });
        return proposals.map(mapActionProposal);
    },
    getActionProposalById: async (userId, proposalId) => prisma.coachActionProposal.findFirst({
        where: { id: proposalId, userId },
        select: {
            id: true,
            type: true,
            label: true,
            payload: true,
            riskLevel: true,
            expiresAt: true,
            status: true,
            conversationId: true,
        },
    }),
    executeActionProposal: async (input) => prisma.$transaction(async (tx) => {
        const proposal = await tx.coachActionProposal.findFirst({
            where: { id: input.proposalId, userId: input.userId },
            select: {
                id: true,
                type: true,
                payload: true,
                status: true,
                expiresAt: true,
            },
        });
        if (!proposal) {
            throw new Error("NOT_FOUND:Action proposal not found");
        }
        if (proposal.expiresAt <= input.now) {
            await tx.coachActionProposal.updateMany({
                where: { id: proposal.id, status: "pending" },
                data: { status: "expired" },
            });
            throw new Error("CONFLICT:Action proposal expired");
        }
        const markExecuted = await tx.coachActionProposal.updateMany({
            where: {
                id: proposal.id,
                userId: input.userId,
                status: "pending",
                expiresAt: { gt: input.now },
            },
            data: {
                status: "executed",
                executedAt: input.now,
            },
        });
        if (markExecuted.count === 0) {
            throw new Error("CONFLICT:Action proposal already processed");
        }
        if (proposal.type === "create_goal") {
            const payload = proposal.payload;
            const createdGoal = await tx.goal.create({
                data: {
                    userId: input.userId,
                    title: payload.title,
                    details: payload.details,
                    targetDate: payload.targetDate ? new Date(payload.targetDate) : null,
                },
            });
            const hydratedGoal = await tx.goal.findUnique({
                where: { id_userId: { id: createdGoal.id, userId: input.userId } },
                include: {
                    progressEvents: { orderBy: { createdAt: "desc" } },
                    milestones: { orderBy: { createdAt: "asc" } },
                    goalTags: { orderBy: { createdAt: "asc" }, include: { tag: true } },
                },
            });
            return {
                resultType: "goal_created",
                goal: hydratedGoal ?? undefined,
            };
        }
        if (proposal.type === "update_goal") {
            const payload = proposal.payload;
            const updatedGoal = await tx.goal.update({
                where: { id_userId: { id: payload.goalId, userId: input.userId } },
                data: {
                    ...(payload.title !== undefined ? { title: payload.title } : {}),
                    ...(payload.details !== undefined ? { details: payload.details } : {}),
                    ...(payload.targetDate !== undefined
                        ? { targetDate: payload.targetDate ? new Date(payload.targetDate) : null }
                        : {}),
                },
            });
            const hydratedGoal = await tx.goal.findUnique({
                where: { id_userId: { id: updatedGoal.id, userId: input.userId } },
                include: {
                    progressEvents: { orderBy: { createdAt: "desc" } },
                    milestones: { orderBy: { createdAt: "asc" } },
                    goalTags: { orderBy: { createdAt: "asc" }, include: { tag: true } },
                },
            });
            return {
                resultType: "goal_updated",
                goal: hydratedGoal ?? undefined,
                goalId: payload.goalId,
            };
        }
        const payload = proposal.payload;
        if (input.confirmText !== "DELETE") {
            throw new Error("BAD_REQUEST:Please type DELETE to confirm.");
        }
        const archived = await tx.goal.updateMany({
            where: { id: payload.goalId, userId: input.userId },
            data: { status: "ARCHIVED" },
        });
        if (archived.count === 0) {
            throw new Error("NOT_FOUND:Goal not found");
        }
        const undoExpiresAt = new Date(input.now.getTime() + 30_000);
        return {
            resultType: "goal_deleted",
            goalId: payload.goalId,
            undoExpiresAt: undoExpiresAt.toISOString(),
        };
    }),
    undoDeleteActionProposal: async (input) => prisma.$transaction(async (tx) => {
        const proposal = await tx.coachActionProposal.findFirst({
            where: { id: input.proposalId, userId: input.userId },
            select: {
                id: true,
                type: true,
                payload: true,
                status: true,
                executedAt: true,
            },
        });
        if (!proposal) {
            throw new Error("NOT_FOUND:Action proposal not found");
        }
        if (proposal.type !== "delete_goal") {
            throw new Error("BAD_REQUEST:Only delete actions can be undone");
        }
        if (proposal.status !== "executed" || !proposal.executedAt) {
            throw new Error("CONFLICT:Action is not undoable");
        }
        const undoWindowEnds = new Date(proposal.executedAt.getTime() + 30_000);
        if (undoWindowEnds <= input.now) {
            throw new Error("CONFLICT:Undo window expired");
        }
        const payload = proposal.payload;
        const restored = await tx.goal.updateMany({
            where: { id: payload.goalId, userId: input.userId },
            data: {
                status: payload.previousStatus ?? "ACTIVE",
            },
        });
        if (restored.count === 0) {
            throw new Error("NOT_FOUND:Goal not found");
        }
        await tx.coachActionProposal.update({
            where: { id: proposal.id },
            data: {
                status: "cancelled",
            },
        });
        const hydratedGoal = await tx.goal.findUnique({
            where: { id_userId: { id: payload.goalId, userId: input.userId } },
            include: {
                progressEvents: { orderBy: { createdAt: "desc" } },
                milestones: { orderBy: { createdAt: "asc" } },
                goalTags: { orderBy: { createdAt: "asc" }, include: { tag: true } },
            },
        });
        return {
            goal: hydratedGoal ?? undefined,
            goalId: payload.goalId,
        };
    }),
};
