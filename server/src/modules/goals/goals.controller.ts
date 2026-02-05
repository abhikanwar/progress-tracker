import type { Response } from "express";
import { goalsService } from "./goals.service.js";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";

export const goalsController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const goals = await goalsService.list(req.user.id);
    res.json(goals);
  },

  getById: async (req: AuthenticatedRequest, res: Response) => {
    const goal = await goalsService.getById(req.user.id, req.params.id);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(goal);
  },

  create: async (req: AuthenticatedRequest, res: Response) => {
    const goal = await goalsService.create(req.user.id, req.body);
    res.status(201).json(goal);
  },

  update: async (req: AuthenticatedRequest, res: Response) => {
    const goal = await goalsService.update(req.user.id, req.params.id, req.body);
    res.json(goal);
  },

  addProgress: async (req: AuthenticatedRequest, res: Response) => {
    const event = await goalsService.addProgress(req.user.id, req.params.id, req.body);
    res.status(201).json(event);
  },

  remove: async (req: AuthenticatedRequest, res: Response) => {
    await goalsService.remove(req.user.id, req.params.id);
    res.status(204).send();
  },
};
