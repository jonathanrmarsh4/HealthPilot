import { storage } from "../storage";

/**
 * Multi-Dimensional Recovery System - Fatigue Modeling Service
 * 
 * This service calculates muscle-group-specific fatigue from workouts and models
 * recovery using exponential decay curves. It provides a sophisticated alternative
 * to simple readiness scores by tracking 6 muscle groups independently.
 */

// The 6 muscle groups we track
export const MUSCLE_GROUPS = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] as const;
export type MuscleGroup = typeof MUSCLE_GROUPS[number];

// Muscle group mapping - maps exercise library muscle tags to our 6 groups
const MUSCLE_GROUP_MAPPING: Record<string, MuscleGroup[]> = {
  // Chest
  'chest': ['chest'],
  'pectorals': ['chest'],
  
  // Back
  'back': ['back'],
  'lats': ['back'],
  'traps': ['back'],
  'rhomboids': ['back'],
  'upper back': ['back'],
  'lower back': ['back'],
  
  // Legs
  'legs': ['legs'],
  'quads': ['legs'],
  'quadriceps': ['legs'],
  'hamstrings': ['legs'],
  'glutes': ['legs'],
  'calves': ['legs'],
  'hip flexors': ['legs'],
  
  // Shoulders
  'shoulders': ['shoulders'],
  'delts': ['shoulders'],
  'deltoids': ['shoulders'],
  
  // Arms
  'arms': ['arms'],
  'biceps': ['arms'],
  'triceps': ['arms'],
  'forearms': ['arms'],
  
  // Core
  'core': ['core'],
  'abs': ['core'],
  'abdominals': ['core'],
  'obliques': ['core'],
};

/**
 * Map exercise muscles array to our standardized muscle groups
 */
function mapToMuscleGroups(exerciseMuscles: string[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  
  for (const muscle of exerciseMuscles) {
    const normalized = muscle.toLowerCase().trim();
    const mapped = MUSCLE_GROUP_MAPPING[normalized];
    if (mapped) {
      mapped.forEach(g => groups.add(g));
    }
  }
  
  return Array.from(groups);
}

/**
 * Calculate fatigue damage for a single exercise
 * Returns fatigue points to add to each affected muscle group
 */
function calculateExerciseFatigue(
  exerciseName: string,
  sets: number,
  reps: number,
  weight: number | null,
  muscles: string[],
  category: 'compound' | 'isolation' | 'cardio' | 'flexibility'
): Map<MuscleGroup, number> {
  const affectedGroups = mapToMuscleGroups(muscles);
  const fatigueMap = new Map<MuscleGroup, number>();
  
  if (affectedGroups.length === 0) return fatigueMap;
  
  // Base fatigue calculation
  // Volume = sets × reps
  const volume = sets * reps;
  
  // Intensity factor (0.5 to 2.0)
  let intensityFactor = 1.0;
  if (weight && weight > 0) {
    // Higher weight = more intensity
    // This is a rough estimate - could be refined with 1RM data
    if (weight >= 100) intensityFactor = 1.8;
    else if (weight >= 60) intensityFactor = 1.5;
    else if (weight >= 30) intensityFactor = 1.2;
    else if (weight >= 10) intensityFactor = 1.0;
    else intensityFactor = 0.8;
  }
  
  // Compound vs isolation multiplier
  const compoundMultiplier = category === 'compound' ? 1.5 : 1.0;
  
  // Total fatigue points for this exercise
  const totalFatigue = volume * intensityFactor * compoundMultiplier;
  
  // Distribute fatigue across affected muscle groups
  const fatiguePerGroup = totalFatigue / affectedGroups.length;
  
  affectedGroups.forEach(group => {
    fatigueMap.set(group, fatiguePerGroup);
  });
  
  return fatigueMap;
}

/**
 * Calculate total muscle group fatigue from a completed workout
 */
export async function calculateWorkoutFatigue(
  userId: string,
  workoutSessionId: string
): Promise<Map<MuscleGroup, number>> {
  const totalFatigue = new Map<MuscleGroup, number>();
  
  // Initialize all groups to 0
  MUSCLE_GROUPS.forEach(g => totalFatigue.set(g, 0));
  
  // Get all exercise sets from this workout
  const exerciseSets = await storage.getExerciseSets(userId, workoutSessionId);
  
  // Get exercise library data for muscle mapping
  const exercises = await storage.getExercises();
  const exerciseMap = new Map(exercises.map(e => [e.id, e]));
  
  // Group sets by exercise
  const setsByExercise = new Map<string, typeof exerciseSets>();
  for (const set of exerciseSets) {
    const existing = setsByExercise.get(set.exerciseId) || [];
    existing.push(set);
    setsByExercise.set(set.exerciseId, existing);
  }
  
  // Calculate fatigue for each exercise
  for (const [exerciseId, sets] of setsByExercise) {
    const exercise = exerciseMap.get(exerciseId);
    if (!exercise) continue;
    
    const totalSets = sets.length;
    const avgReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0) / totalSets;
    const avgWeight = sets.reduce((sum, s) => sum + (s.weight || 0), 0) / totalSets;
    
    const exerciseFatigue = calculateExerciseFatigue(
      exercise.name,
      totalSets,
      Math.round(avgReps),
      avgWeight,
      exercise.muscles,
      exercise.category as any
    );
    
    // Add to total fatigue
    exerciseFatigue.forEach((damage, group) => {
      totalFatigue.set(group, (totalFatigue.get(group) || 0) + damage);
    });
  }
  
  return totalFatigue;
}

