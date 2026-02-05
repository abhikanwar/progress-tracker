import type { Request, Response } from "express";
import { goalsService } from "./goals.service.js";

export const goalsController = {
  list: async (_req: Request, res: Response) => {
    const goals = await goalsService.list();
    res.json(goals);
  },

  getById: async (req: Request, res: Response) => {
    const goal = await goalsService.getById(req.params.id);
    if (!goal) {
      res.status(404).json({ error: "Goal not found" });
      return;
    }
    res.json(goal);
  },

  create: async (req: Request, res: Response) => {
    const goal = await goalsService.create(req.body);
    res.status(201).json(goal);
  },

  update: async (req: Request, res: Response) => {
    const goal = await goalsService.update(req.params.id, req.body);
    res.json(goal);
  },

  addProgress: async (req: Request, res: Response) => {
    const event = await goalsService.addProgress(req.params.id, req.body);
    res.status(201).json(event);
  },

  remove: async (req: Request, res: Response) => {
    await goalsService.remove(req.params.id);
    res.status(204).send();
  },
};
