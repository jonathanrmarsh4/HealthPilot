/**
 * Bulk Import Service - ExerciseDB to HP Exercises
 * 
 * Imports exercises from exercisedb_exercises table into exercises table
 * with proper validation and deduplication.
 */

import { convertExerciseDbToHp, validateConvertedExercise } from './convertExerciseDbToHp';
import { db } from '../../db';
import { exercises, exercisedbExercises } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  failed: number;
  errors: Array<{
    exerciseName: string;
    reason: string;
  }>;
};

/**
 * Bulk import exercises from ExerciseDB into HP exercises table
 * 
 * @param options.dryRun - If true, only validates without inserting
 * @param options.skipExisting - If true, skips exercises that already exist
 * @returns Import result with statistics
 */
export async function bulkImportFromExerciseDb(options: {
  dryRun?: boolean;
  skipExisting?: boolean;
} = {}): Promise<ImportResult> {
  const { dryRun = false, skipExisting = true } = options;

  const result: ImportResult = {
    success: true,
    imported: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  console.log('[BulkImport] Starting import from ExerciseDB...');
  console.log(`[BulkImport] Dry run: ${dryRun}, Skip existing: ${skipExisting}`);

  try {
    // Fetch all ExerciseDB exercises
    const dbExercises = await db.select().from(exercisedbExercises);
    console.log(`[BulkImport] Found ${dbExercises.length} ExerciseDB exercises`);

    // Get existing exercise names and exercisedbIds for deduplication
    const existingExercises = await db.select({
      name: exercises.name,
      exercisedbId: exercises.exercisedbId,
    }).from(exercises);

    const existingNames = new Set(existingExercises.map(e => e.name.toLowerCase()));
    const existingExercisedbIds = new Set(
      existingExercises.map(e => e.exercisedbId).filter(Boolean)
    );

    console.log(`[BulkImport] Found ${existingNames.size} existing HP exercises`);

    // Process each ExerciseDB exercise
    for (const dbExercise of dbExercises) {
      try {
        // Check if already exists
        if (skipExisting) {
          if (existingNames.has(dbExercise.name.toLowerCase())) {
            result.skipped++;
            continue;
          }
          if (existingExercisedbIds.has(dbExercise.exerciseId)) {
            result.skipped++;
            continue;
          }
        }

        // Convert to HP format
        const hpExercise = convertExerciseDbToHp({
          exerciseId: dbExercise.exerciseId,
          name: dbExercise.name,
          bodyPart: dbExercise.bodyPart,
          equipment: dbExercise.equipment,
          target: dbExercise.target,
          secondaryMuscles: (dbExercise.secondaryMuscles as string[]) || [],
          instructions: (dbExercise.instructions as string[]) || [],
        });

        // Validate converted exercise
        const validation = validateConvertedExercise(hpExercise);
        if (!validation.valid) {
          result.failed++;
          result.errors.push({
            exerciseName: dbExercise.name,
            reason: validation.issues.join(', '),
          });
          continue;
        }

        // Insert into database (unless dry run)
        if (!dryRun) {
          await db.insert(exercises).values(hpExercise);
        }

        result.imported++;

        // Log progress every 100 exercises
        if (result.imported % 100 === 0) {
          console.log(`[BulkImport] Progress: ${result.imported} imported...`);
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          exerciseName: dbExercise.name,
          reason: error.message || 'Unknown error',
        });
      }
    }

    console.log('[BulkImport] Import complete!');
    console.log(`[BulkImport] Imported: ${result.imported}`);
    console.log(`[BulkImport] Skipped: ${result.skipped}`);
    console.log(`[BulkImport] Failed: ${result.failed}`);

    if (result.errors.length > 0) {
      console.warn('[BulkImport] Errors encountered:');
      result.errors.slice(0, 10).forEach(err => {
        console.warn(`  - ${err.exerciseName}: ${err.reason}`);
      });
      if (result.errors.length > 10) {
        console.warn(`  ... and ${result.errors.length - 10} more`);
      }
    }
  } catch (error: any) {
    console.error('[BulkImport] Fatal error during import:', error);
    result.success = false;
    result.errors.push({
      exerciseName: 'SYSTEM',
      reason: error.message || 'Unknown fatal error',
    });
  }

  return result;
}

/**
 * Get import statistics without performing import
 */
export async function getImportStats(): Promise<{
  totalExerciseDb: number;
  totalHpExercises: number;
  potentialImports: number;
  alreadyLinked: number;
}> {
  // Count ExerciseDB exercises
  const dbExercises = await db.select().from(exercisedbExercises);
  const totalExerciseDb = dbExercises.length;

  // Count existing HP exercises
  const existingExercises = await db.select().from(exercises);
  const totalHpExercises = existingExercises.length;

  // Count already linked
  const alreadyLinked = existingExercises.filter(e => e.exercisedbId).length;

  // Potential imports = ExerciseDB - already linked
  const potentialImports = totalExerciseDb - alreadyLinked;

  return {
    totalExerciseDb,
    totalHpExercises,
    potentialImports,
    alreadyLinked,
  };
}
