import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Clock, X, Calendar } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

interface ProactiveSuggestion {
  id: string;
  metricType: string;
  currentValue: number;
  targetValue: number;
  deficit: number;
  suggestedActivity: string;
  activityType: string;
  duration: number;
  reasoning: string;
  priority: string;
  status: string;
  createdAt: Date;
}

interface ProactiveSuggestionCardProps {
  suggestion: ProactiveSuggestion;
}

export function ProactiveSuggestionCard({ suggestion }: ProactiveSuggestionCardProps) {
  const { toast } = useToast();
  const [showScheduler, setShowScheduler] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");

  const respondMutation = useMutation({
    mutationFn: async ({ response, scheduledFor }: { response: string; scheduledFor?: Date }) => {
      const res = await apiRequest("POST", `/api/proactive-suggestions/${suggestion.id}/respond`, {
        response,
        scheduledFor,
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/proactive-suggestions/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      
      if (data.scheduled) {
        toast({
          title: "Activity Scheduled! 📅",
          description: `${suggestion.suggestedActivity} has been added to your calendar`,
        });
      } else if (data.suggestion?.status === 'accepted') {
        toast({
          title: "Great! Let's do it! 💪",
          description: "Activity accepted and ready to track",
        });
      } else {
        toast({
          title: "No problem!",
          description: "I'll suggest something else later",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to respond to suggestion",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    respondMutation.mutate({ response: "accepted" });
  };

  const handleDecline = () => {
    respondMutation.mutate({ response: "declined" });
  };

  const handleSchedule = () => {
    if (!showScheduler) {
      setShowScheduler(true);
      return;
    }

    // Combine date and time
    const [hours, minutes] = selectedTime.split(":");
    const scheduledDate = new Date(selectedDate);
    scheduledDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    respondMutation.mutate({ 
      response: "accepted", 
      scheduledFor: scheduledDate 
    });
    setShowScheduler(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "secondary";
    }
  };

  const getMetricLabel = (metricType: string) => {
    const labels: Record<string, string> = {
      steps: "Steps",
      activeMinutes: "Active Minutes",
      sleep: "Sleep",
      supplements: "Supplements",
      workout: "Workout",
    };
    return labels[metricType] || metricType;
  };

  return (
    <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20" data-testid={`suggestion-card-${suggestion.id}`}>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Health Coach Suggestion</h3>
              <p className="text-xs text-muted-foreground">
                {getMetricLabel(suggestion.metricType)} - {suggestion.deficit} behind target
              </p>
            </div>
          </div>
          <Badge variant={getPriorityColor(suggestion.priority)} data-testid={`badge-priority-${suggestion.priority}`}>
            {suggestion.priority}
          </Badge>
        </div>

        {/* Suggestion */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{suggestion.suggestedActivity}</p>
          <p className="text-xs text-muted-foreground">{suggestion.reasoning}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{suggestion.duration} minutes</span>
          </div>
        </div>

        {/* Schedule Picker */}
        {showScheduler && (
          <div className="space-y-3 p-3 bg-background/50 rounded-md">
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="justify-start text-left font-normal"
                    data-testid="button-select-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(selectedDate, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>

              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="flex h-8 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid="input-time"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!showScheduler ? (
            <>
              <Button 
                size="sm" 
                onClick={handleAccept} 
                disabled={respondMutation.isPending}
                data-testid="button-accept-suggestion"
              >
                Accept Now
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleSchedule}
                disabled={respondMutation.isPending}
                data-testid="button-schedule-suggestion"
              >
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Later
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleDecline}
                disabled={respondMutation.isPending}
                data-testid="button-decline-suggestion"
              >
                <X className="mr-2 h-4 w-4" />
                Not Now
              </Button>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                onClick={handleSchedule}
                disabled={respondMutation.isPending}
                data-testid="button-confirm-schedule"
              >
                Confirm Schedule
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={() => setShowScheduler(false)}
                disabled={respondMutation.isPending}
                data-testid="button-cancel-schedule"
              >
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
