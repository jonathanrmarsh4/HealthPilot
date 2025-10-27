import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Send, Sparkles, CheckCircle2, User, Bot } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface GoalConversationDialogProps {
  onSuccess?: () => void;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  questionType?: string;
  rationale?: string;
}

interface ConversationResponse {
  conversationId: string;
  message: string;
  questionType: string;
  rationale: string;
  isComplete: boolean;
  extractedContext: any;
  questionCount: number;
}

export function GoalConversationDialog({ onSuccess }: GoalConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [extractedContext, setExtractedContext] = useState<any>(null);
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const conversationMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const res = await apiRequest("POST", "/api/goals/conversation", {
        conversationId: conversationId || undefined,
        message: userMessage,
        isFirstMessage: conversationId === null,
      });
      return res.json();
    },
    onSuccess: (data: ConversationResponse) => {
      // Add assistant message to conversation
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: data.message,
          questionType: data.questionType,
          rationale: data.rationale,
        },
      ]);

      // Update state
      setConversationId(data.conversationId);
      setIsComplete(data.isComplete);
      setExtractedContext(data.extractedContext);

      if (data.isComplete) {
        toast({
          title: "Goal created!",
          description: "Your personalized goal with training plan has been created",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
        setTimeout(() => {
          setOpen(false);
          onSuccess?.();
        }, 1500);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Conversation error",
        description: error.message || "Failed to continue conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!inputText.trim() || conversationMutation.isPending) return;

    // Add user message to conversation
    setMessages(prev => [
      ...prev,
      { role: 'user', content: inputText },
    ]);

    // Send to API
    conversationMutation.mutate(inputText);
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClose = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset state when closing
      setMessages([]);
      setInputText("");
      setConversationId(null);
      setIsComplete(false);
      setExtractedContext(null);
    }
  };

  const handleStart = () => {
    // Send initial message to start conversation
    const initialMessage = "I want to create a new goal";
    setMessages([{ role: 'user', content: initialMessage }]);
    conversationMutation.mutate(initialMessage);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="outline" data-testid="button-create-conversational-goal">
          <MessageCircle className="h-4 w-4" />
          Talk to AI Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Conversational Goal Creation
          </DialogTitle>
          <DialogDescription>
            Answer a few questions, and AI will create a personalized goal with training plan
          </DialogDescription>
        </DialogHeader>

        {/* Conversation Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {messages.length === 0 ? (
            /* Welcome Screen */
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="p-4 rounded-full bg-primary/10">
                <MessageCircle className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Let's create your goal together</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                I'll ask you a few questions to understand your goal, current ability level, 
                and time availability. This helps me create a realistic, personalized plan.
              </p>
              <Button 
                onClick={handleStart}
                disabled={conversationMutation.isPending}
                className="gap-2 mt-4"
                data-testid="button-start-conversation"
              >
                {conversationMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <MessageCircle className="h-4 w-4" />
                    Start Conversation
                  </>
                )}
              </Button>
            </div>
          ) : (
            <>
              {/* Message History */}
              <ScrollArea className="flex-1 px-4">
                <div ref={scrollRef} className="space-y-4 py-4">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      data-testid={`message-${msg.role}-${idx}`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      
                      <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <Card className={`p-3 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        </Card>
                        
                        {/* Show rationale for AI questions */}
                        {msg.role === 'assistant' && msg.rationale && (
                          <p className="text-xs text-muted-foreground italic px-1">
                            {msg.rationale}
                          </p>
                        )}
                      </div>
                      
                      {msg.role === 'user' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Loading indicator */}
                  {conversationMutation.isPending && (
                    <div className="flex gap-3 justify-start" data-testid="message-loading">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <Card className="p-3 bg-muted">
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <p className="text-sm text-muted-foreground">Thinking...</p>
                        </div>
                      </Card>
                    </div>
                  )}
                  
                  {/* Completion indicator */}
                  {isComplete && (
                    <div className="flex justify-center py-2">
                      <Badge className="gap-1" data-testid="badge-conversation-complete">
                        <CheckCircle2 className="h-3 w-3" />
                        Goal created successfully!
                      </Badge>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Extracted Context (Debug) */}
              {extractedContext && Object.keys(extractedContext).length > 0 && (
                <div className="px-4 pb-2">
                  <details className="text-xs">
                    <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                      Extracted Context ({Object.keys(extractedContext).filter(k => extractedContext[k]).length} items)
                    </summary>
                    <div className="mt-2 p-2 bg-muted rounded-md space-y-1">
                      {extractedContext.goalType && (
                        <div><strong>Goal Type:</strong> {extractedContext.goalType}</div>
                      )}
                      {extractedContext.targetDistance && (
                        <div><strong>Target Distance:</strong> {extractedContext.targetDistance}</div>
                      )}
                      {extractedContext.currentAbility && (
                        <div><strong>Current Ability:</strong> {extractedContext.currentAbility}</div>
                      )}
                      {extractedContext.fitnessLevel && (
                        <div><strong>Fitness Level:</strong> {extractedContext.fitnessLevel}</div>
                      )}
                      {extractedContext.timeAvailability && (
                        <div>
                          <strong>Time Availability:</strong> {extractedContext.timeAvailability.sessionsPerWeek} sessions/week
                          {extractedContext.timeAvailability.preferredDays && 
                            ` on ${extractedContext.timeAvailability.preferredDays.join(', ')}`}
                        </div>
                      )}
                      {extractedContext.motivation && (
                        <div><strong>Motivation:</strong> {extractedContext.motivation}</div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Input Area */}
              {!isComplete && (
                <div className="flex-shrink-0 border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      placeholder="Type your response..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={conversationMutation.isPending || isComplete}
                      className="flex-1"
                      data-testid="input-conversation-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() || conversationMutation.isPending || isComplete}
                      size="icon"
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
