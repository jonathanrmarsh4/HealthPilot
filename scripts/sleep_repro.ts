/**
 * Sleep Data Reproduction Script
 * 
 * Tests sleep data ingest and retrieval for timezone-specific scenarios.
 * Designed to reproduce "No Sleep Data" errors in production.
 * 
 * Usage:
 *   ts-node scripts/sleep_repro.ts --tz Australia/Perth --date 2025-10-23 --user test_user_id
 * 
 * Environment:
 *   SLEEP_DEBUG=1  Enable detailed logging
 */

import { parseArgs } from 'util';

// Parse command line arguments
const { values } = parseArgs({
  options: {
    tz: { type: 'string', default: 'Australia/Perth' },
    date: { type: 'string', default: new Date().toISOString().split('T')[0] },
    user: { type: 'string', default: 'test_user_repro' },
    help: { type: 'boolean', short: 'h', default: false }
  }
});

if (values.help) {
  console.log(`
Sleep Data Reproduction Script

Usage:
  ts-node scripts/sleep_repro.ts [options]

Options:
  --tz <timezone>     Timezone (default: Australia/Perth)
  --date <YYYY-MM-DD> Local date to test (default: today)
  --user <userId>     User ID for testing (default: test_user_repro)
  --help, -h          Show this help

Examples:
  # Test Australia/Perth timezone for Oct 23, 2025
  ts-node scripts/sleep_repro.ts --tz Australia/Perth --date 2025-10-23

  # Test New York timezone for today
  ts-node scripts/sleep_repro.ts --tz America/New_York

Environment:
  SLEEP_DEBUG=1       Enable detailed debug logging
`);
  process.exit(0);
}

const timezone = values.tz as string;
const localDate = values.date as string;
const userId = values.user as string;

console.log('='.repeat(60));
console.log('SLEEP DATA REPRODUCTION SCRIPT');
console.log('='.repeat(60));
console.log(`Timezone: ${timezone}`);
console.log(`Local Date: ${localDate}`);
console.log(`User ID: ${userId}`);
console.log(`Debug Mode: ${process.env.SLEEP_DEBUG === '1' ? 'ENABLED' : 'DISABLED'}`);
console.log('='.repeat(60));
console.log();

