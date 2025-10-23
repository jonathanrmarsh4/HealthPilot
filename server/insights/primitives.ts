/**
 * Generic Analysis Primitives
 * Statistical analysis functions that work on any metric series
 */

import { SeriesPoint } from "./readers";

export interface RollingMeanResult {
  value: number;
  count: number;
  explain: string;
}

export interface ZScoreResult {
  z: number;
  baselineMean: number;
  baselineStd: number;
  latestValue: number;
  explain: string;
}

export interface TrendResult {
  slope: number;          // Units per day
  direction: "up" | "down" | "stable";
  magnitude: "strong" | "moderate" | "weak";
  r2: number;            // Goodness of fit
  explain: string;
}

export interface ThresholdResult {
  crossed: boolean;
  direction: "above" | "below" | "within";
  value: number;
  threshold: number | null;
  explain: string;
}

export interface DayChangeResult {
  absoluteChange: number;
  percentChange: number;
  direction: "up" | "down" | "stable";
  explain: string;
}

/**
 * Calculate rolling mean over N days
 */
export function rollingMean(series: SeriesPoint[], windowDays = 7): RollingMeanResult {
  if (series.length === 0) {
    return { value: 0, count: 0, explain: "No data available" };
  }
  
  const sum = series.reduce((acc, p) => acc + p.v, 0);
  const mean = sum / series.length;
  
  return {
    value: mean,
    count: series.length,
    explain: `${windowDays}d mean: ${mean.toFixed(2)} (n=${series.length})`
  };
}

/**
 * Calculate z-score of latest value vs baseline
 */
export function zScoreLatest(series: SeriesPoint[], baselineWindowDays = 14): ZScoreResult {
  if (series.length < 2) {
    return {
      z: 0,
      baselineMean: 0,
      baselineStd: 0,
      latestValue: 0,
      explain: "Insufficient data for z-score"
    };
  }
  
  // Use all except latest for baseline
  const baseline = series.slice(0, -1);
  const latest = series[series.length - 1];
  
  const mean = baseline.reduce((acc, p) => acc + p.v, 0) / baseline.length;
  
  const variance = baseline.reduce((acc, p) => acc + Math.pow(p.v - mean, 2), 0) / baseline.length;
  const std = Math.sqrt(variance);
  
  const z = std > 0 ? (latest.v - mean) / std : 0;
  
  let magnitude = "normal";
  if (Math.abs(z) > 2) magnitude = "extreme";
  else if (Math.abs(z) > 1) magnitude = "notable";
  
  return {
    z,
    baselineMean: mean,
    baselineStd: std,
    latestValue: latest.v,
    explain: `z=${z.toFixed(2)} (${magnitude}), baseline μ=${mean.toFixed(2)} σ=${std.toFixed(2)}`
  };
}

/**
 * Calculate trend slope using simple linear regression
 */
export function trendSlope(series: SeriesPoint[], days = 7): TrendResult {
  if (series.length < 3) {
    return {
      slope: 0,
      direction: "stable",
      magnitude: "weak",
      r2: 0,
      explain: "Insufficient data for trend"
    };
  }
  
  // Convert timestamps to day indices
  const baseTime = new Date(series[0].t).getTime();
  const points = series.map(p => ({
    x: (new Date(p.t).getTime() - baseTime) / (24 * 60 * 60 * 1000), // Days since first point
    y: p.v
  }));
  
  // Linear regression
  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumX2 = points.reduce((acc, p) => acc + p.x * p.x, 0);
  const sumY2 = points.reduce((acc, p) => acc + p.y * p.y, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  
  // Calculate R²
  const meanY = sumY / n;
  const ssTotal = points.reduce((acc, p) => acc + Math.pow(p.y - meanY, 2), 0);
  const ssResidual = points.reduce((acc, p) => {
    const predicted = slope * p.x + (sumY - slope * sumX) / n;
    return acc + Math.pow(p.y - predicted, 2);
  }, 0);
  const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
  
  // Classify direction and magnitude
  const absSlope = Math.abs(slope);
  const direction = slope > 0.1 ? "up" : slope < -0.1 ? "down" : "stable";
  
  let magnitude: "strong" | "moderate" | "weak" = "weak";
  if (absSlope > 1 && r2 > 0.6) magnitude = "strong";
  else if (absSlope > 0.5 && r2 > 0.4) magnitude = "moderate";
  
  return {
    slope,
    direction,
    magnitude,
    r2,
    explain: `slope=${slope.toFixed(3)}/day, ${direction} ${magnitude} (R²=${r2.toFixed(2)})`
  };
}

/**
 * Check if value crosses threshold
 */
export function thresholdCross(
  series: SeriesPoint[],
  low?: number,
  high?: number
): ThresholdResult {
  if (series.length === 0) {
    return {
      crossed: false,
      direction: "within",
      value: 0,
      threshold: null,
      explain: "No data"
    };
  }
  
  const latest = series[series.length - 1].v;
  
  if (high !== undefined && latest > high) {
    return {
      crossed: true,
      direction: "above",
      value: latest,
      threshold: high,
      explain: `${latest.toFixed(1)} > ${high} (high threshold)`
    };
  }
  
  if (low !== undefined && latest < low) {
    return {
      crossed: true,
      direction: "below",
      value: latest,
      threshold: low,
      explain: `${latest.toFixed(1)} < ${low} (low threshold)`
    };
  }
  
  return {
    crossed: false,
    direction: "within",
    value: latest,
    threshold: null,
    explain: `${latest.toFixed(1)} within range`
  };
}

/**
 * Calculate day-over-day change
 */
export function dayChange(series: SeriesPoint[]): DayChangeResult {
  if (series.length < 2) {
    return {
      absoluteChange: 0,
      percentChange: 0,
      direction: "stable",
      explain: "Insufficient data"
    };
  }
  
  const prev = series[series.length - 2].v;
  const curr = series[series.length - 1].v;
  
  const absoluteChange = curr - prev;
  const percentChange = prev !== 0 ? (absoluteChange / prev) * 100 : 0;
  
  const direction = absoluteChange > 0 ? "up" : absoluteChange < 0 ? "down" : "stable";
  
  return {
    absoluteChange,
    percentChange,
    direction,
    explain: `${absoluteChange > 0 ? "+" : ""}${absoluteChange.toFixed(1)} (${percentChange > 0 ? "+" : ""}${percentChange.toFixed(1)}%)`
  };
}

/**
 * Get descriptive statistics summary
 */
export interface StatsSummary {
  min: number;
  max: number;
  mean: number;
  median: number;
  std: number;
  count: number;
}

export function getStats(series: SeriesPoint[]): StatsSummary {
  if (series.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, std: 0, count: 0 };
  }
  
  const values = series.map(p => p.v).sort((a, b) => a - b);
  const count = values.length;
  const sum = values.reduce((acc, v) => acc + v, 0);
  const mean = sum / count;
  
  const median = count % 2 === 0
    ? (values[count / 2 - 1] + values[count / 2]) / 2
    : values[Math.floor(count / 2)];
  
  const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
  const std = Math.sqrt(variance);
  
  return {
    min: values[0],
    max: values[count - 1],
    mean,
    median,
    std,
    count
  };
}
