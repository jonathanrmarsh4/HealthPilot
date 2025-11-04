import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  Dumbbell, 
  Clock, 
  Zap, 
  Activity, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { useLocation } from "wouter";

export function DailyGeneratedWorkout() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Fetch today's generated workout
  const { data: workout, isLoading, error } = useQuery({
    queryKey: ["/api/training/generated-workout", today],
    retry: false,
  });

  // Generate new workout mutation
  const generateMutation = useMutation({
    mutationFn: async (regenerate = false) => {
      return apiRequest("POST", "/api/training/generate-daily-session", {
        date: today,
        regenerate
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/generated-workout", today] });
      toast({
        title: data.regenerated ? "Workout Regenerated" : "Workout Generated",
        description: "Your AI-powered training session is ready",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Accept workout mutation
  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/training/generated-workout/${id}/accept`, {});
      return response.json();
    },
    onSuccess: (data: { success: boolean; sessionId: string; instanceId: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/generated-workout", today] });
      toast({
        title: "Workout Accepted",
        description: "Opening workout tracker...",
      });
      // Navigate to the workout session page with instanceId to load from snapshot
      setLocation(`/workout/${data.sessionId}?instanceId=${data.instanceId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject workout mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("POST", `/api/training/generated-workout/${id}/reject`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/generated-workout", today] });
      toast({
        title: "Workout Rejected",
        description: "You can generate a new one",
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

  const workoutData = workout?.workoutData;
  const isGenerating = generateMutation.isPending;
  const isPending = workout?.status === 'pending';
  const isAccepted = workout?.status === 'accepted';
  const isRejected = workout?.status === 'rejected';
  const isCompleted = workout?.status === 'completed';

  // Transform blocks array to exercise format for display
  const exercises = workoutData?.blocks?.map((block: any) => ({
    exercise: block.display_name || block.pattern,
    sets: block.sets,
    reps: block.reps,
    rest_seconds: block.rest_s,
    intensity: block.intensity?.scheme === 'rir' 
      ? `RIR ${block.intensity.target}` 
      : `${block.intensity?.target || ''}`,
    goal: block.preferred_modality || 'strength',
    pattern: block.pattern
  })) || [];

  return (
    <Card data-testid="card-daily-generated-workout">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Today's Recommended Workout</CardTitle>
          </div>
          {workout && (
            <Badge 
              variant={isPending ? "secondary" : isAccepted ? "default" : isCompleted ? "secondary" : "outline"}
              className={isCompleted ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : ""}
              data-testid="badge-workout-status"
            >
              {isPending && "Pending Review"}
              {isAccepted && "Accepted"}
              {isRejected && "Rejected"}
              {isCompleted && (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Completed
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !workout && (
          <div className="text-center py-8">
            <Button 
              onClick={() => generateMutation.mutate(false)}
              disabled={isGenerating}
              data-testid="button-generate-workout"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Today's Workout
                </>
              )}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              AI-powered session tailored to your profile and recovery
            </p>
          </div>
        )}

        {workoutData && (
          <>
            {/* Safety Alert */}
            {workoutData.safety?.flag && (
              <Alert variant="destructive" data-testid="alert-safety-warning">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-semibold">Safety Notice</p>
                  <p className="text-sm mt-1">{workoutData.safety.notes}</p>
                  {workoutData.safety.seek_medical_advice && (
                    <p className="text-sm mt-1 font-medium">
                      ⚠️ Please seek medical advice before proceeding
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Workout Focus */}
            <div data-testid="workout-focus">
              <h3 className="font-semibold text-sm mb-2">Today's Focus</h3>
              <p className="text-sm text-muted-foreground">{workoutData.plan?.focus || workoutData.focus || 'Strength Training'}</p>
            </div>

            {/* All Exercises - Show complete list on accept screen */}
            {!isExpanded && (
              <div className="space-y-4" data-testid="exercises-summary">
                {/* Main Exercises */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Main Lifts</h3>
                    <Badge variant="outline" className="text-xs">
                      {exercises.length} exercises
                    </Badge>
                  </div>
                  {exercises.length > 0 && (
                    <div className="space-y-2">
                      {exercises.map((exercise: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-2 bg-muted/30 rounded"
                          data-testid={`exercise-main-${idx}`}
                        >
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm font-medium">{exercise.exercise}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {exercise.sets} × {exercise.reps}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Show detailed view button */}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setIsExpanded(true)}
                  data-testid="button-show-details"
                >
                  Show Full Details (sets, reps, rest, etc.)
                </Button>
              </div>
            )}

            {/* Expanded View */}
            {isExpanded && (
              <div className="space-y-4" data-testid="expanded-workout-view">
                {/* Main Exercises */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Exercises</h3>
                  <div className="space-y-3">
                    {exercises.map((exercise: any, idx: number) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-muted/30 rounded space-y-1"
                        data-testid={`exercise-detail-${idx}`}
                      >
                        <div className="font-medium">{exercise.exercise}</div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          <span>{exercise.sets} sets</span>
                          <span>•</span>
                          <span>{exercise.reps} reps</span>
                          <span>•</span>
                          <span>{exercise.intensity}</span>
                          <span>•</span>
                          <span>{exercise.rest_seconds}s rest</span>
                        </div>
                        <Badge variant="outline" className="text-xs capitalize">
                          {exercise.goal}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="flex gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Duration</div>
                    <div className="font-semibold">{workoutData.plan?.total_time_estimate_min || workoutData.total_time_estimate_min || 60} min</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Sets</div>
                    <div className="font-semibold">{exercises.reduce((acc: number, ex: any) => acc + (ex.sets || 0), 0)}</div>
                  </div>
                </div>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={() => setIsExpanded(false)}
                  data-testid="button-show-less"
                >
                  Show Less
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            {isPending && (
              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => acceptMutation.mutate(workout.id)}
                  disabled={acceptMutation.isPending}
                  data-testid="button-accept-workout"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Workout
                </Button>
                <Button
                  variant="outline"
                  onClick={() => generateMutation.mutate(true)}
                  disabled={isGenerating}
                  data-testid="button-regenerate-workout"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Regenerate
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => rejectMutation.mutate(workout.id)}
                  disabled={rejectMutation.isPending}
                  data-testid="button-reject-workout"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}

            {isAccepted && (
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground text-center">
                  ✓ Workout accepted • Ready to start your session
                </p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setIsNavigating(true);
                      // Navigate directly to existing session - do NOT call accept again!
                      if (workout.sessionId && workout.instanceId) {
                        setLocation(`/workout/${workout.sessionId}?instanceId=${workout.instanceId}`);
                      } else {
                        // Fallback: if sessionId/instanceId not stored, call accept (backwards compat)
                        setIsNavigating(false);
                        acceptMutation.mutate(workout.id);
                      }
                    }}
                    disabled={isNavigating || acceptMutation.isPending}
                    data-testid="button-start-workout"
                  >
                    {(isNavigating || acceptMutation.isPending) ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Dumbbell className="mr-2 h-4 w-4" />
                    )}
                    Start Workout
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => generateMutation.mutate(true)}
                    disabled={isGenerating}
                    data-testid="button-regenerate-workout"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}

            {isCompleted && (
              <div className="space-y-3 pt-2">
                <div className="text-center py-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                  <p className="font-semibold text-lg text-green-700 dark:text-green-400">Workout Completed!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Great job on completing today's training session
                  </p>
                  <div className="mt-3 pt-3 border-t border-green-500/20">
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Your next AI-generated workout will be ready tomorrow at 4:00 AM
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => generateMutation.mutate(true)}
                  disabled={isGenerating}
                  data-testid="button-regenerate-workout"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate Alternative Workout
                    </>
                  )}
                </Button>
              </div>
            )}

            {isRejected && (
              <div className="space-y-2 pt-2">
                <p className="text-sm text-muted-foreground text-center">
                  Workout rejected • Generate a new one
                </p>
                <Button
                  className="w-full"
                  onClick={() => generateMutation.mutate(true)}
                  disabled={isGenerating}
                  data-testid="button-regenerate-workout"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate New Workout
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
