/**
 * Exercise Matcher Simple V1
 * 
 * Deterministic, transparent exercise-to-ExerciseDB matching with confidence scoring.
 * Replaces complex fuzzy matching with simple, auditable rules.
 * 
 * Design Principles:
 * - Transparent scoring (no black-box algorithms)
 * - Deterministic (same input → same output)
 * - Easy to audit and tune
 * - Fail-safe (only accept confident matches)
 */

// ===================
// CONFIGURATION
// ===================

/** Minimum score required to accept a match (0-10 scale) */
export const MATCH_THRESHOLD = 7;

/** Score boosts for positive matches */
export const BOOSTS = {
  exactName: 5,           // Exact name match after normalization
  closeName: 2,           // Name is very similar (substring, minor variations)
  exactTarget: 3,         // Target muscle matches exactly
  exactBodyPart: 2,       // Body part matches exactly
  exactEquipment: 1,      // Equipment matches exactly
} as const;

/** Score penalties for mismatches */
export const PENALTIES = {
  disjointTarget: 4,      // Target muscle completely different
  disjointBodyPart: 3,    // Body part completely different
  equipmentConflict: 2,   // Equipment incompatible (e.g., barbell vs dumbbell)
} as const;

/** Synonym mappings for common exercise name variations */
export const SYNONYMS: Record<string, string> = {
  // Pulldown variations
  'lat pulldown': 'lat pulldown',
  'lat pull down': 'lat pulldown',
  'lat pull-down': 'lat pulldown',
  'lateral pulldown': 'lat pulldown',
  'wide grip pulldown': 'wide grip lat pulldown',
  
  // Row variations
  'seated row': 'seated row',
  'seated cable row': 'seated row',
  'cable row': 'seated row',
  'bent over row': 'bent over row',
  'bent-over row': 'bent over row',
  'barbell row': 'bent over row',
  
  // Press variations
  'bench press': 'bench press',
  'barbell bench press': 'barbell bench press',
  'flat bench press': 'bench press',
  'dumbbell press': 'dumbbell bench press',
  'chest press': 'bench press',
  'shoulder press': 'shoulder press',
  'overhead press': 'overhead press',
  'military press': 'overhead press',
  
  // Squat variations
  'squat': 'squat',
  'squats': 'squat',
  'back squat': 'barbell squat',
  'front squat': 'front squat',
  'bodyweight squat': 'bodyweight squat',
  'air squat': 'bodyweight squat',
  
  // Deadlift variations
  'deadlift': 'deadlift',
  'romanian deadlift': 'romanian deadlift',
  'rdl': 'romanian deadlift',
  'stiff leg deadlift': 'stiff leg deadlift',
  
  // Curl variations
  'bicep curl': 'bicep curl',
  'dumbbell curl': 'dumbbell curl',
  'barbell curl': 'barbell curl',
  'hammer curl': 'hammer curl',
  
  // Pushup variations
  'pushup': 'push up',
  'push up': 'push up',
  'push-up': 'push up',
  'pushups': 'push up',
  
  // Pullup variations
  'pullup': 'pull up',
  'pull up': 'pull up',
  'pull-up': 'pull up',
  'pullups': 'pull up',
  'chin up': 'chin up',
  'chinup': 'chin up',
};

/** Muscle group mapping: HealthPilot muscle → ExerciseDB target */
export const MUSCLE_MAP: Record<string, string[]> = {
  'chest': ['pectorals', 'chest'],
  'back': ['lats', 'upper back', 'lower back', 'traps'],
  'shoulders': ['delts', 'shoulders'],
  'biceps': ['biceps'],
  'triceps': ['triceps'],
  'legs': ['quads', 'hamstrings', 'glutes', 'calves', 'adductors'],
  'quadriceps': ['quads'],
  'hamstrings': ['hamstrings'],
  'glutes': ['glutes'],
  'calves': ['calves'],
  'abs': ['abs', 'waist'],
  'core': ['abs', 'waist'],
  'forearms': ['forearms'],
};

/** Equipment mapping: HealthPilot equipment → ExerciseDB equipment */
export const EQUIPMENT_MAP: Record<string, string[]> = {
  'barbell': ['barbell'],
  'dumbbell': ['dumbbell'],
  'cable': ['cable'],
  'machine': ['leverage machine', 'sled machine', 'smith machine'],
  'bodyweight': ['body weight', 'assisted'],
  'kettlebell': ['kettlebell'],
  'band': ['band', 'resistance band'],
  'other': ['medicine ball', 'stability ball', 'rope', 'wheel roller'],
};

// ===================
// TYPES
// ===================

/** HealthPilot exercise input (from our database) */
export interface HPExercise {
  id: string;
  name: string;
  muscles: string[];       // e.g., ['chest', 'triceps']
  equipment: string;       // e.g., 'barbell'
  category?: string;       // e.g., 'strength'
}

/** ExerciseDB exercise candidate (from exercisedb_exercises table) */
export interface ExerciseDBCandidate {
  exerciseId: string;      // e.g., '0033'
  name: string;            // e.g., 'barbell bench press'
  target: string;          // e.g., 'pectorals'
  bodyPart: string;        // e.g., 'chest'
  equipment: string;       // e.g., 'barbell'
}

/** Match result with confidence score */
export interface MatchResult {
  exercisedbId: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment: string;
  score: number;           // 0-10 scale
  confidence: 'high' | 'medium' | 'low';
  breakdown: Record<string, number>;  // Transparent score breakdown
}

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Normalize exercise name for matching
 * - lowercase
 * - remove punctuation
 * - trim whitespace
 * - apply synonyms
 */
