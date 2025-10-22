/**
 * Daily Training Generator Scheduler
 * Generates AI-powered daily training sessions at 4am user local time
 */

import cron from 'node-cron';
import { format } from 'date-fns';
import { storage } from '../storage';
import { buildUserContext, generateDailySession } from './trainingGenerator';
import { canUseDailyAITrainingGenerator } from '../../shared/config/flags';

/**
 * Process users whose local time matches the target hour (4am)
 */
async function processUsersAtLocalTime(targetHour: number) {
  // Check feature flag
  if (!canUseDailyAITrainingGenerator()) {
    console.log('[DailyTraining] Feature disabled - skipping generation');
    return;
  }

  const currentUtcHour = new Date().getUTCHours();
  console.log(`[DailyTraining] Processing users for local hour ${targetHour}:00 (UTC ${currentUtcHour}:00)`);

  try {
    // Get all users
    const users = await storage.getAllUsers();
    
    let processedCount = 0;
    let generatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Get user's timezone (default to UTC if not set)
        const userTimezone = user.timezone || 'UTC';
        
        // Calculate what the local time is for this user right now
        const now = new Date();
        const userLocalHour = new Date(now.toLocaleString('en-US', { timeZone: userTimezone })).getHours();
        
        // Check if it's the target hour for this user
        if (userLocalHour !== targetHour) {
          continue;
        }

        processedCount++;
        
        // Check if workout already generated today
        const today = format(now, 'yyyy-MM-dd');
        const existing = await storage.getGeneratedWorkout(user.id, today);
        
        if (existing) {
          console.log(`[DailyTraining] Skipping ${user.id} - workout already generated for ${today}`);
          continue;
        }

        // Generate workout
        console.log(`[DailyTraining] Generating workout for user ${user.id}`);
        
        const context = await buildUserContext(storage, user.id, today);
        const workoutData = await generateDailySession(context);
        
        await storage.createGeneratedWorkout({
          userId: user.id,
          date: today,
          workoutData: workoutData as any,
          status: 'pending',
          regenerationCount: 0
        });
        
        generatedCount++;
        console.log(`[DailyTraining] ✅ Generated workout for user ${user.id}`);
        
      } catch (userError: any) {
        errorCount++;
        console.error(`[DailyTraining] Error processing user ${user.id}:`, userError.message);
      }
    }

    console.log(`[DailyTraining] Batch complete: ${processedCount} users processed, ${generatedCount} workouts generated, ${errorCount} errors`);
    
  } catch (error: any) {
    console.error('[DailyTraining] Batch processing error:', error.message);
  }
}

/**
 * Start the daily training generation scheduler
 * Runs every hour and processes users at 4am local time
 */
export function startDailyTrainingScheduler() {
  console.log('💪 Starting Daily Training Generator Scheduler...');
  
  // Run every hour at :00 minutes
  cron.schedule('0 * * * *', async () => {
    const currentUtcHour = new Date().getUTCHours();
    console.log(`[DailyTraining] Hourly check at UTC ${currentUtcHour}:00`);
    
    try {
      await processUsersAtLocalTime(4); // Target local time: 04:00
    } catch (error) {
      console.error('[DailyTraining] Scheduler error:', error);
    }
  });

  console.log('✅ Daily Training Generator Scheduler started (runs hourly)');
}
