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
        const event = await goalsRepo.addProgressEvent(userId, {
            goalId: id,
            value: input.value,
            note: input.note,
        });
        await goalsRepo.update(id, { userId, currentProgress: input.value });
        return event;
    },
    remove: (userId, id) => goalsRepo.delete(userId, id),
};
