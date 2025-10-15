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
import { DailyRemindersCard } from "@/components/DailyRemindersCard";

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

  // Filter training schedules for today only
  const todaysCustomWorkout = useMemo(() => {
    if (!trainingSchedules || trainingSchedules.length === 0) return null;
    
    const today = format(new Date(), 'EEEE');
    return trainingSchedules.find(schedule => 
      schedule.day === today && schedule.completed === 0
    );
  }, [trainingSchedules]);

  // Get all uncompleted custom workouts for the week (for displaying full weekly plan)
  const weeklyCustomWorkouts = useMemo(() => {
    if (!trainingSchedules || trainingSchedules.length === 0) return [];
    
    // Sort by day of week order (Monday first)
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return trainingSchedules
      .filter(schedule => schedule.completed === 0)
      .sort((a, b) => dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day));
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
        completed: !currentCompleted 
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

      {/* Daily Reminders */}
      <DailyRemindersCard />

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

      {/* Your Weekly Training Schedule (if exists) */}
      {weeklyCustomWorkouts.length > 0 && (
        <Card data-testid="card-weekly-training">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" />
                <CardTitle>Your Weekly Training Schedule</CardTitle>
              </div>
              <Badge variant="outline" className="text-xs">
                Created in AI Chat
              </Badge>
            </div>
            <CardDescription>
              Your custom workout plan created through the AI Coach
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {weeklyCustomWorkouts.map((workout) => (
              <TrainingScheduleCard
                key={workout.id}
                id={workout.id}
                day={workout.day}
                workoutType={workout.workoutType}
                duration={workout.duration}
                intensity={workout.intensity as "Low" | "Moderate" | "High"}
                exercises={workout.exercises}
                completed={workout.completed === 1}
                sessionType={workout.sessionType}
                onToggleComplete={handleToggleComplete}
              />
            ))}
            {todaysCustomWorkout && (
              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>You can switch between this custom plan and the AI recommendation above</span>
              </div>
            )}
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
              ) : workoutsByDay.length > 0 ? (
                <div className="space-y-3">
                  {workoutsByDay.map((dayGroup) => (
                    <div
                      key={dayGroup.dateKey}
                      className="rounded-lg border bg-card overflow-hidden"
                      data-testid={`workout-day-${dayGroup.dateKey}`}
                    >
                      {/* Day Header with Totals */}
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

                      {/* Expandable Activities List */}
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
    </div>
  );
}
