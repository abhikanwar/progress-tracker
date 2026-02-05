import { prisma } from "../../db/prisma.js";
export const goalsRepo = {
    list: (userId) => prisma.goal.findMany({
        where: { userId },
        orderBy: [{ updatedAt: "desc" }],
        include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),
    getById: (userId, id) => prisma.goal.findUnique({
        where: { id_userId: { id, userId } },
        include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),
    create: (data) => prisma.goal.create({ data }),
    update: (id, data) => prisma.goal.update({
        where: { id_userId: { id, userId: data.userId } },
        data,
    }),
    addProgressEvent: async (userId, data) => {
        const goal = await prisma.goal.findUnique({
            where: { id_userId: { id: data.goalId, userId } },
            select: { id: true },
        });
        if (!goal) {
            throw new Error("Goal not found");
        }
        return prisma.progressEvent.create({ data });
    },
    delete: (userId, id) => prisma.goal.delete({ where: { id_userId: { id, userId } } }),
};
