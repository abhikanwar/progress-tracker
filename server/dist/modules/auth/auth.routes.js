import { Router } from "express";
import { asyncHandler } from "../../utils/http.js";
import { authController } from "./auth.controller.js";
import { changePasswordSchema, loginSchema, registerSchema, } from "./auth.validation.js";
import { requireAuth } from "../../middlewares/auth.js";
export const authRouter = Router();
authRouter.post("/register", asyncHandler(async (req, _res, next) => {
    req.body = registerSchema.parse(req.body);
    next();
}), asyncHandler(authController.register));
authRouter.post("/login", asyncHandler(async (req, _res, next) => {
    req.body = loginSchema.parse(req.body);
    next();
}), asyncHandler(authController.login));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
authRouter.post("/change-password", requireAuth, asyncHandler(async (req, _res, next) => {
    req.body = changePasswordSchema.parse(req.body);
    next();
}), asyncHandler(authController.changePassword));
