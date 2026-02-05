import { prisma } from "../../db/prisma";
export const goalsRepo = {
    list: () => prisma.goal.findMany({
        orderBy: [{ updatedAt: "desc" }],
        include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),
    getById: (id) => prisma.goal.findUnique({
        where: { id },
        include: { progressEvents: { orderBy: { createdAt: "desc" } } },
    }),
    create: (data) => prisma.goal.create({ data }),
    update: (id, data) => prisma.goal.update({ where: { id }, data }),
    addProgressEvent: (data) => prisma.progressEvent.create({ data }),
    delete: (id) => prisma.goal.delete({ where: { id } }),
};
