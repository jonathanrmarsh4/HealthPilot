/**
 * ExerciseDB to HealthPilot Exercise Converter
 * 
 * Converts ExerciseDB exercise data into HealthPilot exercise format
 * with proper categorization, difficulty assessment, and tracking types.
 */

type ExerciseDBExercise = {
  exerciseId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
};

type HPExercise = {
  name: string;
  muscles: string[];
  equipment: string;
  incrementStep: number;
  tempoDefault: string | null;
  restDefault: number;
  instructions: string | null;
  videoUrl: string | null;
  difficulty: string;
  category: string;
  trackingType: string;
  exercisedbId: string;
};

/**
 * Normalize equipment names to HP standard
 */
function normalizeEquipment(equipment: string): string {
  const equipmentMap: Record<string, string> = {
    'barbell': 'barbell',
    'dumbbell': 'dumbbell',
    'machine': 'machine',
    'cable': 'cable',
    'body weight': 'bodyweight',
    'bodyweight': 'bodyweight',
    'kettlebell': 'kettlebell',
    'band': 'band',
    'resistance band': 'band',
    'ez barbell': 'barbell',
    'olympic barbell': 'barbell',
    'smith machine': 'machine',
    'leverage machine': 'machine',
    'sled machine': 'machine',
    'skierg machine': 'machine',
    'assisted': 'machine',
    'weighted': 'other',
    'medicine ball': 'other',
    'stability ball': 'other',
    'bosu ball': 'other',
    'foam roll': 'other',
    'wheel roller': 'other',
    'rope': 'cable',
    'tire': 'other',
    'trap bar': 'barbell',
    'upper body ergometer': 'machine',
    'elliptical machine': 'machine',
    'stationary bike': 'machine',
    'stepmill machine': 'machine',
  };

  const normalized = equipment.toLowerCase().trim();
  return equipmentMap[normalized] || 'other';
}

/**
 * Normalize muscle names to HP standard
 */
function normalizeMuscle(muscle: string): string {
  const muscleMap: Record<string, string> = {
    // Primary mappings
    'pectorals': 'chest',
    'chest': 'chest',
    'upper back': 'back',
    'lats': 'back',
    'traps': 'back',
    'lower back': 'back',
    'spine': 'back',
    'quads': 'legs',
    'hamstrings': 'legs',
    'glutes': 'glutes',
    'calves': 'calves',
    'abductors': 'legs',
    'adductors': 'legs',
    'delts': 'shoulders',
    'shoulders': 'shoulders',
    'biceps': 'arms',
    'triceps': 'arms',
    'forearms': 'arms',
    'abs': 'core',
    'serratus anterior': 'core',
    'levator scapulae': 'back',
    'cardiovascular system': 'cardio',
  };

  const normalized = muscle.toLowerCase().trim();
  return muscleMap[normalized] || normalized;
}

/**
 * Determine exercise category based on muscles and equipment
 */
function determineCategory(muscles: string[], equipment: string): string {
  // Cardio only if muscles specifically indicate cardio work
  if (muscles.includes('cardio')) {
    return 'cardio';
  }

  // Compound: works multiple major muscle groups
  const majorMuscleGroups = ['chest', 'back', 'legs', 'shoulders', 'glutes'];
  const majorMusclesWorked = muscles.filter(m => majorMuscleGroups.includes(m));
  
  // Also count arms as a potential compound indicator when paired with major groups
  const hasArms = muscles.includes('arms');
  const hasMajorAndArms = majorMusclesWorked.length >= 1 && hasArms;
  
  if (majorMusclesWorked.length >= 2 || hasMajorAndArms) {
    return 'compound';
  }

  // Flexibility/stretching (based on bodyweight + specific patterns)
  if (equipment === 'bodyweight' && muscles.includes('core')) {
    // Could be flexibility, but default to isolation for now
    return 'isolation';
  }

  return 'isolation';
}

/**
 * Determine difficulty based on equipment and complexity
 */
function determineDifficulty(equipment: string, category: string, numMuscles: number): string {
  // Bodyweight compound = harder
  if (equipment === 'bodyweight' && category === 'compound') {
    return 'advanced';
  }

  // Machine-based = easier
  if (equipment === 'machine') {
    return 'beginner';
  }

  // Barbell compound = intermediate to advanced
  if (equipment === 'barbell' && category === 'compound') {
    return 'intermediate';
  }

  // Multiple muscles = more complex
  if (numMuscles >= 3) {
    return 'intermediate';
  }

  // Default
  return 'beginner';
}

