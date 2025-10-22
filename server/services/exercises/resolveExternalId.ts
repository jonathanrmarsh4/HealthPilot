/**
 * ExerciseDB External ID Resolver
 * 
 * Orchestrates between SimpleMatcher (deterministic) and legacy resolver (fuzzy)
 * based on EXERCISE_SIMPLE_MATCHER_ENABLED feature flag.
 */

import { canUseSimpleMatcher } from '@shared/config/flags';
import { resolveSimple, type HPExercise, type MatchResult } from './simpleMatcher';
import { deriveExercisedbId, type ExerciseDBMatch } from '../../utils/exercisedbResolver';
import { storage } from '../../storage';

export interface ExerciseInput {
  name: string;
  muscles: string[];
  equipment: string;
  category?: string;
}

export interface ResolveResult {
  exercisedbId: string;
  name: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Resolve ExerciseDB ID for a HealthPilot exercise
 * 
 * Routes to SimpleMatcher (if flag enabled) or legacy resolver (if flag disabled)
 * 
 * @param exercise - Exercise to resolve
 * @returns Match result or null if no confident match found
 */
export async function resolveExternalId(
  exercise: ExerciseInput
): Promise<ResolveResult | null> {
  const useSimpleMatcher = canUseSimpleMatcher();
  
  console.log(
    `[ResolveExternalId] Resolving "${exercise.name}" ` +
    `(simple matcher: ${useSimpleMatcher ? 'ENABLED' : 'DISABLED'})`
  );
  
  if (useSimpleMatcher) {
    return await resolveWithSimpleMatcher(exercise);
  } else {
    return await resolveWithLegacy(exercise);
  }
}

/**
 * Resolve using SimpleMatcher (deterministic scoring)
 */
async function resolveWithSimpleMatcher(
  exercise: ExerciseInput
): Promise<ResolveResult | null> {
  // Search for candidates
  const candidates = await storage.searchExercisedbCandidates(exercise.name);
  
  if (candidates.length === 0) {
    console.warn(`[SimpleMatcher] No candidates found for "${exercise.name}"`);
    return null;
  }
  
  console.log(`[SimpleMatcher] Found ${candidates.length} candidates for "${exercise.name}"`);
  
  // Convert to SimpleMatcher format
  const hpExercise: HPExercise = {
    id: 'temp-id',
    name: exercise.name,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    category: exercise.category,
  };
  
  const dbCandidates = candidates.map(c => ({
    exerciseId: c.exerciseId,
    name: c.name,
    target: c.target,
    bodyPart: c.bodyPart,
    equipment: c.equipment,
  }));
  
  // Score and match
  const match = resolveSimple(hpExercise, dbCandidates);
  
  if (!match) {
    return null;
  }
  
  return {
    exercisedbId: match.exercisedbId,
    name: match.name,
    confidence: match.confidence,
  };
}

/**
 * Resolve using legacy fuzzy matcher
 */
async function resolveWithLegacy(
  exercise: ExerciseInput
): Promise<ResolveResult | null> {
  const match: ExerciseDBMatch | null = await deriveExercisedbId({
    name: exercise.name,
    muscles: exercise.muscles,
    equipment: exercise.equipment,
    category: exercise.category || 'strength',
  });
  
  if (!match) {
    return null;
  }
  
  return {
    exercisedbId: match.exercisedbId,
    name: match.name,
    confidence: match.confidence,
  };
}
