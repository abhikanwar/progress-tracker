import { z } from "zod";
export const coachPrioritySchema = z.object({
    goalId: z.string().uuid(),
    title: z.string().min(1).max(180),
    reason: z.string().min(1).max(300),
    score: z.number().min(0).max(200),
});
export const coachRiskSchema = z.object({
    goalId: z.string().uuid(),
    title: z.string().min(1).max(180),
    category: z.enum(["schedule", "execution", "consistency"]),
    severity: z.enum(["low", "medium", "high"]),
    reason: z.string().min(1).max(300),
});
export const coachActionSchema = z.object({
    goalId: z.string().uuid(),
    action: z.string().min(1).max(220),
    why: z.string().min(1).max(300),
});
export const coachSummarySchema = z.object({
    topPriorities: z.array(coachPrioritySchema).max(3),
    risks: z.array(coachRiskSchema).max(5),
    nextActions: z.array(coachActionSchema).max(5),
    confidence: z.object({
        value: z.number().min(0).max(100),
        band: z.enum(["low", "medium", "high"]),
    }),
    meta: z.object({
        generatedAt: z.string().datetime(),
        source: z.enum(["ai", "rules"]),
        engineVersion: z.string().min(1).max(64),
        dataWindowDays: z.number().int().min(1).max(60),
    }),
});
export const completeCoachActionParamsSchema = z.object({
    goalId: z.string().uuid(),
});
export const completeCoachActionSchema = z.object({
    insightId: z.string().uuid(),
});
export const coachCompletionRateQuerySchema = z.object({
    windowDays: z.coerce.number().int().min(1).max(30).optional(),
});
export const coachConversationParamsSchema = z.object({
    id: z.string().uuid(),
});
export const coachChatMessageSchema = z.object({
    conversationId: z.string().uuid().optional(),
    message: z.string().trim().min(1).max(2000),
});
export const coachActionTypeSchema = z.enum(["create_goal", "delete_goal", "update_goal"]);
export const coachCreateGoalPayloadSchema = z.object({
    title: z.string().trim().min(1).max(120),
    details: z.string().trim().max(2000).optional(),
    targetDate: z.string().datetime().optional(),
});
export const coachDeleteGoalPayloadSchema = z.object({
    goalId: z.string().uuid(),
    goalTitle: z.string().min(1).max(180),
    previousStatus: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});
export const coachUpdateGoalPayloadSchema = z.object({
    goalId: z.string().uuid(),
    goalTitle: z.string().min(1).max(180),
    title: z.string().trim().min(1).max(120).optional(),
    details: z.string().trim().max(2000).optional(),
    targetDate: z.string().datetime().optional(),
}).refine((payload) => payload.title !== undefined ||
    payload.details !== undefined ||
    payload.targetDate !== undefined, { message: "At least one update field is required" });
export const coachActionProposalSchema = z.object({
    id: z.string().uuid(),
    type: coachActionTypeSchema,
    label: z.string().min(1).max(220),
    riskLevel: z.enum(["low", "high"]),
    expiresAt: z.string().datetime(),
    status: z.enum(["pending", "executed", "expired", "cancelled"]),
    payload: z.union([
        coachCreateGoalPayloadSchema,
        coachDeleteGoalPayloadSchema,
        coachUpdateGoalPayloadSchema,
    ]),
});
export const executeCoachActionParamsSchema = z.object({
    proposalId: z.string().uuid(),
});
export const executeCoachActionSchema = z.object({
    confirmText: z.string().trim().max(20).optional(),
});
export const undoCoachActionParamsSchema = z.object({
    proposalId: z.string().uuid(),
});
