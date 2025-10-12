import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Link } from "wouter";
import { Send, Trash2, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "@shared/schema";

export default function Chat() {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [clearedAtTimestamp, setClearedAtTimestamp] = useState<string | null>(() => {
    // Persist cleared state in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatClearedAt');
    }
    return null;
  });

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { 
        message: content,
        currentPage: "Health Coach Chat"
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      setMessage("");
      
      // Show success notification if training plan was saved
      if (data.trainingPlanSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
        toast({
          title: "Training Plan Added! 🎉",
          description: "Your personalized workout plan has been added to your Training page",
        });
      }
      
      // Show success notification if meal plan was saved
      if (data.mealPlanSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
        toast({
          title: "Meal Plan Added! 🍽️",
          description: "Your personalized meal plan has been added to your Meal Plans page",
        });
      }
      
      // Show success notification if goal was saved
      if (data.goalSaved) {
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
        toast({
          title: "Goal Added! 🎯",
          description: "Your health goal has been added to your Goals page.",
          action: (
            <ToastAction altText="View Goals" asChild>
              <Link href="/goals">View Goals</Link>
            </ToastAction>
          ),
        });
      }
      // Don't reset cleared state - let new messages appear after the cleared timestamp
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleClearChat = () => {
    const now = new Date().toISOString();
    setClearedAtTimestamp(now);
    localStorage.setItem('chatClearedAt', now);
    toast({
      title: "Chat cleared",
      description: "Your conversation history is preserved for context",
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between gap-4 pb-6 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Health Coach</h1>
          <p className="text-muted-foreground mt-2">
            Chat with AI to discuss your fitness and health goals
          </p>
        </div>
        {messages && messages.length > 0 && (
          <Button
            variant="outline"
            onClick={handleClearChat}
            data-testid="button-clear-history"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Chat
          </Button>
        )}
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={i % 2 === 0 ? "flex justify-end" : ""}>
                  <Skeleton className="h-20 w-3/4" />
                </div>
              ))}
            </div>
          ) : (() => {
            // Filter messages to only show those at or after the cleared timestamp
            const visibleMessages = messages && clearedAtTimestamp
              ? messages.filter(msg => {
                  if (!msg.createdAt) return false;
                  const msgTime = typeof msg.createdAt === 'string' ? msg.createdAt : msg.createdAt.toISOString();
                  return msgTime >= clearedAtTimestamp;
                })
              : messages || [];
            
            return visibleMessages.length > 0 ? (
              visibleMessages.map((msg, index) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${msg.role}-${index}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className="text-xs mt-2 opacity-70">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-center text-muted-foreground">
                <div>
                  <p className="text-lg font-medium">Start a conversation</p>
                  <p className="text-sm mt-2">
                    Ask about your fitness goals, nutrition, or training plans
                  </p>
                </div>
              </div>
            );
          })()}
          
          {sendMessageMutation.isPending && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg p-4 bg-muted">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={3}
              disabled={sendMessageMutation.isPending}
              data-testid="input-chat-message"
            />
            <Button
              type="submit"
              disabled={!message.trim() || sendMessageMutation.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
