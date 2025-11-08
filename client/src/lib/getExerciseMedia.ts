/**
 * Placeholder stub for exercise media fetching
 * TODO: Implement actual media fetching logic
 */

interface ExerciseMediaParams {
  id: string;
  name: string;
  target: string | null;
  bodyPart: string | null;
  equipment: string | null;
  externalId: string | null;
}

interface ExerciseMedia {
  url: string;
  confidence: "ok" | "low";
}

export async function getExerciseMedia(_params: ExerciseMediaParams): Promise<ExerciseMedia | null> {
  // Placeholder implementation
  // TODO: Add actual API call to fetch exercise media
  return null;
}
