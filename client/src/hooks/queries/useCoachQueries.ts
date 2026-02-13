import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { coachApi } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import type { Goal } from "../../types/goals";
import type { CoachChatReply, CoachInsight } from "../../types/coach";

export const useCoachInsightQuery = () =>
  useQuery({
    queryKey: queryKeys.coach.insight(),
    queryFn: coachApi.getInsight,
  });

export const useCoachCompletionRateQuery = (windowDays = 7) =>
  useQuery({
    queryKey: queryKeys.coach.completionRate(windowDays),
    queryFn: () => coachApi.getCompletionRate(windowDays),
  });

export const useGenerateCoachInsightMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coachApi.generateInsight,
    onSuccess: (insight: CoachInsight) => {
      queryClient.setQueryData(queryKeys.coach.insight(), insight);
      toast.success(
        insight.source === "ai"
          ? "AI Coach brief generated."
          : "Coach brief generated with fallback rules."
      );
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to generate coach brief";
      toast.error(message);
    },
  });
};

export const useCompleteCoachActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, insightId }: { goalId: string; insightId: string }) =>
      coachApi.completeAction(goalId, insightId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coach.completionRate(7) });
      toast.success("Action marked complete.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to complete action";
      toast.error(message);
    },
  });
};

export const useCoachConversationsQuery = () =>
  useQuery({
    queryKey: queryKeys.coach.conversations(),
    queryFn: coachApi.listConversations,
  });

export const useCoachMessagesQuery = (conversationId: string | null) =>
  useQuery({
    queryKey: queryKeys.coach.messages(conversationId ?? ""),
    queryFn: () => coachApi.listMessages(conversationId ?? ""),
    enabled: Boolean(conversationId),
  });

export const useCoachChatMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      conversationId?: string;
      message: string;
      onToken?: (token: string) => void;
      signal?: AbortSignal;
    }) => coachApi.sendMessageStream(payload),
    onSuccess: (reply: CoachChatReply) => {
      queryClient.setQueryData(
        queryKeys.coach.messages(reply.conversation.id),
        (current: unknown) => {
          const existing = Array.isArray(current) ? current : [];
          return [...existing, reply.userMessage, reply.assistantMessage];
        }
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.coach.conversations() });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to send message";
      toast.error(message);
    },
  });
};

export const useExecuteCoachActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coachApi.executeChatAction,
    onSuccess: (result) => {
      if (result.resultType === "goal_created" && result.goal) {
        queryClient.setQueryData(queryKeys.goals.list(), (current: unknown) => {
          const existing = Array.isArray(current) ? (current as Goal[]) : [];
          return [result.goal, ...existing];
        });
        toast.success("Goal created from coach action.");
      } else if (result.resultType === "goal_updated" && result.goal) {
        queryClient.setQueryData(queryKeys.goals.list(), (current: unknown) => {
          const existing = Array.isArray(current) ? (current as Goal[]) : [];
          return existing.map((goal) => (goal.id === result.goal?.id ? result.goal : goal));
        });
        toast.success("Goal updated from coach action.");
      } else if (result.resultType === "goal_deleted" && result.goalId) {
        queryClient.setQueryData(queryKeys.goals.list(), (current: unknown) => {
          const existing = Array.isArray(current) ? (current as Goal[]) : [];
          return existing.map((goal) =>
            goal.id === result.goalId ? { ...goal, status: "ARCHIVED" } : goal
          );
        });
        toast.success("Goal deleted from coach action.");
      } else {
        toast.success("Coach action executed.");
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.coach.conversations() });
      void queryClient.invalidateQueries({ queryKey: ["coach", "chat", "messages"] });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to execute coach action";
      toast.error(message);
    },
  });
};

export const useUndoCoachActionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: coachApi.undoChatAction,
    onSuccess: (result) => {
      if (result.goal) {
        queryClient.setQueryData(queryKeys.goals.list(), (current: unknown) => {
          const existing = Array.isArray(current) ? (current as Goal[]) : [];
          const without = existing.filter((goal) => goal.id !== result.goal?.id);
          return [result.goal, ...without];
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals.list() });
      toast.success("Action undone.");
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Failed to undo action";
      toast.error(message);
    },
  });
};
