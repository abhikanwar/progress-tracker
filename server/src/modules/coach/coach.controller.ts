import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import { coachService } from "./coach.service.js";
import {
  coachChatMessageSchema,
  coachCompletionRateQuerySchema,
  coachConversationParamsSchema,
} from "./coach.validation.js";

export const coachController = {
  getInsight: async (req: AuthenticatedRequest, res: Response) => {
    const insight = await coachService.getInsight(req.user.id);
    if (!insight) {
      res.status(204).send();
      return;
    }

    res.json(insight);
  },

  generateInsight: async (req: AuthenticatedRequest, res: Response) => {
    const insight = await coachService.generateInsight(req.user.id);
    res.json(insight);
  },

  completeAction: async (req: AuthenticatedRequest, res: Response) => {
    await coachService.completeAction(req.user.id, req.params.goalId, req.body.insightId);
    res.status(204).send();
  },

  completionRate: async (req: AuthenticatedRequest, res: Response) => {
    const parsed = coachCompletionRateQuerySchema.parse(req.query);
    const rate = await coachService.getCompletionRate(req.user.id, parsed.windowDays ?? 7);
    res.json(rate);
  },

  listConversations: async (req: AuthenticatedRequest, res: Response) => {
    const conversations = await coachService.listConversations(req.user.id);
    res.json(conversations);
  },

  listMessages: async (req: AuthenticatedRequest, res: Response) => {
    const parsed = coachConversationParamsSchema.parse(req.params);
    const messages = await coachService.listMessages(req.user.id, parsed.id);
    res.json(messages);
  },

  sendChatMessage: async (req: AuthenticatedRequest, res: Response) => {
    const parsed = coachChatMessageSchema.parse(req.body);
    const reply = await coachService.sendChatMessage(req.user.id, parsed);
    res.json(reply);
  },
};
