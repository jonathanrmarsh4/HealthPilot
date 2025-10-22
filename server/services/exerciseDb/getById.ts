/**
 * ExerciseDB Item Fetcher
 * 
 * Fetches complete exercise data from ExerciseDB by ID for strict verification.
 */

import { z } from 'zod';

export const ZExerciseDBItemFull = z.object({
  id: z.string(),
  name: z.string(),
  bodyPart: z.string(),
  target: z.string(),
  equipment: z.string().optional(),
  gifUrl: z.string().url().optional(),
});

export type ExerciseDBItemFull = z.infer<typeof ZExerciseDBItemFull>;

/**
 * Get complete ExerciseDB item by ID
 * 
 * @param id - ExerciseDB exercise ID (e.g., "0025")
 * @returns Full exercise data including name, target, bodyPart, equipment, gifUrl
 */
export async function getExerciseDbItemByIdFull(
  id: string
): Promise<ExerciseDBItemFull | null> {
  try {
    // Use storage layer to fetch from database
    const { storage } = await import('../../storage');
    const exercise = await storage.getExercisedbExerciseById(id);

    if (!exercise) {
      console.warn(`[ExerciseDB] Exercise ${id} not found`);
      return null;
    }

    // Construct full item with GIF URL
    const item: ExerciseDBItemFull = {
      id: exercise.exerciseId,
      name: exercise.name,
      bodyPart: exercise.bodyPart,
      target: exercise.target,
      equipment: exercise.equipment,
      gifUrl: `/api/exercisedb/image?exerciseId=${exercise.exerciseId}`,
    };

    // Validate with Zod schema
    const validated = ZExerciseDBItemFull.parse(item);
    
    return validated;
  } catch (error) {
    console.error(`[ExerciseDB] Error fetching exercise ${id}:`, error);
    return null;
  }
}
