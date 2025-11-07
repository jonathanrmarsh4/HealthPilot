/**
 * Manual Workout Generation Script
 * Triggers a workout generation for a specific user with detailed logging
 */

import { storage } from '../server/storage';
import { generateAndSaveWorkout } from '../server/services/trainingGenerator';
import { format } from 'date-fns';

const USER_ID = '34226453'; // Real user ID
const TARGET_DATE = format(new Date(), 'yyyy-MM-dd');

async function run() {
  console.log('🎯 Manual Workout Generation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`User ID: ${USER_ID}`);
  console.log(`Target Date: ${TARGET_DATE}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Check for existing workout
    console.log('🔍 Checking for existing workout...');
    const existing = await storage.getGeneratedWorkout(USER_ID, TARGET_DATE);
    if (existing) {
      console.log(`ℹ️  Existing workout found with status: ${existing.status}`);
      console.log('    Note: Will generate new workout anyway (regenerate mode)\n');
    } else {
      console.log('ℹ️  No existing workout found\n');
    }

    // Generate new workout
    console.log('🏋️  Generating workout...\n');
    const result = await generateAndSaveWorkout(storage, USER_ID, TARGET_DATE);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ WORKOUT GENERATED SUCCESSFULLY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Exercises: ${result.blocks?.length || 0}`);
    console.log(`Duration: ${result.plan?.total_time_estimate_min || 'N/A'} minutes`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

run();
