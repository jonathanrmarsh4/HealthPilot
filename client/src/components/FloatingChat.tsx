import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, X, MessageCircle, Loader2, Minimize2, Sparkles } from "lucide-react";
import type { ChatMessage } from "@shared/schema";

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
}

export function FloatingChat({ isOpen, onClose, currentPage }: FloatingChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    }
  }, [isOpen]);

  const { data: messages, isLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/chat/history"],
    enabled: isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest("POST", "/api/chat", { 
        message: content,
        currentPage: currentPage || "Unknown Page"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      setMessage("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

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

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-md ${
        isMinimized ? "max-h-[60px]" : "h-[min(max(10rem,calc(100dvh-2rem)),600px)]"
      }`}
    >
      <Card className="flex flex-col h-full shadow-lg bg-background/90 border-purple-500/50">
        <div className="flex items-center justify-between gap-2 p-4 border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-semibold">Health Coach</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 text-white hover:bg-white/20"
              data-testid="button-minimize-chat"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="h-8 w-8 text-white hover:bg-white/20"
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : messages && messages.length > 0 ? (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    data-testid={`floating-message-${msg.role}-${index}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-3 text-sm ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-32 text-center text-muted-foreground text-sm">
                  <div>
                    <p className="font-medium">Start a conversation</p>
                    <p className="text-xs mt-1">
                      Ask about your health, fitness, or nutrition
                    </p>
                  </div>
                </div>
              )}
              
              {sendMessageMutation.isPending && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg p-3 bg-muted">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <p className="text-sm">Thinking...</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask your health coach..."
                  className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  rows={2}
                  disabled={sendMessageMutation.isPending}
                  data-testid="input-floating-chat-message"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!message.trim() || sendMessageMutation.isPending}
                  data-testid="button-send-floating-message"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

export function FloatingChatTrigger({ onClick }: { onClick: () => void }) {
  return (
    <Button
      size="icon"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 h-10 w-10 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 border-2 border-purple-400 hover:border-purple-300 animate-pulse hover:animate-none transition-all hover:scale-110"
      onClick={onClick}
      data-testid="button-open-floating-chat"
    >
      <Sparkles className="h-5 w-5 text-white" />
    </Button>
  );
}
