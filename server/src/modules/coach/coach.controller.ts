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

  sendChatMessageStream: async (req: AuthenticatedRequest, res: Response) => {
    const parsed = coachChatMessageSchema.parse(req.body);

    req.socket.setNoDelay(true);
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const writeEvent = (event: string, payload: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
      if (typeof (res as Response & { flush?: () => void }).flush === "function") {
        (res as Response & { flush?: () => void }).flush?.();
      }
    };

    try {
      res.write(": stream-open\n\n");
      const reply = await coachService.sendChatMessageStream(req.user.id, parsed, (token) => {
        writeEvent("token", { token });
      });
      writeEvent("done", reply);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Streaming failed";
      writeEvent("error", { error: message });
    } finally {
      res.end();
    }
  },

  executeChatAction: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await coachService.executeChatAction(
        req.user.id,
        req.params.proposalId,
        req.body?.confirmText
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      if (message.startsWith("BAD_REQUEST:")) {
        res.status(400).json({ error: message.replace("BAD_REQUEST:", "").trim() });
        return;
      }
      if (message.startsWith("NOT_FOUND:")) {
        res.status(404).json({ error: message.replace("NOT_FOUND:", "").trim() });
        return;
      }
      if (message.startsWith("CONFLICT:")) {
        res.status(409).json({ error: message.replace("CONFLICT:", "").trim() });
        return;
      }
      throw error;
    }
  },

  undoChatAction: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await coachService.undoChatAction(req.user.id, req.params.proposalId);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error";
      if (message.startsWith("BAD_REQUEST:")) {
        res.status(400).json({ error: message.replace("BAD_REQUEST:", "").trim() });
        return;
      }
      if (message.startsWith("NOT_FOUND:")) {
        res.status(404).json({ error: message.replace("NOT_FOUND:", "").trim() });
        return;
      }
      if (message.startsWith("CONFLICT:")) {
        res.status(409).json({ error: message.replace("CONFLICT:", "").trim() });
        return;
      }
      throw error;
    }
  },
};
