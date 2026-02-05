import { goalsRepo } from "./goals.repo.js";
export const goalsService = {
    list: () => goalsRepo.list(),
    getById: (id) => goalsRepo.getById(id),
    create: (input) => goalsRepo.create({
        title: input.title,
        details: input.details,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    }),
    update: (id, input) => goalsRepo.update(id, {
        title: input.title,
        details: input.details,
        status: input.status,
        targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
        currentProgress: input.currentProgress,
    }),
    addProgress: async (id, input) => {
        const event = await goalsRepo.addProgressEvent({
            goalId: id,
            value: input.value,
            note: input.note,
        });
        await goalsRepo.update(id, { currentProgress: input.value });
        return event;
    },
    remove: (id) => goalsRepo.delete(id),
};
