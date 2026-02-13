import { Router } from "express";
import { asyncHandler } from "../../utils/http.js";
import { requireAuth } from "../../middlewares/auth.js";
import { coachController } from "./coach.controller.js";
import { completeCoachActionParamsSchema, completeCoachActionSchema, } from "./coach.validation.js";
export const coachRouter = Router();
coachRouter.use(requireAuth);
coachRouter.get("/insight", asyncHandler(coachController.getInsight));
coachRouter.post("/insight/generate", asyncHandler(coachController.generateInsight));
coachRouter.get("/chat/conversations", asyncHandler(coachController.listConversations));
coachRouter.get("/chat/conversations/:id/messages", asyncHandler(coachController.listMessages));
coachRouter.post("/chat/message", asyncHandler(coachController.sendChatMessage));
coachRouter.post("/actions/:goalId/complete", asyncHandler(async (req, _res, next) => {
    req.params = completeCoachActionParamsSchema.parse(req.params);
    req.body = completeCoachActionSchema.parse(req.body);
    next();
}), asyncHandler(coachController.completeAction));
coachRouter.get("/actions/completion-rate", asyncHandler(coachController.completionRate));
