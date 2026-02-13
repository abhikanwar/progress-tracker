import { Router } from "express";
import { asyncHandler } from "../../utils/http.js";
import { requireAuth } from "../../middlewares/auth.js";
import { goalTemplatesController } from "./goalTemplates.controller.js";
import { applyGoalTemplateParamsSchema, applyGoalTemplateSchema, listGoalTemplatesQuerySchema, } from "./goalTemplates.validation.js";
export const goalTemplatesRouter = Router();
goalTemplatesRouter.use(requireAuth);
goalTemplatesRouter.get("/", asyncHandler(async (req, _res, next) => {
    req.query = listGoalTemplatesQuerySchema.parse(req.query);
    next();
}), asyncHandler(goalTemplatesController.list));
goalTemplatesRouter.post("/:id/apply", asyncHandler(async (req, _res, next) => {
    req.params = applyGoalTemplateParamsSchema.parse(req.params);
    req.body = applyGoalTemplateSchema.parse(req.body);
    next();
}), asyncHandler(goalTemplatesController.apply));
