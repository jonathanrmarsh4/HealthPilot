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
import { TrainingScheduleCard } from "@/components/TrainingScheduleCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { RecommendationCalendar } from "@/components/RecommendationCalendar";
import { ScheduledRecommendationsCard } from "@/components/ScheduledRecommendationsCard";

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

  const { data: readinessScore, isLoading: readinessLoading } = useQuery<ReadinessScore>({
    queryKey: ["/api/training/readiness"],
  });

  const { data: readinessSettings } = useQuery<ReadinessSettings>({
    queryKey: ["/api/training/readiness/settings"],
  });

  const { data: dailyRec, isLoading: recLoading, refetch: refetchRec } = useQuery<DailyRecommendation>({
    queryKey: ["/api/training/daily-recommendation"],
    staleTime: 5 * 60 * 1000,
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

  const rescheduleRecommendationMutation = useMutation({
    mutationFn: async ({ recommendationId, newDate }: { recommendationId: number; newDate: Date }) => {
      return apiRequest(`/api/recommendations/${recommendationId}/reschedule`, {
        method: "PATCH",
        body: JSON.stringify({ date: newDate.toISOString() }),
        headers: { "Content-Type": "application/json" },
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

  // Filter training schedules for today only
  const todaysCustomWorkout = useMemo(() => {
    if (!trainingSchedules || trainingSchedules.length === 0) return null;
    
    const today = format(new Date(), 'EEEE');
    return trainingSchedules.find(schedule => 
      schedule.day === today && schedule.completed === 0
    );
  }, [trainingSchedules]);

  // Filter completed workouts for last 7 days
  const recentWorkouts = useMemo(() => {
    if (!completedWorkouts) return [];
    
    const sevenDaysAgo = subDays(new Date(), 7);
    return completedWorkouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= sevenDaysAgo;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [completedWorkouts]);

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

      {/* Hero Readiness Card */}
      <Card className="relative overflow-hidden" data-testid="card-readiness-hero">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -z-10" />
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-2xl">Today's Readiness</CardTitle>
              <CardDescription className="mt-2">
                {format(new Date(), "EEEE, MMMM d")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {readinessScore && (
                <Badge 
                  variant={getRecommendationBadgeVariant(readinessScore.recommendation)}
                  className="text-sm px-3 py-1"
                  data-testid="badge-readiness-status"
                >
                  {readinessScore.recommendation.toUpperCase()}
                </Badge>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/training/readiness-settings")}
                data-testid="button-readiness-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {readinessLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : readinessScore ? (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-center gap-6">
                <div className="relative w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={readinessChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={60}
                        startAngle={180}
                        endAngle={0}
                        dataKey="value"
                      >
                        {readinessChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-bold" data-testid="text-readiness-score">
                        {readinessScore.score}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {readinessScore.quality}
                      </div>
                    </div>
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
                  </span>
                  <span className="font-medium">{readinessScore.factors.sleep.score}/100</span>
                </div>
                <Progress value={readinessScore.factors.sleep.score} className="h-2" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    HRV
                  </span>
                  <span className="font-medium">{readinessScore.factors.hrv.score}/100</span>
                </div>
                <Progress value={readinessScore.factors.hrv.score} className="h-2" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    Resting HR
                  </span>
                  <span className="font-medium">{readinessScore.factors.restingHR.score}/100</span>
                </div>
                <Progress value={readinessScore.factors.restingHR.score} className="h-2" />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-purple-500" />
                    Recovery
                  </span>
                  <span className="font-medium">{readinessScore.factors.workloadRecovery.score}/100</span>
                </div>
                <Progress value={readinessScore.factors.workloadRecovery.score} className="h-2" />

                {/* Recovery Estimate */}
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

      {/* Recovery Protocols */}
      <RecoveryProtocols />

      {/* Calendar View for Scheduled Recommendations */}
      <RecommendationCalendar
        recommendations={scheduledRecommendations.map((rec) => ({
          id: rec.id,
          title: rec.title,
          scheduledAt: rec.scheduledAt,
        }))}
        onReschedule={(recommendationId, newDate) => {
          rescheduleRecommendationMutation.mutate({ recommendationId, newDate });
        }}
      />

      {/* Today's Scheduled Recommendations */}
      <ScheduledRecommendationsCard recommendations={todayScheduledRecommendations} />

      {/* Today's Recommended Workout */}
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
          {recLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : dailyRec?.recommendation ? (
            <>
              {/* AI Reasoning */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm" data-testid="text-ai-reasoning">
                  {dailyRec.recommendation.aiReasoning}
                </p>
              </div>

              {/* Adjustments Made (if any) */}
              {dailyRec.recommendation.adjustmentsMade && (
                dailyRec.recommendation.adjustmentsMade.intensityReduced || 
                dailyRec.recommendation.adjustmentsMade.durationReduced || 
                dailyRec.recommendation.adjustmentsMade.exercisesModified
              ) && (
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                        Workout Auto-Adjusted Based on Recovery
                      </p>
                      <p className="text-sm text-blue-600/80 dark:text-blue-400/80" data-testid="text-adjustments-made">
                        {dailyRec.recommendation.adjustmentsMade.reason}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Plan Selection */}
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

              {/* Selected Plan Details */}
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

                  {/* Exercises */}
                  <div className="space-y-3">
                    {currentPlan.exercises.map((exercise, idx) => (
                      <div 
                        key={idx} 
                        className="p-4 rounded-lg border bg-card hover-elevate"
                        data-testid={`exercise-${selectedPlan}-${idx}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium" data-testid={`text-exercise-name-${idx}`}>
                                {exercise.name}
                              </h4>
                              <Badge variant="secondary" className="text-xs">
                                {exercise.intensity}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {exercise.sets && exercise.reps && (
                                <p data-testid={`text-exercise-sets-${idx}`}>
                                  {exercise.sets} sets × {exercise.reps}
                                </p>
                              )}
                              {exercise.duration && (
                                <p data-testid={`text-exercise-duration-${idx}`}>
                                  Duration: {exercise.duration}
                                </p>
                              )}
                              {exercise.notes && (
                                <p className="italic" data-testid={`text-exercise-notes-${idx}`}>
                                  {exercise.notes}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant={exerciseFeedback[exercise.name] === 'up' ? 'default' : 'ghost'}
                              onClick={() => handleExerciseFeedback(exercise.name, 'up')}
                              data-testid={`button-feedback-up-${idx}`}
                            >
                              <ThumbsUp className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant={exerciseFeedback[exercise.name] === 'down' ? 'destructive' : 'ghost'}
                              onClick={() => handleExerciseFeedback(exercise.name, 'down')}
                              data-testid={`button-feedback-down-${idx}`}
                            >
                              <ThumbsDown className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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

      {/* Your Custom Workout (if exists for today) */}
      {todaysCustomWorkout && (
        <Card data-testid="card-custom-workout">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <CardTitle>Your Custom Workout for Today</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Created in AI Chat
              </Badge>
            </div>
            <CardDescription>
              This workout plan was created for you through the AI Coach chat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrainingScheduleCard
              id={todaysCustomWorkout.id}
              day={todaysCustomWorkout.day}
              workoutType={todaysCustomWorkout.workoutType}
              duration={todaysCustomWorkout.duration}
              intensity={todaysCustomWorkout.intensity as "Low" | "Moderate" | "High"}
              exercises={todaysCustomWorkout.exercises}
              completed={todaysCustomWorkout.completed === 1}
              sessionType={todaysCustomWorkout.sessionType}
            />
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>You can switch between this custom plan and the AI recommendation above</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workout History (Collapsible) */}
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
              ) : recentWorkouts.length > 0 ? (
                <div className="space-y-3">
                  {recentWorkouts.map((workout) => (
                    <div
                      key={workout.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                      data-testid={`workout-history-${workout.id}`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{workout.workoutType}</h4>
                          <Badge variant="outline" className="text-xs">
                            {workout.intensity}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(workout.date), 'EEEE, MMM d')}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">{workout.duration} min</div>
                        <div className="text-muted-foreground">~{workout.caloriesEstimate} kcal</div>
                      </div>
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
    </div>
  );
}
