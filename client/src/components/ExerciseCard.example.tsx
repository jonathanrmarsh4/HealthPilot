/**
 * Example: How to use exercise media fetching in React components
 * 
 * This demonstrates the correct pattern for fetching exercise GIFs
 * with feature flag control and intelligent caching.
 */

import { useQuery } from "@tanstack/react-query";
import { getExerciseMedia } from "@/lib/getExerciseMedia";
import type { Exercise } from "@shared/schema";

interface ExerciseCardProps {
  exercise: Exercise;
}

export function ExerciseCard({ exercise }: ExerciseCardProps) {
  // Fetch media via API (respects EXERCISE_MEDIA_AUTOMAP_ENABLED flag on backend)
  const { data: media, isLoading } = useQuery({
    queryKey: ["exercise-media", exercise.id, exercise.externalId ?? null],
    queryFn: () =>
      getExerciseMedia({
        id: exercise.id,
        name: exercise.name,
        target: exercise.target,
        bodyPart: exercise.bodyPart,
        equipment: exercise.equipment ?? null,
        externalId: exercise.externalId ?? null,
      }),
    // Cache for 1 hour - media URLs are stable
    staleTime: 1000 * 60 * 60,
    // Don't retry on 404 (no media found is expected)
    retry: (failureCount, error: any) => {
      if (error?.message?.includes("404")) return false;
      return failureCount < 2;
    },
  });

  return (
    <div className="border rounded-lg p-4" data-testid={`exercise-card-${exercise.id}`}>
      {/* Exercise name */}
      <h3 className="font-semibold mb-2" data-testid="exercise-name">
        {exercise.name}
      </h3>

      {/* Exercise metadata */}
      <div className="text-sm text-muted-foreground mb-3">
        <p data-testid="exercise-target">{exercise.target}</p>
        <p data-testid="exercise-equipment">{exercise.equipment || "Bodyweight"}</p>
      </div>

      {/* Media (GIF) display */}
      {isLoading ? (
        <div className="bg-muted rounded aspect-video flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      ) : media ? (
        <div className="relative">
          <img
            src={media.url}
            alt={`${exercise.name} demonstration`}
            className="w-full rounded aspect-video object-cover"
            data-testid="exercise-gif"
          />
          {/* Show confidence indicator for debugging */}
          {media.confidence === "ok" && (
            <span className="absolute top-2 right-2 bg-yellow-500/80 text-xs px-2 py-1 rounded">
              Auto-matched
            </span>
          )}
        </div>
      ) : (
        <div className="bg-muted rounded aspect-video flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No demonstration available</p>
        </div>
      )}

      {/* Instructions (if available) */}
      {exercise.instructions && (
        <div className="mt-3">
          <p className="text-sm">{exercise.instructions}</p>
        </div>
      )}
    </div>
  );
}
