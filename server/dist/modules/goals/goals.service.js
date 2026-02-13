import { goalsRepo } from "./goals.repo.js";
export const goalsService = {
    list: (userId) => goalsRepo.list(userId),
    getById: (userId, id) => goalsRepo.getById(userId, id),
    create: (userId, input) => goalsRepo.create({
        userId,
        title: input.title,
        details: input.details,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    }),
    update: (userId, id, input) => goalsRepo.update(id, {
        userId,
        title: input.title,
        details: input.details,
        status: input.status,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        currentProgress: input.currentProgress,
    }),
    addProgress: async (userId, id, input) => {
        const goal = await goalsRepo.getById(userId, id);
        if (!goal) {
            throw new Error("Goal not found");
        }
        const event = await goalsRepo.addProgressEvent(userId, {
            goalId: id,
            value: input.value,
            note: input.note,
        });
        await goalsRepo.update(id, {
            userId,
            currentProgress: input.value,
            status: input.value === 100 && goal.status !== "ARCHIVED" ? "COMPLETED" : undefined,
        });
        return event;
    },
    addMilestone: (userId, id, input) => goalsRepo.addMilestone(userId, {
        goalId: id,
        title: input.title,
    }),
    updateMilestone: (userId, milestoneId, input) => goalsRepo.updateMilestone(userId, milestoneId, input),
    removeMilestone: (userId, milestoneId) => goalsRepo.deleteMilestone(userId, milestoneId),
    listTags: (userId) => goalsRepo.listTags(userId),
    addTag: (userId, goalId, input) => goalsRepo.addTagToGoal(userId, goalId, input.name),
    removeTag: (userId, goalId, tagId) => goalsRepo.removeTagFromGoal(userId, goalId, tagId),
    remove: (userId, id) => goalsRepo.delete(userId, id),
};
