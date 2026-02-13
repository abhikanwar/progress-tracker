import type { GoalStatus } from "@prisma/client";
import { goalsRepo } from "./goals.repo.js";

export const goalsService = {
  list: (userId: string) => goalsRepo.list(userId),

  getById: (userId: string, id: string) => goalsRepo.getById(userId, id),

  create: (userId: string, input: { title: string; details?: string; targetDate?: string }) =>
    goalsRepo.create({
      userId,
      title: input.title,
      details: input.details,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
    }),

  update: (
    userId: string,
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
      userId,
      title: input.title,
      details: input.details,
      status: input.status,
      targetDate: input.targetDate ? new Date(input.targetDate) : undefined,
      currentProgress: input.currentProgress,
    }),

  addProgress: async (
    userId: string,
    id: string,
    input: { value: number; note?: string }
  ) => {
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
      status:
        goal.status === "ARCHIVED"
          ? undefined
          : input.value >= 100
            ? "COMPLETED"
            : "ACTIVE",
    });

    return event;
  },

  addMilestone: (userId: string, id: string, input: { title: string }) =>
    goalsRepo.addMilestone(userId, {
      goalId: id,
      title: input.title,
    }),

  updateMilestone: (
    userId: string,
    milestoneId: string,
    input: { title?: string; completed?: boolean }
  ) => goalsRepo.updateMilestone(userId, milestoneId, input),

  removeMilestone: (userId: string, milestoneId: string) =>
    goalsRepo.deleteMilestone(userId, milestoneId),

  listTags: (userId: string) => goalsRepo.listTags(userId),

  addTag: (userId: string, goalId: string, input: { name: string }) =>
    goalsRepo.addTagToGoal(userId, goalId, input.name),

  removeTag: (userId: string, goalId: string, tagId: string) =>
    goalsRepo.removeTagFromGoal(userId, goalId, tagId),

  remove: (userId: string, id: string) => goalsRepo.delete(userId, id),
};
