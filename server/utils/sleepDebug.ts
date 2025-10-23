/**
 * Sleep Data Debugging Utility
 * 
 * Enable with: SLEEP_DEBUG=1 in environment
 * 
 * Provides comprehensive logging for sleep data ingest and retrieval
 * to diagnose "No Sleep Data" errors, timezone issues, and data mismatches.
 */

export const SLEEP_DEBUG = process.env.SLEEP_DEBUG === "1";

/**
 * Debug logger - only logs when SLEEP_DEBUG=1
 */
export function dlog(...args: any[]) {
  if (SLEEP_DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[SLEEP_DEBUG ${timestamp}]`, ...args);
  }
}

/**
 * Log sleep sample summary for ingest operations
 */
export function logIngestSummary(params: {
  userId: string;
  sampleCount: number;
  samples: Array<{ startDate: string | Date; endDate: string | Date; value: string }>;
  userTimezone?: string;
}) {
  if (!SLEEP_DEBUG) return;

  const { userId, sampleCount, samples, userTimezone } = params;
  
  dlog('=== SLEEP INGEST SUMMARY ===');
  dlog(`User ID: ${userId}`);
  dlog(`Timezone: ${userTimezone || 'UTC (default)'}`);
  dlog(`Sample Count: ${sampleCount}`);
  
  if (samples.length > 0) {
    // Convert to Date objects if needed
    const dates = samples.map(s => ({
      start: new Date(s.startDate),
      end: new Date(s.endDate),
      value: s.value
    }));
    
    // Find min/max timestamps
    const startDates = dates.map(d => d.start.getTime());
    const endDates = dates.map(d => d.end.getTime());
    const minStart = new Date(Math.min(...startDates));
    const maxEnd = new Date(Math.max(...endDates));
    
    dlog(`Time Range (UTC):`);
    dlog(`  Min Start: ${minStart.toISOString()}`);
    dlog(`  Max End:   ${maxEnd.toISOString()}`);
    dlog(`  Span: ${((maxEnd.getTime() - minStart.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours`);
    
    // Unique sleep stage values
    const uniqueStages = [...new Set(samples.map(s => s.value))];
    dlog(`Unique Sleep Stages: [${uniqueStages.join(', ')}]`);
    
    // Stage distribution
    const stageCounts: Record<string, number> = {};
    samples.forEach(s => {
      stageCounts[s.value] = (stageCounts[s.value] || 0) + 1;
    });
    dlog('Stage Distribution:');
    Object.entries(stageCounts).forEach(([stage, count]) => {
      dlog(`  ${stage}: ${count} samples`);
    });
    
    // Sample first and last
    dlog('First Sample:', {
      start: dates[0].start.toISOString(),
      end: dates[0].end.toISOString(),
      value: dates[0].value
    });
    dlog('Last Sample:', {
      start: dates[dates.length - 1].start.toISOString(),
      end: dates[dates.length - 1].end.toISOString(),
      value: dates[dates.length - 1].value
    });
  }
  
  dlog('===========================');
}

/**
 * Log sleep session query summary for read operations
 */
export function logQuerySummary(params: {
  userId: string;
  queryWindow: {
    startDate?: Date;
    endDate?: Date;
    startUtc?: Date;
    endUtc?: Date;
    localDate?: string;
    timezone?: string;
  };
  results: Array<{
    bedtime: Date;
    waketime: Date;
    sleepScore?: number | null;
    episodeType?: string | null;
  }>;
  sqlGenerated?: string;
}) {
  if (!SLEEP_DEBUG) return;

  const { userId, queryWindow, results, sqlGenerated } = params;
  
  dlog('=== SLEEP QUERY SUMMARY ===');
  dlog(`User ID: ${userId}`);
  
  if (queryWindow.localDate && queryWindow.timezone) {
    dlog(`Local Date: ${queryWindow.localDate} (${queryWindow.timezone})`);
  }
  
  if (queryWindow.startUtc && queryWindow.endUtc) {
    dlog(`UTC Query Window:`);
    dlog(`  Start: ${queryWindow.startUtc.toISOString()}`);
    dlog(`  End:   ${queryWindow.endUtc.toISOString()}`);
  } else if (queryWindow.startDate && queryWindow.endDate) {
    dlog(`Query Window:`);
    dlog(`  Start: ${queryWindow.startDate.toISOString()}`);
    dlog(`  End:   ${queryWindow.endDate.toISOString()}`);
  }
  
  if (sqlGenerated) {
    dlog(`SQL: ${sqlGenerated}`);
  }
  
  dlog(`Results Count: ${results.length}`);
  
  if (results.length > 0) {
    const bedtimes = results.map(r => r.bedtime.getTime());
    const waketimes = results.map(r => r.waketime.getTime());
    const minBedtime = new Date(Math.min(...bedtimes));
    const maxWaketime = new Date(Math.max(...waketimes));
    
    dlog(`Result Time Range (UTC):`);
    dlog(`  Min Bedtime:  ${minBedtime.toISOString()}`);
    dlog(`  Max Waketime: ${maxWaketime.toISOString()}`);
    
    // Episode type distribution
    const episodeTypes: Record<string, number> = {};
    results.forEach(r => {
      const type = r.episodeType || 'unknown';
      episodeTypes[type] = (episodeTypes[type] || 0) + 1;
    });
    dlog('Episode Types:');
    Object.entries(episodeTypes).forEach(([type, count]) => {
      dlog(`  ${type}: ${count} sessions`);
    });
    
    // Score distribution
    const withScores = results.filter(r => r.sleepScore !== null && r.sleepScore !== undefined);
    if (withScores.length > 0) {
      const avgScore = withScores.reduce((sum, r) => sum + (r.sleepScore || 0), 0) / withScores.length;
      dlog(`Average Sleep Score: ${avgScore.toFixed(1)} (${withScores.length} sessions with scores)`);
    }
    
    // Sample first and last
    dlog('First Result:', {
      bedtime: results[0].bedtime.toISOString(),
      waketime: results[0].waketime.toISOString(),
      score: results[0].sleepScore,
      type: results[0].episodeType
    });
    dlog('Last Result:', {
      bedtime: results[results.length - 1].bedtime.toISOString(),
      waketime: results[results.length - 1].waketime.toISOString(),
      score: results[results.length - 1].sleepScore,
      type: results[results.length - 1].episodeType
    });
  } else {
    dlog('⚠️  NO RESULTS RETURNED - Possible timezone/bounds issue!');
  }
  
  dlog('==========================');
}

/**
 * Log timezone conversion for debugging
 */
export function logTimezoneConversion(params: {
  localDate: string;
  timezone: string;
  startUtc: Date;
  endUtc: Date;
}) {
  if (!SLEEP_DEBUG) return;

  const { localDate, timezone, startUtc, endUtc } = params;
  
  dlog('=== TIMEZONE CONVERSION ===');
  dlog(`Local Date: ${localDate}`);
  dlog(`Timezone: ${timezone}`);
  dlog(`UTC Start: ${startUtc.toISOString()}`);
  dlog(`UTC End:   ${endUtc.toISOString()}`);
  dlog(`Window: ${((endUtc.getTime() - startUtc.getTime()) / (1000 * 60 * 60)).toFixed(1)} hours`);
  dlog('===========================');
}
