import { prisma } from "../../db/prisma.js";
import type { GoalStatus } from "@prisma/client";

export const goalsRepo = {
  list: (userId: string) =>
    prisma.goal.findMany({
      where: { userId },
      orderBy: [{ updatedAt: "desc" }],
      include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),

  getById: (userId: string, id: string) =>
    prisma.goal.findUnique({
      where: { id_userId: { id, userId } },
      include: { progressEvents: { orderBy: { createdAt: "desc" } } },
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

  delete: (userId: string, id: string) =>
    prisma.goal.delete({ where: { id_userId: { id, userId } } }),
};
