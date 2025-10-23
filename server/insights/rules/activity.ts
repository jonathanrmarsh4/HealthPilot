/**
 * Activity Rule Pack
 */

import { SeriesPoint, readSeriesMultiDay } from "../readers";
import { MetricSpec } from "../registry";
import { zScoreLatest, trendSlope } from "../primitives";
import { createHash } from "crypto";
import { Insight } from "./cardio";

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
  
  const latest = series[series.length - 1].v;
  
  // Get baseline
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
  
  // Steps analysis
  if (metricId.includes("step")) {
    const z = zScoreLatest(baselineSeries);
    
    // Significantly below baseline
    if (z.z < -1.0) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "low_steps"),
        title: "Below Average Activity",
        body: `Your steps today (${latest.toFixed(0)}) are ${Math.abs(z.z).toFixed(1)}σ below your 14-day average (${z.baselineMean.toFixed(0)}). Consider adding a walk or light activity.`,
        score: Math.min(0.7, Math.abs(z.z) / 2),
        tags: ["steps", "activity", "low"],
        family: "activity",
        metric: metricId,
        explain: z.explain,
        localDate: ctx.win.localDate
      });
    }
    
    // Significantly above baseline
    if (z.z > 1.5) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "high_steps"),
        title: "Exceptional Activity Day",
        body: `Great job! You logged ${latest.toFixed(0)} steps today, ${z.z.toFixed(1)}σ above your average. Keep up the momentum!`,
        score: 0.5,
        tags: ["steps", "activity", "positive"],
        family: "activity",
        metric: metricId,
        explain: z.explain,
        localDate: ctx.win.localDate
      });
    }
    
    // Check for declining trend
    const trend = trendSlope(baselineSeries.slice(-7), 7);
    if (trend.direction === "down" && trend.magnitude !== "weak") {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "declining_trend"),
        title: "Activity Trending Down",
        body: `Your daily steps have been declining over the past week (${trend.slope.toFixed(0)} steps/day). Consider setting a daily step goal.`,
        score: 0.6,
        tags: ["steps", "activity", "trend"],
        family: "activity",
        metric: metricId,
        explain: trend.explain,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // Active energy analysis
  if (metricId.includes("active_energy")) {
    const z = zScoreLatest(baselineSeries);
    
    if (z.z < -1.0) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "low_energy"),
        title: "Low Energy Expenditure",
        body: `Active energy burn (${latest.toFixed(0)} kcal) is ${Math.abs(z.z).toFixed(1)}σ below your average. Increase activity intensity or duration.`,
        score: 0.6,
        tags: ["energy", "activity", "low"],
        family: "activity",
        metric: metricId,
        explain: z.explain,
        localDate: ctx.win.localDate
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
