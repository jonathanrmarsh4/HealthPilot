/**
 * Sleep Rule Pack
 */

import { SeriesPoint, readSeriesMultiDay } from "../readers";
import { MetricSpec } from "../registry";
import { zScoreLatest, getStats } from "../primitives";
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
  
  // Total sleep duration (in_bed or total sleep)
  if (metricId.includes("in_bed") || metricId === "sleep_score") {
    const totalMinutes = latest;
    const totalHours = totalMinutes / 60;
    
    if (totalHours < 6.5) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "insufficient_sleep"),
        title: "Insufficient Sleep Duration",
        body: `You slept ${totalHours.toFixed(1)} hours last night, which is below the recommended 7-9 hours. Prioritize sleep for optimal recovery and health.`,
        score: Math.min(0.9, (7 - totalHours) / 3),
        tags: ["sleep", "duration", "alert"],
        family: "sleep",
        metric: metricId,
        explain: `Total: ${totalHours.toFixed(1)}h (${totalMinutes.toFixed(0)} min)`,
        localDate: ctx.win.localDate
      });
    } else if (totalHours > 9.5) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "excessive_sleep"),
        title: "Unusually Long Sleep",
        body: `You slept ${totalHours.toFixed(1)} hours, which is longer than typical. This may indicate recovery need or other factors.`,
        score: 0.4,
        tags: ["sleep", "duration"],
        family: "sleep",
        metric: metricId,
        explain: `Total: ${totalHours.toFixed(1)}h`,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // REM sleep percentage
  if (metricId.includes("rem")) {
    const remMinutes = latest;
    // Assume typical 8h sleep = 480 min
    const remPercent = (remMinutes / 480) * 100;
    
    if (remPercent < 15) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "low_rem"),
        title: "Low REM Sleep",
        body: `REM sleep was ${remPercent.toFixed(1)}% of total sleep (${remMinutes.toFixed(0)} min), below the healthy 20-25% range. REM is crucial for memory and mood.`,
        score: 0.6,
        tags: ["sleep", "rem", "quality"],
        family: "sleep",
        metric: metricId,
        explain: `REM: ${remMinutes.toFixed(0)} min (${remPercent.toFixed(1)}%)`,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // Deep sleep percentage
  if (metricId.includes("deep")) {
    const deepMinutes = latest;
    const deepPercent = (deepMinutes / 480) * 100;
    
    if (deepPercent < 10) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "low_deep"),
        title: "Low Deep Sleep",
        body: `Deep sleep was ${deepPercent.toFixed(1)}% of total sleep (${deepMinutes.toFixed(0)} min), below the healthy 13-23% range. Deep sleep is essential for physical recovery.`,
        score: 0.6,
        tags: ["sleep", "deep", "quality"],
        family: "sleep",
        metric: metricId,
        explain: `Deep: ${deepMinutes.toFixed(0)} min (${deepPercent.toFixed(1)}%)`,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // Awake time
  if (metricId.includes("awake")) {
    const awakeMinutes = latest;
    
    if (awakeMinutes > 60) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "fragmented_sleep"),
        title: "Fragmented Sleep",
        body: `You were awake for ${awakeMinutes.toFixed(0)} minutes during the night. Frequent awakenings can reduce sleep quality and recovery.`,
        score: Math.min(0.7, awakeMinutes / 90),
        tags: ["sleep", "fragmentation", "quality"],
        family: "sleep",
        metric: metricId,
        explain: `Awake: ${awakeMinutes.toFixed(0)} min`,
        localDate: ctx.win.localDate
      });
    }
  }
  
  // Sleep score
  if (metricId === "sleep_score") {
    if (latest < 70) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "poor_sleep_score"),
        title: "Poor Sleep Quality",
        body: `Your sleep score was ${latest.toFixed(0)}/100, indicating suboptimal sleep quality. Focus on sleep hygiene and consistent bedtime.`,
        score: (100 - latest) / 100,
        tags: ["sleep", "quality", "score"],
        family: "sleep",
        metric: metricId,
        explain: `Score: ${latest.toFixed(0)}/100`,
        localDate: ctx.win.localDate
      });
    } else if (latest >= 85) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "excellent_sleep"),
        title: "Excellent Sleep Quality",
        body: `Your sleep score was ${latest.toFixed(0)}/100, indicating excellent sleep quality. Great job!`,
        score: 0.5,
        tags: ["sleep", "quality", "positive"],
        family: "sleep",
        metric: metricId,
        explain: `Score: ${latest.toFixed(0)}/100`,
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
