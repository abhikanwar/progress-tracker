import { prisma } from "../../db/prisma.js";
export const goalTemplatesRepo = {
    list: (filters) => prisma.goalTemplate.findMany({
        where: {
            ...(filters.category ? { category: filters.category } : {}),
            ...(filters.search
                ? {
                    OR: [
                        { name: { contains: filters.search, mode: "insensitive" } },
                        { description: { contains: filters.search, mode: "insensitive" } },
                    ],
                }
                : {}),
        },
        include: {
            milestones: { orderBy: { sortOrder: "asc" } },
            tags: { orderBy: { name: "asc" } },
        },
        orderBy: [{ category: "asc" }, { name: "asc" }],
    }),
    getById: (id) => prisma.goalTemplate.findUnique({
        where: { id },
        include: {
            milestones: { orderBy: { sortOrder: "asc" } },
            tags: { orderBy: { name: "asc" } },
        },
    }),
    applyToUserGoal: async (userId, template, input) => {
        const goal = await prisma.$transaction(async (tx) => {
            const createdGoal = await tx.goal.create({
                data: {
                    userId,
                    title: input.title ?? template.name,
                    details: input.details ?? template.description ?? undefined,
                    targetDate: input.targetDate,
                    status: "ACTIVE",
                    currentProgress: 0,
                },
            });
            if (template.milestones.length > 0) {
                await tx.goalMilestone.createMany({
                    data: template.milestones.map((milestone) => ({
                        goalId: createdGoal.id,
                        title: milestone.title,
                    })),
                });
            }
            for (const tag of template.tags) {
                const normalizedName = tag.name.trim().toLowerCase();
                if (!normalizedName)
                    continue;
                const savedTag = await tx.tag.upsert({
                    where: { userId_name: { userId, name: normalizedName } },
                    update: {},
                    create: { userId, name: normalizedName },
                });
                await tx.goalTag.upsert({
                    where: { goalId_tagId: { goalId: createdGoal.id, tagId: savedTag.id } },
                    update: {},
                    create: { goalId: createdGoal.id, tagId: savedTag.id },
                });
            }
            return tx.goal.findUnique({
                where: { id_userId: { id: createdGoal.id, userId } },
                include: {
                    progressEvents: { orderBy: { createdAt: "desc" } },
                    milestones: { orderBy: { createdAt: "asc" } },
                    goalTags: {
                        orderBy: { createdAt: "asc" },
                        include: { tag: true },
                    },
                },
            });
        });
        return goal;
    },
};
