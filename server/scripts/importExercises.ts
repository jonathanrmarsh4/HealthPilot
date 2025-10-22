/**
 * Script to bulk import exercises from ExerciseDB
 * 
 * Run with: npx tsx server/scripts/importExercises.ts
 */

import { bulkImportFromExerciseDb } from '../services/exercises/bulkImportFromExerciseDb';

async function main() {
  console.log('🏋️  Starting exercise bulk import from ExerciseDB...\n');
  
  try {
    // Run the import
    const result = await bulkImportFromExerciseDb({ dryRun: false });
    
    console.log('\n✅ Import Complete!');
    console.log('━'.repeat(60));
    console.log(`📊 Total exercises processed: ${result.totalProcessed}`);
    console.log(`✓  Successfully imported: ${result.imported}`);
    console.log(`⊗  Skipped (duplicates): ${result.skipped}`);
    console.log(`⚠  Failed to convert: ${result.failed}`);
    console.log('━'.repeat(60));
    
    if (result.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      result.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err}`);
      });
    }
    
    console.log('\n🎉 Exercise database is now ready for recommendations!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

main();
