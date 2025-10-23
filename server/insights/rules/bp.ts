/**
 * Blood Pressure Rule Pack
 */

import { SeriesPoint, readSeriesMultiDay } from "../readers";
import { MetricSpec } from "../registry";
import { thresholdCross, trendSlope } from "../primitives";
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
  
  // Systolic BP
  if (metricId.includes("systolic")) {
    // Stage 2 Hypertension (>=140)
    const threshold = thresholdCross(series, undefined, 140);
    if (threshold.crossed && threshold.direction === "above") {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "hypertension_stage2"),
        title: "High Blood Pressure - Stage 2",
        body: `Systolic pressure of ${latest.toFixed(0)} mmHg exceeds 140 mmHg (Stage 2 Hypertension). Consult your healthcare provider.`,
        score: 0.95,
        tags: ["bp", "hypertension", "critical"],
        family: "bp",
        metric: metricId,
        explain: threshold.explain,
        localDate: ctx.win.localDate
      });
    }
    // Stage 1 Hypertension (>=130)
    else if (latest >= 130) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "hypertension_stage1"),
        title: "Elevated Blood Pressure - Stage 1",
        body: `Systolic pressure of ${latest.toFixed(0)} mmHg is in the Stage 1 Hypertension range (130-139 mmHg). Consider lifestyle modifications and monitor regularly.`,
        score: 0.75,
        tags: ["bp", "hypertension", "alert"],
        family: "bp",
        metric: metricId,
        explain: `Systolic: ${latest.toFixed(0)} mmHg`,
        localDate: ctx.win.localDate
      });
    }
    // Elevated (120-129)
    else if (latest >= 120) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "elevated_bp"),
        title: "Elevated Blood Pressure",
        body: `Systolic pressure of ${latest.toFixed(0)} mmHg is elevated (120-129 mmHg). Focus on diet, exercise, and stress management.`,
        score: 0.5,
        tags: ["bp", "elevated"],
        family: "bp",
        metric: metricId,
        explain: `Systolic: ${latest.toFixed(0)} mmHg`,
        localDate: ctx.win.localDate
      });
    }
    
    // Check for rising trend
    if (series.length >= 3) {
      const trend = trendSlope(series, 7);
      if (trend.direction === "up" && trend.magnitude !== "weak") {
        insights.push({
          id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "rising_trend"),
          title: "Blood Pressure Trending Up",
          body: `Your systolic blood pressure has been trending upward (${trend.slope > 0 ? "+" : ""}${trend.slope.toFixed(1)} mmHg/day). Monitor closely and consider lifestyle interventions.`,
          score: 0.6,
          tags: ["bp", "trend", "alert"],
          family: "bp",
          metric: metricId,
          explain: trend.explain,
          localDate: ctx.win.localDate
        });
      }
    }
  }
  
  // Diastolic BP
  if (metricId.includes("diastolic")) {
    // Stage 2 Hypertension (>=90)
    const threshold = thresholdCross(series, undefined, 90);
    if (threshold.crossed && threshold.direction === "above") {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "hypertension_stage2"),
        title: "High Diastolic Pressure - Stage 2",
        body: `Diastolic pressure of ${latest.toFixed(0)} mmHg exceeds 90 mmHg (Stage 2 Hypertension). Consult your healthcare provider.`,
        score: 0.95,
        tags: ["bp", "hypertension", "critical"],
        family: "bp",
        metric: metricId,
        explain: threshold.explain,
        localDate: ctx.win.localDate
      });
    }
    // Stage 1 Hypertension (>=80)
    else if (latest >= 80) {
      insights.push({
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "hypertension_stage1"),
        title: "Elevated Diastolic Pressure - Stage 1",
        body: `Diastolic pressure of ${latest.toFixed(0)} mmHg is in the Stage 1 Hypertension range (80-89 mmHg). Consider lifestyle modifications.`,
        score: 0.75,
        tags: ["bp", "hypertension", "alert"],
        family: "bp",
        metric: metricId,
        explain: `Diastolic: ${latest.toFixed(0)} mmHg`,
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
