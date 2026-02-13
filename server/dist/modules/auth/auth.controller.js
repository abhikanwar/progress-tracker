import { authService } from "./auth.service.js";
export const authController = {
    register: async (req, res) => {
        const { email, password } = req.body;
        try {
            const result = await authService.register(email, password);
            res.status(201).json(result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Registration failed";
            res.status(400).json({ error: message });
        }
    },
    login: async (req, res) => {
        const { email, password } = req.body;
        try {
            const result = await authService.login(email, password);
            res.json(result);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Login failed";
            res.status(401).json({ error: message });
        }
    },
    me: async (req, res) => {
        try {
            const user = await authService.me(req.user.id);
            res.json(user);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to load profile";
            res.status(404).json({ error: message });
        }
    },
    changePassword: async (req, res) => {
        const { currentPassword, newPassword } = req.body;
        try {
            await authService.changePassword(req.user.id, currentPassword, newPassword);
            res.status(204).send();
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "Failed to update password";
            res.status(400).json({ error: message });
        }
    },
};
