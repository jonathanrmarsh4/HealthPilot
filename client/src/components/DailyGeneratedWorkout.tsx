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
              variant={isPending ? "secondary" : isAccepted ? "default" : "outline"}
              data-testid="badge-workout-status"
            >
              {isPending && "Pending Review"}
              {isAccepted && "Accepted"}
              {isRejected && "Rejected"}
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
              <p className="text-sm text-muted-foreground">{workoutData.focus}</p>
            </div>

            {/* All Exercises - Show complete list on accept screen */}
            {!isExpanded && (
              <div className="space-y-4" data-testid="exercises-summary">
                {/* Main Exercises */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">Main Lifts</h3>
                    <Badge variant="outline" className="text-xs">
                      {workoutData.main?.length || 0} exercises
                    </Badge>
                  </div>
                  {workoutData.main && workoutData.main.length > 0 && (
                    <div className="space-y-2">
                      {workoutData.main.map((exercise: any, idx: number) => (
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

                {/* Accessories */}
                {workoutData.accessories && workoutData.accessories.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-sm">Accessory Work</h3>
                      <Badge variant="outline" className="text-xs">
                        {workoutData.accessories.length} exercises
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {workoutData.accessories.map((exercise: any, idx: number) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-2 bg-muted/20 rounded"
                          data-testid={`exercise-accessory-${idx}`}
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
                  </div>
                )}

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
                {/* Warmup */}
                {workoutData.warmup && workoutData.warmup.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-sm mb-2">Warm-up</h3>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {workoutData.warmup.map((item: string, idx: number) => (
                        <li key={idx}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator />

                {/* Main Exercises */}
                <div>
                  <h3 className="font-semibold text-sm mb-3">Main Lifts</h3>
                  <div className="space-y-3">
                    {workoutData.main?.map((exercise: any, idx: number) => (
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

                {/* Accessories */}
                {workoutData.accessories && workoutData.accessories.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-3">Accessory Work</h3>
                      <div className="space-y-2">
                        {workoutData.accessories.map((exercise: any, idx: number) => (
                          <div key={idx} className="p-2 bg-muted/20 rounded text-sm">
                            <div className="font-medium">{exercise.exercise}</div>
                            <div className="text-xs text-muted-foreground">
                              {exercise.sets} × {exercise.reps} @ {exercise.intensity}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Conditioning */}
                {workoutData.conditioning?.include && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Conditioning
                      </h3>
                      <div className="p-2 bg-muted/20 rounded text-sm">
                        <div className="font-medium capitalize">{workoutData.conditioning.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {workoutData.conditioning.duration_minutes} min • Zone {workoutData.conditioning.intensity_zone}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Cooldown */}
                {workoutData.cooldown && workoutData.cooldown.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Cool-down</h3>
                      <ul className="space-y-1 text-sm text-muted-foreground">
                        {workoutData.cooldown.map((item: string, idx: number) => (
                          <li key={idx}>• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}

                {/* Progression Notes */}
                {workoutData.progression_notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Progression Notes
                      </h3>
                      <p className="text-sm text-muted-foreground">{workoutData.progression_notes}</p>
                    </div>
                  </>
                )}

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
                  <RefreshCw className="mr-2 h-4 w-4" />
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
                <Button
                  className="w-full"
                  onClick={() => acceptMutation.mutate(workout.id)}
                  disabled={acceptMutation.isPending}
                  data-testid="button-start-workout"
                >
                  <Dumbbell className="mr-2 h-4 w-4" />
                  Start Workout
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
