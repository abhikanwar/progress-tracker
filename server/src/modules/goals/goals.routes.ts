import { Router } from "express";
import { asyncHandler } from "../../utils/http";
import { goalsController } from "./goals.controller";
import { addProgressSchema, createGoalSchema, updateGoalSchema } from "./goals.validation";

export const goalsRouter = Router();

goalsRouter.get("/", asyncHandler(goalsController.list));
goalsRouter.get("/:id", asyncHandler(goalsController.getById));

goalsRouter.post(
  "/",
  asyncHandler(async (req, _res, next) => {
    req.body = createGoalSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.create)
);

goalsRouter.put(
  "/:id",
  asyncHandler(async (req, _res, next) => {
    req.body = updateGoalSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.update)
);

goalsRouter.post(
  "/:id/progress",
  asyncHandler(async (req, _res, next) => {
    req.body = addProgressSchema.parse(req.body);
    next();
  }),
  asyncHandler(goalsController.addProgress)
);

goalsRouter.delete("/:id", asyncHandler(goalsController.remove));
