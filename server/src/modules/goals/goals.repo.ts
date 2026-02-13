import { prisma } from "../../db/prisma.js";
import type { GoalStatus } from "@prisma/client";

export const goalsRepo = {
  list: (userId: string) =>
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        progressEvents: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { createdAt: "asc" } },
        goalTags: {
          orderBy: { createdAt: "asc" },
          include: { tag: true },
        },
      },
    }),

  getById: (userId: string, id: string) =>
    prisma.goal.findUnique({
      where: { id_userId: { id, userId } },
      include: {
        progressEvents: { orderBy: { createdAt: "desc" } },
        milestones: { orderBy: { createdAt: "asc" } },
        goalTags: {
          orderBy: { createdAt: "asc" },
          include: { tag: true },
        },
      },
    }),

  create: (data: {
    userId: string;
    title: string;
    details?: string;
    targetDate?: Date | null;
  }) => prisma.goal.create({ data }),

  update: (
    id: string,
    data: {
      userId: string;
      title?: string;
      details?: string;
      status?: GoalStatus;
      targetDate?: Date | null;
      currentProgress?: number;
    }
  ) =>
    prisma.goal.update({
      where: { id_userId: { id, userId: data.userId } },
      data,
    }),

  addProgressEvent: async (
    userId: string,
    data: {
      goalId: string;
      value: number;
      note?: string;
    }
  ) => {
    const goal = await prisma.goal.findUnique({
      where: { id_userId: { id: data.goalId, userId } },
      select: { id: true },
    });
    if (!goal) {
      throw new Error("Goal not found");
    }
    return prisma.progressEvent.create({ data });
  },

  addMilestone: async (
    userId: string,
    data: {
      goalId: string;
      title: string;
    }
  ) => {
    const goal = await prisma.goal.findUnique({
      where: { id_userId: { id: data.goalId, userId } },
      select: { id: true },
    });
    if (!goal) {
      throw new Error("Goal not found");
    }
    return prisma.goalMilestone.create({ data });
  },

  updateMilestone: async (
    userId: string,
    milestoneId: string,
    data: {
      title?: string;
      completed?: boolean;
    }
  ) => {
    const milestone = await prisma.goalMilestone.findFirst({
      where: { id: milestoneId, goal: { userId } },
      select: { id: true },
    });
    if (!milestone) {
      throw new Error("Milestone not found");
    }
    return prisma.goalMilestone.update({
      where: { id: milestoneId },
      data,
    });
  },

  deleteMilestone: async (userId: string, milestoneId: string) => {
    const result = await prisma.goalMilestone.deleteMany({
      where: { id: milestoneId, goal: { userId } },
    });
    if (result.count === 0) {
      throw new Error("Milestone not found");
    }
  },

  listTags: (userId: string) =>
    prisma.tag.findMany({
      where: { userId },
      orderBy: { name: "asc" },
    }),

  addTagToGoal: async (userId: string, goalId: string, tagName: string) => {
    const goal = await prisma.goal.findUnique({
      where: { id_userId: { id: goalId, userId } },
      select: { id: true },
    });
    if (!goal) {
      throw new Error("Goal not found");
    }

    const normalizedName = tagName.trim().toLowerCase();
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name: normalizedName } },
      update: {},
      create: { userId, name: normalizedName },
    });

    await prisma.goalTag.upsert({
      where: { goalId_tagId: { goalId, tagId: tag.id } },
      update: {},
      create: { goalId, tagId: tag.id },
    });

    return prisma.goalTag.findUnique({
      where: { goalId_tagId: { goalId, tagId: tag.id } },
      include: { tag: true },
    });
  },

  removeTagFromGoal: async (userId: string, goalId: string, tagId: string) => {
    const goal = await prisma.goal.findUnique({
      where: { id_userId: { id: goalId, userId } },
      select: { id: true },
    });
    if (!goal) {
      throw new Error("Goal not found");
    }

    const tag = await prisma.tag.findFirst({
      where: { id: tagId, userId },
      select: { id: true },
    });
    if (!tag) {
      throw new Error("Tag not found");
    }

    await prisma.goalTag.deleteMany({
      where: { goalId, tagId },
    });
  },

  delete: (userId: string, id: string) =>
    prisma.goal.delete({ where: { id_userId: { id, userId } } }),
};
