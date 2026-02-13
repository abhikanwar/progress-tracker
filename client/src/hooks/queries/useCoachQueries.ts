import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { coachApi } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
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
    mutationFn: (payload: { conversationId?: string; message: string }) =>
      coachApi.sendMessage(payload),
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
