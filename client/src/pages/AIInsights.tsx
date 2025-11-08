import { RecommendationCard } from "@/components/RecommendationCard";
import { ExerciseRecommendationCard } from "@/components/ExerciseRecommendationCard";
import { ScheduleRecommendationDialog } from "@/components/ScheduleRecommendationDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {  TrendingUp, Brain, Loader2, Waves, Activity, AlertCircle, Dumbbell, Sparkles } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Recommendation, HealthRecord, Biomarker } from "@shared/schema";
import { useState } from "react";

interface ExerciseRecommendation {
  id: string;
  status: string;
  title?: string;
  description?: string;
  category?: string;
  alternateExerciseId?: number;
  muscleGroup?: string;
  difficultyLevel?: string;
  [key: string]: unknown;
}

interface CalendarCounts {
  exercises?: number;
  workouts?: number;
  supplements?: number;
}

export default function AIInsights() {
  const { toast } = useToast();
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const { data: healthRecords } = useQuery<HealthRecord[]>({
    queryKey: ["/api/health-records"],
  });

  const { data: biomarkers } = useQuery<Biomarker[]>({
    queryKey: ["/api/biomarkers"],
  });

  const { data: exerciseRecommendations, isLoading: exerciseLoading } = useQuery<ExerciseRecommendation[]>({
    queryKey: ["/api/exercise-recommendations"],
  });

  const { data: calendarResponse } = useQuery<{ calendar?: Record<string, CalendarCounts> }>({
    queryKey: ["/api/schedule/calendar"],
  });

  // Transform calendar object to array format for components
  const calendarData = calendarResponse?.calendar
    ? Object.entries(calendarResponse.calendar).map(([date, counts]) => ({
        date,
        exercises: counts.exercises,
        workouts: counts.workouts,
        supplements: counts.supplements,
      }))
    : [];

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/recommendations/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Success",
        description: "New AI recommendations generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recommendations",
        variant: "destructive",
      });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: async ({ id, date, action }: { id: string; date: Date; action: "add" | "replace" }) => {
      const res = await apiRequest("POST", `/api/recommendations/${id}/schedule`, { date, action });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Success",
        description: "Recommendation scheduled to your training plan!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule recommendation",
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ id, feedback }: { id: string; feedback: "positive" | "negative" }) => {
      const res = await apiRequest("POST", `/api/recommendations/${id}/feedback`, { feedback });
      return res.json();
    },
    onSuccess: (_: unknown, variables: { id: string; feedback: "positive" | "negative" }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: variables.feedback === "positive" ? "Thanks for your feedback!" : "Noted",
        description: variables.feedback === "positive" 
          ? "We'll show you more recommendations like this" 
          : "This recommendation has been dismissed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record feedback",
        variant: "destructive",
      });
    },
  });

  const autoScheduleMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/exercise-recommendations/${id}/auto-schedule`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/calendar"] });
      toast({
        title: "Success",
        description: "Exercise auto-scheduled based on AI recommendation!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to auto-schedule exercise",
        variant: "destructive",
      });
    },
  });

  const manualScheduleMutation = useMutation({
    mutationFn: async ({ id, dates }: { id: number; dates: string[] }) => {
      const res = await apiRequest("POST", `/api/exercise-recommendations/${id}/schedule-manual`, { dates });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/calendar"] });
      toast({
        title: "Success",
        description: "Exercise scheduled for selected days!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to schedule exercise",
        variant: "destructive",
      });
    },
  });

  const declineExerciseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/exercise-recommendations/${id}/decline`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exercise-recommendations"] });
      toast({
        title: "Declined",
        description: "Exercise recommendation dismissed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to decline exercise",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'biomarker':
        return AlertCircle;
      case 'nutrition':
        return Apple;
      case 'exercise':
        return Dumbbell;
      case 'lifestyle':
        return Brain;
      case 'alternative therapy':
        return Waves;
      default:
        return AlertCircle;
    }
  };

  const analyzedRecords = healthRecords?.filter((r: HealthRecord) => r.analyzedAt).length || 0;
  const trackedBiomarkers = biomarkers?.length || 0;
  const activeRecommendations = recommendations?.filter((r: Recommendation) => r.dismissed === 0).length || 0;

  const healthScore = Math.min(100, Math.max(0, 
    50 + (analyzedRecords * 5) + (Math.min(trackedBiomarkers, 10) * 3) - (activeRecommendations * 2)
  ));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          className="w-full sm:w-auto"
          data-testid="button-generate-insights"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Insights
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Records</span>
              <Badge className="bg-chart-4 text-white">{analyzedRecords} Analyzed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Biomarkers</span>
              <Badge className="bg-chart-4 text-white">{trackedBiomarkers} Tracked</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recommendations</span>
              <Badge className="bg-chart-5 text-white">{activeRecommendations} Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-5xl font-bold tracking-tight">{healthScore}</div>
              <p className="text-sm text-muted-foreground">
                {healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Good" : "Needs improvement"} health score based on your metrics
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-chart-4/10 text-chart-4">
                  {healthScore >= 80 ? "Above average" : "Track more data"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {activeRecommendations > 0 
                ? "Your AI assistant has reviewed your latest health data and identified key areas for improvement."
                : "Add more health data to receive personalized AI-powered recommendations."}
            </p>
          </CardContent>
        </Card>
      </div>

      {exerciseRecommendations && exerciseRecommendations.filter((e) => e.status === "pending" || e.status === "scheduled").length > 0 && (
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold mb-6 flex items-center gap-2 break-words">
            <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
            <span>AI Exercise Recommendations</span>
          </h2>
          {exerciseLoading ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 mb-8">
              {exerciseRecommendations
                .filter((e) => e.status === "pending" || e.status === "scheduled")
                .map((exercise) => (
                  <ExerciseRecommendationCard
                    key={exercise.id}
                    recommendation={exercise}
                    calendarData={calendarData || []}
                    onAutoSchedule={(id) => autoScheduleMutation.mutate(id)}
                    onManualSchedule={(id, dates) => manualScheduleMutation.mutate({ id, dates })}
                    onDecline={(id) => declineExerciseMutation.mutate(id)}
                    isScheduling={autoScheduleMutation.isPending || manualScheduleMutation.isPending || declineExerciseMutation.isPending}
                  />
                ))}
            </div>
          )}
        </div>
      )}

      <div>
        <h2 className="text-xl sm:text-2xl font-semibold mb-6 break-words">Personalized Recommendations</h2>
        {recommendationsLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recommendations && recommendations.filter((r: Recommendation) => r.dismissed === 0).length > 0 ? (
          <div className="grid gap-6">
            {recommendations.filter((r: Recommendation) => r.dismissed === 0).map((rec: Recommendation) => (
              <RecommendationCard
                key={rec.id}
                title={rec.title}
                description={rec.description}
                category={rec.category}
                priority={rec.priority as "high" | "medium" | "low"}
                icon={getCategoryIcon(rec.category)}
                details={rec.details || ""}
                actionLabel={rec.actionLabel || "Schedule Workout"}
                onAction={() => {
                  setSelectedRecommendation(rec);
                  setScheduleDialogOpen(true);
                }}
                onFeedback={(feedback) => {
                  if (feedback === "positive") {
                    // Thumbs up: Open schedule dialog
                    setSelectedRecommendation(rec);
                    setScheduleDialogOpen(true);
                  } else {
                    // Thumbs down: Record negative feedback and dismiss
                    feedbackMutation.mutate({ id: rec.id, feedback });
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              No active recommendations. Click &quot;Generate Insights&quot; to get AI-powered health recommendations.
            </CardContent>
          </Card>
        )}
      </div>

      {selectedRecommendation && (
        <ScheduleRecommendationDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          recommendationTitle={selectedRecommendation.title}
          onSchedule={async (date, action) => {
            await scheduleMutation.mutateAsync({ 
              id: selectedRecommendation.id, 
              date, 
              action 
            });
          }}
        />
      )}
    </div>
  );
}
