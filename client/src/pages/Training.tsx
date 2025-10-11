import { TrainingScheduleCard } from "@/components/TrainingScheduleCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, TrendingUp, BarChart3, Activity, Heart, Moon, Zap, Calendar, Dumbbell } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TrainingSchedule, WorkoutSession } from "@shared/schema";
import { useState } from "react";
import { format } from "date-fns";

interface TrainingLoad {
  weeklyLoad: number;
  monthlyLoad: number;
  weeklyHours: number;
}

interface WorkoutStats {
  totalWorkouts: number;
  totalDuration: number;
  totalCalories: number;
  byType: {
    type: string;
    count: number;
    duration: number;
    calories: number;
  }[];
}

interface Correlations {
  sleepQuality: {
    workoutDays: number;
    nonWorkoutDays: number;
    improvement: number;
  };
  restingHR: {
    workoutDays: number;
    nonWorkoutDays: number;
    improvement: number;
  };
}

interface RecoveryInsight {
  category: 'recovery_status' | 'training_load' | 'workout_balance' | 'biomarker_response' | 'alternative_therapy';
  severity: 'excellent' | 'good' | 'caution' | 'warning';
  title: string;
  description: string;
  recommendation: string;
  metrics: {
    primary: string;
    value: string;
    context: string;
  };
}

