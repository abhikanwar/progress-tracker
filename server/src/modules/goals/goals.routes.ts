import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/http.js";
import { goalsController } from "./goals.controller.js";
import { addProgressSchema, createGoalSchema, updateGoalSchema } from "./goals.validation.js";

export const goalsRouter = Router();

goalsRouter.get("/", asyncHandler(goalsController.list));
goalsRouter.get("/:id", asyncHandler(goalsController.getById));

goalsRouter.post(
  "/",
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    req.body = createGoalSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.create)
);

goalsRouter.put(
  "/:id",
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    req.body = updateGoalSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.update)
);

goalsRouter.post(
  "/:id/progress",
  asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    req.body = addProgressSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.addProgress)
);

goalsRouter.delete("/:id", asyncHandler(goalsController.remove));
