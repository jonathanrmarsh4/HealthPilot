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
  CheckCircle2, 
  Circle, 
  Timer, 
  TrendingUp,
  Dumbbell,
  Trophy,
  Clock,
  Repeat,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Info
} from "lucide-react";
import { format, differenceInSeconds } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { Loader2 } from "lucide-react";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkoutFeedbackModal, WorkoutFeedback } from "@/components/WorkoutFeedbackModal";
import { ExerciseDetailsModal } from "@/components/ExerciseDetailsModal";

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
  trackingType: string; // 'weight_reps', 'bodyweight_reps', 'distance_duration', 'duration_only'
  exercisedbId?: string | null; // ExerciseDB ID for stable GIF linking
}

interface ExerciseSet {
  id: string;
  workoutSessionId: string;
  exerciseId: string;
  userId: string;
  setIndex: number;
  targetRepsLow?: number;
  targetRepsHigh?: number;
  weight?: number | null;
  reps?: number | null;
  distance?: number | null; // in km for cardio
  duration?: number | null; // in seconds for cardio/flexibility
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

// Sortable Exercise Card Component
function SortableExerciseCard({ 
  exercise, 
  exerciseSets, 
  completedSets,
  exerciseIndex,
  progressiveSuggestion,
  updateSetMutation,
  addSetMutation,
  handleCompleteSet,
  handleShowAlternatives,
  handleAddSet,
  isExpanded,
  onToggleExpand,
  wasDragging
}: {
  exercise: Exercise;
  exerciseSets: ExerciseSet[];
  completedSets: number;
  exerciseIndex: number;
  progressiveSuggestion?: ProgressiveOverloadSuggestion;
  updateSetMutation: any;
  addSetMutation: any;
  handleCompleteSet: (set: ExerciseSet, exercise: Exercise) => void;
  handleShowAlternatives: (exercise: Exercise) => void;
  handleAddSet: (exerciseId: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  wasDragging: boolean;
}) {
  const [showExerciseDetails, setShowExerciseDetails] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Local state for input values (for responsive typing)
  const [localValues, setLocalValues] = useState<Map<string, { weight: string; reps: string; distance: string; duration: string }>>(new Map());

  // Initialize and sync local values with database (simple approach)
  useEffect(() => {
    setLocalValues(prev => {
      let hasChanges = false;
      const newValues = new Map(prev);
      
      exerciseSets.forEach(set => {
        // Check if this set already has local values
        if (!newValues.has(set.id)) {
          hasChanges = true;
          // New set: initialize from database, then prepopulate if needed
          const dbWeight = set.weight !== null && set.weight !== undefined && set.weight > 0 ? set.weight.toString() : '';
          const initialWeight = dbWeight || (
            exercise.trackingType === 'weight_reps' && 
            progressiveSuggestion?.suggestedWeight !== null && 
            progressiveSuggestion?.suggestedWeight !== undefined && 
            set.completed === 0 
              ? progressiveSuggestion.suggestedWeight.toString() 
              : ''
          );
          
          newValues.set(set.id, {
            weight: initialWeight,
            reps: set.reps !== null && set.reps !== undefined ? set.reps.toString() : '',
            distance: set.distance !== null && set.distance !== undefined ? set.distance.toString() : '',
            duration: set.duration !== null && set.duration !== undefined ? (set.duration / 60).toString() : '',
          });
        }
      });
      
      // Only return new Map if something actually changed (prevents infinite loop)
      return hasChanges ? newValues : prev;
    });
  }, [exerciseSets, exercise.trackingType, progressiveSuggestion]);

  const getLocalValue = (setId: string, field: 'weight' | 'reps' | 'distance' | 'duration') => {
    return localValues.get(setId)?.[field] ?? '';
  };

  const setLocalValue = (setId: string, field: 'weight' | 'reps' | 'distance' | 'duration', value: string) => {
    setLocalValues(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(setId) || { weight: '', reps: '', distance: '', duration: '' };
      newMap.set(setId, { ...current, [field]: value });
      return newMap;
    });
  };

  const saveValue = (setId: string, field: 'weight' | 'reps' | 'distance' | 'duration', value: string) => {
    let numValue: number | null;
    if (value === '') {
      numValue = null;
    } else if (field === 'weight' || field === 'distance') {
      numValue = parseFloat(value);
    } else if (field === 'duration') {
      numValue = parseFloat(value) * 60; // Convert minutes (with decimals) to seconds for storage
    } else {
      numValue = parseInt(value);
    }
    
    updateSetMutation.mutate({
      setId,
      data: { [field]: numValue },
    });
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? "shadow-lg" : ""}
      data-testid={`card-exercise-${exerciseIndex}`}
    >
      <CardHeader className="pb-3 space-y-0">
        <div className="flex items-start gap-2">
          {/* Drag Handle - Hold to reorder */}
          <button
            className="mt-1 cursor-move touch-none p-2 hover-elevate rounded"
            {...attributes}
            {...listeners}
            data-testid={`button-drag-${exerciseIndex}`}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Expand/Collapse Button - Separate from drag handle */}
          <button
            className="mt-1 cursor-pointer p-2 hover-elevate rounded"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            data-testid={`button-expand-${exerciseIndex}`}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Exercise Info */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base leading-tight" data-testid={`text-exercise-name-${exerciseIndex}`}>
              {exercise.name}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {exercise.muscles.slice(0, 2).join(", ")} • {exercise.equipment}
            </p>
            
