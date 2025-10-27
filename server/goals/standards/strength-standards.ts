import type { InsertMetricStandard } from "@shared/schema";

/**
 * ExRx Strength Standards (Kilgore-Rippetoe Standards)
 * 
 * Source: ExRx.net - Strength Level Standards
 * Based on research by Lon Kilgore, PhD and Mark Rippetoe
 * 
 * These standards express 1RM (one-rep max) as a multiple of bodyweight
 * for major compound lifts. Standards are stratified by:
 * - Training experience level
 * - Gender
 * 
 * Levels:
 * - Untrained: No training experience
 * - Novice: Several months of training
 * - Intermediate: 1-2 years of proper training
 * - Advanced: Multi-year training, competitive level
 * - Elite: National/international competitive level
 */

interface StrengthStandard {
  exercise: string;
  metricKey: string;
  gender: 'male' | 'female';
  level: string;
  bodyweightMultiplier: number;
  description: string;
}

const strengthStandards: StrengthStandard[] = [
  // SQUAT - MALE
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'male',
    level: 'untrained',
    bodyweightMultiplier: 1.0,
    description: 'Untrained male can squat 1x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'male',
    level: 'novice',
    bodyweightMultiplier: 1.5,
    description: 'Novice male can squat 1.5x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'male',
    level: 'intermediate',
    bodyweightMultiplier: 2.0,
    description: 'Intermediate male can squat 2x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'male',
    level: 'advanced',
    bodyweightMultiplier: 2.5,
    description: 'Advanced male can squat 2.5x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'male',
    level: 'elite',
    bodyweightMultiplier: 3.0,
    description: 'Elite male can squat 3x bodyweight',
  },

  // SQUAT - FEMALE
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'female',
    level: 'untrained',
    bodyweightMultiplier: 0.65,
    description: 'Untrained female can squat 0.65x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'female',
    level: 'novice',
    bodyweightMultiplier: 1.0,
    description: 'Novice female can squat 1x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'female',
    level: 'intermediate',
    bodyweightMultiplier: 1.35,
    description: 'Intermediate female can squat 1.35x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'female',
    level: 'advanced',
    bodyweightMultiplier: 1.75,
    description: 'Advanced female can squat 1.75x bodyweight',
  },
  {
    exercise: 'Squat',
    metricKey: 'squat_1rm',
    gender: 'female',
    level: 'elite',
    bodyweightMultiplier: 2.15,
    description: 'Elite female can squat 2.15x bodyweight',
  },

  // BENCH PRESS - MALE
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'male',
    level: 'untrained',
    bodyweightMultiplier: 0.75,
    description: 'Untrained male can bench 0.75x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'male',
    level: 'novice',
    bodyweightMultiplier: 1.0,
    description: 'Novice male can bench 1x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'male',
    level: 'intermediate',
    bodyweightMultiplier: 1.35,
    description: 'Intermediate male can bench 1.35x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'male',
    level: 'advanced',
    bodyweightMultiplier: 1.75,
    description: 'Advanced male can bench 1.75x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'male',
    level: 'elite',
    bodyweightMultiplier: 2.0,
    description: 'Elite male can bench 2x bodyweight',
  },

  // BENCH PRESS - FEMALE
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'female',
    level: 'untrained',
    bodyweightMultiplier: 0.45,
    description: 'Untrained female can bench 0.45x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'female',
    level: 'novice',
    bodyweightMultiplier: 0.6,
    description: 'Novice female can bench 0.6x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'female',
    level: 'intermediate',
    bodyweightMultiplier: 0.8,
    description: 'Intermediate female can bench 0.8x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'female',
    level: 'advanced',
    bodyweightMultiplier: 1.0,
    description: 'Advanced female can bench 1x bodyweight',
  },
  {
    exercise: 'Bench Press',
    metricKey: 'bench_press_1rm',
    gender: 'female',
    level: 'elite',
    bodyweightMultiplier: 1.25,
    description: 'Elite female can bench 1.25x bodyweight',
  },

  // DEADLIFT - MALE
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'male',
    level: 'untrained',
    bodyweightMultiplier: 1.25,
    description: 'Untrained male can deadlift 1.25x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'male',
    level: 'novice',
    bodyweightMultiplier: 1.75,
    description: 'Novice male can deadlift 1.75x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'male',
    level: 'intermediate',
    bodyweightMultiplier: 2.25,
    description: 'Intermediate male can deadlift 2.25x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'male',
    level: 'advanced',
    bodyweightMultiplier: 2.75,
    description: 'Advanced male can deadlift 2.75x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'male',
    level: 'elite',
    bodyweightMultiplier: 3.25,
    description: 'Elite male can deadlift 3.25x bodyweight',
  },

  // DEADLIFT - FEMALE
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'female',
    level: 'untrained',
    bodyweightMultiplier: 0.8,
    description: 'Untrained female can deadlift 0.8x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'female',
    level: 'novice',
    bodyweightMultiplier: 1.15,
    description: 'Novice female can deadlift 1.15x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'female',
    level: 'intermediate',
    bodyweightMultiplier: 1.5,
    description: 'Intermediate female can deadlift 1.5x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'female',
    level: 'advanced',
    bodyweightMultiplier: 1.9,
    description: 'Advanced female can deadlift 1.9x bodyweight',
  },
  {
    exercise: 'Deadlift',
    metricKey: 'deadlift_1rm',
    gender: 'female',
    level: 'elite',
    bodyweightMultiplier: 2.35,
    description: 'Elite female can deadlift 2.35x bodyweight',
  },

  // OVERHEAD PRESS - MALE
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'male',
    level: 'untrained',
    bodyweightMultiplier: 0.5,
    description: 'Untrained male can overhead press 0.5x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'male',
    level: 'novice',
    bodyweightMultiplier: 0.65,
    description: 'Novice male can overhead press 0.65x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'male',
    level: 'intermediate',
    bodyweightMultiplier: 0.85,
    description: 'Intermediate male can overhead press 0.85x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'male',
    level: 'advanced',
    bodyweightMultiplier: 1.1,
    description: 'Advanced male can overhead press 1.1x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'male',
    level: 'elite',
    bodyweightMultiplier: 1.35,
    description: 'Elite male can overhead press 1.35x bodyweight',
  },

  // OVERHEAD PRESS - FEMALE
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'female',
    level: 'untrained',
    bodyweightMultiplier: 0.3,
    description: 'Untrained female can overhead press 0.3x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'female',
    level: 'novice',
    bodyweightMultiplier: 0.4,
    description: 'Novice female can overhead press 0.4x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'female',
    level: 'intermediate',
    bodyweightMultiplier: 0.55,
    description: 'Intermediate female can overhead press 0.55x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'female',
    level: 'advanced',
    bodyweightMultiplier: 0.7,
    description: 'Advanced female can overhead press 0.7x bodyweight',
  },
  {
    exercise: 'Overhead Press',
    metricKey: 'overhead_press_1rm',
    gender: 'female',
    level: 'elite',
    bodyweightMultiplier: 0.85,
    description: 'Elite female can overhead press 0.85x bodyweight',
  },
];

