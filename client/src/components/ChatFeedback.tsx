import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThumbsUp, ThumbsDown } from "lucide-react";

interface ChatFeedbackProps {
  messageId: number;
  conversationType?: 'text' | 'voice';
  onFeedbackGiven?: () => void;
}

export function ChatFeedback({ 
  messageId, 
  conversationType = 'text',
  onFeedbackGiven 
}: ChatFeedbackProps) {
  const { toast } = useToast();
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);

  const feedbackMutation = useMutation({
    mutationFn: async (feedbackType: 'positive' | 'negative') => {
      const res = await apiRequest("POST", "/api/chat/feedback", {
        messageId,
        feedbackType,
        context: {
          conversationType,
          timestamp: new Date().toISOString(),
        },
      });
      return res.json();
    },
    onSuccess: (_, feedbackType) => {
      setFeedbackGiven(feedbackType);
      toast({
        title: "Thanks for your feedback!",
        description: feedbackType === 'positive' 
          ? "We're glad the response was helpful."
          : "We'll use this to improve future responses.",
      });
      onFeedbackGiven?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    },
  });

  const handleFeedback = (type: 'positive' | 'negative') => {
    if (feedbackGiven || feedbackMutation.isPending) return;
    feedbackMutation.mutate(type);
  };

  return (
    <div className="flex items-center gap-1" data-testid="chat-feedback">
      <Button
        size="icon"
        variant="ghost"
        onClick={() => handleFeedback('positive')}
        disabled={feedbackGiven !== null || feedbackMutation.isPending}
        className={`h-6 w-6 ${
          feedbackGiven === 'positive' 
            ? 'bg-green-500/20 text-green-600 dark:text-green-400' 
            : 'text-muted-foreground hover:text-green-600 dark:hover:text-green-400'
        }`}
        data-testid="button-feedback-positive"
        title="Helpful response"
      >
        <ThumbsUp className="h-3 w-3" />
      </Button>
      
      <Button
        size="icon"
        variant="ghost"
        onClick={() => handleFeedback('negative')}
        disabled={feedbackGiven !== null || feedbackMutation.isPending}
        className={`h-6 w-6 ${
          feedbackGiven === 'negative' 
            ? 'bg-red-500/20 text-red-600 dark:text-red-400' 
            : 'text-muted-foreground hover:text-red-600 dark:hover:text-red-400'
        }`}
        data-testid="button-feedback-negative"
        title="Not helpful"
      >
        <ThumbsDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
