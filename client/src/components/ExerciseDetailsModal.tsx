import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Target, Dumbbell, Wrench } from "lucide-react";

type ModalExercise = {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
  instructions?: string[];
};

type Props = {
  exercise: ModalExercise;
  open: boolean;
  onClose: () => void;
};

export function ExerciseDetailsModal({ exercise, open, onClose }: Props) {
  // Force a fresh instance when the exercise changes
  const modalKey = useMemo(
    () => `exercise-modal-${exercise.id}`,
    [exercise.id]
  );

  if (!open) return null;

  const hasInstructions = exercise.instructions && exercise.instructions.length > 0;

  return (
    <Dialog key={modalKey} open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-exercise-details">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
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

        <div className="max-h-[calc(90vh-120px)] overflow-y-auto pr-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="space-y-6">
            {/* Visual Placeholder */}
            <div className="rounded-md bg-muted/30 p-8 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Dumbbell className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Exercise demonstration
              </p>
            </div>

            {/* Instructions */}
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

            {/* Empty state when no instructions */}
            {!hasInstructions && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No additional instructions available for this exercise
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
