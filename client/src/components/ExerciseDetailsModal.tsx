import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, Target, Wrench, X } from "lucide-react";

type ModalExercise = {
  id: string;                      // HP exercise id (immutable)
  name: string;                    // from the clicked card (DO NOT overwrite)
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;      // ExerciseDB id (if present)
};

type Props = {
  exercise: ModalExercise;         // pass from the card you clicked
  open: boolean;
  onClose: () => void;
};

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

async function fetchByExternalId(externalId: string): Promise<ExerciseDBExercise | null> {
  const res = await fetch(`/api/exercisedb/exercise/${encodeURIComponent(externalId)}`, {
    credentials: 'include',
  });
  if (!res.ok) return null;
  return await res.json();
}

// SAFE: never fetch by name here. Name-based lookups live behind explicit flags elsewhere.
export function ExerciseDetailsModal({ exercise, open, onClose }: Props) {
  // Force a fresh instance when the exercise changes
  const modalKey = useMemo(
    () => `exercise-modal-${exercise.id}-${exercise.externalId ?? "none"}`,
    [exercise.id, exercise.externalId]
  );

  // Track the current exercise id to ignore late responses (belt & suspenders)
  const currentIdRef = useRef(exercise.id);
  useEffect(() => {
    currentIdRef.current = exercise.id;
  }, [exercise.id]);

  // Fetch media only by trusted externalId. No automap here.
  const { data: media, isLoading } = useQuery<ExerciseDBExercise | null>({
    queryKey: ["exercise-media-for-modal", exercise.id, exercise.externalId ?? null],
    queryFn: () =>
      exercise.externalId ? fetchByExternalId(exercise.externalId) : Promise.resolve(null),
    enabled: open,                 // only fetch when modal is open
    staleTime: 1000 * 60 * 60,
    retry: false,
    select: (m) => {
      // If some wiring bug returns a result for a different exercise (shouldn't happen), ignore it.
      if (!m) return null;
      return currentIdRef.current === exercise.id ? m : null;
    },
  });

  if (!open) return null;

  return (
    <Dialog key={modalKey} open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-exercise-details">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Title is ALWAYS the clicked exercise name. Do not overwrite with fetched name. */}
              <DialogTitle className="text-2xl font-bold capitalize pr-8">
                {exercise.name}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-3">
                <Badge variant="outline" className="capitalize">
                  <Target className="h-3 w-3 mr-1" />
                  {exercise.target}
                </Badge>
                <Badge variant="outline" className="capitalize">
                  <Dumbbell className="h-3 w-3 mr-1" />
                  {exercise.bodyPart}
                </Badge>
                {exercise.equipment && (
                  <Badge variant="outline" className="capitalize">
                    <Wrench className="h-3 w-3 mr-1" />
                    {exercise.equipment}
                  </Badge>
                )}
              </div>
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

          {!isLoading && !media && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Exercise demonstration unavailable</p>
              <p className="text-sm text-muted-foreground mt-2">
                This exercise doesn't have a linked demonstration yet
              </p>
            </div>
          )}

          {media && (
            <div className="space-y-6">
              {/* GIF Demonstration */}
              <div className="rounded-md bg-muted/50 p-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Demonstration
                </h3>
                <div className="relative rounded-md overflow-hidden bg-background aspect-video flex items-center justify-center">
                  <img
                    src={media.gifUrl}
                    alt={`${exercise.name} demonstration`}
                    className="max-w-full max-h-full object-contain"
                    loading="lazy"
                    data-testid="img-exercise-gif"
                    onError={(e) => {
                      // Hide broken images gracefully
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              </div>

              {/* Secondary Muscles */}
              {media.secondaryMuscles && media.secondaryMuscles.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Secondary Muscles
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {media.secondaryMuscles.map((muscle, idx) => (
                      <Badge key={idx} variant="secondary" className="capitalize">
                        {muscle}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Instructions */}
              {media.instructions && media.instructions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {media.instructions.map((instruction, idx) => (
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
