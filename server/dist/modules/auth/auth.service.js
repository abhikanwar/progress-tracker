import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
const SALT_ROUNDS = 10;
export const authService = {
    register: async (email, password) => {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            throw new Error("Email already in use");
        }
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
        const user = await prisma.user.create({
            data: { email, passwordHash },
        });
        const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: "7d" });
        return { token, user: { id: user.id, email: user.email } };
    },
    login: async (email, password) => {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            throw new Error("Invalid credentials");
        }
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
            throw new Error("Invalid credentials");
        }
        const token = jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: "7d" });
        return { token, user: { id: user.id, email: user.email } };
    },
    me: async (userId) => {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, createdAt: true },
        });
        if (!user) {
            throw new Error("User not found");
        }
        return user;
    },
    changePassword: async (userId, currentPassword, newPassword) => {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new Error("User not found");
        }
        const ok = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!ok) {
            throw new Error("Current password is incorrect");
        }
        if (currentPassword === newPassword) {
            throw new Error("New password must be different");
        }
        const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await prisma.user.update({
            where: { id: userId },
            data: { passwordHash },
        });
    },
};
