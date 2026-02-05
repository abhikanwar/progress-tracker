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
};
