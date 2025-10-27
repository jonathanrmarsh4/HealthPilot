/**
 * Metric Mapper - Select appropriate metrics based on goal type and available data sources
 * Prioritizes metrics that are already being tracked (HealthKit, Oura, etc.)
 * over manual-only metrics for better user experience.
 */

import { getCanonicalGoalType, CanonicalGoalMetric } from './seed-data';
import type { InsertGoalMetric } from '@shared/schema';

export interface AvailableDataSources {
  healthkit: string[]; // Array of metric keys available from HealthKit
  oura: string[]; // Array of metric keys available from Oura
  whoop: string[]; // Array of metric keys available from Whoop
  manual: string[]; // Metrics the user has manually tracked
}

export interface MetricSuggestion {
  metric: InsertGoalMetric;
  is_tracked: boolean; // Whether this metric is currently being tracked
  source_available: boolean; // Whether a data source for this metric exists
  recommended_priority: number; // 1=must have, 2=should have, 3=nice to have
}

/**
 * Map canonical goal type to specific metrics based on available data sources
 */
export async function mapMetricsForGoal(
  goalType: string,
  goalEntities: Record<string, any>,
  userId: string,
  availableSources?: AvailableDataSources
): Promise<MetricSuggestion[]> {
  const canonicalType = getCanonicalGoalType(goalType);
  if (!canonicalType) {
    throw new Error(`Invalid goal type: ${goalType}`);
  }

  // Get baseline metrics from seed data
  const baselineMetrics = canonicalType.default_metrics;

  // Enhance metrics with availability information
  const suggestions: MetricSuggestion[] = baselineMetrics.map(metric => {
    const isTracked = isMetricTracked(metric.metric_key, availableSources);
    const sourceAvailable = isDataSourceAvailable(metric.metric_key, availableSources);

    return {
      metric: {
        goalId: '', // Will be set when goal is created
        metricKey: metric.metric_key,
        label: metric.label,
        unit: metric.unit,
        direction: metric.direction,
        source: determineSource(metric.metric_key, availableSources),
        priority: metric.priority || 1,
        targetValue: null, // Will be calculated by plan generator
        baselineValue: null, // Will be fetched from recent data
        currentValue: null,
        confidence: sourceAvailable ? 0.9 : 0.5,
      },
      is_tracked: isTracked,
      source_available: sourceAvailable,
      recommended_priority: metric.priority || 1,
    };
  });

  // Sort by priority: tracked metrics first, then by recommended_priority
  suggestions.sort((a, b) => {
    if (a.is_tracked !== b.is_tracked) {
      return a.is_tracked ? -1 : 1; // Tracked metrics first
    }
    return a.recommended_priority - b.recommended_priority;
  });

  // Add goal-specific custom metrics based on entities
  const customMetrics = await generateCustomMetrics(goalType, goalEntities, availableSources);
  suggestions.push(...customMetrics);

  return suggestions;
}

/**
 * Check if a metric is currently being tracked
 */
function isMetricTracked(metricKey: string, sources?: AvailableDataSources): boolean {
  if (!sources) return false;
  
  return (
    sources.healthkit.includes(metricKey) ||
    sources.oura.includes(metricKey) ||
    sources.whoop.includes(metricKey) ||
    sources.manual.includes(metricKey)
  );
}

/**
 * Check if a data source is available for this metric
 */
function isDataSourceAvailable(metricKey: string, sources?: AvailableDataSources): boolean {
  if (!sources) return false;
  
  // Map metric keys to their potential sources
  const healthkitMetrics = ['vo2max', 'resting_hr', 'hrv', 'body_weight', 'weekly_distance_km', 'long_run_distance_km'];
  const ouraMetrics = ['hrv', 'resting_hr', 'sleep_score', 'readiness_score'];
  const whoopMetrics = ['hrv', 'resting_hr', 'strain', 'recovery'];
  
  return (
    (healthkitMetrics.includes(metricKey) && sources.healthkit.length > 0) ||
    (ouraMetrics.includes(metricKey) && sources.oura.length > 0) ||
    (whoopMetrics.includes(metricKey) && sources.whoop.length > 0)
  );
}

/**
 * Determine the best source for a metric
 */
