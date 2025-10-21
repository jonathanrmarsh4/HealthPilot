import { storage } from '../storage';

/**
 * Baseline Computation Service
 * 
 * Calculates 7/14/30-day rolling baselines from eligible health metrics and labs.
 * Only uses data marked as isBaselineEligible=true (verified devices, completed sessions, good quality).
 */

export interface BaselineWindow {
  days: 7 | 14 | 30;
  average: number | null;
  dataPoints: number;
  hasEnoughData: boolean; // True if meets minimum threshold for reliable baseline
}

export interface MetricBaseline {
  metricName: string;
  windows: {
    sevenDay: BaselineWindow;
    fourteenDay: BaselineWindow;
    thirtyDay: BaselineWindow;
  };
}

export interface LabBaseline {
  marker: string;
  windows: {
    sevenDay: BaselineWindow;
    fourteenDay: BaselineWindow;
    thirtyDay: BaselineWindow;
  };
}

// Minimum data points required for each window to be considered reliable
const MIN_DATA_POINTS = {
  7: 3,   // Need at least 3 days out of 7
  14: 5,  // Need at least 5 days out of 14
  30: 10, // Need at least 10 days out of 30
} as const;

/**
 * Calculate baseline for a specific metric over 7/14/30-day windows
 */
export async function calculateMetricBaseline(
  userId: string,
  metricName: string,
  asOfDate: Date = new Date()
): Promise<MetricBaseline> {
  const windows = {
    sevenDay: await computeWindow(userId, metricName, asOfDate, 7),
    fourteenDay: await computeWindow(userId, metricName, asOfDate, 14),
    thirtyDay: await computeWindow(userId, metricName, asOfDate, 30),
  };

  return {
    metricName,
    windows,
  };
}

/**
 * Calculate baseline for a specific lab marker over 7/14/30-day windows
 */
export async function calculateLabBaseline(
  userId: string,
  marker: string,
  asOfDate: Date = new Date()
): Promise<LabBaseline> {
  const windows = {
    sevenDay: await computeLabWindow(userId, marker, asOfDate, 7),
    fourteenDay: await computeLabWindow(userId, marker, asOfDate, 14),
    thirtyDay: await computeLabWindow(userId, marker, asOfDate, 30),
  };

  return {
    marker,
    windows,
  };
}

/**
 * Compute baseline window for a metric
 */
async function computeWindow(
  userId: string,
  metricName: string,
  asOfDate: Date,
  days: 7 | 14 | 30
): Promise<BaselineWindow> {
  // End date is one day before asOfDate to exclude today (we want exactly N days of history)
  const endDate = new Date(asOfDate);
  endDate.setDate(endDate.getDate() - 1);
  
  // Start date is N days before the end date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1); // +1 to make it inclusive (e.g., 7 days including both endpoints)

  // Get only baseline-eligible metrics
  const eligibleMetrics = await storage.getEligibleDailyMetrics(
    userId,
    metricName,
    startDate,
    endDate
  );

  const dataPoints = eligibleMetrics.length;
  const hasEnoughData = dataPoints >= MIN_DATA_POINTS[days];

  let average: number | null = null;
  if (dataPoints > 0) {
    const sum = eligibleMetrics.reduce((acc, metric) => acc + metric.value, 0);
    average = sum / dataPoints;
  }

  return {
    days,
    average,
    dataPoints,
    hasEnoughData,
  };
}

/**
 * Compute baseline window for a lab marker
 */
async function computeLabWindow(
  userId: string,
  marker: string,
  asOfDate: Date,
  days: 7 | 14 | 30
): Promise<BaselineWindow> {
  // End date is one day before asOfDate to exclude today (we want exactly N days of history)
  const endDate = new Date(asOfDate);
  endDate.setDate(endDate.getDate() - 1);
  
  // Start date is N days before the end date
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - days + 1); // +1 to make it inclusive (e.g., 7 days including both endpoints)

  // Get only baseline-eligible labs
  const eligibleLabs = await storage.getEligibleLabs(
    userId,
    marker,
    startDate,
    endDate
  );

  const dataPoints = eligibleLabs.length;
  const hasEnoughData = dataPoints >= MIN_DATA_POINTS[days];

  let average: number | null = null;
  if (dataPoints > 0) {
    const sum = eligibleLabs.reduce((acc, lab) => acc + lab.value, 0);
    average = sum / dataPoints;
  }

  return {
    days,
    average,
    dataPoints,
    hasEnoughData,
  };
}

/**
 * Get the most reliable baseline window for a metric (prefers 30-day, falls back to 14, then 7)
 */
export function getMostReliableBaseline(baseline: MetricBaseline | LabBaseline): BaselineWindow | null {
  if (baseline.windows.thirtyDay.hasEnoughData) {
    return baseline.windows.thirtyDay;
  }
  if (baseline.windows.fourteenDay.hasEnoughData) {
    return baseline.windows.fourteenDay;
  }
  if (baseline.windows.sevenDay.hasEnoughData) {
    return baseline.windows.sevenDay;
  }
  return null; // No reliable baseline available
}
