/**
 * Daily Health Insights Debug Instrumentation
 * 
 * Enable with: INSIGHTS_DEBUG=1
 */

export const INSIGHTS_DEBUG = process.env.INSIGHTS_DEBUG === "1";

export function ilog(...args: any[]) {
  if (INSIGHTS_DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[INSIGHTS_DEBUG ${timestamp}]`, ...args);
  }
}

/**
 * Convert a local calendar day to UTC range for querying
 * 
 * @param localDateStr - YYYY-MM-DD in local timezone
 * @param tz - IANA timezone (e.g., "Australia/Perth")
 * @returns UTC ISO range for the full local day
 */
export function toUtcRangeForLocalDay(localDateStr: string, tz = "Australia/Perth") {
  // Parse the local date string as midnight in the target timezone
  // Australia/Perth is UTC+8 (no DST)
  const offset = tz === "Australia/Perth" ? "+08:00" : "+00:00";
  
  const startLocal = new Date(`${localDateStr}T00:00:00${offset}`);
  const endLocal = new Date(`${localDateStr}T23:59:59.999${offset}`);
  
  return {
    startUtcIso: startLocal.toISOString(),
    endUtcIso: endLocal.toISOString(),
    startUtc: startLocal,
    endUtc: endLocal,
  };
}

/**
 * Get the local calendar date string for a UTC timestamp in a given timezone
 */
export function getLocalDateStr(utcDate: Date, tz = "Australia/Perth"): string {
  // For Australia/Perth (UTC+8), we add 8 hours to UTC
  const offsetHours = tz === "Australia/Perth" ? 8 : 0;
  const localDate = new Date(utcDate.getTime() + offsetHours * 60 * 60 * 1000);
  return localDate.toISOString().split('T')[0];
}

/**
 * Log insights generation summary
 */
export function logInsightsGenerationSummary(
  userId: string,
  date: string,
  result: {
    metricsAnalyzed: number;
    insightsGenerated: number;
    errors: string[];
  }
) {
  ilog(`
========================================
INSIGHTS GENERATION SUMMARY
========================================
User ID: ${userId}
Date: ${date}
Metrics Analyzed: ${result.metricsAnalyzed}
Insights Generated: ${result.insightsGenerated}
Errors: ${result.errors.length}
${result.errors.length > 0 ? `Error Details:\n${result.errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}` : ''}
========================================
  `);
}

/**
 * Log insights fetch details
 */
export function logInsightsFetch(
  userId: string,
  requestedDate: string,
  utcRange: ReturnType<typeof toUtcRangeForLocalDay>,
  resultCount: number,
  preview?: any
) {
  ilog(`
----------------------------------------
INSIGHTS FETCH
----------------------------------------
User ID: ${userId}
Requested Date: ${requestedDate}
UTC Range: ${utcRange.startUtcIso} to ${utcRange.endUtcIso}
Results: ${resultCount} insights
${preview ? `First Item Preview: ${JSON.stringify(preview, null, 2)}` : 'No insights'}
----------------------------------------
  `);
}
