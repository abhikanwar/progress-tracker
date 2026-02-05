import type { NextFunction, Request, Response } from "express";

export const asyncHandler =
  <Req extends Request = Request, Res extends Response = Response>(
    fn: (req: Req, res: Res, next: NextFunction) => Promise<void>
  ) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req as Req, res as Res, next).catch(next);
