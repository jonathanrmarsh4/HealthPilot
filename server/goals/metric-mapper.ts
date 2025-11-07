/**
 * Metric Mapper - Select appropriate metrics based on goal type and available data sources
 * Prioritizes metrics that are already being tracked (HealthKit, Oura, etc.)
 * over manual-only metrics for better user experience.
 */

import { getCanonicalGoalType } from './seed-data';
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
  availableSources?: AvailableDataSources,
  storage?: any
): Promise<MetricSuggestion[]> {
  const canonicalType = getCanonicalGoalType(goalType);
  if (!canonicalType) {
    throw new Error(`Invalid goal type: ${goalType}`);
  }

  // Get baseline metrics from seed data
  const baselineMetrics = canonicalType.default_metrics;

  // Fetch current/baseline values if storage is provided
  const metricKeys = baselineMetrics.map(m => m.metric_key);
  let metricValues: Record<string, { baseline: number | null; current: number | null }> = {};
  
  if (storage) {
    metricValues = await fetchMetricBaselines(userId, metricKeys, storage);
  }

  // Enhance metrics with availability information and current values
  const suggestions: MetricSuggestion[] = baselineMetrics.map(metric => {
    const isTracked = isMetricTracked(metric.metric_key, availableSources);
    const sourceAvailable = isDataSourceAvailable(metric.metric_key, availableSources);
    const values = metricValues[metric.metric_key] || { baseline: null, current: null };

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
        baselineValue: values.baseline !== null ? values.baseline.toString() : null,
        currentValue: values.current !== null ? values.current.toString() : null,
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
  const healthkitMetrics = [
    'vo2max', 'resting_hr', 'hrv', 'body_weight', 
    'weekly_distance_km', 'long_run_distance_km',
    'running-distance', 'cycling-distance', 'swimming-distance', 'walking-distance'
  ];
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
  const healthkitMetrics = [
    'vo2max', 'resting_hr', 'hrv', 'body_weight', 'weekly_distance_km',
    'running-distance', 'cycling-distance', 'swimming-distance', 'walking-distance'
  ];
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
  _sources?: AvailableDataSources
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
 * Map metric keys to biomarker/healthkit types
 */
const METRIC_TO_DATA_TYPE_MAP: Record<string, string[]> = {
  'vo2max': ['vo2-max', 'cardio-fitness'],
  'resting_hr': ['resting-heart-rate', 'heart-rate'],
  'hrv': ['hrv', 'heart-rate-variability'],
  'body_weight': ['body-weight', 'weight'],
  'body_fat_pct': ['body-fat', 'body-fat-percentage'],
  'weekly_distance_km': ['weekly-distance', 'running-distance', 'distance'],
  'long_run_distance_km': ['long-run-distance', 'running-distance'],
  'running-distance': ['running-distance', 'distance'], // Workout-based
  'cycling-distance': ['cycling-distance', 'distance'], // Workout-based
  'swimming-distance': ['swimming-distance', 'distance'], // Workout-based
  'walking-distance': ['walking-distance', 'distance'], // Workout-based
  'sleep_score': ['sleep-score', 'sleep-quality'],
  'readiness_score': ['readiness-score', 'readiness'],
  'recovery': ['recovery', 'recovery-score'],
  'strain': ['strain', 'daily-strain'],
};

/**
 * Fetch current/baseline values for metrics from user's data
 */
export async function fetchMetricBaselines(
  userId: string,
  metricKeys: string[],
  storage: any // IStorage instance
): Promise<Record<string, { baseline: number | null; current: number | null }>> {
  const baselines: Record<string, { baseline: number | null; current: number | null }> = {};

  for (const metricKey of metricKeys) {
    try {
      // Check if this is a workout-based metric
      const workoutMetrics = ['running-distance', 'cycling-distance', 'swimming-distance', 'walking-distance'];
      
      if (workoutMetrics.includes(metricKey)) {
        // Extract workout type from metric key (e.g., 'running-distance' -> 'running')
        const workoutType = metricKey.replace('-distance', '');
        
        // Get latest workout distance
        const latestDistance = await storage.getWorkoutMetricValue(userId, workoutType, 'latest');
        
        baselines[metricKey] = {
          baseline: latestDistance,
          current: latestDistance,
        };
      } else {
        // Handle biomarker-based metrics
        const dataTypes = METRIC_TO_DATA_TYPE_MAP[metricKey] || [metricKey];
        
        // Query latest biomarker values for any matching type
        let latestValue: number | null = null;

        for (const dataType of dataTypes) {
          try {
            // Get the most recent value
            const recent = await storage.getLatestBiomarkerByType(userId, dataType);
            if (recent && recent.value !== null) {
              // Check if it's within the last 30 days
              const thirtyDaysAgo = new Date();
              thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
              
              if (recent.recordedAt >= thirtyDaysAgo) {
                latestValue = parseFloat(recent.value.toString());
                break; // Found recent data, no need to check other types
              }
            }
          } catch {
            // Continue to next data type
          }
        }
        
        baselines[metricKey] = {
          baseline: latestValue, // Use current as baseline for now
          current: latestValue,
        };
      }
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
