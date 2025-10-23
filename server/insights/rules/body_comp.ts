/**
 * Body Composition Rule Pack
 */

import { SeriesPoint, readSeriesMultiDay } from "../readers";
import { MetricSpec } from "../registry";
import { trendSlope, dayChange } from "../primitives";
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
  
  // Get 7-day trend
  const endDate = ctx.win.localDate;
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 7);
  const startDateStr = startDate.toISOString().split('T')[0];
  
  const trendSeries = await readSeriesMultiDay(
    ctx.userId,
    ctx.spec,
    startDateStr,
    endDate,
    ctx.win.tz
  );
  
  // Weight analysis
  if (metricId.includes("weight") && !metricId.includes("body")) {
    const trend = trendSlope(trendSeries, 7);
    
    // Significant weight loss
    if (trend.direction === "down" && trend.magnitude !== "weak" && Math.abs(trend.slope) > 0.2) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "weight_loss"),
        title: "Weight Loss Trend",
        body: `Your weight is trending down (${trend.slope.toFixed(2)} kg/day over 7 days). ${Math.abs(trend.slope * 7) > 1 ? "Rapid weight loss - ensure adequate nutrition." : "Steady progress!"}`,
        score: Math.abs(trend.slope * 7) > 1 ? 0.7 : 0.5,
        tags: ["weight", "trend", "body_comp"],
        family: "body_comp",
        metric: metricId,
        explain: trend.explain,
        localDate: ctx.win.localDate
      });
    }
    
    // Significant weight gain
    if (trend.direction === "up" && trend.magnitude !== "weak" && Math.abs(trend.slope) > 0.2) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "weight_gain"),
        title: "Weight Gain Trend",
        body: `Your weight is trending up (${trend.slope.toFixed(2)} kg/day over 7 days). Monitor if this aligns with your goals.`,
        score: 0.6,
        tags: ["weight", "trend", "body_comp"],
        family: "body_comp",
        metric: metricId,
        explain: trend.explain,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // Lean body mass
  if (metricId.includes("lean")) {
    if (series.length >= 2) {
      const change = dayChange(series);
      
      // Unusual daily fluctuation
      if (Math.abs(change.absoluteChange) > 0.5) {
        insights.push({
          id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "lean_mass_fluctuation"),
          title: "Lean Mass Fluctuation",
          body: `Lean body mass changed by ${change.absoluteChange.toFixed(1)} kg. Large daily changes may indicate measurement error or water retention.`,
          score: 0.5,
          tags: ["lean_mass", "measurement"],
          family: "body_comp",
          metric: metricId,
          explain: change.explain,
          localDate: ctx.win.localDate
        });
      }
    }
  }
  
  // Body fat percentage
  if (metricId.includes("fat_percentage") || metricId.includes("body_fat")) {
    const trend = trendSlope(trendSeries, 7);
    
    if (trend.direction === "down" && trend.magnitude !== "weak") {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "fat_loss"),
        title: "Body Fat Decreasing",
        body: `Body fat percentage is trending down over the past week. Consistent progress!`,
        score: 0.6,
        tags: ["body_fat", "trend", "positive"],
        family: "body_comp",
        metric: metricId,
        explain: trend.explain,
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