/**
 * Calculate recovery score from fatigue damage
 * 
 * Recovery score = 100 - (fatigue_damage * decay_factor)
 * Decay factor decreases exponentially over time (48-72h halflife)
 */
function calculateRecoveryScore(
  fatigueDamage: number,
  lastWorkoutAt: Date | null,
  now: Date
): number {
  if (fatigueDamage === 0) return 100;
  if (!lastWorkoutAt) return 100;
  
  // Time since workout in hours
  const hoursSinceWorkout = (now.getTime() - lastWorkoutAt.getTime()) / (1000 * 60 * 60);
  
  // Exponential decay: damage * e^(-t/τ)
  // τ (tau) = decay constant = 48 hours for moderate recovery
  const decayConstant = 48;
  const decayFactor = Math.exp(-hoursSinceWorkout / decayConstant);
  
  // Current effective fatigue after decay
  const currentFatigue = fatigueDamage * decayFactor;
  
  // Recovery score: 100 - current fatigue
  // Cap fatigue at 100 to prevent negative scores
  const score = Math.max(0, 100 - Math.min(100, currentFatigue));
  
  return Math.round(score);
}

/**
 * Get current recovery scores for all muscle groups
 * Calculates systemic score from biometrics and combines with muscle-specific recovery
 */
export async function getCurrentRecoveryState(userId: string): Promise<{
  systemic: number;
  muscleGroups: Record<MuscleGroup, number>;
  biometricFactors: {
    sleep: number;
    hrv: number;
    restingHR: number;
  };
}> {
  const now = new Date();
  
  // Get muscle group recovery states
  const muscleRecovery = await storage.getMuscleGroupRecovery(userId);
  
  // Calculate scores with decay applied
  const muscleScores: Record<string, number> = {};
  for (const group of MUSCLE_GROUPS) {
    const state = muscleRecovery.find(m => m.muscleGroup === group);
    if (state) {
      muscleScores[group] = calculateRecoveryScore(
        state.fatigueDamage,
        state.lastWorkoutAt,
        now
      );
    } else {
      // Not yet worked - fully recovered
      muscleScores[group] = 100;
    }
  }
  
  // Get biometric factors (sleep, HRV, resting HR)
  const biometrics = await getBiometricFactors(userId);
  
  // Systemic score = weighted average of biometrics
  const systemic = Math.round(
    biometrics.sleep * 0.50 +
    biometrics.hrv * 0.30 +
    biometrics.restingHR * 0.20
  );
  
  return {
    systemic,
    muscleGroups: muscleScores as Record<MuscleGroup, number>,
    biometricFactors: biometrics,
  };
}

/**
 * Calculate score based on % deviation from baseline
 * @param value - Current measured value
 * @param baseline - Baseline value (personal or age-adjusted)
 * @param higherIsBetter - true for HRV/Sleep, false for Resting HR
 */
