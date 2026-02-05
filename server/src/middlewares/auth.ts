import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type AuthenticatedRequest = Request & { user: { id: string } };

type TokenPayload = {
  sub: string;
};

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
    if (!payload.sub) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    (req as AuthenticatedRequest).user = { id: payload.sub };
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
