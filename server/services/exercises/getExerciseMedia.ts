/**
 * Exercise Media Resolution Service
 * 
 * Simplified, maintainable approach to fetching exercise GIFs from ExerciseDB.
 * Uses the clean scoring system from resolveExternalId.ts
 */

import { isConfident } from "./confidence";
import { resolve } from "./resolveExternalId";
import { storage } from "../../storage";

interface ExerciseInput {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;
}

interface MediaResult {
  url: string;
  id: string;
  confidence: 'trusted' | 'ok';
}

/**
 * Get media (GIF) for an exercise with confidence-based filtering
 * 
 * Strategy:
 * 1. If exercise has trusted externalId, fetch directly by ID
 * 2. Otherwise, search by name and score all candidates
 * 3. Return media only if confidence threshold is met
 * 4. Log all suppressed attempts for telemetry
 */
export async function getMediaForExercise(hp: ExerciseInput): Promise<MediaResult | null> {
  // 1) If we already have a trusted externalId, fetch directly by ID
  if (hp.externalId) {
    try {
      const item = await storage.getExerciseDBById(hp.externalId);
      if (item?.gifUrl) {
        return { 
          url: item.gifUrl, 
          id: item.id, 
          confidence: 'trusted' 
        };
      }
      // Fall through to candidate lookup if ID is stale/invalid
    } catch (error) {
      console.warn(`[getMediaForExercise] Failed to fetch by externalId ${hp.externalId}:`, error);
    }
  }

  // 2) Candidate lookup by name
  const candidates = await storage.searchExerciseDBByName(hp.name);
  
  const res = resolve(hp, candidates);
  
  if (!res) {
    await logSuppressed(hp, 0, candidates.length, 'NO_MATCH');
    return null;
  }

  const { top } = res;
  
  if (!isConfident(top.score)) {
    await logSuppressed(hp, top.score, candidates.length, 'LOW_CONFIDENCE', top.c);
    return null; // suppress until reviewed
  }

  // Confident enough to use
  if (top.c.gifUrl) {
    return { 
      url: top.c.gifUrl, 
      id: top.c.id, 
      confidence: 'ok' 
    };
  }
  
  // Matched exercise but no GIF available
  await logSuppressed(hp, top.score, candidates.length, 'NO_GIF', top.c);
  return null;
}

/**
 * Log suppressed media attempts for telemetry and future review
 */
async function logSuppressed(
  hp: ExerciseInput, 
  score: number, 
  candidateCount: number, 
  reason: 'LOW_CONFIDENCE' | 'NO_MATCH' | 'NO_GIF', 
  chosen?: any
): Promise<void> {
  try {
    await storage.logMediaAttempt({
      hpExerciseId: hp.id,
      hpExerciseName: hp.name,
      target: hp.target || '',
      bodyPart: hp.bodyPart || '',
      equipment: hp.equipment || null,
      reason,
      score,
      candidateCount,
      chosenId: chosen?.id || null,
      chosenName: chosen?.name || null,
      candidates: chosen ? [{
        id: chosen.id,
        name: chosen.name,
        score,
        target: chosen.target,
        bodyPart: chosen.bodyPart,
        equipment: chosen.equipment
      }] : undefined
    });
  } catch (error) {
    // Silent fail for telemetry - don't block user experience
    console.error('[getMediaForExercise] Failed to log suppressed attempt:', error);
  }
}