function calculateBaselineScore(value: number, baseline: number, higherIsBetter: boolean): number {
  const percentDeviation = ((value - baseline) / baseline) * 100;
  
  if (higherIsBetter) {
    // For HRV and Sleep: higher is better
    // At baseline = 100, above baseline = bonus, below = penalty
    if (percentDeviation >= 0) {
      // Above baseline: 100 + bonus (capped at 100)
      return Math.min(100, 100 + percentDeviation);
    } else {
      // Below baseline: reduce score proportionally
      // -10% = 90 score, -20% = 80 score, etc.
      return Math.max(0, 100 + percentDeviation);
    }
  } else {
    // For Resting HR: lower is better
    // At baseline = 100, below baseline = bonus, above = penalty
    if (percentDeviation <= 0) {
      // Below baseline (lower HR): 100 + bonus (capped at 100)
      return Math.min(100, 100 - percentDeviation);
    } else {
      // Above baseline (higher HR): reduce score proportionally
      // +10% = 90 score, +20% = 80 score, etc.
      return Math.max(0, 100 - percentDeviation);
    }
  }
}

/**
 * Get age-adjusted HRV baseline
 * HRV naturally declines with age - adjust standards accordingly
 */
function getAgeAdjustedHRVBaseline(age: number): number {
  // Research-based HRV decline: ~1ms per year after 25
  // Base: 25yo = 65ms, 35yo = 55ms, 45yo = 45ms, 55yo = 35ms
  if (age <= 25) return 65;
  if (age >= 70) return 25;
  return Math.max(25, 65 - (age - 25));
}

/**
 * Get age-adjusted RHR baseline
 * Resting heart rate tends to increase slightly with age
 */
function getAgeAdjustedRHRBaseline(age: number): number {
  // Base: 25yo = 60bpm, increases ~0.2bpm per year
  if (age <= 25) return 60;
  if (age >= 70) return 69;
  return Math.min(69, 60 + (age - 25) * 0.2);
}

/**
 * Get biometric recovery factors (sleep, HRV, resting HR)
 * Returns scores 0-100 for each factor
 * Respects personal baselines and age-adjusted standards
 */
async function getBiometricFactors(userId: string): Promise<{
  sleep: number;
  hrv: number;
  restingHR: number;
}> {
  const { subDays, addDays } = await import('date-fns');
  const targetDate = new Date();
  
  // Load readiness settings for personal baselines
  const settings = await storage.getReadinessSettings(userId);
  const usePersonalBaselines = settings?.usePersonalBaselines === 1;
  const personalBaselines = {
    hrv: settings?.personalHrvBaseline,
    restingHR: settings?.personalRestingHrBaseline,
    sleepHours: settings?.personalSleepHoursBaseline
  };
  
  // Get user age for age-adjusted baselines
  const user = await storage.getUser(userId);
  let userAge: number | undefined;
  if (user?.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(user.dateOfBirth);
    userAge = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      userAge--;
    }
  }
  
  // Sleep score
  let sleepScore = 70; // default if no data
  const sleepSessions = await storage.getSleepSessions(userId);
  const yesterday = subDays(targetDate, 1);
  const recentSleep = sleepSessions
    .filter(s => {
      const sessionDate = new Date(s.bedtime);
      return sessionDate >= subDays(yesterday, 1) && sessionDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime())[0];
  
  if (recentSleep && recentSleep.sleepScore) {
    const sleepHours = recentSleep.totalMinutes / 60;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.sleepHours) {
      sleepScore = calculateBaselineScore(sleepHours, personalBaselines.sleepHours, true);
    } else {
      // Use Apple Health sleep score directly
      sleepScore = recentSleep.sleepScore;
    }
  }
  
  // HRV score
  let hrvScore = 70; // default
  const biomarkers = await storage.getBiomarkers(userId);
  const recentHRV = biomarkers
    .filter(b => b.type === 'hrv')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      return bioDate >= subDays(targetDate, 2) && bioDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  
  if (recentHRV) {
    const hrvValue = recentHRV.value;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.hrv) {
      hrvScore = calculateBaselineScore(hrvValue, personalBaselines.hrv, true);
    } else if (userAge) {
      // Use age-adjusted baseline
      const ageBaseline = getAgeAdjustedHRVBaseline(userAge);
      hrvScore = calculateBaselineScore(hrvValue, ageBaseline, true);
    } else {
      // Standard HRV scoring (for users without age or baselines)
      if (hrvValue < 40) {
        hrvScore = Math.max(0, (hrvValue / 40) * 40);
      } else if (hrvValue < 60) {
        hrvScore = 40 + ((hrvValue - 40) / 20) * 35;
      } else if (hrvValue < 80) {
        hrvScore = 75 + ((hrvValue - 60) / 20) * 15;
      } else {
        hrvScore = Math.min(100, 90 + ((hrvValue - 80) / 40) * 10);
      }
    }
  }
  
  // Resting HR score  
  let rhrScore = 70; // default
  const recentRHR = biomarkers
    .filter(b => b.type === 'heart-rate')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      return bioDate >= subDays(targetDate, 2) && bioDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];
  
  if (recentRHR) {
    const rhr = recentRHR.value;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.restingHR) {
      rhrScore = calculateBaselineScore(rhr, personalBaselines.restingHR, false);
    } else if (userAge) {
      // Use age-adjusted baseline
      const ageBaseline = getAgeAdjustedRHRBaseline(userAge);
      rhrScore = calculateBaselineScore(rhr, ageBaseline, false);
    } else {
      // Standard RHR scoring (lower is better)
      if (rhr < 50) {
        rhrScore = Math.min(100, 90 + ((50 - rhr) / 10) * 10);
      } else if (rhr < 60) {
        rhrScore = 70 + ((60 - rhr) / 10) * 20;
      } else if (rhr < 70) {
        rhrScore = 50 + ((70 - rhr) / 10) * 20;
      } else if (rhr < 80) {
        rhrScore = 30 + ((80 - rhr) / 10) * 20;
      } else {
        rhrScore = Math.max(0, 30 - ((rhr - 80) / 10) * 10);
      }
    }
  }
  
  return {
    sleep: sleepScore,
    hrv: hrvScore,
    restingHR: rhrScore,
  };
}

