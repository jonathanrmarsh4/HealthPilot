/**
 * ExerciseDB Fuzzy Matching Confidence Scoring
 * 
 * This module defines the confidence thresholds for the 0-10 scoring system
 * used when matching HealthPilot exercises to ExerciseDB media.
 * 
 * Scoring Components (0-10 scale):
 * - Name Match: 0-4 points (exact=4, substring=3, word overlap=1-3)
 * - Target Muscle: 0-3 points (match=+3, wrong=-1)
 * - Equipment: 0-3 points (exact=+3, partial=+2, conflict=-2)
 */

/**
 * SCORE_GOOD (7+): Excellent match quality
 * - Exact name + target + equipment alignment
 * - High confidence, suitable for automated mapping
 * - Example: "Barbell Squat" → "barbell squat" = 10/10
 */
export const SCORE_GOOD = 7;

/**
 * SCORE_OK (6+): Acceptable match quality
 * - Confident enough to use for media lookup
 * - Minimum threshold for isConfident()
 * - Example: "Squat" → "barbell squat" = 6/10
 */
export const SCORE_OK = 6;

/**
 * SCORE_LOW (5): Just above rejection threshold
 * - Filtered out, not confident enough to use
 * - Logged as LOW_CONFIDENCE with 50% sampling
 * - Example: "Curl" → "hammer curl" = 5/10
 */
export const SCORE_LOW = 5;

/**
 * Helper to determine if a match score is confident enough to use
 * @param score - Match score (0-10)
 * @returns true if score >= SCORE_OK (6+)
 */
export function isConfident(score: number): boolean {
  return score >= SCORE_OK;
}
