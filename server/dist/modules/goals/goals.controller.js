import { goalsService } from "./goals.service.js";
export const goalsController = {
    list: async (req, res) => {
        const goals = await goalsService.list(req.user.id);
        res.json(goals);
    },
    getById: async (req, res) => {
        const goal = await goalsService.getById(req.user.id, req.params.id);
        if (!goal) {
            res.status(404).json({ error: "Goal not found" });
            return;
        }
        res.json(goal);
    },
    create: async (req, res) => {
        const goal = await goalsService.create(req.user.id, req.body);
        res.status(201).json(goal);
    },
    update: async (req, res) => {
        const goal = await goalsService.update(req.user.id, req.params.id, req.body);
        res.json(goal);
    },
    addProgress: async (req, res) => {
        const event = await goalsService.addProgress(req.user.id, req.params.id, req.body);
        res.status(201).json(event);
    },
    addMilestone: async (req, res) => {
        const milestone = await goalsService.addMilestone(req.user.id, req.params.id, req.body);
        res.status(201).json(milestone);
    },
    updateMilestone: async (req, res) => {
        const milestone = await goalsService.updateMilestone(req.user.id, req.params.milestoneId, req.body);
        res.json(milestone);
    },
    removeMilestone: async (req, res) => {
        await goalsService.removeMilestone(req.user.id, req.params.milestoneId);
        res.status(204).send();
    },
    listTags: async (req, res) => {
        const tags = await goalsService.listTags(req.user.id);
        res.json(tags);
    },
    addTag: async (req, res) => {
        const goalTag = await goalsService.addTag(req.user.id, req.params.id, req.body);
        res.status(201).json(goalTag);
    },
    removeTag: async (req, res) => {
        await goalsService.removeTag(req.user.id, req.params.id, req.params.tagId);
        res.status(204).send();
    },
    remove: async (req, res) => {
        await goalsService.remove(req.user.id, req.params.id);
        res.status(204).send();
    },
};
