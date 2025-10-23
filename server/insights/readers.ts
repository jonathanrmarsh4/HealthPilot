/**
 * Data Readers for Metric Series
 * Reads time-series data from curated tables and hk_events_raw
 */

import { db } from "../db";
import { biomarkers, sleepSessions, hkEventsRaw } from "../../shared/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { MetricSpec } from "./registry";
import { ilog } from "./debug";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";

export interface DayWindow {
  startUtcIso: string;
  endUtcIso: string;
  tz: string;
  localDate: string;
}

export interface SeriesPoint {
  t: string;  // UTC ISO timestamp
  v: number;  // Numeric value
  meta?: any; // Optional metadata
}

/**
 * Compute UTC window for a local date in a timezone
 */
export function perthLocalDay(dateStr: string, tz = "Australia/Perth"): DayWindow {
  // Parse as local midnight
  const localStart = new Date(dateStr + "T00:00:00");
  const localEnd = new Date(dateStr + "T23:59:59.999");
  
  // Convert to UTC ISO strings
  const startUtcIso = formatInTimeZone(localStart, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  const endUtcIso = formatInTimeZone(localEnd, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
  
  return {
    startUtcIso,
    endUtcIso,
    tz,
    localDate: dateStr
  };
}

/**
 * Read series data for a metric
 */
export async function readSeries(
  userId: string,
  metric: MetricSpec,
  win: DayWindow
): Promise<SeriesPoint[]> {
  const startUtc = new Date(win.startUtcIso);
  const endUtc = new Date(win.endUtcIso);
  
  ilog(`Reading series for ${metric.id} (${metric.source}/${metric.mapper})`);
  
  try {
    // Route to appropriate reader based on source/mapper
    if (metric.source === "curated") {
      return await readCurated(userId, metric, startUtc, endUtc, win);
    } else {
      return await readRaw(userId, metric, startUtc, endUtc);
    }
  } catch (error) {
    console.error(`Error reading series for ${metric.id}:`, error);
    return [];
  }
}

/**
 * Read from curated tables (biomarkers, sleep_sessions)
 */
async function readCurated(
  userId: string,
  metric: MetricSpec,
  startUtc: Date,
  endUtc: Date,
  win: DayWindow
): Promise<SeriesPoint[]> {
  if (metric.mapper === "biomarkers") {
    // Read from biomarkers table
    const rows = await db
      .select()
      .from(biomarkers)
      .where(
        and(
          eq(biomarkers.userId, userId),
          eq(biomarkers.type, metric.id),
          gte(biomarkers.date, startUtc),
          lte(biomarkers.date, endUtc)
        )
      )
      .orderBy(desc(biomarkers.date));
    
    return rows.map(row => ({
      t: row.date.toISOString(),
      v: row.value,
      meta: { unit: row.unit }
    }));
  }
  
  if (metric.mapper === "sleep_sessions") {
    // Read from sleep_sessions
    const rows = await db
      .select()
      .from(sleepSessions)
      .where(
        and(
          eq(sleepSessions.userId, userId),
          sql`${sleepSessions.nightKeyLocalDate} = ${win.localDate}`
        )
      )
      .limit(1);
    
    if (rows.length === 0) return [];
    
    const session = rows[0];
    
    // Extract the specific sleep metric
    const value = extractSleepMetric(metric.id, session);
    if (value === null) return [];
    
    return [{
      t: session.startTimeUtc.toISOString(),
      v: value,
      meta: {
        sessionId: session.id,
        episodeType: session.episodeType
      }
    }];
  }
  
  return [];
}

/**
 * Extract specific sleep metric from session
 */
function extractSleepMetric(metricId: string, session: any): number | null {
  switch (metricId) {
    case "sleep_asleep_core":
      return session.coreMinutes || 0;
    case "sleep_asleep_deep":
      return session.deepMinutes || 0;
    case "sleep_asleep_rem":
      return session.remMinutes || 0;
    case "sleep_awake":
      return session.awakeMinutes || 0;
    case "sleep_in_bed":
      return session.inBedMinutes || 0;
    case "sleep_score":
      return session.sleepScore || 0;
    default:
      return null;
  }
}

/**
 * Read from hk_events_raw table
 */
async function readRaw(
  userId: string,
  metric: MetricSpec,
  startUtc: Date,
  endUtc: Date
): Promise<SeriesPoint[]> {
  const rows = await db
    .select()
    .from(hkEventsRaw)
    .where(
      and(
        eq(hkEventsRaw.userId, userId),
        eq(hkEventsRaw.type, metric.id),
        gte(hkEventsRaw.startDateUtc, startUtc),
        lte(hkEventsRaw.endDateUtc, endUtc)
      )
    )
    .orderBy(desc(hkEventsRaw.startDateUtc));
  
  const points: SeriesPoint[] = [];
  
  for (const row of rows) {
    // Extract numeric value from value_json
    const value = extractNumericValue(row.valueJson);
    
    if (value !== null && !isNaN(value)) {
      points.push({
        t: row.startDateUtc.toISOString(),
        v: value,
        meta: {
          unit: row.unit,
          sourceBundle: row.sourceBundleId
        }
      });
    }
  }
  
  ilog(`Read ${points.length} points for ${metric.id}`);
  return points;
}

/**
 * Extract numeric value from HealthKit JSON
 */
function extractNumericValue(valueJson: any): number | null {
  if (valueJson === null || valueJson === undefined) return null;
  
  try {
    // If already a number
    if (typeof valueJson === "number") {
      return valueJson;
    }
    
    // If string that can be parsed
    if (typeof valueJson === "string") {
      const num = parseFloat(valueJson);
      return isNaN(num) ? null : num;
    }
    
    // If object with qty field (common HealthKit pattern)
    if (typeof valueJson === "object") {
      if ("qty" in valueJson && typeof valueJson.qty === "number") {
        return valueJson.qty;
      }
      if ("value" in valueJson && typeof valueJson.value === "number") {
        return valueJson.value;
      }
      if ("count" in valueJson && typeof valueJson.count === "number") {
        return valueJson.count;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Read series for multiple days (for baseline calculations)
 */
export async function readSeriesMultiDay(
  userId: string,
  metric: MetricSpec,
  startDate: string,
  endDate: string,
  tz = "Australia/Perth"
): Promise<SeriesPoint[]> {
  const allPoints: SeriesPoint[] = [];
  
  let currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  while (currentDate <= endDateObj) {
    const dateStr = formatInTimeZone(currentDate, tz, "yyyy-MM-dd");
    const win = perthLocalDay(dateStr, tz);
    const points = await readSeries(userId, metric, win);
    allPoints.push(...points);
    currentDate = addDays(currentDate, 1);
  }
  
  return allPoints.sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
}
