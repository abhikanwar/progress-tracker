import { z } from "zod";
export const listGoalTemplatesQuerySchema = z.object({
    category: z.string().trim().min(1).max(80).optional(),
    search: z.string().trim().min(1).max(120).optional(),
});
export const applyGoalTemplateParamsSchema = z.object({
    id: z.string().uuid(),
});
export const applyGoalTemplateSchema = z.object({
    titleOverride: z.string().trim().min(1).max(120).optional(),
    detailsOverride: z.string().trim().max(2000).optional(),
    targetDateOverride: z.string().datetime().optional(),
});
