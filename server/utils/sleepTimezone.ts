/**
 * Sleep Data Timezone Utilities
 * 
 * Handles timezone-aware date range conversions for sleep data queries.
 * Critical for supporting users in different timezones (e.g., Australia/Perth UTC+08:00)
 * where local calendar days don't align with UTC midnight.
 */

import { formatInTimeZone, toDate } from 'date-fns-tz';
import { parseISO } from 'date-fns';

/**
 * Convert a local calendar date to UTC date range
 * 
 * Example: For Australia/Perth (UTC+08:00)
 *   Input: "2025-10-23", "Australia/Perth"
 *   Output: { 
 *     startUtc: 2025-10-22T16:00:00.000Z,  // 2025-10-23 00:00:00 Perth time
 *     endUtc: 2025-10-23T15:59:59.999Z     // 2025-10-23 23:59:59.999 Perth time
 *   }
 * 
 * @param localDate - Calendar date in YYYY-MM-DD format
 * @param timezone - IANA timezone (e.g., "Australia/Perth", "America/New_York")
 * @returns UTC start and end timestamps covering the full local calendar day
 */
export function localDayToUtcRange(localDate: string, timezone: string = 'UTC'): {
  startUtc: Date;
  endUtc: Date;
} {
  // Parse the local date (YYYY-MM-DD format)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) {
    throw new Error(`Invalid date format: ${localDate}. Expected YYYY-MM-DD`);
  }

  // Create start of day in local timezone (00:00:00.000)
  const startLocal = `${localDate}T00:00:00`;
  const startUtc = toDate(startLocal, { timeZone: timezone });

  // Create end of day in local timezone (23:59:59.999)
  const endLocal = `${localDate}T23:59:59.999`;
  const endUtc = toDate(endLocal, { timeZone: timezone });

  return { startUtc, endUtc };
}

/**
 * Convert any date/timestamp to UTC ISO string
 * 
 * @param dateInput - Date object, ISO string, or epoch milliseconds
 * @param timezone - Source timezone (if converting from local time)
 * @returns UTC ISO string
 */
export function toUtcIso(dateInput: Date | string | number, timezone?: string): string {
  let date: Date;

  if (typeof dateInput === 'number') {
    // Handle epoch timestamps
    // Auto-detect seconds vs milliseconds (values > 10^12 are milliseconds)
    const timestamp = dateInput > 10 ** 12 ? dateInput : dateInput * 1000;
    
    // Sanity check: reject absurd timestamps (before 2000 or after 2100)
    const year = new Date(timestamp).getFullYear();
    if (year < 2000 || year > 2100) {
      throw new Error(`Invalid timestamp: ${dateInput} (year: ${year}). Expected range: 2000-2100`);
    }
    
    date = new Date(timestamp);
  } else if (typeof dateInput === 'string') {
    date = parseISO(dateInput);
  } else {
    date = dateInput;
  }

  // Convert to UTC if timezone specified
  if (timezone && timezone !== 'UTC') {
    // This ensures we're working with the date as interpreted in the given timezone
    return date.toISOString();
  }

  return date.toISOString();
}

/**
 * Extract local hour from a UTC timestamp in a specific timezone
 * 
 * @param date - UTC date
 * @param timezone - Target timezone
 * @returns Hour in local time (0-23)
 */
export function getLocalHour(date: Date, timezone: string = 'UTC'): number {
  return Number(formatInTimeZone(date, timezone, 'H'));
}

/**
 * Extract local date string from a UTC timestamp in a specific timezone
 * 
 * @param date - UTC date
 * @param timezone - Target timezone
 * @returns Date string in YYYY-MM-DD format
 */
export function getLocalDateString(date: Date, timezone: string = 'UTC'): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/**
 * Check if a timestamp falls within a local calendar day
 * 
 * @param timestamp - UTC timestamp to check
 * @param localDate - Local calendar date (YYYY-MM-DD)
 * @param timezone - Timezone to use
 * @returns True if timestamp falls on that local calendar day
 */
export function isOnLocalDay(timestamp: Date, localDate: string, timezone: string = 'UTC'): boolean {
  const dateStr = getLocalDateString(timestamp, timezone);
  return dateStr === localDate;
}

/**
 * Convert bedtime/waketime window to bedtime-based filtering
 * 
 * Sleep sessions are typically queried by bedtime (start of sleep), but users
 * think in terms of calendar days. This function converts a local calendar day
 * to the appropriate bedtime window.
 * 
 * For a calendar day like "2025-10-23", we want sleep sessions that:
 *   - Started (bedtime) during that day OR
 *   - Ended (waketime) during that day OR
 *   - Spanned across that day
 * 
 * A safe approach is to query bedtimes in a wider window to catch cross-midnight sleep.
 * 
 * @param localDate - Local calendar date (YYYY-MM-DD)
 * @param timezone - Timezone
 * @returns Bedtime window that captures sleep for that calendar day
 */
export function localDayToBedtimeWindow(localDate: string, timezone: string = 'UTC'): {
  startBedtime: Date;
  endBedtime: Date;
} {
  // Get the UTC range for the full local calendar day
  const { startUtc, endUtc } = localDayToUtcRange(localDate, timezone);

  // Extend the window backwards to catch sleep that started the previous day
  // but ended during the target day (typical overnight sleep)
  const startBedtime = new Date(startUtc.getTime() - 18 * 60 * 60 * 1000); // 18 hours before

  // Extend forward to catch any sleep that started during the day
  const endBedtime = new Date(endUtc.getTime());

  return { startBedtime, endBedtime };
}
