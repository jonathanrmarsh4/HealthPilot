/**
 * Exercise Media Resolution Service
 * 
 * Production-ready service for fetching exercise GIFs with:
 * - Trusted ID-based lookup (fast path)
 * - Optional auto-mapping with confidence scoring
 * - Feature flag control for progressive rollout
 * - Telemetry logging for continuous improvement
 */

import { resolve } from "./resolveExternalId";
import { SCORE_OK } from "./confidence";
import { storage } from "../../storage";
import { canUseExerciseMediaAutomap } from "@shared/config/flags";

type HP = {
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
  externalId?: string | null;
};

interface MediaResult {
  url: string;
  id: string;
  source: "ExerciseDB";
  confidence: "trusted" | "ok";
}

/**
 * Safely get media (GIF) for an exercise with intelligent fallback
 * 
 * Strategy:
 * 1. If exercise has trusted externalId, fetch directly by ID (fast path)
 * 2. If auto-mapping enabled, search candidates and score them
 * 3. Return media only if confidence threshold (6+) is met
 * 4. Log all attempts for telemetry and admin review
 * 
 * @param hp - HealthPilot exercise to find media for
 * @param opts - Options including allowAutomap feature flag override
 * @returns Media result or null if no confident match found
 */
export async function getMediaSafe(
  hp: HP,
  opts?: { allowAutomap?: boolean }
): Promise<MediaResult | null> {
  // 1) If we already have a trusted ID, fetch by ID only (fast path)
  if (hp.externalId) {
    const byId = await fetchMediaById(hp.externalId);
    if (byId) {
      return { ...byId, confidence: "trusted" as const };
    }
    // Fall through to candidate search if ID is stale/invalid
  }

  // 2) Check if auto-mapping is allowed (feature flag + explicit opt-in)
  const automapEnabled = opts?.allowAutomap ?? canUseExerciseMediaAutomap();
  if (!automapEnabled) {
    return null;
  }

  // 3) Search candidates by name and score them
  try {
    const candidates = await searchExerciseDBCandidates(hp.name);

    if (candidates.length === 0) {
      await logSuppressed(hp, 0, 0, "NO_MATCH");
      return null;
    }

    // 4) Resolve best match using deterministic scoring
    const result = resolve(
      {
        id: hp.id,
        name: hp.name,
        target: hp.target,
        bodyPart: hp.bodyPart,
        equipment: hp.equipment ?? null,
      },
      candidates
    );

    if (!result) {
      await logSuppressed(hp, 0, candidates.length, "NO_MATCH");
      return null;
    }

    const { top } = result;

    // 5) Check confidence threshold (SCORE_OK = 6)
    if (top.score < SCORE_OK) {
      await logSuppressed(hp, top.score, candidates.length, "LOW_CONFIDENCE", top.c);
      return null;
    }

    // 6) We have a confident match - persist the link for future fast-path lookups
    const chosen = top.c;
    if (chosen.gifUrl) {
      // Log successful match for telemetry
      await logSuccess(hp, top.score, candidates.length, chosen);
      
      // Persist the external ID to enable fast-path lookups in future
      await persistExternalId(hp.id, chosen.id);
      
      return {
        url: chosen.gifUrl,
        id: chosen.id,
        source: "ExerciseDB" as const,
        confidence: "ok" as const,
      };
    }

    // Matched exercise but no GIF available
    await logSuppressed(hp, top.score, candidates.length, "NO_GIF", chosen);
    return null;
  } catch (error) {
    console.error("[getMediaSafe] Error during candidate search:", error);
    return null;
  }
}

/**
 * Fetch media by known ExerciseDB ID (trusted path)
 */
async function fetchMediaById(id: string): Promise<{ url: string; id: string; source: "ExerciseDB" } | null> {
  try {
    // Use storage layer to fetch from database
    const exercise = await storage.getExercisedbExerciseById(id);

    if (exercise) {
      // Construct the GIF URL from the exercise ID
      const gifUrl = `/api/exercisedb/image?exerciseId=${exercise.exerciseId}`;
      
      return {
        url: gifUrl,
        id: exercise.exerciseId,
        source: "ExerciseDB" as const,
      };
    }

    return null;
  } catch (error) {
    console.error(`[fetchMediaById] Failed to fetch exercise ${id}:`, error);
    return null;
  }
}

