import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Calendar, Check, Trash2, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useState } from "react";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  scheduledAt: string | null;
  category: string;
}

interface ScheduledRecommendationsCardProps {
  recommendations: Recommendation[];
}

interface SwipeableRecommendationProps {
  recommendation: Recommendation;
  onComplete: () => void;
  onDelete: () => void;
  onReschedule: () => void;
  isCompleting: boolean;
}

function SwipeableRecommendation({
  recommendation,
  onComplete,
  onDelete,
  onReschedule,
  isCompleting,
}: SwipeableRecommendationProps) {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-150, 0, 150],
    ["rgb(239, 68, 68)", "transparent", "rgb(59, 130, 246)"]
  );

  const SWIPE_THRESHOLD = 100; // pixels to trigger action

  return (
    <div className="relative overflow-hidden rounded-lg" data-testid={`scheduled-recommendation-${recommendation.id}`}>
      {/* Background Actions */}
      <motion.div 
        className="absolute inset-0 flex items-center justify-between px-6"
        style={{ background }}
      >
        <div className="flex items-center gap-2 text-white">
          <Trash2 className="w-5 h-5" />
          <span className="text-sm font-medium">Delete</span>
        </div>
        <div className="flex items-center gap-2 text-white">
          <span className="text-sm font-medium">Reschedule</span>
          <CalendarClock className="w-5 h-5" />
        </div>
      </motion.div>

      {/* Swipeable Card */}
      <motion.div
        drag="x"
        dragElastic={0.2}
        style={{ x }}
        onDragEnd={(e, { offset }) => {
          // Check if swipe exceeds threshold
          if (offset.x < -SWIPE_THRESHOLD) {
            // Swipe left - delete
            onDelete();
            // Immediately reset position
            x.set(0);
          } else if (offset.x > SWIPE_THRESHOLD) {
            // Swipe right - reschedule
            onReschedule();
            // Immediately reset position
            x.set(0);
          } else {
            // Snap back to center
            x.set(0);
          }
        }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">{recommendation.title}</CardTitle>
                <CardDescription className="text-sm">
                  {recommendation.description}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {/* Action buttons - always accessible */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onReschedule}
                  data-testid={`button-reschedule-${recommendation.id}`}
                  aria-label="Reschedule recommendation"
                >
                  <CalendarClock className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  data-testid={`button-delete-${recommendation.id}`}
                  aria-label="Delete recommendation"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={onComplete}
                  disabled={isCompleting}
                  data-testid={`button-complete-${recommendation.id}`}
                  className="flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Complete
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </motion.div>
    </div>
  );
}

export function ScheduledRecommendationsCard({ recommendations }: ScheduledRecommendationsCardProps) {
  const { toast } = useToast();
  const [swipingId, setSwipingId] = useState<number | null>(null);

  const completeMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      return apiRequest("POST", `/api/recommendations/${recommendationId}/complete`, {});
    },
    onSuccess: () => {
      // Invalidate all queries that might be affected by workout completion
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workouts/completed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/daily-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
      toast({
        title: "Workout completed!",
        description: "Great job completing your scheduled workout. It's been added to your history.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (recommendationId: number) => {
      return apiRequest("PATCH", `/api/recommendations/${recommendationId}/dismiss`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/today"] });
      toast({
        title: "Deleted",
        description: "Recommendation removed from your schedule.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Your Scheduled Recommendations
              </CardTitle>
              <CardDescription>
                Workouts you scheduled for today
              </CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {format(new Date(), "MMM d")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendations.map((rec) => (
          <SwipeableRecommendation
            key={rec.id}
            recommendation={rec}
            onComplete={() => completeMutation.mutate(rec.id)}
            onDelete={() => deleteMutation.mutate(rec.id)}
            onReschedule={() => {
              toast({
                title: "Reschedule",
                description: "Drag to calendar to reschedule this recommendation.",
              });
            }}
            isCompleting={completeMutation.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}
