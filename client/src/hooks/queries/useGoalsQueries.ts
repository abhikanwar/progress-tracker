import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { goalsApi } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import type {
  Goal,
  GoalInput,
  GoalUpdate,
  MilestoneInput,
  MilestoneUpdate,
  ProgressInput,
} from "../../types/goals";

const getSafeGoals = (goals: Goal[] | undefined) => goals ?? [];

export const useGoalsListQuery = () =>
  useQuery({
    queryKey: queryKeys.goals.list(),
    queryFn: goalsApi.list,
  });

export const useGoalTagsQuery = () =>
  useQuery({
    queryKey: queryKeys.goals.tags(),
    queryFn: goalsApi.listTags,
  });

export const useCreateGoalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: GoalInput) => goalsApi.create(payload),
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );

      const now = new Date().toISOString();
      const tempId = `temp-goal-${Date.now()}`;
      const tempGoal: Goal = {
        id: tempId,
        title: payload.title,
        details: payload.details ?? null,
        status: "ACTIVE",
        targetDate: payload.targetDate ?? null,
        currentProgress: 0,
        createdAt: now,
        updatedAt: now,
        progressEvents: [],
        milestones: [],
        goalTags: [],
      };

      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), [tempGoal, ...previousGoals]);

      return { previousGoals, tempId };
    },
    onError: (_error, _payload, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (createdGoal, _payload, context) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === context?.tempId ? createdGoal : goal
        )
      );
    },
  });
};

export const useUpdateGoalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: GoalUpdate }) =>
      goalsApi.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );

      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === id
            ? {
                ...goal,
                ...payload,
                details: payload.details ?? goal.details,
                updatedAt: new Date().toISOString(),
              }
            : goal
        )
      );

      return { previousGoals };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (goal) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((item) => (item.id === goal.id ? goal : item))
      );
    },
  });
};

export const useDeleteGoalMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).filter((goal) => goal.id !== id)
      );
      return { previousGoals };
    },
    onError: (_error, _id, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
  });
};

export const useAddProgressMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: ProgressInput }) =>
      goalsApi.addProgress(goalId, payload),
    onMutate: async ({ goalId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      const now = new Date().toISOString();
      const tempProgressId = `temp-progress-${Date.now()}`;

      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                currentProgress: payload.value,
                updatedAt: now,
                progressEvents: [
                  {
                    id: tempProgressId,
                    goalId,
                    value: payload.value,
                    note: payload.note ?? null,
                    createdAt: now,
                  },
                  ...(goal.progressEvents ?? []),
                ],
              }
            : goal
        )
      );

      return { previousGoals, tempProgressId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (event, { goalId }, context) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                progressEvents: (goal.progressEvents ?? []).map((item) =>
                  item.id === context?.tempProgressId ? event : item
                ),
              }
            : goal
        )
      );
    },
  });
};

export const useAddMilestoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: MilestoneInput }) =>
      goalsApi.addMilestone(goalId, payload),
    onMutate: async ({ goalId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      const now = new Date().toISOString();
      const tempMilestoneId = `temp-milestone-${Date.now()}`;

      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                milestones: [
                  {
                    id: tempMilestoneId,
                    goalId,
                    title: payload.title,
                    completed: false,
                    createdAt: now,
                    updatedAt: now,
                  },
                  ...(goal.milestones ?? []),
                ],
              }
            : goal
        )
      );

      return { previousGoals, tempMilestoneId, goalId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (milestone, _variables, context) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === context?.goalId
            ? {
                ...goal,
                milestones: (goal.milestones ?? []).map((item) =>
                  item.id === context.tempMilestoneId ? milestone : item
                ),
              }
            : goal
        )
      );
    },
  });
};

export const useUpdateMilestoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      goalId,
      milestoneId,
      payload,
    }: {
      goalId: string;
      milestoneId: string;
      payload: MilestoneUpdate;
    }) => goalsApi.updateMilestone(goalId, milestoneId, payload),
    onMutate: async ({ goalId, milestoneId, payload }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                milestones: (goal.milestones ?? []).map((milestone) =>
                  milestone.id === milestoneId ? { ...milestone, ...payload } : milestone
                ),
              }
            : goal
        )
      );
      return { previousGoals };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (updatedMilestone, { goalId }) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                milestones: (goal.milestones ?? []).map((milestone) =>
                  milestone.id === updatedMilestone.id ? updatedMilestone : milestone
                ),
              }
            : goal
        )
      );
    },
  });
};

export const useDeleteMilestoneMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, milestoneId }: { goalId: string; milestoneId: string }) =>
      goalsApi.removeMilestone(goalId, milestoneId),
    onMutate: async ({ goalId, milestoneId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                milestones: (goal.milestones ?? []).filter(
                  (milestone) => milestone.id !== milestoneId
                ),
              }
            : goal
        )
      );
      return { previousGoals };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
  });
};

export const useAddTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, name }: { goalId: string; name: string }) =>
      goalsApi.addTag(goalId, name),
    onMutate: async ({ goalId, name }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      const now = new Date().toISOString();
      const tempTagId = `temp-tag-${Date.now()}`;
      const tempGoalTagId = `temp-goal-tag-${Date.now()}`;

      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                goalTags: [
                  {
                    id: tempGoalTagId,
                    goalId,
                    tagId: tempTagId,
                    createdAt: now,
                    tag: {
                      id: tempTagId,
                      userId: "temp-user",
                      name,
                      createdAt: now,
                    },
                  },
                  ...(goal.goalTags ?? []),
                ],
              }
            : goal
        )
      );

      return { previousGoals, goalId, tempTagId, tempGoalTagId };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSuccess: (goalTag, _variables, context) => {
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === context?.goalId
            ? {
                ...goal,
                goalTags: (goal.goalTags ?? []).map((item) =>
                  item.id === context.tempGoalTagId ? goalTag : item
                ),
              }
            : goal
        )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.tags() });
    },
  });
};

export const useDeleteTagMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, tagId }: { goalId: string; tagId: string }) =>
      goalsApi.removeTag(goalId, tagId),
    onMutate: async ({ goalId, tagId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.goals.list() });
      const previousGoals = getSafeGoals(
        queryClient.getQueryData<Goal[]>(queryKeys.goals.list())
      );
      queryClient.setQueryData<Goal[]>(queryKeys.goals.list(), (current) =>
        getSafeGoals(current).map((goal) =>
          goal.id === goalId
            ? {
                ...goal,
                goalTags: (goal.goalTags ?? []).filter((goalTag) => goalTag.tagId !== tagId),
              }
            : goal
        )
      );
      return { previousGoals };
    },
    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(queryKeys.goals.list(), context.previousGoals);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.goals.tags() });
    },
  });
};
