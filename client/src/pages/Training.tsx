import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Loader2, Activity, Heart, RefreshCw, ThumbsUp, ThumbsDown, Dumbbell, Zap, Moon, Settings, Info, AlertTriangle, ChevronDown, ChevronUp, History } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { format, isToday, startOfDay, endOfDay, subDays } from "date-fns";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useLocation } from "wouter";
import { RecoveryProtocols } from "@/components/RecoveryProtocols";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RecommendationCalendar } from "@/components/RecommendationCalendar";
import { ScheduledRecommendationsCard } from "@/components/ScheduledRecommendationsCard";
import { ScheduledInsightsCard } from "@/components/ScheduledInsightsCard";
import { TileManager, type TileConfig } from "@/components/TileManager";

interface TrainingSchedule {
  id: string;
  day: string;
  workoutType: string;
  duration: number;
  intensity: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
  }>;
  completed: number;
  sessionType?: string;
  createdAt?: string;
}

interface ReadinessSettings {
  sleepWeight: number;
  hrvWeight: number;
  restingHRWeight: number;
  workloadWeight: number;
  alertThreshold: number;
  alertsEnabled: boolean;
}

interface RecoveryEstimate {
  daysUntilReady: number;
  trend: "improving" | "declining" | "stable";
  confidence: "high" | "medium" | "low";
}

interface ReadinessScore {
  score: number;
  quality: string;
  recommendation: "ready" | "caution" | "rest";
  reasoning: string;
  factors: {
    sleep: { score: number; weight: number; value?: number };
    hrv: { score: number; weight: number; value?: number };
    restingHR: { score: number; weight: number; value?: number };
    workloadRecovery: { score: number; weight: number };
  };
  recoveryEstimate?: RecoveryEstimate;
}

interface Exercise {
  name: string;
  sets?: number | null;
  reps?: string | null;
  duration?: string | null;
  intensity: string;
  notes?: string;
}

interface WorkoutPlan {
  title: string;
  exercises: Exercise[];
  totalDuration: number;
  intensity: string;
  calorieEstimate: number;
}

interface AdjustmentsMade {
  intensityReduced: boolean;
  durationReduced: boolean;
  exercisesModified: boolean;
  reason: string;
}

interface DailyRecommendation {
  readinessScore: number;
  readinessRecommendation: "ready" | "caution" | "rest";
  recommendation: {
    primaryPlan: WorkoutPlan;
    alternatePlan: WorkoutPlan;
    restDayOption: {
      title: string;
      activities: string[];
      duration: number;
      benefits: string;
    };
    aiReasoning: string;
    safetyNote?: string;
    adjustmentsMade?: AdjustmentsMade;
  };
}

interface CompletedWorkout {
  id: number;
  date: string;
  workoutType: string;
  duration: number;
  caloriesEstimate: number;
  intensity: "Low" | "Moderate" | "High";
}

