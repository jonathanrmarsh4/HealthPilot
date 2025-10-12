import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { Link } from "wouter";
import { Send, X, MessageCircle, Loader2, Minimize2, Sparkles, Trash2, SkipForward, CheckCircle2 } from "lucide-react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import type { ChatMessage } from "@shared/schema";

interface FloatingChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage?: string;
}

const ONBOARDING_STEPS = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'apple_health', label: 'Apple Health' },
  { key: 'health_records', label: 'Health Records' },
  { key: 'training_plan', label: 'Training Plan' },
  { key: 'meal_plan', label: 'Meal Plan' },
] as const;

const STEP_NEXT_MAP = {
  'welcome': 'apple_health',
  'apple_health': 'health_records',
  'health_records': 'training_plan',
  'training_plan': 'meal_plan',
  'meal_plan': 'complete',
} as const;

export function FloatingChat({ isOpen, onClose, currentPage }: FloatingChatProps) {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const { status: onboardingStatus, skipStep, completeOnboarding } = useOnboarding();
  const [clearedAtTimestamp, setClearedAtTimestamp] = useState<string | null>(() => {
    // Persist cleared state in localStorage
    if (typeof window !== 'undefined') {
      return localStorage.getItem('chatClearedAt');
    }
    return null;
  });

  useEffect(() => {
    if (!isOpen) {
      setIsMinimized(false);
    } else {
      // Re-read cleared timestamp from localStorage when chat opens
      // This ensures sync with Health Coach page clears
      const stored = localStorage.getItem('chatClearedAt');
      if (stored !== clearedAtTimestamp) {
        setClearedAtTimestamp(stored);
      }
    }
  }, [isOpen, clearedAtTimestamp]);

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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/history"] });
      // Refetch onboarding status to update UI after chat interaction
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/status"] });
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

  const [isSkipping, setIsSkipping] = useState(false);

  const handleSkipOnboardingStep = async () => {
    if (!onboardingStatus || !onboardingStatus.step || isSkipping) return;
    
    const currentStep = onboardingStatus.step as keyof typeof STEP_NEXT_MAP;
    const nextStepKey = STEP_NEXT_MAP[currentStep];
    
    setIsSkipping(true);
    try {
      if (nextStepKey === 'complete') {
        await completeOnboarding();
        toast({
          title: "Onboarding Complete!",
          description: "You can always return to configure these features later.",
        });
        onClose();
      } else {
        await skipStep(currentStep, nextStepKey as any);
        toast({
          title: "Step Skipped",
          description: `Moving to ${ONBOARDING_STEPS.find(s => s.key === nextStepKey)?.label}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to skip step. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSkipping(false);
    }
  };

  const isOnboarding = onboardingStatus && !onboardingStatus.completed;
  const currentStepIndex = ONBOARDING_STEPS.findIndex(s => s.key === onboardingStatus?.step);

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
      style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}
      className={`z-50 flex flex-col w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-md ${
        isMinimized ? "max-h-[60px]" : "h-[min(max(10rem,calc(100dvh-2rem)),600px)]"
      }`}
    >
      <Card className="flex flex-col h-full shadow-lg bg-background/90 border-purple-500/50">
        <div className="border-b bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <div className="flex items-center justify-between gap-2 p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <h3 className="font-semibold">{isOnboarding ? "Getting Started" : "Health Coach"}</h3>
            </div>
            <div className="flex items-center gap-1">
              {isOnboarding && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSkipOnboardingStep}
                  disabled={isSkipping}
                  className="h-8 px-2 text-white hover:bg-white/20 gap-1 disabled:opacity-50"
                  data-testid="button-skip-onboarding"
                >
                  {isSkipping ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <SkipForward className="h-3 w-3" />
                  )}
                  <span className="text-xs">{isSkipping ? "Skipping..." : "Skip"}</span>
                </Button>
              )}
              {messages && messages.length > 0 && !isOnboarding && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleClearChat}
                  className="h-8 w-8 text-white hover:bg-white/20"
                  data-testid="button-clear-chat"
                  title="Clear chat (keeps history for context)"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
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
          
          {isOnboarding && currentStepIndex >= 0 && (
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/80">
                  Step {currentStepIndex + 1} of {ONBOARDING_STEPS.length}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {ONBOARDING_STEPS[currentStepIndex].label}
                </Badge>
              </div>
              <div className="w-full bg-white/20 rounded-full h-1.5">
                <div 
                  className="bg-white rounded-full h-1.5 transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-6 w-6 animate-spin" />
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
                );
              })()}
              
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
      style={{ position: 'fixed', bottom: '1rem', right: '1rem' }}
      className="z-40 h-10 w-10 rounded-full shadow-lg bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 border-2 border-purple-400 hover:border-purple-300 animate-pulse hover:animate-none transition-all hover:scale-110"
      onClick={onClick}
      data-testid="button-open-floating-chat"
    >
      <Sparkles className="h-5 w-5 text-white" />
    </Button>
  );
}
