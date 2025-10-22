/**
 * Client-side utility for fetching exercise media (GIFs)
 * Calls the backend API which uses getMediaSafe service
 */

export interface ExerciseMediaResult {
  url: string;
  id: string;
  source: "ExerciseDB";
  confidence: "trusted" | "ok";
}

export interface ExerciseForMedia {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;
}

/**
 * Fetch exercise media via API endpoint
 * This calls the backend which uses feature-flag controlled auto-mapping
 */
export async function getExerciseMedia(
  exercise: ExerciseForMedia
): Promise<ExerciseMediaResult | null> {
  const params = new URLSearchParams({
    id: exercise.id,
    name: exercise.name,
    target: exercise.target,
    bodyPart: exercise.bodyPart,
  });

  if (exercise.equipment) {
    params.append("equipment", exercise.equipment);
  }

  if (exercise.externalId) {
    params.append("externalId", exercise.externalId);
  }

  const response = await fetch(`/api/exercises/media?${params.toString()}`);

  if (!response.ok) {
    if (response.status === 404) {
      // No media found - this is expected for some exercises
      return null;
    }
    throw new Error(`Failed to fetch exercise media: ${response.statusText}`);
  }

  const data = await response.json();
  return data.media || null;
}
