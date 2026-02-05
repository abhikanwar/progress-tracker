import { prisma } from "../../db/prisma";
import type { GoalStatus } from "@prisma/client";

export const goalsRepo = {
  list: () =>
    prisma.goal.findMany({
      orderBy: [{ updatedAt: "desc" }],
      include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),

  getById: (id: string) =>
    prisma.goal.findUnique({
      where: { id },
      include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),

  create: (data: {
    title: string;
    details?: string;
    targetDate?: Date | null;
  }) => prisma.goal.create({ data }),

  update: (
    id: string,
    data: {
      title?: string;
      details?: string;
      status?: GoalStatus;
      targetDate?: Date | null;
      currentProgress?: number;
    }
  ) => prisma.goal.update({ where: { id }, data }),

  addProgressEvent: (data: {
    goalId: string;
    value: number;
    note?: string;
  }) => prisma.progressEvent.create({ data }),

  delete: (id: string) => prisma.goal.delete({ where: { id } }),
};
