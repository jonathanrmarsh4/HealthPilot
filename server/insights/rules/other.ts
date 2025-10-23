/**
 * Other/Generic Rule Pack
 * For unknown or miscellaneous metrics - uses only primitives
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
  
  // Get baseline for z-score
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
  
  if (baselineSeries.length < 3) return insights;
  
  // Generic outlier detection
  const z = zScoreLatest(baselineSeries);
  
  if (Math.abs(z.z) > 2.0) {
    insights.push({
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "outlier"),
      title: `${formatMetricName(metricId)} Outlier Detected`,
      body: `This metric is ${Math.abs(z.z).toFixed(1)} standard deviations ${z.z > 0 ? "above" : "below"} your 14-day average (${z.latestValue.toFixed(1)} vs ${z.baselineMean.toFixed(1)}).`,
      score: Math.min(0.7, Math.abs(z.z) / 4),
      tags: ["exploratory", "outlier"],
      family: "other",
      metric: metricId,
      explain: z.explain,
      localDate: ctx.win.localDate
    });
  }
  
  // Generic trend detection
  if (baselineSeries.length >= 5) {
    const trend = trendSlope(baselineSeries.slice(-7), 7);
    
    if (trend.magnitude === "strong") {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "trend"),
        title: `${formatMetricName(metricId)} Trending ${trend.direction === "up" ? "Up" : "Down"}`,
        body: `Strong ${trend.direction === "up" ? "upward" : "downward"} trend detected over the past week (slope: ${trend.slope.toFixed(2)}/day).`,
        score: 0.5,
        tags: ["exploratory", "trend"],
        family: "other",
        metric: metricId,
        explain: trend.explain,
        localDate: ctx.win.localDate
      });
    }
  }
  
  return insights;
}

function formatMetricName(metricId: string): string {
  return metricId
    .split(/[_-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function hashInsight(userId: string, date: string, metric: string, rule: string): string {
  return createHash("sha256")
    .update(`${userId}|${date}|${metric}|${rule}`)
    .digest("hex")
    .substring(0, 16);
}
