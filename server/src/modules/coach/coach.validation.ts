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
