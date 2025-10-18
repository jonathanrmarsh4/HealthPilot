/**
 * Muscle Group Taxonomy and Exercise Classification
 * 
 * Defines standardized muscle groups and maps exercises to their primary/secondary targets
 */

// Standard muscle group taxonomy
export const MUSCLE_GROUPS = {
  CHEST: 'chest',
  BACK: 'back',
  LEGS: 'legs',
  SHOULDERS: 'shoulders',
  ARMS: 'arms',
  CORE: 'core',
  GLUTES: 'glutes',
  CALVES: 'calves',
} as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[keyof typeof MUSCLE_GROUPS];

// Engagement levels
export const ENGAGEMENT_LEVELS = {
  PRIMARY: 'primary',     // Main muscle being targeted
  SECONDARY: 'secondary', // Supporting/synergist muscle
} as const;

export type EngagementLevel = typeof ENGAGEMENT_LEVELS[keyof typeof ENGAGEMENT_LEVELS];

// Exercise to muscle group mappings
export interface ExerciseMuscleMapping {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
}

/**
 * Classify an exercise name to determine which muscle groups it targets
 * Uses keyword matching for intelligent classification
 */
export function classifyExerciseMuscleGroups(exerciseName: string): ExerciseMuscleMapping {
  const nameLower = exerciseName.toLowerCase();
  
  // Chest exercises
  if (nameLower.includes('bench press') || nameLower.includes('chest press')) {
    return { primary: [MUSCLE_GROUPS.CHEST], secondary: [MUSCLE_GROUPS.SHOULDERS, MUSCLE_GROUPS.ARMS] };
  }
  if (nameLower.includes('chest fly') || nameLower.includes('pec fly') || nameLower.includes('cable crossover')) {
    return { primary: [MUSCLE_GROUPS.CHEST], secondary: [MUSCLE_GROUPS.SHOULDERS] };
  }
  if (nameLower.includes('push-up') || nameLower.includes('pushup') || nameLower.includes('push up')) {
    return { primary: [MUSCLE_GROUPS.CHEST], secondary: [MUSCLE_GROUPS.SHOULDERS, MUSCLE_GROUPS.ARMS, MUSCLE_GROUPS.CORE] };
  }
  if (nameLower.includes('dip') && !nameLower.includes('hip')) {
    return { primary: [MUSCLE_GROUPS.CHEST, MUSCLE_GROUPS.ARMS], secondary: [MUSCLE_GROUPS.SHOULDERS] };
  }
  
  // Back exercises
  if (nameLower.includes('pull-up') || nameLower.includes('pullup') || nameLower.includes('chin-up') || nameLower.includes('chinup')) {
    return { primary: [MUSCLE_GROUPS.BACK], secondary: [MUSCLE_GROUPS.ARMS] };
  }
  if (nameLower.includes('row') && !nameLower.includes('barrow')) {
    return { primary: [MUSCLE_GROUPS.BACK], secondary: [MUSCLE_GROUPS.ARMS] };
  }
  if (nameLower.includes('deadlift')) {
    return { primary: [MUSCLE_GROUPS.BACK, MUSCLE_GROUPS.LEGS, MUSCLE_GROUPS.GLUTES], secondary: [MUSCLE_GROUPS.CORE] };
  }
  if (nameLower.includes('lat pulldown') || nameLower.includes('lat pull')) {
    return { primary: [MUSCLE_GROUPS.BACK], secondary: [MUSCLE_GROUPS.ARMS] };
  }
  if (nameLower.includes('pullover')) {
    return { primary: [MUSCLE_GROUPS.BACK, MUSCLE_GROUPS.CHEST], secondary: [MUSCLE_GROUPS.ARMS] };
  }
  
  // Leg exercises
  if (nameLower.includes('squat')) {
    return { primary: [MUSCLE_GROUPS.LEGS, MUSCLE_GROUPS.GLUTES], secondary: [MUSCLE_GROUPS.CORE] };
  }
  if (nameLower.includes('leg press')) {
    return { primary: [MUSCLE_GROUPS.LEGS, MUSCLE_GROUPS.GLUTES], secondary: [] };
  }
  if (nameLower.includes('leg curl') || nameLower.includes('hamstring curl')) {
    return { primary: [MUSCLE_GROUPS.LEGS], secondary: [] };
  }
  if (nameLower.includes('leg extension') || nameLower.includes('quad extension')) {
    return { primary: [MUSCLE_GROUPS.LEGS], secondary: [] };
  }
  if (nameLower.includes('lunge')) {
    return { primary: [MUSCLE_GROUPS.LEGS, MUSCLE_GROUPS.GLUTES], secondary: [MUSCLE_GROUPS.CORE] };
  }
  if (nameLower.includes('calf raise') || nameLower.includes('calf press')) {
    return { primary: [MUSCLE_GROUPS.CALVES], secondary: [] };
  }
  
  // Shoulder exercises
  if (nameLower.includes('shoulder press') || nameLower.includes('overhead press') || nameLower.includes('military press')) {
    return { primary: [MUSCLE_GROUPS.SHOULDERS], secondary: [MUSCLE_GROUPS.ARMS, MUSCLE_GROUPS.CORE] };
  }
  if (nameLower.includes('lateral raise') || nameLower.includes('side raise')) {
    return { primary: [MUSCLE_GROUPS.SHOULDERS], secondary: [] };
  }
  if (nameLower.includes('front raise')) {
    return { primary: [MUSCLE_GROUPS.SHOULDERS], secondary: [] };
  }
  if (nameLower.includes('rear delt') || nameLower.includes('reverse fly')) {
    return { primary: [MUSCLE_GROUPS.SHOULDERS], secondary: [MUSCLE_GROUPS.BACK] };
  }
  if (nameLower.includes('shrug')) {
    return { primary: [MUSCLE_GROUPS.SHOULDERS, MUSCLE_GROUPS.BACK], secondary: [] };
  }
  
  // Arm exercises
  if (nameLower.includes('bicep curl') || nameLower.includes('hammer curl') || nameLower.includes('preacher curl')) {
    return { primary: [MUSCLE_GROUPS.ARMS], secondary: [] };
  }
  if (nameLower.includes('tricep') || nameLower.includes('skull crusher') || nameLower.includes('overhead extension')) {
    return { primary: [MUSCLE_GROUPS.ARMS], secondary: [] };
  }
  
  // Glute-focused exercises
  if (nameLower.includes('hip thrust') || nameLower.includes('glute bridge')) {
    return { primary: [MUSCLE_GROUPS.GLUTES], secondary: [MUSCLE_GROUPS.LEGS] };
  }
  if (nameLower.includes('kickback') || nameLower.includes('glute kickback')) {
    return { primary: [MUSCLE_GROUPS.GLUTES], secondary: [] };
  }
  
  // Core exercises
  if (nameLower.includes('plank') || nameLower.includes('ab') || nameLower.includes('crunch') || 
      nameLower.includes('sit-up') || nameLower.includes('situp') || nameLower.includes('core')) {
    return { primary: [MUSCLE_GROUPS.CORE], secondary: [] };
  }
  if (nameLower.includes('russian twist') || nameLower.includes('bicycle') || nameLower.includes('leg raise')) {
    return { primary: [MUSCLE_GROUPS.CORE], secondary: [] };
  }
  
  // Cardio/Full body (assign to legs as primary mover)
  if (nameLower.includes('running') || nameLower.includes('cycling') || nameLower.includes('rowing') || 
      nameLower.includes('swimming') || nameLower.includes('elliptical') || nameLower.includes('walking')) {
    return { primary: [MUSCLE_GROUPS.LEGS], secondary: [MUSCLE_GROUPS.CORE] };
  }
  
  // Flexibility/Mobility (primarily core engagement)
  if (nameLower.includes('stretch') || nameLower.includes('yoga') || nameLower.includes('mobility')) {
    return { primary: [MUSCLE_GROUPS.CORE], secondary: [] };
  }
  
  // Default: assume compound movement (chest, back, legs as primary)
  return { primary: [MUSCLE_GROUPS.CHEST, MUSCLE_GROUPS.BACK, MUSCLE_GROUPS.LEGS], secondary: [MUSCLE_GROUPS.CORE] };
}

