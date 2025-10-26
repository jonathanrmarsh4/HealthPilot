/**
 * Cost Rollup Scheduler
 * 
 * Runs daily at 02:30 UTC to aggregate telemetry events into cost summaries.
 * This keeps the cost dashboard up-to-date with real-time usage data.
 */

import cron from 'node-cron';
import { rollupCostsForDate } from './telemetry';

/**
 * Starts the cost rollup scheduler
 * Runs daily at 02:30 UTC to process the previous day's telemetry data
 */
export function startCostRollupScheduler() {
  console.log('💰 Starting Cost Rollup Scheduler...');
  
  // Run daily at 02:30 UTC
  cron.schedule('30 2 * * *', async () => {
    const now = new Date();
    console.log(`[CostRollup] Running daily rollup at ${now.toISOString()}`);
    
    try {
      // Process yesterday's data
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      
      console.log(`[CostRollup] Processing telemetry for ${dateStr}...`);
      await rollupCostsForDate(yesterday);
      console.log(`[CostRollup] ✅ Successfully rolled up costs for ${dateStr}`);
      
    } catch (error: any) {
      console.error('[CostRollup] ❌ Error during cost rollup:', error.message);
    }
  }, {
    timezone: 'UTC'
  });
  
  console.log('✅ Cost Rollup Scheduler started (runs daily at 02:30 UTC)');
}