/**
 * Convert strength standards to database format
 */
export function getStrengthStandards(): Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] {
  return strengthStandards.map(standard => ({
    metricKey: standard.metricKey,
    standardType: 'bodyweight_ratio',
    category: 'strength',
    ageMin: null, // Strength standards don't vary significantly by age in these tables
    ageMax: null,
    gender: standard.gender,
    valueMin: null,
    valueMax: null,
    valueSingle: standard.bodyweightMultiplier,
    unit: 'kg', // Assumes bodyweight in kg
    percentile: null,
    level: standard.level,
    sourceName: 'ExRx',
    sourceUrl: 'https://exrx.net/Testing/WeightLifting/StrengthStandards',
    sourceDescription: 'ExRx Strength Level Standards (Kilgore-Rippetoe)',
    confidenceScore: 1.0,
    evidenceLevel: 'professional_org',
    isActive: 1,
    verifiedByAdmin: 1,
    lastVerifiedAt: new Date('2025-01-01'),
  }));
}

/**
 * Calculate target 1RM based on current strength level and desired progression
 * @param currentWeight - Current 1RM in kg
 * @param bodyweight - User's bodyweight in kg
 * @param currentLevel - Current strength level
 * @param targetLevel - Desired strength level
 * @param exercise - Exercise metric key
 * @param gender - User's gender
 */
export function calculateStrengthTarget(
  currentWeight: number,
  bodyweight: number,
  currentLevel: string,
  targetLevel: string,
  exercise: string,
  gender: 'male' | 'female'
): number | null {
  const targetStandard = strengthStandards.find(
    s => s.metricKey === exercise && s.gender === gender && s.level === targetLevel
  );

  if (!targetStandard) return null;

  return Math.round(bodyweight * targetStandard.bodyweightMultiplier);
}

/**
 * Determine current strength level based on 1RM and bodyweight
 */
export function classifyStrengthLevel(
  oneRepMax: number,
  bodyweight: number,
  exercise: string,
  gender: 'male' | 'female'
): string {
  const ratio = oneRepMax / bodyweight;
  
  const exerciseStandards = strengthStandards
    .filter(s => s.metricKey === exercise && s.gender === gender)
    .sort((a, b) => a.bodyweightMultiplier - b.bodyweightMultiplier);

  for (let i = exerciseStandards.length - 1; i >= 0; i--) {
    if (ratio >= exerciseStandards[i].bodyweightMultiplier) {
      return exerciseStandards[i].level;
    }
  }

  return 'untrained';
}
