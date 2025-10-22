/**
 * Exercise Data Normalizer
 * 
 * Normalizes exercise data from database to ensure consistent format for frontend.
 * Handles various instruction formats from JSONB storage.
 * 
 * BASELINE_MODE compliance:
 * - Ensures instructions are always string arrays
 * - Validates exercisedbId presence for media access
 * - Provides telemetry for missing external IDs
 */

export interface NormalizedExercise {
  id: number;
  name: string;
  instructions: string[];
  sets?: number | null;
  reps?: string | null;
  duration?: number | null;
  exercisedbId?: string | null;
  gifUrl?: string | null;
  hasExternalMedia: boolean;
}

/**
 * Normalize instructions to string array format
 * Handles string, string[], or other formats from JSONB
 */
export function normalizeInstructions(instructions: unknown): string[] {
  if (!instructions) {
    return [];
  }

  // Already a string array
  if (Array.isArray(instructions)) {
    return instructions
      .map(inst => typeof inst === 'string' ? inst : String(inst))
      .filter(Boolean);
  }

  // Single string (newline or comma separated)
  if (typeof instructions === 'string') {
    return instructions
      .split(/\r?\n|;/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Unknown format: return empty array
  console.warn('[ExerciseNormalizer] Unknown instructions format:', typeof instructions);
  return [];
}

/**
 * Telemetry: Log exercises with missing exercisedbId
 * Helps track which exercises need manual mapping
 */
export function logMissingExercisedbId(exerciseId: number, exerciseName: string): void {
  console.log('[ExerciseNormalizer] [TELEMETRY] Missing exercisedbId:', {
    exerciseId,
    name: exerciseName,
    reason: 'NO_EXTERNAL_ID',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Normalize a single exercise object
 * 
 * BASELINE_MODE behavior:
 * - When EXERCISE_MEDIA_AUTOMAP_ENABLED=false: Only exercises with exercisedbId get GIF URLs
 * - Ensures instructions are always string arrays
 * - Sets hasExternalMedia flag for frontend conditionals
 */
export function normalizeExercise(rawExercise: any): NormalizedExercise {
  if (!rawExercise) {
    throw new Error('[ExerciseNormalizer] Cannot normalize null/undefined exercise');
  }

  // Normalize instructions to string array
  const instructions = normalizeInstructions(rawExercise.instructions);

  // Check if exercise has external media ID
  const hasExternalMedia = Boolean(rawExercise.exercisedbId);

  // Log telemetry for missing exercisedbId
  if (!hasExternalMedia && rawExercise.id && rawExercise.name) {
    logMissingExercisedbId(rawExercise.id, rawExercise.name);
  }

  // Construct GIF URL only if exercisedbId exists
  const gifUrl = hasExternalMedia
    ? `/api/exercisedb/image?exerciseId=${rawExercise.exercisedbId}`
    : null;

  return {
    ...rawExercise,
    instructions,
    hasExternalMedia,
    gifUrl,
  };
}

/**
 * Normalize an array of exercises
 */
export function normalizeExercises(rawExercises: any[]): NormalizedExercise[] {
  if (!Array.isArray(rawExercises)) {
    console.warn('[ExerciseNormalizer] Expected array, got:', typeof rawExercises);
    return [];
  }

  return rawExercises.map(normalizeExercise);
}

/**
 * Strict validation: Exercise must have exercisedbId for media access
 * Used in BASELINE_MODE when EXERCISE_MEDIA_AUTOMAP_ENABLED=false
 */
export function validateExerciseForMedia(exercise: any): boolean {
  return Boolean(exercise?.exercisedbId);
}