function determineSource(metricKey: string, sources?: AvailableDataSources): string {
  if (!sources) return 'manual';
  
  // Priority: HealthKit > Oura > Whoop > Manual
  if (sources.healthkit.includes(metricKey)) return 'healthkit';
  if (sources.oura.includes(metricKey)) return 'oura';
  if (sources.whoop.includes(metricKey)) return 'whoop';
  if (sources.manual.includes(metricKey)) return 'manual';
  
  // Check if source is available (even if not currently tracked)
  const healthkitMetrics = ['vo2max', 'resting_hr', 'hrv', 'body_weight', 'weekly_distance_km'];
  const ouraMetrics = ['hrv', 'resting_hr', 'sleep_score'];
  const whoopMetrics = ['hrv', 'strain', 'recovery'];
  
  if (healthkitMetrics.includes(metricKey) && sources.healthkit.length > 0) return 'healthkit';
  if (ouraMetrics.includes(metricKey) && sources.oura.length > 0) return 'oura';
  if (whoopMetrics.includes(metricKey) && sources.whoop.length > 0) return 'whoop';
  
  return 'manual';
}

/**
 * Generate custom metrics based on goal entities
 * For example, if goal is "Run NYC Marathon under 4 hours", add target_pace metric
 */
async function generateCustomMetrics(
  goalType: string,
  entities: Record<string, any>,
  sources?: AvailableDataSources
): Promise<MetricSuggestion[]> {
  const customMetrics: MetricSuggestion[] = [];

  // Endurance event: Add pace/speed metrics if target time is specified
  if (goalType === 'endurance_event' && entities.target_time_hms && entities.distance_km) {
    customMetrics.push({
      metric: {
        goalId: '',
        metricKey: 'target_pace',
        label: 'Target Pace',
        unit: 'min/km',
        direction: 'decrease',
        source: 'calculated',
        priority: 1,
        targetValue: calculatePace(entities.target_time_hms, entities.distance_km),
        baselineValue: null,
        currentValue: null,
        confidence: 0.95,
      },
      is_tracked: false,
      source_available: true,
      recommended_priority: 1,
    });
  }

  // Body comp: Add BMI if height is available
  if (goalType === 'body_comp' && entities.target_weight_kg) {
    customMetrics.push({
      metric: {
        goalId: '',
        metricKey: 'bmi',
        label: 'BMI',
        unit: 'kg/m²',
        direction: 'achieve',
        source: 'calculated',
        priority: 3,
        targetValue: null, // Will be calculated with height
        baselineValue: null,
        currentValue: null,
        confidence: 0.8,
      },
      is_tracked: false,
      source_available: true,
      recommended_priority: 3,
    });
  }

  return customMetrics;
}

/**
 * Calculate target pace from time and distance
 * @param timeHMS - Time in HH:MM:SS format
 * @param distanceKm - Distance in kilometers
 * @returns Pace in min/km as string
 */
function calculatePace(timeHMS: string, distanceKm: number): string {
  try {
    const parts = timeHMS.split(':');
    const hours = parseInt(parts[0] || '0');
    const minutes = parseInt(parts[1] || '0');
    const seconds = parseInt(parts[2] || '0');
    
    const totalMinutes = hours * 60 + minutes + seconds / 60;
    const paceMinPerKm = totalMinutes / distanceKm;
    
    const paceMin = Math.floor(paceMinPerKm);
    const paceSec = Math.round((paceMinPerKm - paceMin) * 60);
    
    return `${paceMin}:${paceSec.toString().padStart(2, '0')}`;
  } catch {
    return '0:00';
  }
}

/**
 * Fetch current/baseline values for metrics from user's data
 */
export async function fetchMetricBaselines(
  userId: string,
  metricKeys: string[],
  storage: any // IStorage instance
): Promise<Record<string, { baseline: string | null; current: string | null }>> {
  const baselines: Record<string, { baseline: string | null; current: string | null }> = {};

  for (const metricKey of metricKeys) {
    try {
      // This would query the user's recent data for each metric
      // For now, return nulls - will be implemented in storage layer
      baselines[metricKey] = {
        baseline: null,
        current: null,
      };
    } catch (error) {
      console.error(`Error fetching baseline for ${metricKey}:`, error);
      baselines[metricKey] = { baseline: null, current: null };
    }
  }

  return baselines;
}

/**
 * Get mock available sources for testing
 * In production, this would check user's connected integrations
 */
export function getMockAvailableSources(): AvailableDataSources {
  return {
    healthkit: ['vo2max', 'resting_hr', 'hrv', 'body_weight', 'weekly_distance_km'],
    oura: [],
    whoop: [],
    manual: ['body_fat_pct', 'waist_circumference'],
  };
}
