/**
 * Dynamic Insights Engine
 * Orchestrates discovery, analysis, scoring, and selection
 */

import { discoverMetrics } from "./discovery";
import { readSeries, perthLocalDay } from "./readers";
import { getRegistry, getFamilyWeight, MetricSpec } from "./registry";
import { config } from "./config";
import { ilog, ilogSection, ilogInsight } from "./debug";
import { db } from "../db";
import { dailyHealthInsights } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// Import all rule packs
import * as cardioRules from "./rules/cardio";
import * as bpRules from "./rules/bp";
import * as sleepRules from "./rules/sleep";
import * as activityRules from "./rules/activity";
import * as bodyCompRules from "./rules/body_comp";
import * as biomarkerRules from "./rules/biomarker";
import * as otherRules from "./rules/other";

export interface Insight {
  id: string;
  title: string;
  body: string;
  score: number;
  tags: string[];
  family: string;
  metric: string;
  explain: string;
  localDate: string;
}

const rulePacks = {
  cardio: cardioRules,
  bp: bpRules,
  sleep: sleepRules,
  activity: activityRules,
  body_comp: bodyCompRules,
  resp: otherRules,  // Use generic for respiratory until specialized pack created
  glucose: biomarkerRules,  // Glucose uses biomarker rules
  biomarker: biomarkerRules,
  other: otherRules
};

/**
 * Compute daily insights for a user
 */
export async function computeDailyInsights(
  userId: string,
  localDate: string,
  tz = "Australia/Perth"
): Promise<Insight[]> {
  ilogSection(`Computing Daily Insights for ${userId} on ${localDate}`);
  
  const win = perthLocalDay(localDate, tz);
  const registry = getRegistry();
  
  // 1. Discover all available metrics (pass timezone for proper UTC conversion)
  const { specs, counts } = await discoverMetrics(userId, localDate, tz);
  ilog(`Discovered ${specs.length} metric types with ${Object.keys(counts).length} data series`);
  
  if (specs.length === 0) {
    ilog("No metrics found - skipping insight generation");
    return [];
  }
  
  const allInsights: Insight[] = [];
  
  // 2. Process each metric
  for (const spec of specs) {
    try {
      // Read series data
      const series = await readSeries(userId, spec, win);
      
      if (series.length === 0) {
        ilog(`No data for ${spec.id} - skipping`);
        continue;
      }
      
      ilog(`Processing ${spec.id} (family: ${spec.family}, ${series.length} points)`);
      
      // 3. Run appropriate rule pack
      const pack = rulePacks[spec.family] || otherRules;
      const ctx = { userId, spec, win };
      
      const insights = await pack.generate(spec.id, series, ctx);
      
      if (insights.length > 0) {
        ilog(`Generated ${insights.length} insights for ${spec.id}`);
        insights.forEach(ins => ilogInsight(ins));
        allInsights.push(...insights);
      }
    } catch (error) {
      console.error(`Error processing metric ${spec.id}:`, error);
    }
  }
  
  ilog(`Total insights generated: ${allInsights.length}`);
  
  // 4. Score and weight insights
  const weighted = scoreInsights(allInsights);
  
  // 5. Select top-N insights
  const selected = selectTopInsights(weighted, config.maxPerDay, config.topKPerFamily);
  
  ilog(`Selected ${selected.length} top insights for display`);
  
  // 6. Persist to database
  await saveInsights(userId, localDate, selected);
  
  return selected;
}

/**
 * Apply family weights and severity scoring
 */
function scoreInsights(insights: Insight[]): Insight[] {
  return insights.map(insight => {
    const familyWeight = getFamilyWeight(insight.family as any);
    const weightedScore = insight.score * familyWeight;
    
    return {
      ...insight,
      score: Math.min(1.0, weightedScore)
    };
  });
}

/**
 * Select top insights with diversity constraints
 */
function selectTopInsights(
  insights: Insight[],
  maxTotal: number,
  maxPerFamily: number
): Insight[] {
  // Sort by score descending
  const sorted = [...insights].sort((a, b) => b.score - a.score);
  
  const selected: Insight[] = [];
  const familyCounts: Record<string, number> = {};
  
  for (const insight of sorted) {
    // Check if we've hit the total cap
    if (selected.length >= maxTotal) break;
    
    // Check if we've hit the per-family cap
    const familyCount = familyCounts[insight.family] || 0;
    if (familyCount >= maxPerFamily) continue;
    
    // Add this insight
    selected.push(insight);
    familyCounts[insight.family] = familyCount + 1;
  }
  
  return selected;
}

/**
 * Save insights to database
 */
async function saveInsights(
  userId: string,
  localDate: string,
  insights: Insight[]
): Promise<void> {
  if (insights.length === 0) {
    ilog("No insights to save");
    return;
  }
  
  // De-duplicate insights by metric (keep highest-scoring one per metric)
  // This prevents unique constraint violations on daily_health_insights_user_date_metric_active_idx
  const deduplicatedInsights = new Map<string, Insight>();
  for (const insight of insights) {
    const existing = deduplicatedInsights.get(insight.metric);
    if (!existing || insight.score > existing.score) {
      deduplicatedInsights.set(insight.metric, insight);
    }
  }
  const uniqueInsights = Array.from(deduplicatedInsights.values());
  
  ilog(`De-duplicated ${insights.length} insights to ${uniqueInsights.length} unique metrics`);
  
  // Delete existing insights for this date (recompute scenario)
  await db
    .delete(dailyHealthInsights)
    .where(
      and(
        eq(dailyHealthInsights.userId, userId),
        eq(dailyHealthInsights.date, new Date(localDate))
      )
    );
  
  // Insert new insights
  for (const insight of uniqueInsights) {
    await db.insert(dailyHealthInsights).values({
      id: insight.id,
      userId,
      date: new Date(localDate),
      generatedFor: new Date(localDate),
      title: insight.title,
      message: insight.body,
      metric: insight.metric,
      severity: mapScoreToSeverity(insight.score),
      confidence: insight.score,
      evidence: {
        family: insight.family,
        raw_score: insight.score,
        rule_id: insight.id
      },
      status: "active",
      score: insight.score,
      issuedBy: "dynamic-engine",
      recommendationId: null,
      acknowledgedAt: null,
      dismissedAt: null,
      createdAt: new Date()
    });
  }
  
  ilog(`Saved ${uniqueInsights.length} insights to database`);
}

/**
 * Map family to category enum
 */
function mapFamilyToCategory(family: string): "sleep" | "recovery" | "performance" | "health" {
  switch (family) {
    case "sleep":
      return "sleep";
    case "cardio":
    case "activity":
      return "performance";
    case "bp":
    case "biomarker":
    case "glucose":
      return "health";
    default:
      return "health";
  }
}

/**
 * Map score to severity
 */
function mapScoreToSeverity(score: number): "normal" | "notable" | "significant" | "critical" {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "significant";
  if (score >= 0.4) return "notable";
  return "normal";
}
