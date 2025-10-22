/**
 * ExerciseDB Resolver
 * 
 * Deterministically maps HealthPilot exercises to ExerciseDB entries
 * using multi-factor scoring (name + target + bodyPart + equipment)
 */

import { storage } from '../storage';

interface HealthPilotExercise {
  name: string;
  muscles: string[]; // ['chest', 'triceps'] format
  equipment: string; // 'barbell', 'dumbbell', etc.
  category?: string; // 'compound', 'isolation', 'cardio'
}

interface ExerciseDBMatch {
  exercisedbId: string;
  name: string;
  target: string;
  bodyPart: string;
  equipment: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Map HealthPilot muscle groups to ExerciseDB target muscles
 */
const MUSCLE_MAP: Record<string, string[]> = {
  'chest': ['pectorals', 'upper pectorals', 'lower pectorals'],
  'back': ['lats', 'upper back', 'lower back', 'spine', 'traps'],
  'shoulders': ['deltoids', 'anterior deltoid', 'posterior deltoid', 'lateral deltoid'],
  'triceps': ['triceps'],
  'biceps': ['biceps'],
  'forearms': ['forearms'],
  'legs': ['quads', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  'quads': ['quads'],
  'hamstrings': ['hamstrings'],
  'glutes': ['glutes'],
  'calves': ['calves'],
  'core': ['abs', 'abdominals', 'obliques'],
  'abs': ['abs', 'abdominals'],
  'full_body': ['cardiovascular system', 'levator scapulae'], // Generic mapping
};

/**
 * Map HealthPilot equipment to ExerciseDB equipment
 */
const EQUIPMENT_MAP: Record<string, string[]> = {
  'barbell': ['barbell'],
  'dumbbell': ['dumbbell'],
  'cable': ['cable'],
  'machine': ['machine', 'leverage machine', 'sled machine'],
  'bodyweight': ['body weight', 'assisted'],
  'kettlebell': ['kettlebell'],
  'band': ['band', 'resistance band'],
  'other': ['rope', 'medicine ball', 'stability ball', 'bosu ball', 'wheel roller', 'ez barbell', 'trap bar', 'smith machine'],
};

/**
 * Normalize exercise name for better matching
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(.*?)s$/, '$1')  // Remove trailing 's'
    .replace(/pushups?/g, 'push up')
    .replace(/pullups?/g, 'pull up')
    .replace(/situps?/g, 'sit up')
    .replace(/curls?$/g, 'curl')
    .replace(/rows?$/g, 'row')
    .replace(/flyes?$/g, 'fly')
    .replace(/raises?$/g, 'raise')
    .replace(/presses?$/g, 'press')
    .replace(/squats?$/g, 'squat')
    .replace(/lunges?$/g, 'lunge')
    .replace(/dips?$/g, 'dip');
}

/**
 * Calculate deterministic match score between HP exercise and ExerciseDB item
 */
function calculateMatchScore(
  hpExercise: HealthPilotExercise,
  dbExercise: { name: string; target: string; bodyPart: string; equipment: string }
): { score: number; breakdown: Record<string, number> } {
  const breakdown: Record<string, number> = {};
  let score = 0;

  // 1. Name matching
  const normalizedHPName = normalizeExerciseName(hpExercise.name);
  const normalizedDBName = normalizeExerciseName(dbExercise.name);
  
  // Split names into words for detailed matching
  const hpWords = normalizedHPName.split(/\s+/).filter(w => w.length > 2);
  const dbWords = normalizedDBName.split(/\s+/).filter(w => w.length > 2);

  if (normalizedHPName === normalizedDBName) {
    breakdown.exactName = 100;
    score += 100;
  } else if (normalizedDBName.includes(normalizedHPName) || normalizedHPName.includes(normalizedDBName)) {
    breakdown.substringName = 90;
    score += 90;
  } else {
    // Word-based matching
    const matchingWords = hpWords.filter(hw => 
      dbWords.some(dw => dw === hw || dw.includes(hw) || hw.includes(dw))
    );
    const wordScore = Math.min(matchingWords.length * 15, 60);
    if (wordScore > 0) {
      breakdown.wordMatch = wordScore;
      score += wordScore;
    }
  }

  // 2. Muscle/target matching (CRITICAL for avoiding wrong GIFs)
  const primaryMuscle = hpExercise.muscles[0]?.toLowerCase();
  if (primaryMuscle) {
    const mappedTargets = MUSCLE_MAP[primaryMuscle] || [];
    const dbTarget = dbExercise.target.toLowerCase();
    const dbBodyPart = dbExercise.bodyPart.toLowerCase();
    
    const targetMatches = mappedTargets.some(target => 
      dbTarget.includes(target) || target.includes(dbTarget)
    );
    
    if (targetMatches) {
      breakdown.targetMatch = 60;
      score += 60;
    } else {
      // Penalize muscle mismatch to avoid showing wrong exercise
      breakdown.targetMismatch = -30;
      score -= 30;
    }
  }

  // 3. Equipment matching (CRITICAL to distinguish variants)
  const hpEquipment = hpExercise.equipment.toLowerCase();
  const dbEquipment = dbExercise.equipment.toLowerCase();
  
  const mappedEquipment = EQUIPMENT_MAP[hpEquipment] || [hpEquipment];
  
  if (mappedEquipment.some(eq => dbEquipment === eq)) {
    breakdown.exactEquipment = 50;
    score += 50;
  } else if (mappedEquipment.some(eq => dbEquipment.includes(eq) || eq.includes(dbEquipment))) {
    breakdown.partialEquipment = 30;
    score += 30;
  } else {
    // Check for equipment conflicts
    const hpCategory = Object.keys(EQUIPMENT_MAP).find(k => EQUIPMENT_MAP[k].includes(hpEquipment)) || hpEquipment;
    const dbCategory = Object.keys(EQUIPMENT_MAP).find(k => EQUIPMENT_MAP[k].some(e => dbEquipment.includes(e)));
    
    if (hpCategory && dbCategory && hpCategory !== dbCategory) {
      // Different equipment types (e.g., barbell vs dumbbell)
      breakdown.equipmentConflict = -200;
      score -= 200;
    } else {
      breakdown.equipmentMismatch = -50;
      score -= 50;
    }
  }

  // 4. Exercise type bonus (press, curl, row, etc.)
  const exerciseTypes = ['press', 'curl', 'row', 'squat', 'deadlift', 'pulldown', 'fly', 'raise', 'extension', 'pullup', 'pushup', 'dip', 'lunge', 'crunch', 'plank'];
  const hpType = hpWords.find(w => exerciseTypes.some(t => w.includes(t) || t.includes(w)));
  const dbType = dbWords.find(w => exerciseTypes.some(t => w.includes(t) || t.includes(w)));
  
  if (hpType && dbType) {
    const normalizedHPType = exerciseTypes.find(t => hpType.includes(t) || t.includes(hpType)) || hpType;
    const normalizedDBType = exerciseTypes.find(t => dbType.includes(t) || t.includes(dbType)) || dbType;
    
    if (normalizedHPType === normalizedDBType) {
      breakdown.exerciseTypeMatch = 40;
      score += 40;
    }
  }

  return { score, breakdown };
}

/**
 * Derive the best matching ExerciseDB ID for a HealthPilot exercise
 * 
 * @returns ExerciseDB match with confidence level, or null if no good match found
 */
export async function deriveExercisedbId(
  hpExercise: HealthPilotExercise
): Promise<ExerciseDBMatch | null> {
  try {
    console.log(`[ExerciseDB Resolver] Resolving match for "${hpExercise.name}"`);
    console.log(`[ExerciseDB Resolver] HP Exercise details:`, {
      muscles: hpExercise.muscles,
      equipment: hpExercise.equipment,
      category: hpExercise.category,
    });

    // Get all ExerciseDB exercises from database
    const allDbExercises = await storage.getAllExercisedbExercises();
    
    if (allDbExercises.length === 0) {
      console.warn('[ExerciseDB Resolver] No ExerciseDB exercises in database. Please sync first.');
      return null;
    }

    console.log(`[ExerciseDB Resolver] Searching among ${allDbExercises.length} ExerciseDB exercises`);

    // Score all exercises
    const scoredExercises = allDbExercises.map(dbEx => {
      const { score, breakdown } = calculateMatchScore(hpExercise, {
        name: dbEx.name,
        target: dbEx.target,
        bodyPart: dbEx.bodyPart,
        equipment: dbEx.equipment,
      });

      return {
        exercisedbId: dbEx.exerciseId,
        name: dbEx.name,
        target: dbEx.target,
        bodyPart: dbEx.bodyPart,
        equipment: dbEx.equipment,
        score,
        breakdown,
      };
    });

    // Sort by score (highest first)
    scoredExercises.sort((a, b) => b.score - a.score);

    // Get best match
    const bestMatch = scoredExercises[0];

    if (!bestMatch || bestMatch.score < 50) {
      console.warn(`[ExerciseDB Resolver] No suitable match found for "${hpExercise.name}". Best score: ${bestMatch?.score || 0}`);
      if (bestMatch) {
        console.warn(`[ExerciseDB Resolver] Best candidate was "${bestMatch.name}" with breakdown:`, bestMatch.breakdown);
      }
      return null;
    }

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low';
    if (bestMatch.score >= 200) {
      confidence = 'high'; // Excellent match (name + target + equipment all align)
    } else if (bestMatch.score >= 100) {
      confidence = 'medium'; // Good match (name or target aligns well)
    } else {
      confidence = 'low'; // Acceptable match but may need review
    }

    console.log(`[ExerciseDB Resolver] ✓ Best match for "${hpExercise.name}":`);
    console.log(`  → "${bestMatch.name}" (ID: ${bestMatch.exercisedbId})`);
    console.log(`  → Score: ${bestMatch.score} (Confidence: ${confidence})`);
    console.log(`  → Target: ${bestMatch.target} | Equipment: ${bestMatch.equipment}`);
    console.log(`  → Breakdown:`, bestMatch.breakdown);

    // Log top 3 alternatives for debugging
    if (scoredExercises.length > 1) {
      console.log(`[ExerciseDB Resolver] Other candidates:`);
      scoredExercises.slice(1, 4).forEach((alt, idx) => {
        console.log(`  ${idx + 2}. "${alt.name}" (score: ${alt.score})`);
      });
    }

    return {
      exercisedbId: bestMatch.exercisedbId,
      name: bestMatch.name,
      target: bestMatch.target,
      bodyPart: bestMatch.bodyPart,
      equipment: bestMatch.equipment,
      score: bestMatch.score,
      confidence,
    };
  } catch (error: any) {
    console.error(`[ExerciseDB Resolver] Error resolving exercisedbId:`, error.message);
    return null;
  }
}
