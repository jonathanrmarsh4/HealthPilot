/**
 * ExerciseDB API Client
 * 
 * Provides type-safe search functionality for ExerciseDB exercises
 * with Zod validation for runtime type safety.
 */

import { z } from "zod";

const ZCandidate = z.object({
  id: z.string(),
  name: z.string(),
  target: z.string(),
  bodyPart: z.string(),
  equipment: z.string().optional(),
  gifUrl: z.string().url().optional(),
});

export type Candidate = z.infer<typeof ZCandidate>;

/**
 * Search ExerciseDB for exercises matching a name
 * 
 * @param name - Exercise name to search for
 * @returns Array of validated exercise candidates
 */
export async function searchExerciseDBCandidates(name: string): Promise<Candidate[]> {
  try {
    // Use the backend proxy endpoint
    const res = await fetch(`/api/exercisedb/exercises?name=${encodeURIComponent(name)}`);
    
    if (!res.ok) {
      console.error('ExerciseDB search failed:', res.status, res.statusText);
      return [];
    }
    
    const data = await res.json();
    const arr = Array.isArray(data) ? data : [];
    
    // Validate each candidate and filter out invalid ones
    return arr
      .map((x) => ZCandidate.safeParse(x))
      .filter((r) => r.success)
      .map((r) => r.data!);
  } catch (error) {
    console.error('Failed to search ExerciseDB:', error);
    return [];
  }
}
