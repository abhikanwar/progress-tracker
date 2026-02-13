import type { Response } from "express";
import type { AuthenticatedRequest } from "../../middlewares/auth.js";
import { goalTemplatesService } from "./goalTemplates.service.js";

export const goalTemplatesController = {
  list: async (req: AuthenticatedRequest, res: Response) => {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const templates = await goalTemplatesService.list({ category, search });
    res.json(templates);
  },

  apply: async (req: AuthenticatedRequest, res: Response) => {
    const goal = await goalTemplatesService.apply(req.user.id, req.params.id, req.body);
    if (!goal) {
      res.status(404).json({ error: "Goal template not found" });
      return;
    }

    res.status(201).json(goal);
  },
};
