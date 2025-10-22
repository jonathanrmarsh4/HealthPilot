/**
 * Backfill Script: Fix Incorrect ExerciseDB ID Mappings
 * 
 * Uses the new SimpleMatcher to correct wrong exercisedbId values in the exercises table.
 * Provides audit logging and statistics.
 * 
 * Usage:
 *   EXERCISE_SIMPLE_MATCHER_ENABLED=true tsx server/scripts/backfillExercisedbIds.ts
 */

import { storage } from '../storage';
import { resolveExternalId } from '../services/exercises/resolveExternalId';

interface BackfillResult {
  exerciseId: string;
  exerciseName: string;
  oldExercisedbId: string | null;
  newExercisedbId: string | null;
  newExercisedbName: string | null;
  confidence: string | null;
  action: 'unchanged' | 'corrected' | 'added' | 'no_match';
}

async function main() {
  console.log('='.repeat(80));
  console.log('EXERCISE EXERCISEDB ID BACKFILL SCRIPT');
  console.log('='.repeat(80));
  console.log('');
  
  // Check feature flag
  const { canUseSimpleMatcher } = await import('@shared/config/flags');
  const usingSimpleMatcher = canUseSimpleMatcher();
  
  console.log(`Matcher: ${usingSimpleMatcher ? 'SimpleMatcher (NEW)' : 'Legacy Fuzzy Matcher'}`);
  console.log('');
  
  if (!usingSimpleMatcher) {
    console.error('❌ FATAL: EXERCISE_SIMPLE_MATCHER_ENABLED=false');
    console.error('❌ This script requires the new SimpleMatcher to prevent wrong ID overwrites');
    console.error('');
    console.error('Usage: EXERCISE_SIMPLE_MATCHER_ENABLED=true tsx server/scripts/backfillExercisedbIds.ts');
    console.error('');
    process.exit(1);
  }
  
  // Get all exercises
  console.log('📊 Fetching all exercises from database...');
  const allExercises = await storage.getAllExercises();
  console.log(`Found ${allExercises.length} exercises`);
  console.log('');
  
  // Process each exercise
  const results: BackfillResult[] = [];
  let corrected = 0;
  let added = 0;
  let unchanged = 0;
  let noMatch = 0;
  
  console.log('🔍 Processing exercises...');
  console.log('');
  
  for (const exercise of allExercises) {
    const result: BackfillResult = {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      oldExercisedbId: exercise.exercisedbId || null,
      newExercisedbId: null,
      newExercisedbName: null,
      confidence: null,
      action: 'unchanged',
    };
    
    try {
      // Resolve new ID using SimpleMatcher or legacy resolver
      const match = await resolveExternalId({
        name: exercise.name,
        muscles: exercise.muscles,
        equipment: exercise.equipment,
        category: exercise.category,
      });
      
      if (match) {
        result.newExercisedbId = match.exercisedbId;
        result.newExercisedbName = match.name;
        result.confidence = match.confidence;
        
        // Determine action
        if (!exercise.exercisedbId) {
          // Adding new ID
          result.action = 'added';
          added++;
          console.log(`✅ ADDED: "${exercise.name}" → "${match.name}" (ID: ${match.exercisedbId}, confidence: ${match.confidence})`);
          
          // Update database
          await storage.updateExerciseExternalId(exercise.id, match.exercisedbId);
        } else if (exercise.exercisedbId !== match.exercisedbId) {
          // Correcting wrong ID
          result.action = 'corrected';
          corrected++;
          
          // Get old ExerciseDB name for comparison
          const oldExercisedb = await storage.getExercisedbExerciseById(exercise.exercisedbId);
          
          console.log(`🔧 CORRECTED: "${exercise.name}"`);
          console.log(`   OLD: ID ${exercise.exercisedbId} → "${oldExercisedb?.name || 'unknown'}"`);
          console.log(`   NEW: ID ${match.exercisedbId} → "${match.name}" (confidence: ${match.confidence})`);
          console.log('');
          
          // Update database
          await storage.updateExerciseExternalId(exercise.id, match.exercisedbId);
        } else {
          // ID already correct
          result.action = 'unchanged';
          unchanged++;
        }
      } else {
        // No match found
        result.action = 'no_match';
        noMatch++;
        console.log(`⚠️  NO MATCH: "${exercise.name}" (muscles: ${exercise.muscles.join(', ')}, equipment: ${exercise.equipment})`);
      }
    } catch (error) {
      console.error(`❌ ERROR processing "${exercise.name}":`, error);
    }
    
    results.push(result);
  }
  
  // Print statistics
  console.log('');
  console.log('='.repeat(80));
  console.log('BACKFILL STATISTICS');
  console.log('='.repeat(80));
  console.log(`Total exercises processed: ${allExercises.length}`);
  console.log(`✅ Corrected (wrong ID fixed):   ${corrected}`);
  console.log(`➕ Added (ID was null):          ${added}`);
  console.log(`✓  Unchanged (already correct):  ${unchanged}`);
  console.log(`⚠️  No match found:              ${noMatch}`);
  console.log('');
  
  // Export audit log
  const auditLog = {
    timestamp: new Date().toISOString(),
    matcher: usingSimpleMatcher ? 'SimpleMatcher' : 'Legacy',
    stats: {
      total: allExercises.length,
      corrected,
      added,
      unchanged,
      noMatch,
    },
    results,
  };
  
  // Save audit log to file
  const fs = await import('fs/promises');
  const logPath = `./backfill-audit-${Date.now()}.json`;
  await fs.writeFile(logPath, JSON.stringify(auditLog, null, 2));
  console.log(`📝 Audit log saved to: ${logPath}`);
  console.log('');
  
  // Show exercises that need manual review
  if (noMatch > 0) {
    console.log('⚠️  MANUAL REVIEW NEEDED:');
    console.log('The following exercises could not be matched automatically:');
    console.log('');
    
    results
      .filter(r => r.action === 'no_match')
      .forEach(r => {
        console.log(`  - ${r.exerciseName} (ID: ${r.exerciseId})`);
      });
    
    console.log('');
  }
  
  console.log('✅ Backfill complete!');
  console.log('');
  
  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ FATAL ERROR:', error);
  process.exit(1);
});