/**
 * Apply fatigue damage from a workout to muscle group recovery states
 */
export async function applyWorkoutFatigue(
  userId: string,
  workoutSessionId: string,
  completedAt: Date
): Promise<void> {
  // Calculate fatigue from this workout
  const fatigue = await calculateWorkoutFatigue(userId, workoutSessionId);
  
  // Update each affected muscle group
  for (const [muscleGroup, damage] of fatigue) {
    await storage.updateMuscleGroupRecovery(userId, muscleGroup, {
      fatigueDamage: damage,
      lastWorkoutAt: completedAt,
      lastUpdatedAt: completedAt,
    });
  }
}

/**
 * Apply recovery boost from a protocol completion
 */
export async function applyRecoveryBoost(
  userId: string,
  protocolName: string,
  completedAt: Date
): Promise<void> {
  // Protocol boost amounts (reduce fatigue damage by %)
  const PROTOCOL_BOOSTS: Record<string, { muscleGroups: MuscleGroup[], boostPercent: number }> = {
    'sauna': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.10 }, // 10% across all groups
    'cold plunge': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.08 },
    'ice bath': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.08 },
    'foam rolling': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.05 },
    'massage': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.12 },
    'stretching': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.05 },
    'yoga': { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.08 },
  };
  
  // Find matching protocol (case-insensitive partial match)
  const normalizedName = protocolName.toLowerCase();
  let boost = null;
  for (const [key, value] of Object.entries(PROTOCOL_BOOSTS)) {
    if (normalizedName.includes(key)) {
      boost = value;
      break;
    }
  }
  
  if (!boost) {
    // Default boost for unknown protocols
    boost = { muscleGroups: [...MUSCLE_GROUPS], boostPercent: 0.05 };
  }
  
  // Apply boost to affected muscle groups
  for (const muscleGroup of boost.muscleGroups) {
    const current = await storage.getMuscleGroupRecoveryByGroup(userId, muscleGroup);
    if (current) {
      // Reduce fatigue damage by boost percentage
      const newDamage = current.fatigueDamage * (1 - boost.boostPercent);
      await storage.updateMuscleGroupRecovery(userId, muscleGroup, {
        fatigueDamage: Math.max(0, newDamage),
        lastUpdatedAt: completedAt,
      });
    }
  }
}
