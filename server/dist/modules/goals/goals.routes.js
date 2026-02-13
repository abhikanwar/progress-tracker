import { Router } from "express";
import { asyncHandler } from "../../utils/http.js";
import { goalsController } from "./goals.controller.js";
import { addTagSchema, addProgressSchema, createGoalSchema, createMilestoneSchema, updateGoalSchema, updateMilestoneSchema, } from "./goals.validation.js";
import { requireAuth } from "../../middlewares/auth.js";
export const goalsRouter = Router();
goalsRouter.use(requireAuth);
goalsRouter.get("/tags", asyncHandler(goalsController.listTags));
goalsRouter.get("/", asyncHandler(goalsController.list));
goalsRouter.get("/:id", asyncHandler(goalsController.getById));
goalsRouter.post("/", asyncHandler(async (req, _res, next) => {
    req.body = createGoalSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.create));
goalsRouter.put("/:id", asyncHandler(async (req, _res, next) => {
    req.body = updateGoalSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.update));
goalsRouter.post("/:id/progress", asyncHandler(async (req, _res, next) => {
    req.body = addProgressSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.addProgress));
goalsRouter.post("/:id/milestones", asyncHandler(async (req, _res, next) => {
    req.body = createMilestoneSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.addMilestone));
goalsRouter.put("/:id/milestones/:milestoneId", asyncHandler(async (req, _res, next) => {
    req.body = updateMilestoneSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.updateMilestone));
goalsRouter.delete("/:id/milestones/:milestoneId", asyncHandler(goalsController.removeMilestone));
goalsRouter.post("/:id/tags", asyncHandler(async (req, _res, next) => {
    req.body = addTagSchema.parse(req.body);
    next();
}), asyncHandler(goalsController.addTag));
goalsRouter.delete("/:id/tags/:tagId", asyncHandler(goalsController.removeTag));
goalsRouter.delete("/:id", asyncHandler(goalsController.remove));
