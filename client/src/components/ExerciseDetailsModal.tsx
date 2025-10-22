import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, Target, Wrench, X } from "lucide-react";

interface ExerciseDBExercise {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl: string;
}

interface ExerciseDetailsModalProps {
  exerciseName: string;           // The name from the clicked card (preserved, never overwritten)
  exercisedbId?: string | null;   // ExerciseDB ID for stable GIF lookup
  open: boolean;
  onClose: () => void;
}

/**
 * SAFE: Fetches exercise media ONLY by trusted exercisedbId.
 * Never performs name-based lookups. No automap here.
 */
async function fetchByExercisedbId(exercisedbId: string): Promise<ExerciseDBExercise | null> {
  const res = await fetch(`/api/exercisedb/exercise/${encodeURIComponent(exercisedbId)}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return await res.json();
}

export function ExerciseDetailsModal({ 
  exerciseName, 
  exercisedbId, 
  open, 
  onClose 
}: ExerciseDetailsModalProps) {
  // Force a fresh instance when the exercise changes (prevents stale data)
  const modalKey = useMemo(
    () => `exercise-modal-${exerciseName}-${exercisedbId ?? "none"}`, 
    [exerciseName, exercisedbId]
  );

  // Track the current exercise name to ignore late responses (belt & suspenders)
  const currentNameRef = useRef(exerciseName);
  useEffect(() => { 
    currentNameRef.current = exerciseName; 
  }, [exerciseName]);

  // Fetch media only by trusted exercisedbId. No automap here.
  const { data: exercise, isLoading } = useQuery<ExerciseDBExercise | null>({
    queryKey: ["exercise-details-modal", exercisedbId ?? null],
    queryFn: () => exercisedbId ? fetchByExercisedbId(exercisedbId) : Promise.resolve(null),
    enabled: open && !!exercisedbId, // Only fetch when modal is open AND we have an ID
    staleTime: 1000 * 60 * 60 * 24,  // Cache for 24 hours
    retry: false,
    select: (data) => {
      // If some wiring bug returns a result for a different exercise (shouldn't happen), ignore it
      if (!data) return null;
      return currentNameRef.current === exerciseName ? data : null;
    }
  });

  return (
    <Dialog key={modalKey} open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-exercise-details">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* CRITICAL: Title is ALWAYS the clicked exercise name. Never overwrite with fetched name. */}
              <DialogTitle className="text-2xl font-bold capitalize pr-8">
                {exerciseName}
              </DialogTitle>
              {exercise && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="capitalize">
                    <Target className="h-3 w-3 mr-1" />
                    {exercise.target}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    <Dumbbell className="h-3 w-3 mr-1" />
                    {exercise.bodyPart}
                  </Badge>
                  <Badge variant="outline" className="capitalize">
                    <Wrench className="h-3 w-3 mr-1" />
                    {exercise.equipment}
                  </Badge>
                </div>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="shrink-0"
              data-testid="button-close-exercise-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-md" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {!isLoading && !exercise && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">
                Exercise demonstration unavailable
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                This exercise doesn't have a linked demonstration yet
              </p>
            </div>
          )}

          {exercise && (
            <div className="space-y-6">
              {/* GIF Demonstration */}
              <div className="rounded-md bg-muted/50 p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Demonstration
                </h3>
                <div className="relative rounded-md overflow-hidden bg-background aspect-video flex items-center justify-center">
                  <img
                    src={exercise.gifUrl}
                    alt={`${exerciseName} demonstration`}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    data-testid="img-exercise-gif"
                    onError={(e) => {
                      // Hide broken images gracefully
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Secondary Muscles */}
              {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Secondary Muscles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {exercise.secondaryMuscles.map((muscle, idx) => (
                      <Badge key={idx} variant="secondary" className="capitalize">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {exercise.instructions && exercise.instructions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {exercise.instructions.map((instruction, idx) => (
                      <li key={idx} className="flex gap-3">
                        <span className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-sm font-semibold shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm leading-relaxed pt-0.5">
                          {instruction}
                        </span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
