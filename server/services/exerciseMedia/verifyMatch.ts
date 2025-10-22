/**
 * Exercise Match Verification
 * 
 * Verifies that an ExerciseDB item matches the clicked exercise to prevent
 * incorrect GIF/instruction display.
 * 
 * Verification Rules:
 * 1. Name must be similar (normalized match)
 * 2. Target muscle OR body part must match
 * 3. Equipment conflicts are flagged but not blocking (informational)
 */

import type { ExerciseDBItemFull } from '../exerciseDb/getById';

type HP = {
  name: string;
  target: string;
  bodyPart: string;
  equipment?: string | null;
};

/**
 * Normalize string for comparison (lowercase, remove special chars, trim)
 */
const norm = (s?: string | null) =>
  (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export type VerifyResult = {
  ok: boolean;
  reasons?: string[];
};

/**
 * Verify that ExerciseDB item matches the HealthPilot exercise
 * 
 * @param hp - HealthPilot exercise snapshot (from clicked card)
 * @param db - ExerciseDB exercise item fetched by externalId
 * @returns Verification result with reasons if failed
 */
export function verifyDbItemMatches(hp: HP, db: ExerciseDBItemFull): VerifyResult {
  const reasons: string[] = [];

  // Check 1: Name similarity (required)
  const nameEq = norm(hp.name) === norm(db.name);
  const nameContains = norm(db.name).includes(norm(hp.name)) || norm(hp.name).includes(norm(db.name));
  
  if (!nameEq && !nameContains) {
    reasons.push(`Name mismatch: "${hp.name}" vs "${db.name}"`);
  }

  // Check 2: Target muscle OR body part must match (at least one required)
  const targetEq = norm(hp.target) === norm(db.target);
  const bodyPartEq = norm(hp.bodyPart) === norm(db.bodyPart);
  
  if (!targetEq && !bodyPartEq) {
    reasons.push(
      `Muscle mismatch: HP(target="${hp.target}", bodyPart="${hp.bodyPart}") vs DB(target="${db.target}", bodyPart="${db.bodyPart}")`
    );
  }

  // Check 3: Equipment conflict (informational warning, not blocking)
  if (hp.equipment && db.equipment) {
    const equipEq = norm(hp.equipment) === norm(db.equipment);
    if (!equipEq) {
      // This is informational only - don't block on equipment mismatch
      console.warn(
        `[Verify] Equipment differs but not blocking: HP="${hp.equipment}" vs DB="${db.equipment}"`
      );
    }
  }

  // Pass only if name matches AND (target OR bodyPart matches)
  const ok = (nameEq || nameContains) && (targetEq || bodyPartEq);

  if (!ok) {
    console.warn(`[Verify] Match failed for "${hp.name}":`, reasons);
  }

  return { ok, reasons: ok ? undefined : reasons };
}