/**
 * Search ExerciseDB candidates by name
 * Returns all exercises that fuzzy-match the search term
 */
async function searchExerciseDBCandidates(name: string): Promise<Array<{
  id: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string;
  gifUrl?: string;
}>> {
  try {
    // Get all exercises and filter client-side for fuzzy matching
    // This is acceptable since we cache the full list (1,300 exercises)
    const allExercises = await storage.getAllExercisedbExercises();
    const searchTerm = name.toLowerCase().trim();
    
    // Filter exercises that contain the search term and construct gifUrl
    const matches = allExercises
      .filter((ex) => ex.name.toLowerCase().includes(searchTerm))
      .map((ex) => ({
        id: ex.exerciseId,
        name: ex.name,
        target: ex.target,
        bodyPart: ex.bodyPart,
        equipment: ex.equipment,
        gifUrl: `/api/exercisedb/image?exerciseId=${ex.exerciseId}`,
      }));
    
    return matches;
  } catch (error) {
    console.error("[searchExerciseDBCandidates] Search failed:", error);
    return [];
  }
}

/**
 * Log suppressed media attempts for telemetry and admin review
 */
async function logSuppressed(
  hp: HP,
  score: number,
  candidateCount: number,
  reason: "LOW_CONFIDENCE" | "NO_MATCH" | "NO_GIF",
  chosen?: any
): Promise<void> {
  try {
    await storage.logMediaAttempt({
      hpExerciseId: hp.id,
      hpExerciseName: hp.name,
      target: hp.target || "",
      bodyPart: hp.bodyPart || "",
      equipment: hp.equipment || null,
      reason,
      score,
      candidateCount,
      chosenId: chosen?.id || null,
      chosenName: chosen?.name || null,
      candidates: chosen
        ? [
            {
              id: chosen.id,
              name: chosen.name,
              score,
              target: chosen.target,
              bodyPart: chosen.bodyPart,
              equipment: chosen.equipment,
            },
          ]
        : undefined,
    });
  } catch (error) {
    // Silent fail for telemetry - don't block user experience
    console.error("[getMediaSafe] Failed to log suppressed attempt:", error);
  }
}

/**
 * Log successful media matches for analytics
 */
async function logSuccess(
  hp: HP,
  score: number,
  candidateCount: number,
  chosen: any
): Promise<void> {
  try {
    await storage.logMediaAttempt({
      hpExerciseId: hp.id,
      hpExerciseName: hp.name,
      target: hp.target || "",
      bodyPart: hp.bodyPart || "",
      equipment: hp.equipment || null,
      reason: "OK",
      score,
      candidateCount,
      chosenId: chosen.id,
      chosenName: chosen.name,
      candidates: [
        {
          id: chosen.id,
          name: chosen.name,
          score,
          target: chosen.target,
          bodyPart: chosen.bodyPart,
          equipment: chosen.equipment,
        },
      ],
    });
  } catch (error) {
    // Silent fail for telemetry
    console.error("[getMediaSafe] Failed to log success:", error);
  }
}

/**
 * Persist ExerciseDB external ID to HealthPilot exercise
 * 
 * This creates a trusted link between the HealthPilot exercise and ExerciseDB,
 * enabling fast-path media lookups in the future.
 * 
 * @param hpExerciseId - HealthPilot exercise ID
 * @param externalId - ExerciseDB exercise ID
 * @returns Updated exercise or undefined if not found
 */
export async function persistExternalId(
  hpExerciseId: string,
  externalId: string
): Promise<void> {
  try {
    const updated = await storage.updateExerciseExternalId(hpExerciseId, externalId);
    
    if (updated) {
      console.log(
        `[persistExternalId] Successfully linked exercise ${hpExerciseId} to ExerciseDB ID ${externalId}`
      );
    } else {
      console.warn(
        `[persistExternalId] Exercise ${hpExerciseId} not found - cannot persist external ID`
      );
    }
  } catch (error) {
    console.error(
      `[persistExternalId] Failed to persist external ID for exercise ${hpExerciseId}:`,
      error
    );
    throw error;
  }
}