/**
 * Evidence-based frequency guidelines for muscle group training
 * Based on ACSM/NSCA recommendations
 */
export const FREQUENCY_GUIDELINES = {
  // Optimal frequency range for muscle growth (hypertrophy)
  HYPERTROPHY: {
    minDaysPerWeek: 2,
    maxDaysPerWeek: 3,
    minRestDays: 2, // Minimum days rest between sessions for same muscle group
  },
  // Strength-focused training
  STRENGTH: {
    minDaysPerWeek: 2,
    maxDaysPerWeek: 4,
    minRestDays: 1,
  },
  // Endurance/conditioning
  ENDURANCE: {
    minDaysPerWeek: 3,
    maxDaysPerWeek: 6,
    minRestDays: 0, // Can train daily with proper load management
  },
  // General fitness
  GENERAL: {
    minDaysPerWeek: 2,
    maxDaysPerWeek: 3,
    minRestDays: 1,
  },
} as const;

/**
 * Calculate days since last training for a muscle group
 */
export function daysSinceLastTraining(lastTrainingDate: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastTrainingDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine if a muscle group needs training based on frequency guidelines
 */
export function needsTraining(
  muscleGroup: MuscleGroup,
  lastTrainedDate: Date | null,
  trainingGoal: keyof typeof FREQUENCY_GUIDELINES = 'GENERAL'
): { needs: boolean; priority: 'high' | 'medium' | 'low'; daysSince: number | null } {
  if (!lastTrainedDate) {
    return { needs: true, priority: 'high', daysSince: null };
  }
  
  const daysSince = daysSinceLastTraining(lastTrainedDate);
  const guidelines = FREQUENCY_GUIDELINES[trainingGoal];
  
  // High priority: past optimal frequency window
  const optimalFrequencyDays = Math.ceil(7 / guidelines.minDaysPerWeek);
  if (daysSince >= optimalFrequencyDays + 1) {
    return { needs: true, priority: 'high', daysSince };
  }
  
  // Medium priority: approaching end of optimal window
  if (daysSince >= optimalFrequencyDays) {
    return { needs: true, priority: 'medium', daysSince };
  }
  
  // Low priority: within optimal window but could use more volume
  if (daysSince >= guidelines.minRestDays) {
    return { needs: false, priority: 'low', daysSince };
  }
  
  // Too soon - needs rest
  return { needs: false, priority: 'low', daysSince };
}
