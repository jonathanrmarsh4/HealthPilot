/**
 * Simplified Exercise External ID Resolution
 * 
 * Clean, maintainable scoring algorithm for matching HealthPilot exercises
 * to ExerciseDB media based on name, target, bodyPart, and equipment.
 */

type HP = { 
  id: string; 
  name: string; 
  target: string; 
  bodyPart: string; 
  equipment?: string | null 
};

type ExDB = { 
  id: string; 
  name: string; 
  target: string; 
  bodyPart: string; 
  equipment?: string | null; 
  gifUrl?: string 
};

/**
 * Normalize string for comparison (lowercase, alphanumeric only)
 */
const norm = (s?: string | null) => 
  (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Score a candidate match (0-9 scale)
 * 
 * Scoring breakdown:
 * - Name exact match: +3
 * - Name substring match: +1
 * - Target match: +3
 * - BodyPart match: +2
 * - Equipment match: +1
 * 
 * Maximum score: 9 (exact name + all fields match)
 */
export function score(hp: HP, c: ExDB): number {
  let s = 0;
  
  // Name matching (3 points max)
  if (norm(hp.name) === norm(c.name)) {
    s += 3;
  } else if (norm(hp.name).includes(norm(c.name)) || norm(c.name).includes(norm(hp.name))) {
    s += 1;
  }
  
  // Target muscle (3 points)
  if (norm(hp.target) === norm(c.target)) {
    s += 3;
  }
  
  // Body part (2 points)
  if (norm(hp.bodyPart) === norm(c.bodyPart)) {
    s += 2;
  }
  
  // Equipment (1 point)
  if (hp.equipment && c.equipment && norm(hp.equipment) === norm(c.equipment)) {
    s += 1;
  }
  
  return s;
}

/**
 * Resolve best matching exercise from candidates
 * 
 * @returns Object with top match and full ranked list, or null if no candidates
 */
export function resolve(hp: HP, candidates: ExDB[]) {
  const ranked = candidates
    .map(c => ({ c, score: score(hp, c) }))
    .sort((a, b) => b.score - a.score);
  
  const top = ranked[0];
  return top ? { top, ranked } : null;
}