export default function Training() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState<'primary' | 'alternate' | 'rest'>('primary');
  const [exerciseFeedback, setExerciseFeedback] = useState<Record<string, 'up' | 'down'>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showFullReasoning, setShowFullReasoning] = useState(false);
  const [showFullAdjustments, setShowFullAdjustments] = useState(false);

  const { data: readinessScore, isLoading: readinessLoading } = useQuery<ReadinessScore>({
    queryKey: ["/api/training/readiness"],
  });

  // Check if user has completed their fitness profile
  const { data: fitnessProfile } = useQuery<any>({
    queryKey: ["/api/fitness-profile"],
  });

  const { data: readinessSettings } = useQuery<ReadinessSettings>({
    queryKey: ["/api/training/readiness/settings"],
  });

  const { data: dailyRec, isLoading: recLoading, error: recError, refetch: refetchRec } = useQuery<DailyRecommendation>({
    queryKey: ["/api/training/daily-recommendation"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const { data: trainingSchedules, isLoading: schedulesLoading } = useQuery<TrainingSchedule[]>({
    queryKey: ["/api/training-schedules"],
  });

  const { data: completedWorkouts, isLoading: workoutsLoading } = useQuery<CompletedWorkout[]>({
    queryKey: ["/api/workouts/completed"],
  });

  const { data: scheduledRecommendations = [] } = useQuery<any[]>({
    queryKey: ["/api/recommendations/scheduled"],
  });

  const { data: todayScheduledRecommendations = [] } = useQuery<any[]>({
    queryKey: ["/api/recommendations/today"],
  });

  const { data: scheduledInsights = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-insights"],
  });

  const { data: scheduledExercises = [] } = useQuery<any[]>({
    queryKey: ["/api/scheduled-exercises"],
  });

  const rescheduleRecommendationMutation = useMutation({
    mutationFn: async ({ recommendationId, newDate }: { recommendationId: string | number; newDate: Date }) => {
      return apiRequest("PATCH", `/api/recommendations/${recommendationId}/reschedule`, { 
        date: newDate.toISOString() 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/scheduled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations/today"] });
      toast({
        title: "Recommendation Rescheduled",
        description: "Your workout has been moved to the new date",
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

  // Check if readiness alert should be shown
  const showAlert = useMemo(() => {
    if (!readinessScore || !readinessSettings) return false;
    if (!readinessSettings.alertsEnabled) return false;
    return readinessScore.score < readinessSettings.alertThreshold;
  }, [readinessScore, readinessSettings]);


  // Filter completed workouts for last 7 days
  const recentWorkouts = useMemo(() => {
    if (!completedWorkouts) return [];
    
    const sevenDaysAgo = subDays(new Date(), 7);
    return completedWorkouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= sevenDaysAgo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [completedWorkouts]);

  // Group workouts by day with totals
  const workoutsByDay = useMemo(() => {
    if (!recentWorkouts || recentWorkouts.length === 0) return [];

    const grouped = new Map<string, {
      date: Date;
      dateKey: string;
      workouts: CompletedWorkout[];
      totalCalories: number;
      totalMinutes: number;
    }>();

    recentWorkouts.forEach(workout => {
      const workoutDate = new Date(workout.date);
      const dateKey = format(workoutDate, 'yyyy-MM-dd');
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, {
          date: workoutDate,
          dateKey,
          workouts: [],
          totalCalories: 0,
          totalMinutes: 0,
        });
      }

      const dayGroup = grouped.get(dateKey)!;
      dayGroup.workouts.push(workout);
      dayGroup.totalCalories += workout.caloriesEstimate;
      dayGroup.totalMinutes += workout.duration;
    });

    return Array.from(grouped.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [recentWorkouts]);

  const toggleDayExpansion = (dateKey: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateKey)) {
        newSet.delete(dateKey);
      } else {
        newSet.add(dateKey);
      }
      return newSet;
    });
  };

  const startWorkoutMutation = useMutation({
    mutationFn: async (workoutPlan: WorkoutPlan) => {
      const response = await apiRequest("POST", "/api/workout-sessions/start", { 
        workoutPlan 
      });
      return await response.json();
    },
    onSuccess: (session) => {
      toast({
        title: "Workout Started!",
        description: "Get ready to train",
      });
      setLocation(`/workout/${session.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refreshPlanMutation = useMutation({
    mutationFn: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/daily-recommendation"] });
      const result = await refetchRec();
      return result.data;
    },
    onSuccess: () => {
      toast({
        title: "Plan Refreshed",
        description: "Your training recommendation has been updated based on current readiness",
      });
      setSelectedPlan('primary');
      setExerciseFeedback({});
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to refresh plan",
        variant: "destructive",
      });
    },
  });

  const exerciseFeedbackMutation = useMutation({
    mutationFn: async ({ exerciseName, feedback }: { exerciseName: string; feedback: 'up' | 'down' }) => {
      return apiRequest('POST', '/api/training/exercise-feedback', { exerciseName, feedback });
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Feedback Recorded",
        description: `Your preference for ${variables.exerciseName} has been saved`,
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ scheduleId, currentCompleted }: { scheduleId: string; currentCompleted: boolean }) => {
      return apiRequest('PATCH', `/api/training-schedules/${scheduleId}/complete`, { 
        completed: currentCompleted ? 0 : 1 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
      toast({
        title: "Status Updated",
        description: "Workout completion status has been updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workout status",
        variant: "destructive",
      });
    },
  });

  const handleExerciseFeedback = (exerciseName: string, feedback: 'up' | 'down') => {
    const currentFeedback = exerciseFeedback[exerciseName];
    
    if (currentFeedback === feedback) {
      const { [exerciseName]: _, ...rest } = exerciseFeedback;
      setExerciseFeedback(rest);
      exerciseFeedbackMutation.mutate({ exerciseName, feedback: 'up' });
    } else {
      setExerciseFeedback({ ...exerciseFeedback, [exerciseName]: feedback });
      exerciseFeedbackMutation.mutate({ exerciseName, feedback });
    }
  };

  const handleToggleComplete = (scheduleId: string, currentCompleted: boolean) => {
    toggleCompleteMutation.mutate({ scheduleId, currentCompleted });
  };

  // Readiness chart data
  const readinessChartData = useMemo(() => {
    if (!readinessScore) return [];
    const score = readinessScore.score;
    return [
      { name: 'Ready', value: score, color: score >= 70 ? 'hsl(var(--chart-1))' : 'transparent' },
      { name: 'Caution', value: score >= 40 && score < 70 ? score : 0, color: score >= 40 && score < 70 ? 'hsl(var(--chart-2))' : 'transparent' },
      { name: 'Rest', value: score < 40 ? score : 0, color: score < 40 ? 'hsl(var(--chart-3))' : 'transparent' },
      { name: 'Remaining', value: 100 - score, color: 'hsl(var(--muted))' }
    ];
  }, [readinessScore]);

  const getRecommendationBadgeVariant = (rec: string) => {
    if (rec === 'ready') return 'default';
    if (rec === 'caution') return 'secondary';
    return 'destructive';
  };

  const currentPlan = dailyRec?.recommendation ? 
    (selectedPlan === 'primary' ? dailyRec.recommendation.primaryPlan : 
     selectedPlan === 'alternate' ? dailyRec.recommendation.alternatePlan : null) : null;

  // Check if fitness profile is incomplete
  const isProfileIncomplete = useMemo(() => {
    if (!fitnessProfile) return true;
    
    // Check if key fields are missing - use correct property names from schema
    const hasBasicInfo = fitnessProfile.fitnessLevel && fitnessProfile.trainingExperience;
    const hasEquipmentInfo = (fitnessProfile.homeEquipment?.length > 0) || (fitnessProfile.hasGymAccess === 1);
    const hasGoals = fitnessProfile.primaryGoal || (fitnessProfile.secondaryGoals?.length > 0);
    
    return !hasBasicInfo || !hasEquipmentInfo || !hasGoals;
  }, [fitnessProfile]);

  // Define tiles for the Training page
  const tiles: TileConfig[] = [
    {
      id: "readiness-score",
      title: "Readiness Score",
      description: "Your current recovery and training readiness",
      alwaysVisible: true,
      renderTile: () => (
        <Card data-testid="card-readiness">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Readiness Score</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setLocation("/training/readiness-settings")}
                data-testid="button-readiness-settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </CardTitle>
            <CardDescription>
              Your current recovery and training readiness
            </CardDescription>
          </CardHeader>
          <CardContent>
            {readinessLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : readinessScore ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                  <div className="flex flex-col items-center justify-center gap-2 shrink-0">
                    <div className="relative">
                      <ResponsiveContainer width={160} height={160}>
                        <PieChart>
                          <Pie
                            data={[
                              { value: readinessScore.score },
                              { value: 100 - readinessScore.score }
                            ]}
                            dataKey="value"
                            startAngle={180}
                            endAngle={0}
                            cx="50%"
                            cy="90%"
                            innerRadius={50}
                            outerRadius={70}
                          >
                            <Cell
                              fill={
                                readinessScore.recommendation === "ready"
                                  ? "hsl(var(--chart-2))"
                                  : readinessScore.recommendation === "caution"
                                  ? "hsl(var(--chart-3))"
                                  : "hsl(var(--chart-4))"
                              }
                            />
                            <Cell fill="hsl(var(--muted))" />
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                        <p className="text-3xl font-bold" data-testid="text-readiness-score">
                          {Math.round(readinessScore.score)}
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid="text-readiness-quality">
                          {readinessScore.quality}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <Badge 
                        variant={
                          readinessScore.recommendation === "ready" ? "default" :
                          readinessScore.recommendation === "caution" ? "secondary" :
                          "destructive"
                        }
                        className="text-sm px-3 py-1"
                        data-testid="badge-recommendation"
                      >
                        {readinessScore.recommendation === "ready" && "Ready to Train"}
                        {readinessScore.recommendation === "caution" && "Train with Caution"}
                        {readinessScore.recommendation === "rest" && "Rest Recommended"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground" data-testid="text-readiness-reasoning">
                      {readinessScore.reasoning}
                    </p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-blue-500" />
                      Sleep Quality
                      {readinessScore.factors.sleep.value && (
                        <span className="text-xs text-muted-foreground">
                          ({Math.round(readinessScore.factors.sleep.value)}h)
                        </span>
                      )}
                    </span>
                    <span className="font-medium">{Math.round(readinessScore.factors.sleep.score)}/100</span>
                  </div>
                  <Progress value={readinessScore.factors.sleep.score} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-green-500" />
                      HRV
                    </span>
                    <span className="font-medium">{Math.round(readinessScore.factors.hrv.score)}/100</span>
                  </div>
                  <Progress value={readinessScore.factors.hrv.score} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      Resting HR
                    </span>
                    <span className="font-medium">{Math.round(readinessScore.factors.restingHR.score)}/100</span>
                  </div>
                  <Progress value={readinessScore.factors.restingHR.score} className="h-2" />
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      Recovery
                    </span>
                    <span className="font-medium">{Math.round(readinessScore.factors.workloadRecovery.score)}/100</span>
                  </div>
                  <Progress value={readinessScore.factors.workloadRecovery.score} className="h-2" />

                  {readinessScore.recoveryEstimate && readinessScore.recoveryEstimate.daysUntilReady > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recovery Estimate</span>
                        <Badge variant="outline" data-testid="badge-recovery-estimate">
                          {readinessScore.recoveryEstimate.daysUntilReady === 1 
                            ? "1 day" 
                            : `${readinessScore.recoveryEstimate.daysUntilReady} days`}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1">
                          <div className="text-xs text-muted-foreground">
                            Trend: <span className={
                              readinessScore.recoveryEstimate.trend === "improving" ? "text-green-600 dark:text-green-400" :
                              readinessScore.recoveryEstimate.trend === "declining" ? "text-red-600 dark:text-red-400" :
                              "text-yellow-600 dark:text-yellow-400"
                            }>{readinessScore.recoveryEstimate.trend}</span>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {readinessScore.recoveryEstimate.confidence} confidence
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No readiness data available. Connect Apple Health to start tracking.
              </p>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      id: "recovery-protocols",
      title: "Recovery Protocols",
      description: "Personalized recovery suggestions",
      renderTile: () => <RecoveryProtocols />
    },
    {
      id: "scheduled-calendar",
      title: "Training Calendar",
      description: "View and reschedule recommendations",
      renderTile: () => (
        <RecommendationCalendar
          recommendations={scheduledRecommendations.map((rec) => ({
            id: rec.id,
            title: rec.title,
            scheduledAt: rec.scheduledAt,
            type: 'recommendation' as const,
            description: rec.description,
            category: rec.category,
            duration: rec.duration,
          }))}
          insights={[
            ...scheduledInsights
              .filter((insight: any) => 
                insight.status === 'scheduled' || insight.status === 'active'
              )
              .flatMap((insight: any) => 
                (insight.scheduledDates || []).map((date: string) => ({
                  id: `${insight.id}-${date}`,
                  insightId: insight.id,
                  title: insight.title,
                  scheduledAt: date,
                  type: 'insight' as const,
                  description: insight.description,
                  category: insight.category,
                  activityType: insight.activityType,
                  duration: insight.duration,
                }))
              ),
            ...scheduledExercises
              .flatMap((exercise: any) => 
                (exercise.scheduledDates || []).map((date: string) => ({
                  id: `${exercise.id}-${date}`,
                  insightId: exercise.id,
                  title: exercise.exerciseName,
                  scheduledAt: date,
                  type: 'insight' as const,
                  description: exercise.description,
                  category: exercise.exerciseType,
                  activityType: exercise.exerciseType,
                  duration: exercise.duration,
                }))
              )
          ]}
          onReschedule={(recommendationId, newDate) => {
            rescheduleRecommendationMutation.mutate({ recommendationId, newDate });
          }}
        />
      )
    },
    {
      id: "today-scheduled",
      title: "Today's Schedule",
      description: "Scheduled recommendations for today",
      renderTile: () => <ScheduledRecommendationsCard recommendations={todayScheduledRecommendations} />
    },
    {
      id: "scheduled-insights",
      title: "Scheduled Insights",
      description: "Your scheduled health insights",
      renderTile: () => <ScheduledInsightsCard />
    },
    {
      id: "daily-recommendation",
      title: "Daily Workout Recommendation",
      description: "AI-powered workout plan based on readiness",
      alwaysVisible: true,
      renderTile: () => (
        <Card data-testid="card-todays-workout">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>Today's Recommended Workout</CardTitle>
            </div>
            <CardDescription>
              Personalized workout based on your current readiness level
            </CardDescription>
            {dailyRec?.recommendation.safetyNote && (
              <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400" data-testid="text-safety-note">
                  ⚠️ {dailyRec.recommendation.safetyNote}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* AI-Saved Workouts Section */}
            {trainingSchedules && trainingSchedules.length > 0 && (() => {
              const today = new Date().toISOString().split('T')[0];
              const todayWorkouts = trainingSchedules.filter(schedule => 
                schedule.scheduledFor && new Date(schedule.scheduledFor).toISOString().split('T')[0] === today
              );
              
              if (todayWorkouts.length > 0) {
                return (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <h4 className="font-semibold text-sm">Your Scheduled Workouts</h4>
                    </div>
                    <div className="space-y-2">
                      {todayWorkouts.map((workout) => (
                        <div key={workout.id} className="p-3 rounded-lg border bg-card hover-elevate" data-testid={`workout-${workout.id}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-medium text-sm" data-testid="text-workout-type">
                                  {workout.workoutType}
                                </h5>
                                {workout.duration && (
                                  <Badge variant="outline" className="text-xs">
                                    {workout.duration} min
                                  </Badge>
                                )}
                              </div>
                              {workout.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2" data-testid="text-workout-description">
                                  {workout.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4" />
                  </div>
                );
              }
              return null;
            })()}
            
            {recLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : recError ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Unable to load workout recommendation. Please try again.
                </p>
                <Button onClick={() => refetchRec()} variant="outline" data-testid="button-retry-recommendation">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            ) : dailyRec?.recommendation ? (
              <>
                <div>
                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    AI Recommendation
                  </h4>
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className={`text-sm ${!showFullReasoning ? 'line-clamp-3' : ''}`} data-testid="text-ai-reasoning">
                      {dailyRec.recommendation.aiReasoning}
                    </p>
                    {dailyRec.recommendation.aiReasoning.length > 150 && (
                      <button
                        onClick={() => setShowFullReasoning(!showFullReasoning)}
                        className="text-xs text-primary hover:underline mt-2"
                        data-testid="button-toggle-reasoning"
                      >
                        {showFullReasoning ? 'Read less' : 'Read more'}
                      </button>
                    )}
                  </div>
                </div>

                {dailyRec.recommendation.adjustmentsMade && (
                  dailyRec.recommendation.adjustmentsMade.intensityReduced || 
                  dailyRec.recommendation.adjustmentsMade.durationReduced || 
                  dailyRec.recommendation.adjustmentsMade.exercisesModified
                ) && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                          Workout Auto-Adjusted Based on Recovery
                        </p>
                        <p className={`text-sm text-blue-600/80 dark:text-blue-400/80 ${!showFullAdjustments ? 'line-clamp-3' : ''}`} data-testid="text-adjustments-made">
                          {dailyRec.recommendation.adjustmentsMade.reason}
                        </p>
                        {dailyRec.recommendation.adjustmentsMade.reason.length > 150 && (
                          <button
                            onClick={() => setShowFullAdjustments(!showFullAdjustments)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2"
                            data-testid="button-toggle-adjustments"
                          >
                            {showFullAdjustments ? 'Read less' : 'Read more'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={selectedPlan === 'primary' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedPlan('primary');
                      setExerciseFeedback({});
                    }}
                    data-testid="button-plan-primary"
                  >
                    <Dumbbell className="mr-2 h-4 w-4" />
                    Primary Plan
                  </Button>
                  <Button
                    variant={selectedPlan === 'alternate' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedPlan('alternate');
                      setExerciseFeedback({});
                    }}
                    data-testid="button-plan-alternate"
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Lighter Alternative
                  </Button>
                  <Button
                    variant={selectedPlan === 'rest' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedPlan('rest');
                      setExerciseFeedback({});
                    }}
                    data-testid="button-plan-rest"
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    Rest Day
                  </Button>
                </div>

                {selectedPlan === 'rest' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold" data-testid="text-rest-title">
                        {dailyRec.recommendation.restDayOption.title}
                      </h3>
                      <Badge variant="outline">{dailyRec.recommendation.restDayOption.duration} min</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid="text-rest-benefits">
                      {dailyRec.recommendation.restDayOption.benefits}
                    </p>
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Suggested Activities:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {dailyRec.recommendation.restDayOption.activities.map((activity, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground" data-testid={`text-rest-activity-${idx}`}>
                            {activity}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : currentPlan ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h3 className="text-lg font-semibold" data-testid={`text-${selectedPlan}-title`}>
                        {currentPlan.title}
                      </h3>
                      <div className="flex gap-2">
                        <Badge variant="outline" data-testid={`badge-${selectedPlan}-duration`}>
                          {currentPlan.totalDuration} min
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-${selectedPlan}-intensity`}>
                          {currentPlan.intensity} intensity
                        </Badge>
                        <Badge variant="outline" data-testid={`badge-${selectedPlan}-calories`}>
                          ~{currentPlan.calorieEstimate} kcal
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {currentPlan.exercises.map((exercise, idx) => (
                        <div 
                          key={idx} 
                          className="p-2.5 rounded-lg border bg-card hover-elevate"
                          data-testid={`exercise-${selectedPlan}-${idx}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate" data-testid={`text-exercise-name-${idx}`}>
                                  {exercise.name}
                                </h4>
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {exercise.intensity}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                {exercise.sets && exercise.reps && (
                                  <span data-testid={`text-exercise-sets-${idx}`}>
                                    {exercise.sets} sets × {exercise.reps}
                                  </span>
                                )}
                                {exercise.duration && (
                                  <span data-testid={`text-exercise-duration-${idx}`}>
                                    {exercise.duration}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <Button
                                size="icon"
                                variant={exerciseFeedback[exercise.name] === 'up' ? 'default' : 'ghost'}
                                onClick={() => handleExerciseFeedback(exercise.name, 'up')}
                                className="h-7 w-7"
                                data-testid={`button-feedback-up-${idx}`}
                              >
                                <ThumbsUp className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant={exerciseFeedback[exercise.name] === 'down' ? 'destructive' : 'ghost'}
                                onClick={() => handleExerciseFeedback(exercise.name, 'down')}
                                className="h-7 w-7"
                                data-testid={`button-feedback-down-${idx}`}
                              >
                                <ThumbsDown className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {selectedPlan !== 'rest' && (
                      <div className="pt-4 border-t">
                        <Button 
                          className="w-full" 
                          size="lg"
                          onClick={() => startWorkoutMutation.mutate(currentPlan)}
                          disabled={startWorkoutMutation.isPending}
                          data-testid="button-start-workout"
                        >
                          {startWorkoutMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Dumbbell className="mr-2 h-5 w-5" />
                              Start Workout
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No recommendation available. Ensure you have readiness data and a training plan.
              </p>
            )}
          </CardContent>
        </Card>
      )
    },
    {
      id: "workout-history",
      title: "Workout History",
      description: "Your completed workouts from the last 7 days",
      renderTile: () => (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <Card data-testid="card-workout-history">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    <CardTitle>Workout History</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {recentWorkouts.length > 0 && (
                      <Badge variant="secondary">{recentWorkouts.length} recent</Badge>
                    )}
                    {historyOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
                <CardDescription>
                  Your completed workouts from the last 7 days
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {workoutsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : workoutsByDay.length > 0 ? (
                  <div className="space-y-3">
                    {workoutsByDay.map((dayGroup) => (
                      <div
                        key={dayGroup.dateKey}
                        className="rounded-lg border bg-card overflow-hidden"
                        data-testid={`workout-day-${dayGroup.dateKey}`}
                      >
                        <button
                          onClick={() => toggleDayExpansion(dayGroup.dateKey)}
                          className="w-full flex items-center justify-between p-4 hover-elevate"
                          data-testid={`button-toggle-day-${dayGroup.dateKey}`}
                        >
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">
                                {format(dayGroup.date, 'EEEE, MMM d')}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {dayGroup.workouts.length} {dayGroup.workouts.length === 1 ? 'activity' : 'activities'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {dayGroup.totalMinutes} min • {dayGroup.totalCalories} kcal
                            </div>
                          </div>
                          {expandedDays.has(dayGroup.dateKey) ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>

                        {expandedDays.has(dayGroup.dateKey) && (
                          <div className="border-t bg-muted/30">
                            {dayGroup.workouts.map((workout, index) => (
                              <div
                                key={workout.id}
                                className={`flex items-center justify-between p-4 ${
                                  index !== dayGroup.workouts.length - 1 ? 'border-b' : ''
                                }`}
                                data-testid={`workout-activity-${workout.id}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm">{workout.workoutType}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {workout.intensity}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="text-right text-sm text-muted-foreground">
                                  <span>{workout.duration} min • {workout.caloriesEstimate} kcal</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No completed workouts in the last 7 days
                  </p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Adaptive Training</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered daily recommendations based on your recovery status
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshPlanMutation.mutate()}
          disabled={refreshPlanMutation.isPending}
          data-testid="button-refresh-plan"
        >
          {refreshPlanMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Plan
            </>
          )}
        </Button>
      </div>

      {/* Fitness Profile Completion Banner */}
      {isProfileIncomplete && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20" data-testid="card-profile-incomplete">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-2 rounded-lg">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm">Get More Personalized Workouts</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your fitness profile to receive AI-powered workout recommendations perfectly matched to your fitness level, available equipment, and goals.
                </p>
                <Button
                  variant="default"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLocation('/training/fitness-profile')}
                  data-testid="button-complete-profile"
                >
                  Complete Fitness Profile
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Banner */}
      {showAlert && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4" data-testid="alert-readiness-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">
                Readiness Alert: Score Below Threshold
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                Your readiness score ({readinessScore?.score}) is below your alert threshold ({readinessSettings?.alertThreshold}). 
                Consider taking rest or reducing training intensity.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Training tiles with drag-and-drop reordering */}
      <TileManager
        page="training"
        tiles={tiles}
        defaultVisible={[
          "readiness-score",
          "daily-recommendation",
          "recovery-protocols",
          "scheduled-calendar",
          "today-scheduled",
          "scheduled-insights",
          "workout-history"
        ]}
      />
    </div>
  );
}
