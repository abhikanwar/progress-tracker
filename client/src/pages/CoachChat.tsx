import { useEffect, useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import {
  useCoachConversationsQuery,
  useCoachMessagesQuery,
  useCoachChatMutation,
} from "../hooks/queries/useCoachQueries";
import { formatDateTimeInTimezone } from "../lib/datetime";
import { settingsStorage } from "../lib/settings";

export const CoachChatPage = () => {
  const timezone = settingsStorage.getResolvedTimezone();
  const conversationsQuery = useCoachConversationsQuery();
  const chatMutation = useCoachChatMutation();

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isStartingNewChat, setIsStartingNewChat] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  const messagesQuery = useCoachMessagesQuery(selectedConversationId);

  const conversations = conversationsQuery.data ?? [];
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    if (isStartingNewChat) return;
    if (selectedConversationId) return;
    if (conversations.length === 0) return;
    setSelectedConversationId(conversations[0].id);
  }, [conversations, isStartingNewChat, selectedConversationId]);

  const handleSendMessage = async () => {
    const message = draftMessage.trim();
    if (!message) return;

    const reply = await chatMutation.mutateAsync({
      conversationId: selectedConversationId ?? undefined,
      message,
    });

    setDraftMessage("");
    setSelectedConversationId(reply.conversation.id);
    setIsStartingNewChat(false);
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
                </div>
              ))}
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
    </div>
  );
};
