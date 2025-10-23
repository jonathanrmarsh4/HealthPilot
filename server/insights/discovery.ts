/**
 * Dynamic Metric Discovery
 * Discovers all available metrics for a user on a given date
 */

import { db } from "../db";
import { biomarkers, sleepSessions, workoutSessions, hkEventsRaw } from "../../shared/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { MetricSpec, registerMetric, getRegistry } from "./registry";
import { ilog, ilogSection, ilogMetrics } from "./debug";
import { config } from "./config";
import { perthLocalDay } from "./readers";

export interface DiscoveryResult {
  specs: MetricSpec[];
  counts: Record<string, number>;
}

/**
 * Discover all metrics available for a user on a date
 */
export async function discoverMetrics(
  userId: string,
  localDate: string,
  tz = "Australia/Perth"
): Promise<DiscoveryResult> {
  ilogSection(`Discovering metrics for user ${userId} on ${localDate}`);
  
  const discovered = new Set<string>();
  const counts: Record<string, number> = {};
  
  // 1. Get proper UTC window for the local date in user's timezone
  const win = perthLocalDay(localDate, tz);
  const dateStart = new Date(win.startUtcIso);
  const dateEnd = new Date(win.endUtcIso);
  
  const biomarkerRows = await db
    .select({ type: biomarkers.type })
    .from(biomarkers)
    .where(
      and(
        eq(biomarkers.userId, userId),
        gte(biomarkers.date, dateStart),
        lte(biomarkers.date, dateEnd)
      )
    );
  
  for (const row of biomarkerRows) {
    if (row.type) {
      discovered.add(row.type);
      counts[row.type] = (counts[row.type] || 0) + 1;
    }
  }
  
  ilog(`Found ${biomarkerRows.length} biomarker records`);
  
  // 2. Check curated: sleep_sessions
  const sleepRows = await db
    .select()
    .from(sleepSessions)
    .where(
      and(
        eq(sleepSessions.userId, userId),
        sql`${sleepSessions.nightKeyLocalDate} = ${localDate}`
      )
    )
    .limit(1);
  
  if (sleepRows.length > 0) {
    const sleepMetrics = [
      "sleep_asleep_core",
      "sleep_asleep_deep", 
      "sleep_asleep_rem",
      "sleep_awake",
      "sleep_in_bed",
      "sleep_score"
    ];
    sleepMetrics.forEach(m => {
      discovered.add(m);
      counts[m] = 1;
    });
    ilog(`Found sleep session data - added ${sleepMetrics.length} sleep metrics`);
  }
  
  // 3. Check curated: workout_sessions
  const workoutRows = await db
    .select()
    .from(workoutSessions)
    .where(
      and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startTime, dateStart),
        lte(workoutSessions.startTime, dateEnd)
      )
    );
  
  if (workoutRows.length > 0) {
    counts["workout_session"] = workoutRows.length;
    ilog(`Found ${workoutRows.length} workout sessions`);
  }
  
  // 4. Dynamic discovery from hk_events_raw
  if (config.dynamicDiscovery || config.includeAll) {
    ilog("Dynamic discovery enabled - querying hk_events_raw...");
    
    // Use the computed DayWindow (already in correct UTC bounds) instead of DATE() comparison
    const rawTypes = await db
      .select({
        type: hkEventsRaw.type,
        count: sql<number>`count(*)`.as('count')
      })
      .from(hkEventsRaw)
      .where(
        and(
          eq(hkEventsRaw.userId, userId),
          // Event overlaps with [start, end) window: start < end AND eventEnd >= start
          // Uses >= on lower bound to include zero-duration samples at midnight
          sql`${hkEventsRaw.startDateUtc} < ${dateEnd}`,
          sql`${hkEventsRaw.endDateUtc} >= ${dateStart}`
        )
      )
      .groupBy(hkEventsRaw.type);
    
    for (const row of rawTypes) {
      const type = row.type;
      const count = Number(row.count);
      
      discovered.add(type);
      counts[type] = (counts[type] || 0) + count;
      
      // Auto-register unknown metrics with proper mapper
      const registry = getRegistry();
      if (!registry.metrics[type]) {
        const newSpec: MetricSpec = {
          id: type,
          family: mapTypeToFamily(type),
          kind: "value",
          source: "raw",
          mapper: "hk_events_raw",  // Always hk_events_raw for dynamic discovery
          preferredAgg: "mean"
        };
        
        // Validate that mapper is set before registration
        if (!newSpec.mapper) {
          console.warn(`[Discovery] Skipping dynamic registration of ${type}: no mapper defined`);
          continue;
        }
        
        registerMetric(newSpec);
        ilog(`Auto-registered new metric: ${type} (family: ${newSpec.family}, mapper: ${newSpec.mapper})`);
      }
    }
    
    ilog(`Found ${rawTypes.length} distinct types in hk_events_raw`);
  }
  
  const metricIds = Array.from(discovered);
  ilogMetrics(metricIds);
  
  // Build result
  const registry = getRegistry();
  const specs = metricIds
    .map(id => registry.metrics[id])
    .filter((spec): spec is MetricSpec => spec !== undefined);
  
  return { specs, counts };
}

/**
 * Map HK type to metric family using heuristics
 */
function mapTypeToFamily(type: string): "cardio" | "sleep" | "bp" | "activity" | "body_comp" | "resp" | "glucose" | "biomarker" | "other" {
  const lower = type.toLowerCase();
  
  // Cardio
  if (lower.includes("heart") || lower.includes("hrv") || lower.includes("pulse")) {
    return "cardio";
  }
  
  // Sleep
  if (lower.includes("sleep")) {
    return "sleep";
  }
  
  // Blood pressure
  if (lower.includes("blood_pressure") || lower.includes("bloodpressure")) {
    return "bp";
  }
  
  // Activity
  if (lower.includes("step") || lower.includes("distance") || lower.includes("energy") || 
      lower.includes("active") || lower.includes("exercise") || lower.includes("flight")) {
    return "activity";
  }
  
  // Body composition
  if (lower.includes("weight") || lower.includes("mass") || lower.includes("fat") || 
      lower.includes("bmi") || lower.includes("height")) {
    return "body_comp";
  }
  
  // Respiratory
  if (lower.includes("oxygen") || lower.includes("respiratory") || lower.includes("breathing")) {
    return "resp";
  }
  
  // Glucose
  if (lower.includes("glucose") || lower.includes("sugar")) {
    return "glucose";
  }
  
  // Biomarker (lab results)
  if (lower.includes("cholesterol") || lower.includes("triglyceride") || lower.includes("hdl") || 
      lower.includes("ldl") || lower.includes("creatinine") || lower.includes("albumin")) {
    return "biomarker";
  }
  
  // Default
  return "other";
}
