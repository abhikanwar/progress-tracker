import { goalsService } from "./goals.service.js";
export const goalsController = {
    list: async (_req, res) => {
        const goals = await goalsService.list();
        res.json(goals);
    },
    getById: async (req, res) => {
        const goal = await goalsService.getById(req.params.id);
        if (!goal) {
            res.status(404).json({ error: "Goal not found" });
            return;
        }
        res.json(goal);
    },
    create: async (req, res) => {
        const goal = await goalsService.create(req.body);
        res.status(201).json(goal);
    },
    update: async (req, res) => {
        const goal = await goalsService.update(req.params.id, req.body);
        res.json(goal);
    },
    addProgress: async (req, res) => {
        const event = await goalsService.addProgress(req.params.id, req.body);
        res.status(201).json(event);
    },
    remove: async (req, res) => {
        await goalsService.remove(req.params.id);
        res.status(204).send();
    },
};
