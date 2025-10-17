import { useState, useEffect, useMemo } from "react";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ChevronLeft, 
  Play, 
  Pause, 
  CheckCircle2, 
  Circle, 
  Timer, 
  TrendingUp,
  Dumbbell,
  Trophy,
  Clock,
  Repeat
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";

interface Exercise {
  id: string;
  name: string;
  muscles: string[];
  equipment: string;
  incrementStep: number;
  tempoDefault?: string;
  restDefault: number;
  instructions?: string;
  videoUrl?: string;
  difficulty?: string;
  category: string;
}

interface ExerciseSet {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  userId: string;
  setIndex: number;
  targetRepsLow?: number;
  targetRepsHigh?: number;
  weight?: number;
  reps?: number;
  rpeLogged?: number;
  completed: number;
  notes?: string;
  restStartedAt?: string;
  tempo?: string;
  createdAt: string;
}

interface WorkoutSession {
  id: string;
  userId: string;
  workoutType: string;
  sessionType: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  notes?: string;
  perceivedEffort?: number;
}

interface ProgressiveOverloadSuggestion {
  suggestedWeight: number | null;
  lastWeight: number | null;
  lastReps: number | null;
  reason: string;
}

export default function WorkoutSession() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/workout/:id");
  const sessionId = params?.id;
  const { toast } = useToast();

  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [restTimerInterval, setRestTimerInterval] = useState<NodeJS.Timeout | null>(null);
  const [sessionStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedExerciseForSwap, setSelectedExerciseForSwap] = useState<Exercise | null>(null);
  const [alternatives, setAlternatives] = useState<Exercise[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [alternativesError, setAlternativesError] = useState<string | null>(null);

  // Fetch workout session
  const { data: session, isLoading: sessionLoading } = useQuery<WorkoutSession>({
    queryKey: ["/api/workout-sessions", sessionId],
    enabled: !!sessionId,
  });

  // Fetch exercises for this session
  const { data: exercises = [], isLoading: exercisesLoading } = useQuery<Exercise[]>({
    queryKey: ["/api/workout-sessions", sessionId, "exercises"],
    enabled: !!sessionId,
  });

  // Fetch sets for this session
  const { data: sets = [], isLoading: setsLoading } = useQuery<ExerciseSet[]>({
    queryKey: ["/api/workout-sessions", sessionId, "sets"],
    enabled: !!sessionId,
  });

  // Store progressive overload suggestions
  const [progressiveSuggestions, setProgressiveSuggestions] = useState<Map<string, ProgressiveOverloadSuggestion>>(new Map());

  // Fetch progressive overload suggestions for all exercises (batched for performance)
  useEffect(() => {
    if (!exercises.length) return;

    const fetchSuggestions = async () => {
      const suggestions = new Map<string, ProgressiveOverloadSuggestion>();
      
      // Batch all requests with Promise.all to avoid sequential waterfall
      const fetchPromises = exercises.map(async (exercise) => {
        try {
          const response = await fetch(`/api/exercises/${exercise.id}/progressive-overload`, {
            credentials: 'include',
          });
          if (response.ok) {
            const suggestion = await response.json();
            return { exerciseId: exercise.id, suggestion };
          }
        } catch (error) {
          console.error(`Failed to fetch suggestion for ${exercise.name}:`, error);
        }
        return null;
      });
      
      const results = await Promise.all(fetchPromises);
      
      // Build suggestions map from results
      results.forEach((result) => {
        if (result) {
          suggestions.set(result.exerciseId, result.suggestion);
        }
      });
      
      setProgressiveSuggestions(suggestions);
    };

    fetchSuggestions();
  }, [exercises]);

  // Timer for elapsed time
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(differenceInSeconds(new Date(), sessionStartTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionStartTime]);

  // Rest timer countdown
  useEffect(() => {
    if (restTimer !== null && restTimer > 0) {
      const interval = setInterval(() => {
        setRestTimer((prev) => (prev && prev > 0 ? prev - 1 : null));
      }, 1000);
      setRestTimerInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (restTimer === 0) {
      // Timer finished, play alert
      toast({
        title: "Rest Complete!",
        description: "Ready for your next set",
      });
      setRestTimer(null);
      if (restTimerInterval) clearInterval(restTimerInterval);
    }
  }, [restTimer, toast, restTimerInterval]);

  // Update set mutation
  const updateSetMutation = useMutation({
    mutationFn: async ({ setId, data }: { setId: string; data: Partial<ExerciseSet> }) => {
      return apiRequest("PATCH", `/api/exercise-sets/${setId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "sets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete set and start rest timer
  const handleCompleteSet = (set: ExerciseSet, exercise: Exercise) => {
    updateSetMutation.mutate({
      setId: set.id,
      data: {
        completed: 1,
        restStartedAt: new Date().toISOString(),
      },
    });

    // Start rest timer
    setRestTimer(exercise.restDefault || 90);
  };

  // Cancel rest timer
  const handleCancelRest = () => {
    setRestTimer(null);
    if (restTimerInterval) clearInterval(restTimerInterval);
  };

  // Show exercise alternatives
  const handleShowAlternatives = async (exercise: Exercise) => {
    setSelectedExerciseForSwap(exercise);
    setSwapDialogOpen(true);
    setAlternatives([]); // Reset alternatives to prevent stale data
    setLoadingAlternatives(true);
    setAlternativesError(null);
    
    try {
      const response = await fetch(`/api/exercises/${exercise.id}/alternatives?limit=3`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to load alternatives: ${response.statusText}`);
      }
      
      const alternativeExercises = await response.json();
      setAlternatives(alternativeExercises);
    } catch (error: any) {
      console.error("Failed to fetch alternatives:", error);
      setAlternativesError(error.message || "Failed to load exercise alternatives");
      toast({
        title: "Error",
        description: "Failed to load exercise alternatives",
        variant: "destructive",
      });
    } finally {
      setLoadingAlternatives(false);
    }
  };

  // Swap exercise (replace all sets for this exercise with the alternative)
  const handleSwapExercise = async (alternativeExercise: Exercise) => {
    if (!selectedExerciseForSwap || !sessionId) return;

    try {
      // Call swap endpoint to replace exercise
      await apiRequest("POST", `/api/workout-sessions/${sessionId}/swap-exercise`, {
        oldExerciseId: selectedExerciseForSwap.id,
        newExerciseId: alternativeExercise.id,
      });

      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "exercises"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "sets"] });

      toast({
        title: "Exercise Swapped!",
        description: `Changed ${selectedExerciseForSwap.name} to ${alternativeExercise.name}`,
      });

      setSwapDialogOpen(false);
      setSelectedExerciseForSwap(null);
      setAlternatives([]);
    } catch (error) {
      console.error("Failed to swap exercise:", error);
      toast({
        title: "Error",
        description: "Failed to swap exercise",
        variant: "destructive",
      });
    }
  };

  // Group sets by exercise
  const setsByExercise = useMemo(() => {
    const grouped = new Map<string, ExerciseSet[]>();
    sets.forEach((set) => {
      if (!grouped.has(set.exerciseId)) {
        grouped.set(set.exerciseId, []);
      }
      grouped.get(set.exerciseId)!.push(set);
    });
    return grouped;
  }, [sets]);

  // Calculate session progress
  const sessionProgress = useMemo(() => {
    if (sets.length === 0) return 0;
    const completedSets = sets.filter((s) => s.completed === 1).length;
    return Math.round((completedSets / sets.length) * 100);
  }, [sets]);

  // Format elapsed time
  const formatElapsedTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format rest timer
  const formatRestTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!sessionId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Session not found</p>
      </div>
    );
  }

  if (sessionLoading || exercisesLoading || setsLoading) {
    return (
      <div className="space-y-6 p-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background border-b p-4">
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/training")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold" data-testid="text-session-title">
              {session?.workoutType || "Workout"}
            </h1>
            <p className="text-xs text-muted-foreground" data-testid="text-session-start-time">
              Started {format(new Date(session?.startTime || new Date()), "h:mm a")}
            </p>
          </div>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="p-4 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center" data-testid="card-duration">
            <CardContent className="p-3">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold" data-testid="text-elapsed-time">
                {formatElapsedTime(elapsedTime)}
              </p>
              <p className="text-xs text-muted-foreground">Duration</p>
            </CardContent>
          </Card>

          <Card className="text-center" data-testid="card-progress">
            <CardContent className="p-3">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-lg font-bold" data-testid="text-progress">
                {sessionProgress}%
              </p>
              <p className="text-xs text-muted-foreground">Complete</p>
            </CardContent>
          </Card>

          <Card className="text-center" data-testid="card-exercises">
            <CardContent className="p-3">
              <Dumbbell className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-lg font-bold" data-testid="text-exercise-count">
                {exercises.length}
              </p>
              <p className="text-xs text-muted-foreground">Exercises</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <div className="mt-4">
          <Progress value={sessionProgress} className="h-2" data-testid="progress-session" />
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {exercises.map((exercise, exerciseIndex) => {
          const exerciseSets = setsByExercise.get(exercise.id) || [];
          const completedSets = exerciseSets.filter((s) => s.completed === 1).length;

          return (
            <Card key={exercise.id} data-testid={`card-exercise-${exerciseIndex}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg" data-testid={`text-exercise-name-${exerciseIndex}`}>
                      {exercise.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {exercise.muscles.join(", ")} • {exercise.equipment}
                    </p>
                    
                    {/* Progressive Overload Suggestion */}
                    {progressiveSuggestions.get(exercise.id) && (
                      <div className="mt-2 flex items-center gap-2 p-2 bg-primary/10 rounded-md" data-testid={`suggestion-${exerciseIndex}`}>
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <div className="text-xs">
                          {progressiveSuggestions.get(exercise.id)!.lastWeight !== null ? (
                            <p>
                              <span className="text-muted-foreground">Last: </span>
                              <span className="font-medium">
                                {progressiveSuggestions.get(exercise.id)!.lastWeight}kg × {progressiveSuggestions.get(exercise.id)!.lastReps}
                              </span>
                              {progressiveSuggestions.get(exercise.id)!.suggestedWeight !== progressiveSuggestions.get(exercise.id)!.lastWeight && (
                                <span className="text-primary font-semibold ml-1">
                                  → Try {progressiveSuggestions.get(exercise.id)!.suggestedWeight}kg
                                </span>
                              )}
                            </p>
                          ) : (
                            <p className="text-muted-foreground">First time - no history</p>
                          )}
                          <p className="text-muted-foreground italic mt-0.5">
                            {progressiveSuggestions.get(exercise.id)!.reason}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" data-testid={`badge-exercise-sets-${exerciseIndex}`}>
                      {completedSets}/{exerciseSets.length} sets
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleShowAlternatives(exercise)}
                      data-testid={`button-swap-${exerciseIndex}`}
                      className="h-7 px-2"
                    >
                      <Repeat className="h-4 w-4 mr-1" />
                      <span className="text-xs">Swap</span>
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {exerciseSets.map((set, setIndex) => (
                  <div
                    key={set.id}
                    className={`p-3 rounded-lg border ${
                      set.completed === 1 ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"
                    }`}
                    data-testid={`set-${exerciseIndex}-${setIndex}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Set number */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background">
                        {set.completed === 1 ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" data-testid={`icon-set-complete-${exerciseIndex}-${setIndex}`} />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" data-testid={`icon-set-incomplete-${exerciseIndex}-${setIndex}`} />
                        )}
                      </div>

                      {/* Set inputs */}
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground">Weight (kg)</label>
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="0"
                              value={set.weight === null ? "" : (set.weight || "")}
                              onChange={(e) =>
                                updateSetMutation.mutate({
                                  setId: set.id,
                                  data: { weight: parseFloat(e.target.value) || 0 },
                                })
                              }
                              disabled={set.completed === 1 || set.weight === null}
                              className="h-8 text-sm flex-1"
                              data-testid={`input-weight-${exerciseIndex}-${setIndex}`}
                            />
                            <Button
                              size="sm"
                              variant={set.weight === null ? "default" : "outline"}
                              onClick={() =>
                                updateSetMutation.mutate({
                                  setId: set.id,
                                  data: { weight: set.weight === null ? 0 : null },
                                })
                              }
                              disabled={set.completed === 1}
                              className="h-8 px-2 text-xs"
                              data-testid={`button-bodyweight-${exerciseIndex}-${setIndex}`}
                            >
                              BW
                            </Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Reps</label>
                          <Input
                            type="number"
                            placeholder="0"
                            value={set.reps || ""}
                            onChange={(e) =>
                              updateSetMutation.mutate({
                                setId: set.id,
                                data: { reps: parseInt(e.target.value) || 0 },
                              })
                            }
                            disabled={set.completed === 1}
                            className="h-8 text-sm"
                            data-testid={`input-reps-${exerciseIndex}-${setIndex}`}
                          />
                        </div>
                      </div>

                      {/* Complete button */}
                      {set.completed === 0 && (
                        <Button
                          size="sm"
                          onClick={() => handleCompleteSet(set, exercise)}
                          disabled={(set.weight !== null && !set.weight) || !set.reps}
                          data-testid={`button-complete-set-${exerciseIndex}-${setIndex}`}
                        >
                          Complete
                        </Button>
                      )}
                    </div>

                    {/* Target reps */}
                    {set.targetRepsLow && set.targetRepsHigh && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Target: {set.targetRepsLow}-{set.targetRepsHigh} reps
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Rest Timer (floating) */}
      {restTimer !== null && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-30 w-11/12 max-w-md">
          <Card className="bg-primary text-primary-foreground shadow-lg" data-testid="card-rest-timer">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Timer className="h-6 w-6" />
                  <div>
                    <p className="text-sm font-medium">Rest Timer</p>
                    <p className="text-2xl font-bold" data-testid="text-rest-timer">
                      {formatRestTimer(restTimer)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCancelRest}
                  data-testid="button-cancel-rest"
                >
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sticky Footer */}
      <div className="sticky bottom-0 z-20 bg-background border-t p-4">
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/training")}
            data-testid="button-save-exit"
          >
            Save & Exit
          </Button>
          <Button
            className="flex-1"
            onClick={() => {
              toast({
                title: "Workout Complete!",
                description: "Great job on your workout",
              });
              navigate("/training");
            }}
            data-testid="button-finish-workout"
          >
            <Trophy className="mr-2 h-4 w-4" />
            Finish Workout
          </Button>
        </div>
      </div>

      {/* Swap Exercise Dialog */}
      <Dialog open={swapDialogOpen} onOpenChange={setSwapDialogOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-swap-exercise">
          <DialogHeader>
            <DialogTitle>Swap Exercise</DialogTitle>
            <DialogDescription>
              Choose an alternative for {selectedExerciseForSwap?.name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {loadingAlternatives ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Loading alternatives...</p>
              </div>
            ) : alternativesError ? (
              <div className="text-center py-8">
                <p className="text-sm text-destructive">{alternativesError}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => selectedExerciseForSwap && handleShowAlternatives(selectedExerciseForSwap)}
                  data-testid="button-retry-alternatives"
                >
                  Retry
                </Button>
              </div>
            ) : alternatives.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No alternatives found</p>
              </div>
            ) : (
              alternatives.map((alt, index) => (
                <Card
                  key={alt.id}
                  className="cursor-pointer hover-elevate active-elevate-2"
                  onClick={() => handleSwapExercise(alt)}
                  data-testid={`alternative-${index}`}
                >
                  <CardContent className="p-4">
                    <h3 className="font-semibold" data-testid={`alternative-name-${index}`}>
                      {alt.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alt.muscles.join(", ")} • {alt.equipment}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {alt.category}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alt.difficulty || "intermediate"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={() => {
              setSwapDialogOpen(false);
              setSelectedExerciseForSwap(null);
              setAlternatives([]);
              setAlternativesError(null);
            }}
            data-testid="button-cancel-swap"
          >
            Cancel
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