/**
 * Determine tracking type based on equipment and category
 */
function determineTrackingType(equipment: string, category: string): string {
  if (category === 'cardio') {
    return 'distance_duration';
  }

  if (equipment === 'bodyweight') {
    return 'bodyweight_reps';
  }

  // Default to weight and reps for resistance training
  return 'weight_reps';
}

/**
 * Determine increment step based on equipment
 */
function determineIncrementStep(equipment: string): number {
  const incrementMap: Record<string, number> = {
    'barbell': 2.5,      // 2.5kg plates
    'dumbbell': 2.0,     // Smaller increments
    'machine': 5.0,      // Machines often use pin selections
    'cable': 2.5,        // Similar to machines
    'bodyweight': 0.0,   // No weight increments
    'kettlebell': 4.0,   // Kettlebells jump in ~4kg increments
    'band': 0.0,         // No weight
    'other': 2.5,        // Default
  };

  return equipment in incrementMap ? incrementMap[equipment] : 2.5;
}

/**
 * Determine default rest based on category
 */
function determineRestDefault(category: string): number {
  const restMap: Record<string, number> = {
    'compound': 120,     // Compound needs more rest
    'isolation': 60,     // Isolation can be shorter
    'cardio': 60,        // Cardio intervals
    'flexibility': 30,   // Stretching
  };

  return restMap[category] || 90;
}

/**
 * Convert ExerciseDB exercise to HP exercise format
 */
export function convertExerciseDbToHp(dbExercise: ExerciseDBExercise): HPExercise {
  // Normalize equipment
  const equipment = normalizeEquipment(dbExercise.equipment);

  // Build muscles array: [primary, ...secondaries]
  const primaryMuscle = normalizeMuscle(dbExercise.target);
  const secondaryMuscles = (dbExercise.secondaryMuscles || [])
    .map(normalizeMuscle)
    .filter(m => m !== primaryMuscle); // Deduplicate

  const muscles = [primaryMuscle, ...secondaryMuscles];

  // Determine category
  const category = determineCategory(muscles, equipment);

  // Determine difficulty
  const difficulty = determineDifficulty(equipment, category, muscles.length);

  // Determine tracking type
  const trackingType = determineTrackingType(equipment, category);

  // Determine increment step
  const incrementStep = determineIncrementStep(equipment);

  // Determine rest default
  const restDefault = determineRestDefault(category);

  // Format instructions (join with newlines if exists)
  const instructions = dbExercise.instructions && dbExercise.instructions.length > 0
    ? dbExercise.instructions.join('\n')
    : null;

  return {
    name: dbExercise.name,
    muscles,
    equipment,
    incrementStep,
    tempoDefault: null, // Can be customized later
    restDefault,
    instructions,
    videoUrl: null, // GIFs are fetched via exercisedbId
    difficulty,
    category,
    trackingType,
    exercisedbId: dbExercise.exerciseId,
  };
}

/**
 * Validate converted exercise for quality
 */
export function validateConvertedExercise(exercise: HPExercise): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Must have name
  if (!exercise.name || exercise.name.trim().length === 0) {
    issues.push('Missing name');
  }

  // Must have at least one muscle
  if (!exercise.muscles || exercise.muscles.length === 0) {
    issues.push('No muscles specified');
  }

  // Must have valid equipment
  const validEquipment = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other'];
  if (!validEquipment.includes(exercise.equipment)) {
    issues.push(`Invalid equipment: ${exercise.equipment}`);
  }

  // Must have valid category
  const validCategories = ['compound', 'isolation', 'cardio', 'flexibility'];
  if (!validCategories.includes(exercise.category)) {
    issues.push(`Invalid category: ${exercise.category}`);
  }

  // Must have valid tracking type
  const validTrackingTypes = ['weight_reps', 'bodyweight_reps', 'distance_duration', 'duration_only'];
  if (!validTrackingTypes.includes(exercise.trackingType)) {
    issues.push(`Invalid tracking type: ${exercise.trackingType}`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
