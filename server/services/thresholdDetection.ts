import { BaselineWindow, MetricBaseline, LabBaseline, getMostReliableBaseline } from './baselineComputation';
import { BIOMARKER_THRESHOLDS, getBiomarkerThreshold, getSupportedBiomarkers } from '../config/biomarkerThresholds';

/**
 * Threshold Detection Service
 * 
 * Detects notable deviations from personal baselines using metric-specific thresholds.
 * Implements safety-first logic with evidence-based deviation criteria.
 */

export interface DeviationResult {
  detected: boolean;
  direction: 'higher' | 'lower' | 'none';
  percentageDeviation: number; // Percentage from baseline (positive = higher, negative = lower)
  absoluteDeviation: number;
  currentValue: number;
  baselineValue: number | null;
  baselineWindow: 7 | 14 | 30 | null; // Which window was used
  threshold: MetricThreshold;
  severity: 'normal' | 'notable' | 'significant' | 'critical';
}

export interface MetricThreshold {
  metricName: string;
  minPercentageDeviation: number; // Minimum % change to be considered notable
  criticalPercentageDeviation: number; // Threshold for critical alerts
  direction: 'both' | 'increase' | 'decrease'; // Which direction matters
  unit: string;
  description: string;
}

/**
 * Metric-specific threshold configuration (aligned with clinical and performance guidelines)
 */
const METRIC_THRESHOLDS: Record<string, MetricThreshold> = {
  // Sleep Metrics
  'sleep_duration_hours': {
    metricName: 'sleep_duration_hours',
    minPercentageDeviation: 15, // 15% deviation from baseline (e.g., 7h → 6h or 8h)
    criticalPercentageDeviation: 30,
    direction: 'both',
    unit: 'hours',
    description: 'Total sleep duration',
  },
  'sleep_quality_score': {
    metricName: 'sleep_quality_score',
    minPercentageDeviation: 10,
    criticalPercentageDeviation: 25,
    direction: 'decrease', // Only care about drops in quality
    unit: '%',
    description: 'Sleep quality score',
  },
  'rem_sleep_minutes': {
    metricName: 'rem_sleep_minutes',
    minPercentageDeviation: 20,
    criticalPercentageDeviation: 40,
    direction: 'both',
    unit: 'minutes',
    description: 'REM sleep duration',
  },
  'deep_sleep_minutes': {
    metricName: 'deep_sleep_minutes',
    minPercentageDeviation: 20,
    criticalPercentageDeviation: 40,
    direction: 'both',
    unit: 'minutes',
    description: 'Deep sleep duration',
  },

  // HRV Metrics
  'hrv_rmssd': {
    metricName: 'hrv_rmssd',
    minPercentageDeviation: 15, // 15% deviation from baseline
    criticalPercentageDeviation: 30,
    direction: 'both',
    unit: 'ms',
    description: 'HRV RMSSD',
  },
  'hrv_sdnn': {
    metricName: 'hrv_sdnn',
    minPercentageDeviation: 15,
    criticalPercentageDeviation: 30,
    direction: 'both',
    unit: 'ms',
    description: 'HRV SDNN',
  },

  // Resting Heart Rate
  'resting_heart_rate_bpm': {
    metricName: 'resting_heart_rate_bpm',
    minPercentageDeviation: 10, // 10% deviation (e.g., 60 → 66 bpm)
    criticalPercentageDeviation: 20,
    direction: 'both',
    unit: 'bpm',
    description: 'Resting heart rate',
  },

  // Body Metrics
  'body_weight_kg': {
    metricName: 'body_weight_kg',
    minPercentageDeviation: 2, // 2% change (e.g., 70kg → 71.4kg)
    criticalPercentageDeviation: 5,
    direction: 'both',
    unit: 'kg',
    description: 'Body weight',
  },
  'body_fat_percentage': {
    metricName: 'body_fat_percentage',
    minPercentageDeviation: 5,
    criticalPercentageDeviation: 10,
    direction: 'both',
    unit: '%',
    description: 'Body fat percentage',
  },
  'lean_body_mass_kg': {
    metricName: 'lean_body_mass_kg',
    minPercentageDeviation: 2,
    criticalPercentageDeviation: 5,
    direction: 'both',
    unit: 'kg',
    description: 'Lean body mass',
  },

  // Activity Metrics
  'steps_count': {
    metricName: 'steps_count',
    minPercentageDeviation: 25, // 25% deviation
    criticalPercentageDeviation: 50,
    direction: 'decrease', // Only care about significant drops
    unit: 'steps',
    description: 'Daily step count',
  },
  'active_energy_kcal': {
    metricName: 'active_energy_kcal',
    minPercentageDeviation: 20,
    criticalPercentageDeviation: 40,
    direction: 'both',
    unit: 'kcal',
    description: 'Active energy expenditure',
  },

  // Training Load
  'training_load': {
    metricName: 'training_load',
    minPercentageDeviation: 20,
    criticalPercentageDeviation: 40,
    direction: 'increase', // Care about overtraining spikes
    unit: 'AU',
    description: 'Training load',
  },

  // Readiness
  'readiness_score': {
    metricName: 'readiness_score',
    minPercentageDeviation: 10,
    criticalPercentageDeviation: 20,
    direction: 'decrease', // Only drops matter
    unit: '%',
    description: 'Readiness score',
  },

  // Blood Pressure
  'systolic_bp_mmhg': {
    metricName: 'systolic_bp_mmhg',
    minPercentageDeviation: 10, // 10% deviation
    criticalPercentageDeviation: 20,
    direction: 'both',
    unit: 'mmHg',
    description: 'Systolic blood pressure',
  },
  'diastolic_bp_mmhg': {
    metricName: 'diastolic_bp_mmhg',
    minPercentageDeviation: 10,
    criticalPercentageDeviation: 20,
    direction: 'both',
    unit: 'mmHg',
    description: 'Diastolic blood pressure',
  },

  // Blood Oxygen
  'blood_oxygen_percent': {
    metricName: 'blood_oxygen_percent',
    minPercentageDeviation: 2, // Very small deviations matter
    criticalPercentageDeviation: 5,
    direction: 'decrease', // Only drops matter
    unit: '%',
    description: 'Blood oxygen saturation',
  },

  // Respiratory Rate
  'respiratory_rate_bpm': {
    metricName: 'respiratory_rate_bpm',
    minPercentageDeviation: 15,
    criticalPercentageDeviation: 30,
    direction: 'both',
    unit: 'breaths/min',
    description: 'Respiratory rate',
  },
};

