import { z } from "zod";
export const createGoalSchema = z.object({
    title: z.string().min(1).max(120),
    details: z.string().max(2000).optional(),
    targetDate: z.string().datetime().optional(),
});
export const updateGoalSchema = z.object({
    title: z.string().min(1).max(120).optional(),
    details: z.string().max(2000).optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
    targetDate: z.string().datetime().optional(),
    currentProgress: z.number().int().min(0).max(100).optional(),
});
export const addProgressSchema = z.object({
    value: z.number().int().min(0).max(100),
    note: z.string().max(500).optional(),
});
export const createMilestoneSchema = z.object({
    title: z.string().min(1).max(200),
});
export const updateMilestoneSchema = z
    .object({
    title: z.string().min(1).max(200).optional(),
    completed: z.boolean().optional(),
})
    .refine((payload) => payload.title !== undefined || payload.completed !== undefined, {
    message: "At least one field must be provided",
});
export const addTagSchema = z.object({
    name: z.string().min(1).max(50),
});
