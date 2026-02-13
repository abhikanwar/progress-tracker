import { goalTemplatesRepo } from "./goalTemplates.repo.js";

export const goalTemplatesService = {
  list: (input: { category?: string; search?: string }) => goalTemplatesRepo.list(input),

  apply: async (
    userId: string,
    templateId: string,
    input: {
      titleOverride?: string;
      detailsOverride?: string;
      targetDateOverride?: string;
    }
  ) => {
    const template = await goalTemplatesRepo.getById(templateId);
    if (!template) return null;

    return goalTemplatesRepo.applyToUserGoal(
      userId,
      {
        id: template.id,
        name: template.name,
        description: template.description,
        milestones: template.milestones.map((milestone) => ({
          title: milestone.title,
          sortOrder: milestone.sortOrder,
        })),
        tags: template.tags.map((tag) => ({ name: tag.name })),
      },
      {
        title: input.titleOverride,
        details: input.detailsOverride,
        targetDate: input.targetDateOverride ? new Date(input.targetDateOverride) : undefined,
      }
    );
  },
};
