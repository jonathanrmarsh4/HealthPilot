/**
 * Cardiovascular Rule Pack
 * Analyzes heart rate, HRV, resting heart rate
 */

import { SeriesPoint, readSeriesMultiDay } from "../readers";
import { MetricSpec } from "../registry";
import { zScoreLatest, trendSlope, thresholdCross } from "../primitives";
import { createHash } from "crypto";

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

interface Context {
  userId: string;
  spec: MetricSpec;
  win: any;
}

export async function generate(
  metricId: string,
  series: SeriesPoint[],
  ctx: Context
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  if (series.length === 0) return insights;
  
  // Get 14-day baseline for comparison
  const endDate = ctx.win.localDate;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 14);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const baselineSeries = await readSeriesMultiDay(
    ctx.userId,
    ctx.spec,
    startDateStr,
    endDate,
    ctx.win.tz
  );
  
  // Heart Rate Variability (HRV) analysis
  if (metricId.toLowerCase().includes("hrv") || metricId.toLowerCase().includes("heart_rate_variability")) {
    const z = zScoreLatest(baselineSeries);
    
    // Low HRV indicates poor recovery
    if (z.z < -1.0) {
      insights.push({
        id: hashInsight(ctx.userId, endDate, metricId, "low_hrv"),
        title: "HRV Below Baseline",
        body: `Your heart rate variability is ${Math.abs(z.z).toFixed(1)} standard deviations below your 14-day average (${z.latestValue.toFixed(0)}ms vs ${z.baselineMean.toFixed(0)}ms). This may indicate insufficient recovery or elevated stress.`,
        score: Math.min(1.0, Math.abs(z.z) / 3), // 0-1 scale
        tags: ["hrv", "recovery", "stress", "alert"],
        family: "cardio",
        metric: metricId,
        explain: z.explain,
        localDate: endDate
      });
    }
    
    // High HRV indicates good recovery
    if (z.z > 1.5) {
      insights.push({
        id: hashInsight(ctx.userId, endDate, metricId, "high_hrv"),
        title: "Excellent Recovery",
        body: `Your HRV is ${z.z.toFixed(1)} standard deviations above baseline (${z.latestValue.toFixed(0)}ms). Your body is well-recovered and ready for intense training.`,
        score: 0.6,
        tags: ["hrv", "recovery", "positive"],
        family: "cardio",
        metric: metricId,
        explain: z.explain,
        localDate: endDate
      });
    }
  }
  
  // Resting Heart Rate analysis
  if (metricId.toLowerCase().includes("resting") && metricId.toLowerCase().includes("heart")) {
    const z = zScoreLatest(baselineSeries);
    const trend = trendSlope(baselineSeries.slice(-7), 7);
    
    // Elevated RHR
    if (z.z > 1.0) {
      insights.push({
        id: hashInsight(ctx.userId, endDate, metricId, "elevated_rhr"),
        title: "Elevated Resting Heart Rate",
        body: `Your resting heart rate is ${z.z.toFixed(1)}σ above baseline (${z.latestValue.toFixed(0)} vs ${z.baselineMean.toFixed(0)} bpm). This may indicate fatigue, stress, illness, or overtraining.`,
        score: Math.min(1.0, z.z / 2.5),
        tags: ["rhr", "fatigue", "stress", "alert"],
        family: "cardio",
        metric: metricId,
        explain: z.explain,
        localDate: endDate
      });
    }
    
    // Declining RHR trend (positive)
    if (trend.direction === "down" && trend.magnitude !== "weak") {
      insights.push({
        id: hashInsight(ctx.userId, endDate, metricId, "improving_rhr"),
        title: "Improving Cardiovascular Fitness",
        body: `Your resting heart rate is trending down (${trend.slope.toFixed(1)} bpm/day over 7 days), suggesting improved cardiovascular fitness.`,
        score: 0.5,
        tags: ["rhr", "fitness", "trend", "positive"],
        family: "cardio",
        metric: metricId,
        explain: trend.explain,
        localDate: endDate
      });
    }
  }
  
  // General Heart Rate threshold checks
  if (metricId === "heart_rate" && !metricId.includes("resting")) {
    const latest = series[series.length - 1].v;
    
    // Very high heart rate
    if (latest > 120) {
      insights.push({
        id: hashInsight(ctx.userId, endDate, metricId, "high_hr"),
        title: "Elevated Heart Rate Detected",
        body: `Heart rate of ${latest.toFixed(0)} bpm detected. If at rest, this may indicate stress, anxiety, or other issues.`,
        score: 0.7,
        tags: ["heart_rate", "elevated", "alert"],
        family: "cardio",
        metric: metricId,
        explain: `Latest: ${latest.toFixed(0)} bpm`,
        localDate: endDate
      });
    }
  }
  
  return insights;
}

function hashInsight(userId: string, date: string, metric: string, rule: string): string {
  return createHash("sha256")
    .update(`${userId}|${date}|${metric}|${rule}`)
    .digest("hex")
    .substring(0, 16);
}
