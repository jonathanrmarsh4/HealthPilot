import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, Target, Wrench, X, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  exerciseName: string;
  exercisedbId?: string | null; // Stable ExerciseDB ID for direct lookup (preferred)
  open: boolean;
  onClose: () => void;
}

export function ExerciseDetailsModal({ exerciseName, exercisedbId, open, onClose }: ExerciseDetailsModalProps) {
  const [imageError, setImageError] = useState(false);

  const { data: exercise, isLoading, error } = useQuery<ExerciseDBExercise | null>({
    queryKey: exercisedbId 
      ? ['/api/exercisedb/exercise', exercisedbId]  // Direct ID lookup (deterministic)
      : ['/api/exercisedb/search', exerciseName],    // Fallback to fuzzy name search
    queryFn: async () => {
      // Prefer direct ID lookup when available
      if (exercisedbId) {
        const res = await fetch(`/api/exercisedb/exercise/${encodeURIComponent(exercisedbId)}`, {
          credentials: 'include',
        });
        if (!res.ok) {
          // If direct lookup fails, fall back to name search
          console.warn(`ExerciseDB ID ${exercisedbId} not found, falling back to name search`);
          const searchRes = await fetch(`/api/exercisedb/search?name=${encodeURIComponent(exerciseName)}`, {
            credentials: 'include',
          });
          if (!searchRes.ok) {
            throw new Error('Exercise not found');
          }
          return await searchRes.json();
        }
        return await res.json();
      }
      
      // Fallback: fuzzy name-based search (legacy behavior)
      const res = await fetch(`/api/exercisedb/search?name=${encodeURIComponent(exerciseName)}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        throw new Error('Exercise not found');
      }
      const data = await res.json();
      return data; // Can be null if no high-confidence match found
    },
    enabled: open && (!!exercisedbId || !!exerciseName),
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
    retry: false, // Don't retry on null responses
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-exercise-details">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl font-bold capitalize pr-8">
                {exercise?.name || exerciseName}
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

          {error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">This is a BETA function, coming soon</p>
            </div>
          )}

          {!isLoading && !error && exercise === null && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">This is a BETA function, coming soon</p>
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
                  {!imageError ? (
                    <img
                      src={exercise.gifUrl}
                      alt={`${exercise.name} demonstration`}
                      className="max-w-full max-h-full object-contain"
                      onError={() => setImageError(true)}
                      data-testid="img-exercise-gif"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-muted-foreground p-8">
                      <Dumbbell className="h-16 w-16 mb-4" />
                      <p className="text-sm">Animation unavailable</p>
                    </div>
                  )}
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