/**
 * Convert biomarker threshold to metric threshold format
 */
function biomarkerToMetricThreshold(biomarkerType: string): MetricThreshold | undefined {
  const biomarkerThreshold = getBiomarkerThreshold(biomarkerType);
  if (!biomarkerThreshold) return undefined;
  
  return {
    metricName: biomarkerThreshold.type,
    minPercentageDeviation: biomarkerThreshold.minPercentageDeviation,
    criticalPercentageDeviation: biomarkerThreshold.criticalPercentageDeviation,
    direction: biomarkerThreshold.direction,
    unit: biomarkerThreshold.unit,
    description: biomarkerThreshold.description,
  };
}

/**
 * Detect deviation from baseline for a metric
 */
export function detectMetricDeviation(
  currentValue: number,
  baseline: MetricBaseline,
  metricName: string
): DeviationResult {
  const threshold = METRIC_THRESHOLDS[metricName];
  if (!threshold) {
    // Unknown metric - use conservative defaults
    return createUnknownMetricResult(currentValue, baseline, metricName);
  }

  const reliableBaseline = getMostReliableBaseline(baseline);
  if (!reliableBaseline || reliableBaseline.average === null) {
    // No baseline available
    return {
      detected: false,
      direction: 'none',
      percentageDeviation: 0,
      absoluteDeviation: 0,
      currentValue,
      baselineValue: null,
      baselineWindow: null,
      threshold,
      severity: 'normal',
    };
  }

  const baselineValue = reliableBaseline.average;
  const absoluteDeviation = currentValue - baselineValue;
  const percentageDeviation = (absoluteDeviation / baselineValue) * 100;

  // Determine direction and check threshold
  const direction = absoluteDeviation > 0 ? 'higher' : 'lower';
  const absPercentage = Math.abs(percentageDeviation);

  // Check if deviation is in a direction we care about
  let directionMatters = false;
  if (threshold.direction === 'both') {
    directionMatters = true;
  } else if (threshold.direction === 'increase' && direction === 'higher') {
    directionMatters = true;
  } else if (threshold.direction === 'decrease' && direction === 'lower') {
    directionMatters = true;
  }

  const detected = directionMatters && absPercentage >= threshold.minPercentageDeviation;

  // Determine severity
  let severity: DeviationResult['severity'] = 'normal';
  if (detected) {
    if (absPercentage >= threshold.criticalPercentageDeviation) {
      severity = 'critical';
    } else if (absPercentage >= threshold.minPercentageDeviation * 1.5) {
      severity = 'significant';
    } else {
      severity = 'notable';
    }
  }

  return {
    detected,
    direction: detected ? direction : 'none',
    percentageDeviation,
    absoluteDeviation,
    currentValue,
    baselineValue,
    baselineWindow: reliableBaseline.days,
    threshold,
    severity,
  };
}

