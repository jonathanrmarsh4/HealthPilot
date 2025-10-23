/**
 * Biomarker Rule Pack
 * Comprehensive reference ranges for 50+ lab biomarkers
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

interface BiomarkerRange {
  low?: number;
  high?: number;
  optimal?: { low: number; high: number };
  unit: string;
  name: string;
}

// Comprehensive biomarker reference ranges
const BIOMARKER_RANGES: Record<string, BiomarkerRange> = {
  // Lipid panel
  "total-cholesterol": { high: 200, optimal: { low: 125, high: 200 }, unit: "mg/dL", name: "Total Cholesterol" },
  "ldl-cholesterol": { high: 100, optimal: { low: 0, high: 100 }, unit: "mg/dL", name: "LDL Cholesterol" },
  "hdl-cholesterol": { low: 40, optimal: { low: 60, high: 100 }, unit: "mg/dL", name: "HDL Cholesterol" },
  "triglycerides": { high: 150, optimal: { low: 0, high: 150 }, unit: "mg/dL", name: "Triglycerides" },
  "non-hdl-cholesterol": { high: 130, unit: "mg/dL", name: "Non-HDL Cholesterol" },
  
  // Liver function
  "alt": { high: 40, unit: "U/L", name: "ALT" },
  "ast": { high: 40, unit: "U/L", name: "AST" },
  "alkaline-phosphatase": { low: 30, high: 120, unit: "U/L", name: "Alkaline Phosphatase" },
  "gamma-gt": { high: 60, unit: "U/L", name: "Gamma-GT" },
  "total-bilirubin": { high: 1.2, unit: "mg/dL", name: "Total Bilirubin" },
  "albumin": { low: 3.5, high: 5.5, unit: "g/dL", name: "Albumin" },
  
  // Kidney function
  "creatinine": { low: 0.7, high: 1.3, unit: "mg/dL", name: "Creatinine" },
  "egfr": { low: 60, unit: "mL/min/1.73m²", name: "eGFR" },
  "bun": { low: 7, high: 20, unit: "mg/dL", name: "BUN" },
  
  // Blood counts
  "wbc": { low: 4.5, high: 11.0, unit: "x10⁹/L", name: "White Blood Cells" },
  "rbc": { low: 4.5, high: 5.9, unit: "x10¹²/L", name: "Red Blood Cells" },
  "haemoglobin": { low: 13.5, high: 17.5, unit: "g/dL", name: "Hemoglobin" },
  "hct": { low: 40, high: 52, unit: "%", name: "Hematocrit" },
  "platelets": { low: 150, high: 400, unit: "x10⁹/L", name: "Platelets" },
  "neutrophils": { low: 40, high: 70, unit: "%", name: "Neutrophils" },
  "lymphocytes": { low: 20, high: 40, unit: "%", name: "Lymphocytes" },
  "monocytes": { low: 2, high: 8, unit: "%", name: "Monocytes" },
  "eosinophils": { high: 5, unit: "%", name: "Eosinophils" },
  
  // Thyroid
  "tsh": { low: 0.4, high: 4.0, unit: "mIU/L", name: "TSH" },
  "t3": { low: 80, high: 200, unit: "ng/dL", name: "T3" },
  "t4": { low: 4.5, high: 12.0, unit: "μg/dL", name: "T4" },
  "free-t3": { low: 2.3, high: 4.2, unit: "pg/mL", name: "Free T3" },
  "free-t4": { low: 0.8, high: 1.8, unit: "ng/dL", name: "Free T4" },
  
  // Hormones
  "testosterone": { low: 300, high: 1000, unit: "ng/dL", name: "Testosterone" },
  "estradiol": { low: 10, high: 40, unit: "pg/mL", name: "Estradiol" },
  "cortisol": { low: 6, high: 23, unit: "μg/dL", name: "Cortisol" },
  "dhea-sulphate": { low: 80, high: 560, unit: "μg/dL", name: "DHEA-S" },
  "shbg": { low: 10, high: 57, unit: "nmol/L", name: "SHBG" },
  
  // Vitamins & minerals
  "vitamin-d": { low: 30, optimal: { low: 40, high: 60 }, unit: "ng/mL", name: "Vitamin D" },
  "vitamin-b12": { low: 200, unit: "pg/mL", name: "Vitamin B12" },
  "folate": { low: 3, unit: "ng/mL", name: "Folate" },
  "iron": { low: 60, high: 170, unit: "μg/dL", name: "Iron" },
  "ferritin": { low: 30, high: 200, unit: "ng/mL", name: "Ferritin" },
  "magnesium": { low: 1.7, high: 2.2, unit: "mg/dL", name: "Magnesium" },
  "calcium": { low: 8.5, high: 10.5, unit: "mg/dL", name: "Calcium" },
  "phosphate": { low: 2.5, high: 4.5, unit: "mg/dL", name: "Phosphate" },
  
  // Inflammation
  "crp": { high: 3.0, optimal: { low: 0, high: 1.0 }, unit: "mg/L", name: "C-Reactive Protein" },
  "hscrp": { high: 3.0, optimal: { low: 0, high: 1.0 }, unit: "mg/L", name: "hs-CRP" },
  "esr": { high: 20, unit: "mm/hr", name: "ESR" },
  
  // Metabolic
  "glucose": { low: 70, high: 100, unit: "mg/dL", name: "Glucose" },
  "hba1c": { high: 5.7, optimal: { low: 4.0, high: 5.6 }, unit: "%", name: "HbA1c" },
  "insulin": { high: 25, unit: "μIU/mL", name: "Insulin" },
  "uric-acid": { high: 7.0, unit: "mg/dL", name: "Uric Acid" }
};

export async function generate(
  metricId: string,
  series: SeriesPoint[],
  ctx: Context
): Promise<Insight[]> {
  const insights: Insight[] = [];
  
  if (series.length === 0) return insights;
  
  const latest = series[series.length - 1].v;
  const range = BIOMARKER_RANGES[metricId];
  
  // Unknown biomarker - use generic trend analysis
  if (!range) {
    const trend = await analyzeTrend(metricId, series, ctx);
    if (trend) insights.push(trend);
    return insights;
  }
  
  // Range-based analysis
  const rangeInsight = analyzeRange(metricId, latest, range, ctx);
  if (rangeInsight) insights.push(rangeInsight);
  
  // Trend analysis (90 days)
  if (series.length >= 2) {
    const trendInsight = await analyzeBiomarkerTrend(metricId, series, range, ctx);
    if (trendInsight) insights.push(trendInsight);
  }
  
  return insights;
}

function analyzeRange(
  metricId: string,
  value: number,
  range: BiomarkerRange,
  ctx: Context
): Insight | null {
  // Check if out of range
  if (range.high !== undefined && value > range.high) {
    const severity = value > range.high * 1.2 ? "critical" : "significant";
    return {
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "high"),
      title: `Elevated ${range.name}`,
      body: `Your ${range.name} is ${value.toFixed(1)} ${range.unit}, above the reference range (>${range.high} ${range.unit}). ${getSuggestion(metricId, "high")}`,
      score: severity === "critical" ? 0.9 : 0.7,
      tags: ["biomarker", "elevated", severity],
      family: "biomarker",
      metric: metricId,
      explain: `${value.toFixed(1)} > ${range.high} ${range.unit}`,
      localDate: ctx.win.localDate
    };
  }
  
  if (range.low !== undefined && value < range.low) {
    const severity = value < range.low * 0.8 ? "critical" : "significant";
    return {
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "low"),
      title: `Low ${range.name}`,
      body: `Your ${range.name} is ${value.toFixed(1)} ${range.unit}, below the reference range (<${range.low} ${range.unit}). ${getSuggestion(metricId, "low")}`,
      score: severity === "critical" ? 0.9 : 0.7,
      tags: ["biomarker", "low", severity],
      family: "biomarker",
      metric: metricId,
      explain: `${value.toFixed(1)} < ${range.low} ${range.unit}`,
      localDate: ctx.win.localDate
    };
  }
  
  // Check optimal range
  if (range.optimal) {
    if (value < range.optimal.low || value > range.optimal.high) {
      return {
        id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "suboptimal"),
        title: `${range.name} Sub-optimal`,
        body: `${range.name} is ${value.toFixed(1)} ${range.unit}, outside the optimal range (${range.optimal.low}-${range.optimal.high} ${range.unit}) but within reference range.`,
        score: 0.4,
        tags: ["biomarker", "suboptimal"],
        family: "biomarker",
        metric: metricId,
        explain: `${value.toFixed(1)} ${range.unit} (suboptimal)`,
        localDate: ctx.win.localDate
      };
    }
  }
  
  return null;
}

async function analyzeBiomarkerTrend(
  metricId: string,
  series: SeriesPoint[],
  range: BiomarkerRange,
  ctx: Context
): Promise<Insight | null> {
  if (series.length < 2) return null;
  
  const trend = trendSlope(series, 90);
  
  if (trend.magnitude === "weak") return null;
  
  const latest = series[series.length - 1].v;
  const isHigh = range.high && latest > range.high * 0.9;
  const isLow = range.low && latest < range.low * 1.1;
  
  // Worsening trend (moving toward out-of-range)
  if ((trend.direction === "up" && isHigh) || (trend.direction === "down" && isLow)) {
    return {
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "worsening_trend"),
      title: `${range.name} Trending ${trend.direction === "up" ? "Up" : "Down"}`,
      body: `${range.name} has been trending ${trend.direction} over recent measurements. Monitor closely and consider lifestyle interventions.`,
      score: 0.6,
      tags: ["biomarker", "trend", "alert"],
      family: "biomarker",
      metric: metricId,
      explain: trend.explain,
      localDate: ctx.win.localDate
    };
  }
  
  // Improving trend
  if ((trend.direction === "down" && isHigh) || (trend.direction === "up" && isLow)) {
    return {
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "improving_trend"),
      title: `${range.name} Improving`,
      body: `Great progress! ${range.name} is trending in a positive direction. Keep up your healthy habits.`,
      score: 0.5,
      tags: ["biomarker", "trend", "positive"],
      family: "biomarker",
      metric: metricId,
      explain: trend.explain,
      localDate: ctx.win.localDate
    };
  }
  
  return null;
}

async function analyzeTrend(
  metricId: string,
  series: SeriesPoint[],
  ctx: Context
): Promise<Insight | null> {
  if (series.length < 3) return null;
  
  const trend = trendSlope(series, 30);
  
  if (trend.magnitude === "strong") {
    return {
      id: hashInsight(ctx.userId, ctx.win.localDate, metricId, "unknown_trend"),
      title: `${formatMetricName(metricId)} Trending ${trend.direction === "up" ? "Up" : "Down"}`,
      body: `This biomarker shows a ${trend.magnitude} ${trend.direction}ward trend. Review with your healthcare provider.`,
      score: 0.5,
      tags: ["biomarker", "trend", "unknown"],
      family: "biomarker",
      metric: metricId,
      explain: trend.explain,
      localDate: ctx.win.localDate
    };
  }
  
  return null;
}

function getSuggestion(metricId: string, direction: "high" | "low"): string {
  const suggestions: Record<string, Record<string, string>> = {
    "ldl-cholesterol": { high: "Consider dietary changes, exercise, and consult your doctor." },
    "hdl-cholesterol": { low: "Increase healthy fats, exercise, and avoid smoking." },
    "triglycerides": { high: "Reduce sugar and refined carbs. Increase omega-3 intake." },
    "glucose": { high: "Monitor carb intake and consider testing for diabetes." },
    "vitamin-d": { low: "Increase sun exposure or consider supplementation." },
    "crp": { high: "Elevated inflammation. Review diet, exercise, and stress levels." }
  };
  
  return suggestions[metricId]?.[direction] || "Consult your healthcare provider.";
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