async function main() {
  try {
    // Import utilities
    const { localDayToUtcRange } = await import('../server/utils/sleepTimezone');
    const { normalizeSleepStage } = await import('../server/utils/sleepStageNormalizer');
    
    // Generate synthetic sleep data for the local date
    const { startUtc, endUtc } = localDayToUtcRange(localDate, timezone);
    
    console.log('📅 LOCAL DATE WINDOW:');
    console.log(`  Local: ${localDate} 00:00:00 to 23:59:59.999 (${timezone})`);
    console.log(`  UTC:   ${startUtc.toISOString()} to ${endUtc.toISOString()}`);
    console.log();
    
    // Create synthetic sleep samples spanning local midnight
    // Typical sleep: 22:30 previous day to 06:15 target day (local time)
    const prevDayDate = new Date(startUtc);
    prevDayDate.setDate(prevDayDate.getDate() - 1);
    
    // Bedtime: 22:30 local (previous calendar day in local time)
    const bedtimeLocal = new Date(startUtc.getTime() - (1.5 * 60 * 60 * 1000)); // 1.5 hours before midnight
    
    // Wake time: 06:15 local (target calendar day)
    const waketimeLocal = new Date(startUtc.getTime() + (6.25 * 60 * 60 * 1000)); // 6:15 AM
    
    const sleepSamples = [
      // In bed awake
      { startDate: bedtimeLocal.toISOString(), endDate: new Date(bedtimeLocal.getTime() + 15 * 60 * 1000).toISOString(), value: 'inBed' },
      // Light sleep
      { startDate: new Date(bedtimeLocal.getTime() + 15 * 60 * 1000).toISOString(), endDate: new Date(bedtimeLocal.getTime() + 90 * 60 * 1000).toISOString(), value: 'asleep_core' },
      // Deep sleep
      { startDate: new Date(bedtimeLocal.getTime() + 90 * 60 * 1000).toISOString(), endDate: new Date(bedtimeLocal.getTime() + 180 * 60 * 1000).toISOString(), value: 'asleep_deep' },
      // REM sleep
      { startDate: new Date(bedtimeLocal.getTime() + 180 * 60 * 1000).toISOString(), endDate: new Date(bedtimeLocal.getTime() + 270 * 60 * 1000).toISOString(), value: 'asleep_rem' },
      // More light sleep
      { startDate: new Date(bedtimeLocal.getTime() + 270 * 60 * 1000).toISOString(), endDate: new Date(bedtimeLocal.getTime() + 360 * 60 * 1000).toISOString(), value: 'asleep_core' },
      // Wake up
      { startDate: new Date(bedtimeLocal.getTime() + 360 * 60 * 1000).toISOString(), endDate: new Date(bedtimeLocal.getTime() + 375 * 60 * 1000).toISOString(), value: 'awake' },
      // Back to light sleep
      { startDate: new Date(bedtimeLocal.getTime() + 375 * 60 * 1000).toISOString(), endDate: waketimeLocal.toISOString(), value: 'asleep_core' },
    ];
    
    console.log('🛌 SYNTHETIC SLEEP SAMPLES:');
    console.log(`  Count: ${sleepSamples.length}`);
    console.log(`  Bedtime (local): ${bedtimeLocal.toISOString()}`);
    console.log(`  Waketime (local): ${waketimeLocal.toISOString()}`);
    console.log(`  Duration: ${((waketimeLocal.getTime() - bedtimeLocal.getTime()) / (60 * 60 * 1000)).toFixed(1)} hours`);
    console.log();
    
    console.log('📊 SAMPLE BREAKDOWN:');
    sleepSamples.forEach((sample, idx) => {
      const start = new Date(sample.startDate);
      const end = new Date(sample.endDate);
      const durationMin = (end.getTime() - start.getTime()) / (60 * 1000);
      const normalized = normalizeSleepStage(sample.value);
      
      console.log(`  ${idx + 1}. ${sample.value.padEnd(15)} | ${start.toISOString()} | ${durationMin.toFixed(0)} min | canonical: ${normalized.canonical}`);
    });
    console.log();
    
    // Simulate API post to ingest endpoint
    console.log('📤 SIMULATED INGEST:');
    console.log('  POST /api/apple-health/sync');
    console.log(`  User: ${userId}`);
    console.log(`  Timezone: ${timezone}`);
    console.log(`  Samples: ${sleepSamples.length}`);
    console.log();
    
    // Simulate API query for the local date
    console.log('📥 SIMULATED READ QUERIES:');
    console.log();
    
    console.log('  Query 1: By local date with timezone');
    console.log(`  GET /api/sleep/sessions?localDate=${localDate}&timezone=${timezone}`);
    console.log(`  Expected: Sleep session from ${bedtimeLocal.toISOString()} to ${waketimeLocal.toISOString()}`);
    console.log();
    
    console.log('  Query 2: By UTC window (pure UTC)');
    console.log(`  GET /api/sleep/sessions (with startDate=${startUtc.toISOString()}, endDate=${endUtc.toISOString()})`);
    console.log(`  Expected: May miss data if bedtime is before UTC window start`);
    console.log();
    
    // Show potential issue
    console.log('⚠️  POTENTIAL ISSUE DEMONSTRATION:');
    console.log();
    
    const bedtimeUtc = new Date(bedtimeLocal);
    const isBeforeWindow = bedtimeUtc < startUtc;
    const isAfterWindow = bedtimeUtc > endUtc;
    
    if (isBeforeWindow) {
      console.log(`  ❌ TIMEZONE MISMATCH DETECTED:`);
      console.log(`     Bedtime UTC (${bedtimeUtc.toISOString()}) is BEFORE window start (${startUtc.toISOString()})`);
      console.log(`     This sleep session would be MISSED by a naive UTC query for local date ${localDate}`);
      console.log(`     → Solution: Use localDayToBedtimeWindow() to extend query window backwards`);
    } else if (isAfterWindow) {
      console.log(`  ❌ TIMEZONE MISMATCH DETECTED:`);
      console.log(`     Bedtime UTC (${bedtimeUtc.toISOString()}) is AFTER window end (${endUtc.toISOString()})`);
      console.log(`     This sleep session would be MISSED by a naive UTC query`);
    } else {
      console.log(`  ✅ Bedtime falls within UTC window - data would be found`);
      console.log(`     However, this may not always be the case for overnight sleep`);
    }
    console.log();
    
    console.log('✅ EXPECTED BEHAVIOR WITH FIX:');
    console.log(`  1. Stage normalization maps all variants (inBed, asleep_core, etc.) to canonical values`);
    console.log(`  2. Timezone-aware query extends window to catch overnight sleep`);
    console.log(`  3. SQL WHERE clause filters efficiently (not in-memory)`);
    console.log(`  4. Debug logging shows exact query window and results`);
    console.log();
    
    console.log('='.repeat(60));
    console.log('REPRODUCTION SCRIPT COMPLETE');
    console.log('='.repeat(60));
    console.log();
    console.log('💡 TO TEST WITH REAL DATABASE:');
    console.log(`   1. Set SLEEP_DEBUG=1 in environment`);
    console.log(`   2. Start the server: npm run dev`);
    console.log(`   3. Use this data to POST to /api/apple-health/sync`);
    console.log(`   4. Query with GET /api/sleep/sessions?localDate=${localDate}&timezone=${timezone}`);
    console.log(`   5. Check logs for [SLEEP_DEBUG] entries`);
    console.log();
    
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

main();