/**
 * Detect deviation from baseline for a lab marker (biomarker)
 */
export function detectLabDeviation(
  currentValue: number,
  baseline: LabBaseline,
  marker: string
): DeviationResult {
  const threshold = biomarkerToMetricThreshold(marker);
  if (!threshold) {
    // Unknown biomarker - use conservative defaults
    return createUnknownLabResult(currentValue, baseline, marker);
  }

  const reliableBaseline = getMostReliableBaseline(baseline);
  if (!reliableBaseline || reliableBaseline.average === null) {
    return {
      detected: false,
      direction: 'none',
      percentageDeviation: 0,
      absoluteDeviation: 0,
      currentValue,
      baselineValue: null,
      baselineWindow: null,
      threshold,
      severity: 'normal',
    };
  }

  const baselineValue = reliableBaseline.average;
  const absoluteDeviation = currentValue - baselineValue;
  const percentageDeviation = (absoluteDeviation / baselineValue) * 100;

  const direction = absoluteDeviation > 0 ? 'higher' : 'lower';
  const absPercentage = Math.abs(percentageDeviation);

  let directionMatters = false;
  if (threshold.direction === 'both') {
    directionMatters = true;
  } else if (threshold.direction === 'increase' && direction === 'higher') {
    directionMatters = true;
  } else if (threshold.direction === 'decrease' && direction === 'lower') {
    directionMatters = true;
  }

  const detected = directionMatters && absPercentage >= threshold.minPercentageDeviation;

  let severity: DeviationResult['severity'] = 'normal';
  if (detected) {
    if (absPercentage >= threshold.criticalPercentageDeviation) {
      severity = 'critical';
    } else if (absPercentage >= threshold.minPercentageDeviation * 1.5) {
      severity = 'significant';
    } else {
      severity = 'notable';
    }
  }

  return {
    detected,
    direction: detected ? direction : 'none',
    percentageDeviation,
    absoluteDeviation,
    currentValue,
    baselineValue,
    baselineWindow: reliableBaseline.days,
    threshold,
    severity,
  };
}

/**
 * Create result for unknown metric
 */
function createUnknownMetricResult(
  currentValue: number,
  baseline: MetricBaseline,
  metricName: string
): DeviationResult {
  const reliableBaseline = getMostReliableBaseline(baseline);
  return {
    detected: false,
    direction: 'none',
    percentageDeviation: 0,
    absoluteDeviation: 0,
    currentValue,
    baselineValue: reliableBaseline?.average ?? null,
    baselineWindow: reliableBaseline?.days ?? null,
    threshold: {
      metricName,
      minPercentageDeviation: 20, // Conservative default
      criticalPercentageDeviation: 40,
      direction: 'both',
      unit: '',
      description: 'Unknown metric',
    },
    severity: 'normal',
  };
}

/**
 * Create result for unknown lab
 */
function createUnknownLabResult(
  currentValue: number,
  baseline: LabBaseline,
  marker: string
): DeviationResult {
  const reliableBaseline = getMostReliableBaseline(baseline);
  return {
    detected: false,
    direction: 'none',
    percentageDeviation: 0,
    absoluteDeviation: 0,
    currentValue,
    baselineValue: reliableBaseline?.average ?? null,
    baselineWindow: reliableBaseline?.days ?? null,
    threshold: {
      metricName: marker,
      minPercentageDeviation: 20,
      criticalPercentageDeviation: 40,
      direction: 'both',
      unit: '',
      description: 'Unknown lab marker',
    },
    severity: 'normal',
  };
}

/**
 * Get list of all supported metrics
 */
export function getSupportedMetrics(): string[] {
  return Object.keys(METRIC_THRESHOLDS);
}

/**
 * Get list of all supported lab markers (biomarkers)
 */
export function getSupportedLabMarkers(): string[] {
  return getSupportedBiomarkers();
}