            {/* Progressive Overload Suggestion - Compact - Only show when expanded and suggestion exists */}
            {isExpanded && progressiveSuggestion?.suggestedWeight !== null && progressiveSuggestion && (
              <div className="mt-2 flex items-center gap-1.5 text-xs" data-testid={`suggestion-${exerciseIndex}`}>
                <TrendingUp className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                {progressiveSuggestion.lastWeight !== null ? (
                  <>
                    <span className="text-muted-foreground">Last:</span>
                    <span className="font-medium">
                      {progressiveSuggestion.lastWeight}kg × {progressiveSuggestion.lastReps}
                    </span>
                    {progressiveSuggestion.suggestedWeight !== progressiveSuggestion.lastWeight && (
                      <span className="text-primary font-semibold">
                        → {progressiveSuggestion.suggestedWeight}kg
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">Suggested:</span>
                    <span className="text-primary font-semibold">
                      {progressiveSuggestion.suggestedWeight}kg
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions Column */}
          <div className="flex flex-col items-end gap-1.5">
            <Badge variant="outline" className="text-xs" data-testid={`badge-exercise-sets-${exerciseIndex}`}>
              {completedSets}/{exerciseSets.length}
            </Badge>
            {isExpanded && (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowExerciseDetails(true)}
                  data-testid={`button-exercise-info-${exerciseIndex}`}
                  className="h-7 w-7 p-0"
                >
                  <Info className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleShowAlternatives(exercise)}
                  data-testid={`button-swap-${exerciseIndex}`}
                  className="h-7 w-7 p-0"
                >
                  <Repeat className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-2 pt-0">
        {exerciseSets.map((set, setIndex) => (
          <div
            key={set.id}
            className={`p-3 rounded-lg border ${
              set.completed === 1 ? "bg-green-500/5 border-green-500/20" : "bg-muted/30"
            }`}
            data-testid={`set-${exerciseIndex}-${setIndex}`}
          >
            {/* Set Header Row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {set.completed === 1 ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" data-testid={`icon-set-complete-${exerciseIndex}-${setIndex}`} />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" data-testid={`icon-set-incomplete-${exerciseIndex}-${setIndex}`} />
                )}
                <span className="text-sm font-medium">Set {setIndex + 1}</span>
              </div>
              {set.targetRepsLow && set.targetRepsHigh && (
                <span className="text-xs text-muted-foreground">
                  Target: {set.targetRepsLow}-{set.targetRepsHigh}
                </span>
              )}
            </div>

            {/* Inputs Row - Conditional based on exercise tracking type */}
            <div className="flex items-end gap-2">
              {/* Weight + Reps (for strength training) */}
              {exercise.trackingType === 'weight_reps' && (
                <>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Weight (kg)</label>
                    <div className="flex gap-1">
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="0"
                        value={getLocalValue(set.id, 'weight')}
                        onChange={(e) => setLocalValue(set.id, 'weight', e.target.value)}
                        onBlur={(e) => saveValue(set.id, 'weight', e.target.value)}
                        disabled={set.completed === 1}
                        className="h-10 text-base flex-1"
                        data-testid={`input-weight-${exerciseIndex}-${setIndex}`}
                      />
                      <Button
                        size="sm"
                        variant={set.weight === null ? "default" : "outline"}
                        onClick={() =>
                          updateSetMutation.mutate({
                            setId: set.id,
                            data: { weight: set.weight === null ? (progressiveSuggestion?.suggestedWeight ?? 20) : null },
                          })
                        }
                        disabled={set.completed === 1}
                        className="h-10 px-3 text-xs"
                        data-testid={`button-bodyweight-${exerciseIndex}-${setIndex}`}
                      >
                        BW
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={getLocalValue(set.id, 'reps')}
                      onChange={(e) => setLocalValue(set.id, 'reps', e.target.value)}
                      onBlur={(e) => saveValue(set.id, 'reps', e.target.value)}
                      disabled={set.completed === 1}
                      className="h-10 text-base"
                      data-testid={`input-reps-${exerciseIndex}-${setIndex}`}
                    />
                  </div>
                </>
              )}

              {/* Reps only (for bodyweight exercises) */}
              {exercise.trackingType === 'bodyweight_reps' && (
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Reps</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={getLocalValue(set.id, 'reps')}
                    onChange={(e) => setLocalValue(set.id, 'reps', e.target.value)}
                    onBlur={(e) => saveValue(set.id, 'reps', e.target.value)}
                    disabled={set.completed === 1}
                    className="h-10 text-base"
                    data-testid={`input-reps-${exerciseIndex}-${setIndex}`}
                  />
                </div>
              )}

              {/* Distance + Duration (for cardio like running, cycling) */}
              {exercise.trackingType === 'distance_duration' && (
                <>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Distance (km)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={getLocalValue(set.id, 'distance')}
                      onChange={(e) => setLocalValue(set.id, 'distance', e.target.value)}
                      onBlur={(e) => saveValue(set.id, 'distance', e.target.value)}
                      disabled={set.completed === 1}
                      className="h-10 text-base"
                      data-testid={`input-distance-${exerciseIndex}-${setIndex}`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground block mb-1">Duration (min)</label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={getLocalValue(set.id, 'duration')}
                      onChange={(e) => setLocalValue(set.id, 'duration', e.target.value)}
                      onBlur={(e) => saveValue(set.id, 'duration', e.target.value)}
                      disabled={set.completed === 1}
                      className="h-10 text-base"
                      data-testid={`input-duration-${exerciseIndex}-${setIndex}`}
                    />
                  </div>
                </>
              )}

              {/* Duration only (for flexibility/stretching) */}
              {exercise.trackingType === 'duration_only' && (
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground block mb-1">Duration (min)</label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={getLocalValue(set.id, 'duration')}
                    onChange={(e) => setLocalValue(set.id, 'duration', e.target.value)}
                    onBlur={(e) => saveValue(set.id, 'duration', e.target.value)}
                    disabled={set.completed === 1}
                    className="h-10 text-base"
                    data-testid={`input-duration-${exerciseIndex}-${setIndex}`}
                  />
                </div>
              )}

              {/* Complete Button - Validation based on tracking type */}
              {set.completed === 0 && (
                <Button
                  size="default"
                  onClick={() => handleCompleteSet(set, exercise)}
                  disabled={
                    (exercise.trackingType === 'weight_reps' && (!set.reps || (set.weight !== null && set.weight !== 0 && !set.weight))) ||
                    (exercise.trackingType === 'bodyweight_reps' && !set.reps) ||
                    (exercise.trackingType === 'distance_duration' && (!set.distance || !set.duration)) ||
                    (exercise.trackingType === 'duration_only' && !set.duration)
                  }
                  className="h-10 px-4"
                  data-testid={`button-complete-set-${exerciseIndex}-${setIndex}`}
                >
                  ✓
                </Button>
              )}
            </div>
          </div>
        ))}
        
        {/* Add Set Button */}
        <div className="mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddSet(exercise.id)}
            disabled={addSetMutation.isPending}
            className="w-full"
            data-testid={`button-add-set-${exerciseIndex}`}
          >
            {addSetMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <span className="text-lg mr-2">+</span> Add Set
              </>
            )}
          </Button>
        </div>
        </CardContent>
      )}
      <ExerciseDetailsModal
        exerciseName={exercise.name}
        exercisedbId={exercise.exercisedbId}
        open={showExerciseDetails}
        onClose={() => setShowExerciseDetails(false)}
      />
    </Card>
  );
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

  // Exercise order state (for drag-and-drop)
  const [exerciseOrder, setExerciseOrder] = useState<string[]>([]);

  // Expanded state for exercises (collapsed by default)
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());

  // Toggle expand/collapse for an exercise
  const toggleExpandExercise = (exerciseId: string) => {
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  // Sync exercise order when exercises change (including after swaps)
  useEffect(() => {
    if (exercises.length > 0) {
      setExerciseOrder(prevOrder => {
        const currentIds = exercises.map(e => e.id);
        const needsUpdate = prevOrder.length !== currentIds.length || 
                           currentIds.some(id => !prevOrder.includes(id));
        
        if (!needsUpdate) return prevOrder;
        
        const removedIds = prevOrder.filter(id => !currentIds.includes(id));
        const newIds = currentIds.filter(id => !prevOrder.includes(id));
        
        // Handle swaps: if one removed and one added, replace at same position
        if (removedIds.length === 1 && newIds.length === 1) {
          const removedIndex = prevOrder.indexOf(removedIds[0]);
          const newOrder = [...prevOrder];
          newOrder[removedIndex] = newIds[0];
          return newOrder;
        } else {
          // Otherwise preserve existing order and append new IDs
          const preserved = prevOrder.filter(id => currentIds.includes(id));
          return [...preserved, ...newIds];
        }
      });
    }
  }, [exercises]);

  // Store progressive overload suggestions
  const [progressiveSuggestions, setProgressiveSuggestions] = useState<Map<string, ProgressiveOverloadSuggestion>>(new Map());
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // Fetch progressive overload suggestions for all exercises
  useEffect(() => {
    if (!exercises.length) return;

    const fetchSuggestions = async () => {
      const suggestions = new Map<string, ProgressiveOverloadSuggestion>();
      
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
    mutationFn: async ({ setId, data, startRest }: { setId: string; data: Partial<ExerciseSet>; startRest?: { duration: number } }) => {
      const result = await apiRequest("PATCH", `/api/exercise-sets/${setId}`, data);
      return { result, startRest };
    },
    onSuccess: (data) => {
      // Start rest timer BEFORE invalidating queries to prevent race condition
      if (data.startRest) {
        setRestTimer(data.startRest.duration);
      }
      
      // Invalidate queries after a small delay to let state update
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "sets"] });
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Add set mutation
  const addSetMutation = useMutation({
    mutationFn: async ({ exerciseId }: { exerciseId: string }) => {
      return await apiRequest("POST", `/api/workout-sessions/${sessionId}/exercises/${exerciseId}/add-set`, {});
    },
    onSuccess: () => {
      // Invalidate both sets and exercises queries to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "sets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions", sessionId, "exercises"] });
      toast({
        title: "Set Added",
        description: "New set added to exercise",
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

  // Finish workout mutation - records muscle group engagements
  const finishWorkoutMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/workout-sessions/${sessionId}/finish`, {});
    },
    onSuccess: async () => {
      // Invalidate and refetch all relevant data to ensure fresh state on Training page
      await queryClient.invalidateQueries({ queryKey: ["/api/analytics/muscle-group-frequency"] });
      await queryClient.refetchQueries({ queryKey: ["/api/analytics/muscle-group-frequency"] });
      
      // Refetch daily recommendation to show "Workout Complete" state immediately
      await queryClient.invalidateQueries({ queryKey: ["/api/training/daily-recommendation"] });
      await queryClient.refetchQueries({ queryKey: ["/api/training/daily-recommendation"] });
      
      // Invalidate other related queries
      await queryClient.invalidateQueries({ queryKey: ["/api/workouts/completed"] });
      
      toast({
        title: "Workout Complete!",
        description: "Great job on your workout. Please share your feedback.",
      });
      
      // Show feedback modal instead of navigating immediately
      setShowFeedbackModal(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Submit workout feedback mutation
  const submitFeedbackMutation = useMutation({
    mutationFn: async (feedback: WorkoutFeedback) => {
      return await apiRequest("POST", `/api/workout-sessions/${sessionId}/feedback`, feedback);
    },
    onSuccess: () => {
      setShowFeedbackModal(false);
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! We'll use it to improve your future workouts.",
      });
      
      // Navigate to training page
      navigate("/training");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle feedback submission
  const handleSubmitFeedback = (feedback: WorkoutFeedback) => {
    submitFeedbackMutation.mutate(feedback);
  };

  // Handle skipping feedback (navigate directly)
  const handleSkipFeedback = () => {
    setShowFeedbackModal(false);
    navigate("/training");
  };

  // Complete set and start rest timer
  const handleCompleteSet = (set: ExerciseSet, exercise: Exercise) => {
    const restDuration = exercise.restDefault || 90;
    
    updateSetMutation.mutate({
      setId: set.id,
      data: {
        completed: 1,
        restStartedAt: new Date().toISOString(),
      },
      startRest: { duration: restDuration },
    });
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
    setAlternatives([]);
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

  // Swap exercise
  const handleSwapExercise = async (alternativeExercise: Exercise) => {
    if (!selectedExerciseForSwap || !sessionId) return;

    try {
      await apiRequest("POST", `/api/workout-sessions/${sessionId}/swap-exercise`, {
        oldExerciseId: selectedExerciseForSwap.id,
        newExerciseId: alternativeExercise.id,
      });

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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts
        tolerance: 5, // Allow 5px of movement during the delay
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setExerciseOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Get ordered exercises
  const orderedExercises = useMemo(() => {
    if (exerciseOrder.length === 0) return exercises;
    return exerciseOrder
      .map(id => exercises.find(e => e.id === id))
      .filter(Boolean) as Exercise[];
  }, [exercises, exerciseOrder]);

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
      <div className="sticky top-0 z-20 bg-background border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/training")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate" data-testid="text-session-title">
              {session?.workoutType || "Workout"}
            </h1>
            <p className="text-xs text-muted-foreground" data-testid="text-session-start-time">
              Started {format(new Date(session?.startTime || new Date()), "h:mm a")}
            </p>
          </div>
        </div>
      </div>

      {/* Compact Metrics */}
      <div className="px-4 py-3 bg-muted/30 border-b">
        <div className="flex items-center justify-around gap-4">
          <div className="text-center" data-testid="card-duration">
            <Clock className="h-4 w-4 mx-auto mb-1 text-primary" />
            <p className="text-sm font-bold" data-testid="text-elapsed-time">
              {formatElapsedTime(elapsedTime)}
            </p>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="text-center" data-testid="card-progress">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-bold" data-testid="text-progress">
              {sessionProgress}%
            </p>
          </div>

          <div className="h-8 w-px bg-border" />

          <div className="text-center" data-testid="card-exercises">
            <Dumbbell className="h-4 w-4 mx-auto mb-1 text-blue-500" />
            <p className="text-sm font-bold" data-testid="text-exercise-count">
              {exercises.length}
            </p>
          </div>
        </div>
        <Progress value={sessionProgress} className="h-1.5 mt-3" data-testid="progress-session" />
      </div>

      {/* Exercise List with Drag-and-Drop */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-24">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exerciseOrder}
            strategy={verticalListSortingStrategy}
          >
            {orderedExercises.map((exercise, exerciseIndex) => {
              const exerciseSets = (setsByExercise.get(exercise.id) || []).sort((a, b) => a.setIndex - b.setIndex);
              const completedSets = exerciseSets.filter((s) => s.completed === 1).length;
              const progressiveSuggestion = progressiveSuggestions.get(exercise.id);

              return (
                <SortableExerciseCard
                  key={exercise.id}
                  exercise={exercise}
                  exerciseSets={exerciseSets}
                  completedSets={completedSets}
                  exerciseIndex={exerciseIndex}
                  progressiveSuggestion={progressiveSuggestion}
                  updateSetMutation={updateSetMutation}
                  addSetMutation={addSetMutation}
                  handleCompleteSet={handleCompleteSet}
                  handleShowAlternatives={handleShowAlternatives}
                  handleAddSet={(exerciseId) => addSetMutation.mutate({ exerciseId })}
                  isExpanded={expandedExercises.has(exercise.id)}
                  onToggleExpand={() => toggleExpandExercise(exercise.id)}
                  wasDragging={false}
                />
              );
            })}
          </SortableContext>
        </DndContext>
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
            onClick={() => finishWorkoutMutation.mutate()}
            disabled={finishWorkoutMutation.isPending}
            data-testid="button-finish-workout"
          >
            {finishWorkoutMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Finishing...
              </>
            ) : (
              <>
                <Trophy className="mr-2 h-4 w-4" />
                Finish
              </>
            )}
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

      {/* Workout Feedback Modal */}
      <WorkoutFeedbackModal
        open={showFeedbackModal}
        onOpenChange={(open) => {
          if (!open) handleSkipFeedback();
        }}
        exercises={exercises.map(e => e.name)}
        onSubmit={handleSubmitFeedback}
      />
    </div>
  );
}
