import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { goalTemplatesApi } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import type { Goal } from "../../types/goals";
import type { ApplyTemplateInput } from "../../types/templates";

const getSafeGoals = (goals: Goal[] | undefined) => goals ?? [];

export const useGoalTemplatesQuery = (filters?: { category?: string; search?: string }) =>
  useQuery({
    queryKey: queryKeys.templates.list(filters),
    queryFn: () => goalTemplatesApi.list(filters),
  });

export const useApplyTemplateMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: ApplyTemplateInput }) =>
      goalTemplatesApi.apply(templateId, payload),
    onSuccess: (createdGoal) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) => {
        const goals = getSafeGoals(current);
        if (goals.some((goal) => goal.id === createdGoal.id)) {
          return goals;
        }
        return [createdGoal, ...goals];
      });

      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.tags() });
      toast.success("Goal created from template.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to apply template";
      toast.error(message);
    },
  });
};
