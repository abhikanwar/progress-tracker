import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { goalsRouter } from "./modules/goals/goals.routes.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { notFound } from "./middlewares/notFound.js";
export const createApp = () => {
    const app = express();
    app.use(cors({ origin: env.clientOrigin }));
    app.use(express.json());
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    app.use("/goals", goalsRouter);
    app.use(notFound);
    app.use(errorHandler);
    return app;
};