function normalizeName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')  // Remove punctuation
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .trim();
  
  // Apply synonym mapping
  return SYNONYMS[cleaned] || cleaned;
}

/**
 * Calculate match score between HP exercise and ExerciseDB candidate
 */
function calculateScore(
  hpEx: HPExercise,
  dbEx: ExerciseDBCandidate
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;
  
  // 1. Name matching
  const hpName = normalizeName(hpEx.name);
  const dbName = normalizeName(dbEx.name);
  
  if (hpName === dbName) {
    breakdown.exactName = BOOSTS.exactName;
    score += BOOSTS.exactName;
  } else if (dbName.includes(hpName) || hpName.includes(dbName)) {
    breakdown.closeName = BOOSTS.closeName;
    score += BOOSTS.closeName;
  } else {
    // Check word overlap
    const hpWords = hpName.split(/\s+/).filter(w => w.length > 2);
    const dbWords = dbName.split(/\s+/).filter(w => w.length > 2);
    const commonWords = hpWords.filter(w => dbWords.includes(w)).length;
    
    if (commonWords >= 2) {
      breakdown.partialName = 1;
      score += 1;
    }
  }
  
  // 2. Target muscle matching
  const primaryMuscle = hpEx.muscles[0]?.toLowerCase();
  if (primaryMuscle) {
    const validTargets = MUSCLE_MAP[primaryMuscle] || [];
    const dbTarget = dbEx.target.toLowerCase();
    
    if (validTargets.some(t => dbTarget.includes(t) || t.includes(dbTarget))) {
      breakdown.exactTarget = BOOSTS.exactTarget;
      score += BOOSTS.exactTarget;
    } else {
      // Penalize if target is completely different
      breakdown.disjointTarget = -PENALTIES.disjointTarget;
      score -= PENALTIES.disjointTarget;
    }
  }
  
  // 3. Body part matching
  const dbBodyPart = dbEx.bodyPart.toLowerCase();
  const primaryBodyPart = primaryMuscle; // Assuming muscle group aligns with body part
  
  if (primaryBodyPart) {
    const validBodyParts = MUSCLE_MAP[primaryBodyPart] || [];
    if (validBodyParts.some(bp => dbBodyPart.includes(bp) || bp.includes(dbBodyPart))) {
      breakdown.exactBodyPart = BOOSTS.exactBodyPart;
      score += BOOSTS.exactBodyPart;
    }
  }
  
  // 4. Equipment matching
  const hpEquip = hpEx.equipment.toLowerCase();
  const dbEquip = dbEx.equipment.toLowerCase();
  const validEquipments = EQUIPMENT_MAP[hpEquip] || [hpEquip];
  
  if (validEquipments.some(eq => dbEquip === eq || dbEquip.includes(eq) || eq.includes(dbEquip))) {
    breakdown.exactEquipment = BOOSTS.exactEquipment;
    score += BOOSTS.exactEquipment;
  } else {
    // Check for equipment conflicts
    const isConflict = (
      (hpEquip === 'barbell' && dbEquip.includes('dumbbell')) ||
      (hpEquip === 'dumbbell' && dbEquip.includes('barbell')) ||
      (hpEquip === 'bodyweight' && (dbEquip.includes('barbell') || dbEquip.includes('dumbbell')))
    );
    
    if (isConflict) {
      breakdown.equipmentConflict = -PENALTIES.equipmentConflict;
      score -= PENALTIES.equipmentConflict;
    }
  }
  
  return { score, breakdown };
}

/**
 * Determine confidence level based on score
 */
function getConfidence(score: number): 'high' | 'medium' | 'low' {
  if (score >= 9) return 'high';      // Excellent match
  if (score >= 7) return 'medium';    // Good match
  return 'low';                       // Acceptable match
}

// ===================
// MAIN RESOLVER
// ===================

/**
 * Resolve ExerciseDB match for a HealthPilot exercise
 * 
 * @param hpExercise - HealthPilot exercise to match
 * @param candidates - ExerciseDB candidates to search through
 * @returns Best match if score >= MATCH_THRESHOLD, otherwise null
 */
export function resolveSimple(
  hpExercise: HPExercise,
  candidates: ExerciseDBCandidate[]
): MatchResult | null {
  if (candidates.length === 0) {
    console.warn(`[SimpleMatcher] No candidates provided for "${hpExercise.name}"`);
    return null;
  }
  
  // Score all candidates
  const scored = candidates.map(candidate => {
    const { score, breakdown } = calculateScore(hpExercise, candidate);
    return {
      exercisedbId: candidate.exerciseId,
      name: candidate.name,
      target: candidate.target,
      bodyPart: candidate.bodyPart,
      equipment: candidate.equipment,
      score,
      breakdown,
      confidence: getConfidence(score),
    };
  });
  
  // Sort by score (highest first)
  scored.sort((a, b) => b.score - a.score);
  
  const best = scored[0];
  
  // Check if score meets threshold
  if (best.score < MATCH_THRESHOLD) {
    console.warn(
      `[SimpleMatcher] No confident match for "${hpExercise.name}". ` +
      `Best: "${best.name}" (score: ${best.score}, threshold: ${MATCH_THRESHOLD})`
    );
    console.warn(`[SimpleMatcher] Score breakdown:`, best.breakdown);
    return null;
  }
  
  console.log(
    `[SimpleMatcher] ✓ Matched "${hpExercise.name}" → "${best.name}" ` +
    `(score: ${best.score}, confidence: ${best.confidence})`
  );
  console.log(`[SimpleMatcher] Breakdown:`, best.breakdown);
  
  return best;
}
