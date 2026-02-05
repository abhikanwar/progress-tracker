import type { GoalStatus } from "@prisma/client";
import { goalsRepo } from "./goals.repo";

export const goalsService = {
  list: () => goalsRepo.list(),

  getById: (id: string) => goalsRepo.getById(id),

  create: (input: { title: string; details?: string; targetDate?: string }) =>
    goalsRepo.create({
      title: input.title,
      details: input.details,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    }),

  update: (
    id: string,
    input: {
      title?: string;
      details?: string;
      status?: GoalStatus;
      targetDate?: string;
      currentProgress?: number;
    }
  ) =>
    goalsRepo.update(id, {
      title: input.title,
      details: input.details,
      status: input.status,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      currentProgress: input.currentProgress,
    }),

  addProgress: async (
    id: string,
    input: { value: number; note?: string }
  ) => {
    const event = await goalsRepo.addProgressEvent({
      goalId: id,
      value: input.value,
      note: input.note,
    });

    await goalsRepo.update(id, { currentProgress: input.value });

    return event;
  },

  remove: (id: string) => goalsRepo.delete(id),
};
