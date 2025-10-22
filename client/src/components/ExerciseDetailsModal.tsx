import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, Target, Wrench, X, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

type ModalExercise = {
  id: string;                      // HP exercise id (immutable)
  name: string;                    // from the clicked card (DO NOT overwrite)
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;      // ExerciseDB id (if present)
  instructions?: string[];         // snapshot instructions from caller (DO NOT fetch)
};

type Props = {
  exercise: ModalExercise;         // pass from the card you clicked
  open: boolean;
  onClose: () => void;
};

type MediaResult =
  | { media: { url: string; id: string }; withheld: false; reason?: never }
  | { media: null; withheld: true; reason: 'no_external_id' | 'not_found' | 'verification_failed' | 'strict_binding_disabled'; details?: string[] };

async function fetchStrictMedia(exercise: ModalExercise): Promise<MediaResult> {
  return await apiRequest<MediaResult>("/api/exercisedb/media/strict", {
    method: "POST",
    body: JSON.stringify({
      id: exercise.id,
      name: exercise.name,
      target: exercise.target,
      bodyPart: exercise.bodyPart,
      equipment: exercise.equipment,
      externalId: exercise.externalId,
    }),
  });
}

// SAFE: never fetch by name here. Strict binding only uses trusted externalId with verification.
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

  // Fetch media with strict verification
  const { data: mediaResult, isLoading } = useQuery<MediaResult>({
    queryKey: ["exercise-media-strict", exercise.id, exercise.externalId ?? null],
    queryFn: () => fetchStrictMedia(exercise),
    enabled: open,                 // only fetch when modal is open
    placeholderData: undefined,    // critical: don't show previous card's media (TanStack Query v5)
    staleTime: 1000 * 60 * 60,
    retry: false,
    select: (result) => {
      // If some wiring bug returns a result for a different exercise (shouldn't happen), ignore it.
      return currentIdRef.current === exercise.id ? result : { media: null, withheld: true, reason: 'not_found' as const };
    },
  });

  if (!open) return null;

  // Determine what to display
  const hasMedia = mediaResult && !mediaResult.withheld && mediaResult.media;
  const isWithheld = mediaResult && mediaResult.withheld;
  const hasInstructions = exercise.instructions && exercise.instructions.length > 0;

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

          {!isLoading && (
            <div className="space-y-6">
              {/* GIF Demonstration */}
              {hasMedia && (
                <div className="rounded-md bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Demonstration
                  </h3>
                  <div className="relative rounded-md overflow-hidden bg-background aspect-video flex items-center justify-center">
                    <img
                      src={mediaResult.media.url}
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
              )}

              {/* Withheld Media Warning */}
              {isWithheld && (
                <div className="rounded-md bg-yellow-500/10 border border-yellow-500/20 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                        Demo Withheld
                      </h3>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        {mediaResult.reason === 'no_external_id' && 
                          'This exercise does not have a linked demonstration in our database.'}
                        {mediaResult.reason === 'not_found' && 
                          'The linked demonstration could not be found in ExerciseDB.'}
                        {mediaResult.reason === 'verification_failed' && 
                          'The linked demonstration did not match this exercise (safety check prevented display).'}
                        {mediaResult.reason === 'strict_binding_disabled' && 
                          'Strict binding verification is disabled.'}
                      </p>
                      {mediaResult.details && mediaResult.details.length > 0 && (
                        <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
                          {mediaResult.details.map((detail, idx) => (
                            <div key={idx}>• {detail}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions from snapshot (NEVER fetch) */}
              {hasInstructions && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Instructions
                  </h3>
                  <ol className="space-y-3">
                    {exercise.instructions!.map((instruction, idx) => (
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

              {/* Empty state when no media and no instructions */}
              {!hasMedia && !isWithheld && !hasInstructions && !isLoading && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No demonstration or instructions available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    This exercise doesn't have linked content yet
                  </p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
