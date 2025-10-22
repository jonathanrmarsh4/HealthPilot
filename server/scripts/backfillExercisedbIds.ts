/**
 * Backfill Script: Resolve exercisedbId for existing exercises
 * 
 * This script updates all existing exercises in the database to link them
 * to ExerciseDB entries using deterministic matching.
 */

import { db } from '../db';
import { exercises } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { deriveExercisedbId } from '../utils/exercisedbResolver';

async function backfillExercisedbIds() {
  console.log('🚀 Starting exercisedbId backfill...\n');

  try {
    // Fetch all exercises from database
    const allExercises = await db.select().from(exercises);
    console.log(`📊 Found ${allExercises.length} exercises to process\n`);

    let updated = 0;
    let alreadyLinked = 0;
    let noMatch = 0;
    let errors = 0;

    const confidenceStats = {
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const exercise of allExercises) {
      try {
        // Skip if already has exercisedbId
        if (exercise.exercisedbId) {
          alreadyLinked++;
          console.log(`⏭️  Skipped "${exercise.name}" (already linked to ${exercise.exercisedbId})`);
          continue;
        }

        console.log(`\n🔍 Processing "${exercise.name}"...`);
        console.log(`   Muscles: ${exercise.muscles.join(', ')}`);
        console.log(`   Equipment: ${exercise.equipment}`);

        // Derive ExerciseDB ID
        const match = await deriveExercisedbId({
          name: exercise.name,
          muscles: exercise.muscles,
          equipment: exercise.equipment,
          category: exercise.category,
        });

        if (match) {
          // Update the exercise with exercisedbId
          await db
            .update(exercises)
            .set({ exercisedbId: match.exercisedbId })
            .where(eq(exercises.id, exercise.id));

          console.log(`✅ Linked "${exercise.name}" → "${match.name}"`);
          console.log(`   ExerciseDB ID: ${match.exercisedbId}`);
          console.log(`   Confidence: ${match.confidence} (score: ${match.score})`);
          console.log(`   Target: ${match.target} | Equipment: ${match.equipment}`);

          updated++;
          confidenceStats[match.confidence]++;
        } else {
          console.warn(`⚠️  No suitable ExerciseDB match found for "${exercise.name}"`);
          noMatch++;
        }

      } catch (error: any) {
        console.error(`❌ Error processing exercise ${exercise.id} (${exercise.name}):`, error.message);
        errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total exercises: ${allExercises.length}`);
    console.log(`Already linked: ${alreadyLinked}`);
    console.log(`Newly linked: ${updated}`);
    console.log(`No match found: ${noMatch}`);
    console.log(`Errors: ${errors}`);
    console.log('');
    console.log('Match confidence distribution:');
    console.log(`  High confidence: ${confidenceStats.high}`);
    console.log(`  Medium confidence: ${confidenceStats.medium}`);
    console.log(`  Low confidence: ${confidenceStats.low}`);
    console.log('='.repeat(60));

    if (noMatch > 0) {
      console.log('\n⚠️  WARNING: Some exercises have no ExerciseDB match.');
      console.log('   These exercises will not have GIF demonstrations available.');
      console.log('   Consider manually linking them or updating the resolver logic.');
    }

    if (confidenceStats.low > 0) {
      console.log('\n⚠️  WARNING: Some matches have low confidence.');
      console.log('   Review these matches to ensure correct GIF mapping.');
    }

    console.log('\n✅ Backfill complete!');

  } catch (error: any) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillExercisedbIds()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
