import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export const requireAuth = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        res.status(401).json({ error: "Missing or invalid authorization header" });
        return;
    }
    const token = header.slice("Bearer ".length);
    try {
        const payload = jwt.verify(token, env.jwtSecret);
        if (!payload.sub) {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
        req.user = { id: payload.sub };
        next();
    }
    catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
};
