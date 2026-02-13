import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import {
  useCoachConversationsQuery,
  useCoachMessagesQuery,
  useCoachChatMutation,
  useExecuteCoachActionMutation,
  useUndoCoachActionMutation,
} from "../hooks/queries/useCoachQueries";
import { formatDateTimeInTimezone } from "../lib/datetime";
import { settingsStorage } from "../lib/settings";
import type { CoachActionProposal } from "../types/coach";

export const CoachChatPage = () => {
  const timezone = settingsStorage.getResolvedTimezone();
  const conversationsQuery = useCoachConversationsQuery();
  const chatMutation = useCoachChatMutation();
  const executeActionMutation = useExecuteCoachActionMutation();
  const undoActionMutation = useUndoCoachActionMutation();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [streamingReply, setStreamingReply] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewProposal, setPreviewProposal] = useState<CoachActionProposal | null>(null);
  const [previewDeleteConfirmText, setPreviewDeleteConfirmText] = useState("");

  const messagesQuery = useCoachMessagesQuery(selectedConversationId);

  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  const handleExecuteAction = async (proposal: CoachActionProposal) => {
    const result = await executeActionMutation.mutateAsync({
      proposalId: proposal.id,
      confirmText: proposal.type === "delete_goal" ? previewDeleteConfirmText : undefined,
    });

    if (result.resultType === "goal_deleted" && result.undoExpiresAt) {
      toast.message("Goal archived.", {
        description: "You can undo this action for 30 seconds.",
        action: {
          label: "Undo",
          onClick: () => {
            void undoActionMutation.mutateAsync({ proposalId: proposal.id });
          },
        },
      });
    }
    setPreviewDeleteConfirmText("");
    setPreviewProposal(null);
    setPreviewOpen(false);
  };

  useEffect(() => {
    if (isStartingNewChat) return;
    if (selectedConversationId) return;
    if (conversations.length === 0) return;
    setSelectedConversationId(conversations[0].id);
  }, [conversations, isStartingNewChat, selectedConversationId]);

  const handleSendMessage = async () => {
    const message = draftMessage.trim();
    if (!message) return;

    setStreamingReply("");
    try {
      const reply = await chatMutation.mutateAsync({
        conversationId: selectedConversationId ?? undefined,
        message,
        onToken: (token) => {
          setStreamingReply((current) => current + token);
        },
      });

      setDraftMessage("");
      setSelectedConversationId(reply.conversation.id);
      setIsStartingNewChat(false);
    } finally {
      setStreamingReply("");
    }
  };

  return (
    <div className="space-y-6 motion-enter">
      <div className="page-header">
        <div>
          <p className="page-kicker">Coach Chat</p>
          <h1 className="page-title">Personalized conversation</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="section-title">Chat with Coach</CardTitle>
          <CardDescription>
            Personalized conversation using your goals, progress, milestones, and recent activity.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-2 rounded-xl border border-border/70 p-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setIsStartingNewChat(true);
                setSelectedConversationId(null);
                setDraftMessage("");
              }}
            >
              New chat
            </Button>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  onClick={() => {
                    setIsStartingNewChat(false);
                    setSelectedConversationId(conversation.id);
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                    selectedConversationId === conversation.id
                      ? "border-foreground bg-muted"
                      : "border-border/70 hover:bg-muted/60"
                  }`}
                >
                  <p className="truncate font-medium">{conversation.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    {formatDateTimeInTimezone(conversation.updatedAt, timezone)}
                  </p>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="text-xs text-muted-foreground">No conversations yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-border/70 p-3">
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {messagesQuery.isLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-3/4" />
                  <Skeleton className="ml-auto h-12 w-2/3" />
                </div>
              )}
              {!messagesQuery.isLoading && messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Start the conversation by asking for personalized next steps.
                </p>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-lg border p-3 text-sm ${
                    message.role === "assistant"
                      ? "border-border/70 bg-muted/50"
                      : "ml-auto border-foreground/20 bg-foreground/5"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {message.role}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{message.content}</p>
                  {message.role === "assistant" &&
                    (message.proposedActions?.length ?? 0) > 0 && (
                      <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                        {message.proposedActions?.map((proposal) => {
                          const isPending = executeActionMutation.isPending || proposal.status !== "pending";

                          return (
                            <div
                              key={proposal.id}
                              className={`rounded-md border p-2 ${
                                proposal.type === "delete_goal"
                                  ? "border-red-400/50 bg-red-500/5"
                                  : "border-emerald-400/40 bg-emerald-500/5"
                              }`}
                            >
                              <p className="text-xs font-semibold">{proposal.label}</p>
                              {proposal.type === "create_goal" && (
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {proposal.payload.details || "No details provided"}
                                  {proposal.payload.targetDate
                                    ? ` • target ${formatDateTimeInTimezone(
                                        proposal.payload.targetDate,
                                        timezone
                                      )}`
                                    : ""}
                                  </p>
                              )}
                              {proposal.type === "delete_goal" && (
                                <p className="mt-2 text-xs text-red-400">
                                  Destructive action. Preview required before execution.
                                </p>
                              )}
                              {proposal.type === "update_goal" && (
                                <p className="mt-2 text-xs text-blue-400">
                                  Will update goal fields after preview confirmation.
                                </p>
                              )}
                              <div className="mt-2 flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={() => {
                                    setPreviewProposal(proposal);
                                    setPreviewDeleteConfirmText("");
                                    setPreviewOpen(true);
                                  }}
                                >
                                  Preview action
                                </Button>
                                <span className="text-[10px] text-muted-foreground">
                                  {proposal.status === "pending"
                                    ? `Expires ${formatDateTimeInTimezone(proposal.expiresAt, timezone)}`
                                    : `Status: ${proposal.status}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                </div>
              ))}
              {chatMutation.isPending && streamingReply.trim().length > 0 && (
                <div className="max-w-[85%] rounded-lg border border-border/70 bg-muted/50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    assistant
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{streamingReply}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                value={draftMessage}
                onChange={(event) => setDraftMessage(event.target.value)}
                placeholder="Ask Coach something specific..."
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSendMessage();
                  }
                }}
              />
              <Button onClick={() => void handleSendMessage()} disabled={chatMutation.isPending}>
                {chatMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open);
          if (!open) {
            setPreviewDeleteConfirmText("");
            setPreviewProposal(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm coach action</DialogTitle>
            <DialogDescription>
              Review this action before execution.
            </DialogDescription>
          </DialogHeader>

          {previewProposal && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border border-border/70 p-3">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Action</p>
                <p className="mt-1 font-medium">{previewProposal.label}</p>
              </div>

              {previewProposal.type === "create_goal" && (
                <div className="rounded-md border border-emerald-400/30 bg-emerald-500/5 p-3">
                  <p className="font-medium">Goal preview</p>
                  <p className="mt-1">Title: {previewProposal.payload.title}</p>
                  <p className="mt-1 text-muted-foreground">
                    Details: {previewProposal.payload.details || "No details"}
                  </p>
                  <p className="mt-1 text-muted-foreground">
                    Target date:{" "}
                    {previewProposal.payload.targetDate
                      ? formatDateTimeInTimezone(previewProposal.payload.targetDate, timezone)
                      : "Not set"}
                  </p>
                </div>
              )}

              {previewProposal.type === "delete_goal" && (
                <div className="space-y-2 rounded-md border border-red-400/40 bg-red-500/5 p-3">
                  <p className="font-medium text-red-300">
                    You are deleting: {previewProposal.payload.goalTitle}
                  </p>
                  <p className="text-xs text-red-300">
                    Type DELETE to confirm this destructive action.
                  </p>
                  <Input
                    value={previewDeleteConfirmText}
                    onChange={(event) => setPreviewDeleteConfirmText(event.target.value)}
                    placeholder="Type DELETE"
                    className="h-9"
                  />
                </div>
              )}

              {previewProposal.type === "update_goal" && (
                <div className="space-y-2 rounded-md border border-blue-400/40 bg-blue-500/5 p-3">
                  <p className="font-medium">Update preview for "{previewProposal.payload.goalTitle}"</p>
                  <p className="text-sm text-muted-foreground">
                    {previewProposal.payload.title
                      ? `Title -> ${previewProposal.payload.title}`
                      : "Title unchanged"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {previewProposal.payload.details
                      ? `Details -> ${previewProposal.payload.details}`
                      : "Details unchanged"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {previewProposal.payload.targetDate
                      ? `Target date -> ${formatDateTimeInTimezone(previewProposal.payload.targetDate, timezone)}`
                      : "Target date unchanged"}
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant={previewProposal.type === "delete_goal" ? "outline" : "default"}
                  className={
                    previewProposal.type === "delete_goal"
                      ? "border-red-500/60 text-red-300 hover:bg-red-500/10"
                      : undefined
                  }
                  disabled={
                    executeActionMutation.isPending ||
                    (previewProposal.type === "delete_goal" &&
                      previewDeleteConfirmText !== "DELETE")
                  }
                  onClick={() => void handleExecuteAction(previewProposal)}
                >
                  {executeActionMutation.isPending ? "Executing..." : "Execute action"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
