/**
 * Cost Rollup Worker
 * 
 * Runs nightly to aggregate telemetry events into daily cost summaries.
 * Should be scheduled to run at 02:30 local time via cron or similar.
 * 
 * Usage:
 *   tsx server/workers/costRollup.ts [date]
 * 
 * If no date is provided, processes yesterday's data.
 * Date format: YYYY-MM-DD
 */

import { rollupCostsForDate } from "../services/telemetry";

async function main() {
  const args = process.argv.slice(2);
  let targetDate: Date;

  if (args.length > 0) {
    // Process specific date from command line
    targetDate = new Date(args[0]);
    if (isNaN(targetDate.getTime())) {
      console.error('Invalid date format. Use YYYY-MM-DD');
      process.exit(1);
    }
  } else {
    // Default: process yesterday's data
    targetDate = new Date();
    targetDate.setDate(targetDate.getDate() - 1);
  }

  console.log(`[Cost Rollup Worker] Starting rollup for ${targetDate.toISOString().split('T')[0]}`);
  
  try {
    await rollupCostsForDate(targetDate);
    console.log('[Cost Rollup Worker] Completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('[Cost Rollup Worker] Failed:', error);
    process.exit(1);
  }
}

main();
