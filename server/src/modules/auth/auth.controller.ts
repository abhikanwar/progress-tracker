import type { Request, Response } from "express";
import { authService } from "./auth.service.js";

export const authController = {
  register: async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    try {
      const result = await authService.register(email, password);
      res.status(201).json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      res.status(400).json({ error: message });
    }
  },

  login: async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    try {
      const result = await authService.login(email, password);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      res.status(401).json({ error: message });
    }
  },
};