export default function Training() {
  const { toast } = useToast();
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7' | '30' | '90'>('30');
  
  const { data: workouts, isLoading } = useQuery<TrainingSchedule[]>({
    queryKey: ["/api/training-schedules"],
  });

  const { data: workoutSessions, isLoading: sessionsLoading } = useQuery<WorkoutSession[]>({
    queryKey: [`/api/workout-sessions?days=${analyticsTimeframe}`],
  });

  const { data: trainingLoad, isLoading: loadLoading } = useQuery<TrainingLoad>({
    queryKey: [`/api/analytics/training-load?days=${analyticsTimeframe}`],
  });

  const { data: workoutStats, isLoading: statsLoading } = useQuery<WorkoutStats>({
    queryKey: [`/api/analytics/workout-stats?days=${analyticsTimeframe}`],
  });

  const { data: correlations, isLoading: correlationsLoading } = useQuery<Correlations>({
    queryKey: [`/api/analytics/correlations?days=${analyticsTimeframe}`],
  });

  const { data: recoveryInsights, isLoading: insightsLoading } = useQuery<RecoveryInsight[]>({
    queryKey: [`/api/analytics/recovery-insights?days=${analyticsTimeframe}`],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/training-schedules/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
      toast({
        title: "Success",
        description: "New training schedule generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate training schedule",
        variant: "destructive",
      });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/training-schedules/${id}/complete`, { completed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training-schedules"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workout status",
        variant: "destructive",
      });
    },
  });

  const handleToggleComplete = (id: string, currentCompleted: boolean) => {
    toggleCompleteMutation.mutate({ id, completed: !currentCompleted });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Training</h1>
          <p className="text-muted-foreground mt-2">
            Track your workout schedule and analyze your training progress
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          data-testid="button-generate-training"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New Schedule
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="schedule" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList data-testid="tabs-training" className="w-full justify-start">
            <TabsTrigger value="schedule" data-testid="tab-schedule">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="workouts" data-testid="tab-workouts">
              <Dumbbell className="h-4 w-4 mr-2" />
              Workouts
            </TabsTrigger>
            <TabsTrigger value="analytics" data-testid="tab-analytics">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="schedule" className="space-y-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-64 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workouts && workouts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {workouts.map((workout) => (
                <TrainingScheduleCard 
                  key={workout.id} 
                  id={workout.id}
                  day={workout.day}
                  workoutType={workout.workoutType}
                  duration={workout.duration}
                  intensity={workout.intensity as "Low" | "Moderate" | "High"}
                  exercises={workout.exercises as any[]}
                  completed={workout.completed === 1}
                  onToggleComplete={handleToggleComplete}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No training schedule available. Click "Generate New Schedule" to create a personalized workout plan.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="workouts" className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <div className="flex gap-1">
              {(['7', '30', '90'] as const).map((days) => (
                <Button
                  key={days}
                  variant={analyticsTimeframe === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe(days)}
                  data-testid={`button-timeframe-${days}`}
                >
                  {days === '7' ? '7 Days' : days === '30' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
          </div>

          {sessionsLoading ? (
            <div className="grid gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : workoutSessions && workoutSessions.length > 0 ? (
            <div className="grid gap-4">
              {workoutSessions.map((session) => (
                <Card key={session.id} data-testid={`workout-session-${session.id}`}>
                  <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Activity className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg capitalize" data-testid={`workout-type-${session.id}`}>
                          {session.workoutType}
                        </CardTitle>
                        <CardDescription data-testid={`workout-date-${session.id}`}>
                          {format(new Date(session.startTime), "MMM dd, yyyy 'at' h:mm a")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" data-testid={`workout-source-${session.id}`}>
                      {session.sourceType === 'apple_health' ? 'Apple Health' : session.sourceType}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Duration</div>
                        <div className="text-lg font-semibold" data-testid={`workout-duration-${session.id}`}>
                          {formatDuration(session.duration)}
                        </div>
                      </div>
                      {session.distance && (
                        <div>
                          <div className="text-sm text-muted-foreground">Distance</div>
                          <div className="text-lg font-semibold" data-testid={`workout-distance-${session.id}`}>
                            {(session.distance / 1000).toFixed(2)} km
                          </div>
                        </div>
                      )}
                      {session.calories && (
                        <div>
                          <div className="text-sm text-muted-foreground">Calories</div>
                          <div className="text-lg font-semibold" data-testid={`workout-calories-${session.id}`}>
                            {session.calories} kcal
                          </div>
                        </div>
                      )}
                      {session.avgHeartRate && (
                        <div>
                          <div className="text-sm text-muted-foreground">Avg HR</div>
                          <div className="text-lg font-semibold" data-testid={`workout-heart-rate-${session.id}`}>
                            {session.avgHeartRate} bpm
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No workouts recorded yet. Connect your Apple Health to automatically import workouts.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Timeframe:</span>
            <div className="flex gap-1">
              {(['7', '30', '90'] as const).map((days) => (
                <Button
                  key={days}
                  variant={analyticsTimeframe === days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAnalyticsTimeframe(days)}
                  data-testid={`button-timeframe-${days}`}
                >
                  {days === '7' ? '7 Days' : days === '30' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
          </div>

          {/* Training Load */}
          <div className="grid gap-6 md:grid-cols-3">
            <Card data-testid="card-weekly-load">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Training Load</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-weekly-load">
                    {trainingLoad?.weeklyLoad?.toFixed(0) || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Intensity units per week
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-monthly-load">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Training Load</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-monthly-load">
                    {trainingLoad?.monthlyLoad?.toFixed(0) || 0}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Intensity units per month
                </p>
              </CardContent>
            </Card>

            <Card data-testid="card-weekly-hours">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Weekly Training Hours</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold" data-testid="text-weekly-hours">
                    {trainingLoad?.weeklyHours?.toFixed(1) || 0}h
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Average hours per week
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Workout Statistics */}
          <Card data-testid="card-workout-stats">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                Workout Statistics
              </CardTitle>
              <CardDescription>
                Breakdown by workout type over the selected timeframe
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : workoutStats && workoutStats.byType.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground pb-2 border-b">
                    <div>Type</div>
                    <div className="text-center">Workouts</div>
                    <div className="text-right">Duration / Calories</div>
                  </div>
                  {workoutStats.byType.map((stat) => (
                    <div key={stat.type} className="grid grid-cols-3 gap-4 items-center" data-testid={`stat-${stat.type.toLowerCase().replace(/\s+/g, '-')}`}>
                      <div className="font-medium">{stat.type}</div>
                      <div className="text-center">
                        <Badge variant="secondary">{stat.count}</Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        {formatDuration(stat.duration)} / {stat.calories?.toFixed(0) || 0} kcal
                      </div>
                    </div>
                  ))}
                  <div className="pt-4 border-t grid grid-cols-3 gap-4 font-semibold" data-testid="stats-total">
                    <div>Total</div>
                    <div className="text-center">{workoutStats.totalWorkouts}</div>
                    <div className="text-right">
                      {formatDuration(workoutStats.totalDuration)} / {workoutStats.totalCalories?.toFixed(0) || 0} kcal
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No workout data available for the selected timeframe
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workout-Biomarker Correlations */}
          <Card data-testid="card-correlations">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Training Impact Analysis
              </CardTitle>
              <CardDescription>
                How your workouts affect sleep quality and resting heart rate
              </CardDescription>
            </CardHeader>
            <CardContent>
              {correlationsLoading ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : correlations ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3" data-testid="correlation-sleep">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Sleep Quality</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{correlations.sleepQuality.workoutDays}</div>
                        <div className="text-xs text-muted-foreground">Workout days</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{correlations.sleepQuality.nonWorkoutDays}</div>
                        <div className="text-xs text-muted-foreground">Non-workout days</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Badge 
                        variant={correlations.sleepQuality.improvement > 0 ? "default" : "secondary"}
                        className="w-full justify-center"
                      >
                        {correlations.sleepQuality.improvement > 0 ? '+' : ''}{correlations.sleepQuality.improvement} point improvement
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-3" data-testid="correlation-hr">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-primary" />
                      <h4 className="font-medium">Resting Heart Rate</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold">{correlations.restingHR.workoutDays}</div>
                        <div className="text-xs text-muted-foreground">Workout days</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{correlations.restingHR.nonWorkoutDays}</div>
                        <div className="text-xs text-muted-foreground">Non-workout days</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Badge 
                        variant={correlations.restingHR.improvement < 0 ? "default" : "secondary"}
                        className="w-full justify-center"
                      >
                        {correlations.restingHR.improvement} bpm improvement
                      </Badge>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No correlation data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI-Powered Recovery Insights */}
          <Card data-testid="card-recovery-insights">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Recovery Insights
              </CardTitle>
              <CardDescription>
                Personalized recovery recommendations based on your training analytics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : recoveryInsights && recoveryInsights.length > 0 ? (
                <div className="space-y-4">
                  {recoveryInsights.map((insight, index) => {
                    const severityColors = {
                      excellent: 'border-green-500/50 bg-green-50/50 dark:bg-green-950/20',
                      good: 'border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20',
                      caution: 'border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20',
                      warning: 'border-red-500/50 bg-red-50/50 dark:bg-red-950/20'
                    };
                    
                    const severityBadgeVariants = {
                      excellent: 'default',
                      good: 'secondary',
                      caution: 'outline',
                      warning: 'destructive'
                    };

                    return (
                      <div 
                        key={index} 
                        className={`p-4 rounded-lg border-l-4 ${severityColors[insight.severity]}`}
                        data-testid={`insight-${index}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <h4 className="font-semibold text-base">{insight.title}</h4>
                          <Badge variant={severityBadgeVariants[insight.severity] as any} className="shrink-0">
                            {insight.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{insight.description}</p>
                        <div className="bg-background/50 p-3 rounded-md space-y-2">
                          <div className="text-sm">
                            <span className="font-medium">Recommendation: </span>
                            <span className="text-muted-foreground">{insight.recommendation}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {insight.metrics.primary}: {insight.metrics.value}
                            </Badge>
                            <span>• {insight.metrics.context}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recovery insights available.</p>
                  <p className="text-sm mt-1">Complete some workouts to get AI-powered recovery recommendations.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
