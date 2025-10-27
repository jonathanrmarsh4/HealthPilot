/**
 * Canonical Goal Types - Seed Dataset
 * These are the 6 core goal types that all natural language goals map to.
 * Each type has default metrics, milestones, and recommended data sources.
 */

export interface CanonicalGoalMetric {
  metric_key: string;
  label: string;
  unit: string;
  direction: 'increase' | 'decrease' | 'maintain' | 'achieve';
  priority?: number; // 1=primary, 2=secondary, 3=tertiary
}

export interface CanonicalGoalType {
  type: string;
  display_name: string;
  description: string;
  default_metrics: CanonicalGoalMetric[];
  default_milestones: string[];
  recommended_sources: string[];
  icon?: string; // Lucide icon name
}

export const CANONICAL_GOAL_TYPES: CanonicalGoalType[] = [
  {
    type: 'endurance_event',
    display_name: 'Endurance Event (Marathon, Triathlon, etc.)',
    description: 'Training for a specific endurance event like a marathon, half-marathon, triathlon, or long-distance cycling event',
    icon: 'Trophy',
    default_metrics: [
      { metric_key: 'vo2max', label: 'VO2 Max', unit: 'ml/kg/min', direction: 'increase', priority: 1 },
      { metric_key: 'weekly_distance_km', label: 'Weekly Distance', unit: 'km', direction: 'increase', priority: 1 },
      { metric_key: 'long_run_distance_km', label: 'Long Run Distance', unit: 'km', direction: 'increase', priority: 2 },
      { metric_key: 'resting_hr', label: 'Resting Heart Rate', unit: 'bpm', direction: 'decrease', priority: 2 },
      { metric_key: 'hrv', label: 'Heart Rate Variability', unit: 'ms', direction: 'increase', priority: 3 },
    ],
    default_milestones: [
      'Long run reaches 75% of race distance',
      'VO2max improves by 10%',
      'Consistent training for 8+ weeks',
      'Complete race simulation workout',
      'Taper period begins',
    ],
    recommended_sources: ['healthkit', 'oura', 'whoop', 'garmin', 'polar'],
  },
  {
    type: 'body_comp',
    display_name: 'Body Composition / Weight Goal',
    description: 'Goals related to changing body weight, body fat percentage, or building lean mass',
    icon: 'Scale',
    default_metrics: [
      { metric_key: 'body_weight', label: 'Body Weight', unit: 'kg', direction: 'achieve', priority: 1 },
      { metric_key: 'body_fat_pct', label: 'Body Fat %', unit: '%', direction: 'decrease', priority: 1 },
      { metric_key: 'lean_mass', label: 'Lean Mass', unit: 'kg', direction: 'increase', priority: 2 },
      { metric_key: 'waist_circumference', label: 'Waist Circumference', unit: 'cm', direction: 'decrease', priority: 3 },
    ],
    default_milestones: [
      'Achieve 25% of weight goal',
      'Achieve 50% of weight goal',
      'Achieve 75% of weight goal',
      'Maintain target weight for 2 weeks',
      'Maintain target weight for 4 weeks',
      'Complete body scan reassessment',
    ],
    recommended_sources: ['manual', 'smart_scale', 'healthkit'],
  },
  {
    type: 'strength',
    display_name: 'Strength & Performance Goal',
    description: 'Building strength, increasing one-rep max lifts, or improving performance in specific exercises',
    icon: 'Dumbbell',
    default_metrics: [
      { metric_key: 'one_rm_squat', label: '1RM Squat', unit: 'kg', direction: 'increase', priority: 1 },
      { metric_key: 'one_rm_deadlift', label: '1RM Deadlift', unit: 'kg', direction: 'increase', priority: 1 },
      { metric_key: 'one_rm_bench', label: '1RM Bench Press', unit: 'kg', direction: 'increase', priority: 1 },
      { metric_key: 'total_volume', label: 'Weekly Training Volume', unit: 'kg', direction: 'increase', priority: 2 },
      { metric_key: 'session_rpe', label: 'Session RPE', unit: '1-10', direction: 'maintain', priority: 3 },
    ],
    default_milestones: [
      'Complete 4-week strength foundation block',
      'Complete 8-week progressive overload cycle',
      'Add +10% to 1RM in key lifts',
      'Achieve strength balance (reduce left/right asymmetry)',
      'Complete deload week',
      'Test new 1RM maxes',
    ],
    recommended_sources: ['manual', 'fitness_tracker', 'healthkit'],
  },
  {
    type: 'habit',
    display_name: 'Lifestyle or Habit Goal',
    description: 'Building consistency with daily habits like meditation, hydration, sleep hygiene, or activity streaks',
    icon: 'CheckCircle',
    default_metrics: [
      { metric_key: 'habit_completion_rate', label: 'Completion Rate', unit: '%', direction: 'increase', priority: 1 },
      { metric_key: 'streak_days', label: 'Current Streak', unit: 'days', direction: 'increase', priority: 1 },
      { metric_key: 'weekly_adherence', label: 'Weekly Adherence', unit: '%', direction: 'maintain', priority: 2 },
    ],
    default_milestones: [
      'Achieve 7-day streak',
      'Achieve 14-day streak',
      'Achieve 30-day streak',
      'Achieve 60-day streak',
      'Reach 90% habit adherence over 30 days',
      'Reach 90% habit adherence over 60 days',
    ],
    recommended_sources: ['manual', 'in_app_tracking', 'healthkit'],
  },
  {
    type: 'health_marker',
    display_name: 'Biomarker Improvement Goal',
    description: 'Improving specific health biomarkers like cholesterol, blood pressure, glucose, resting heart rate, HRV, or other lab values',
    icon: 'Activity',
    default_metrics: [
      { metric_key: 'resting_hr', label: 'Resting Heart Rate', unit: 'bpm', direction: 'decrease', priority: 1 },
      { metric_key: 'hrv', label: 'Heart Rate Variability', unit: 'ms', direction: 'increase', priority: 2 },
      { metric_key: 'ldl_cholesterol', label: 'LDL Cholesterol', unit: 'mmol/L', direction: 'decrease', priority: 1 },
      { metric_key: 'hdl_cholesterol', label: 'HDL Cholesterol', unit: 'mmol/L', direction: 'increase', priority: 2 },
      { metric_key: 'fasting_glucose', label: 'Fasting Glucose', unit: 'mmol/L', direction: 'decrease', priority: 1 },
      { metric_key: 'blood_pressure_sys', label: 'Systolic BP', unit: 'mmHg', direction: 'decrease', priority: 1 },
      { metric_key: 'blood_pressure_dia', label: 'Diastolic BP', unit: 'mmHg', direction: 'decrease', priority: 2 },
    ],
    default_milestones: [
      'Initial baseline values recorded',
      'First follow-up shows improvement',
      'Target value achieved',
      'Stable results for 1 month',
      'Stable results for 3 months',
      'Physician confirmation of improvement',
    ],
    recommended_sources: ['healthkit', 'lab_upload', 'manual', 'connected_bp_monitor', 'continuous_glucose_monitor', 'oura', 'whoop'],
  },
  {
    type: 'hybrid',
    display_name: 'Hybrid or Multi-domain Goal',
    description: 'Complex goals that span multiple categories (e.g., "Get ready for a triathlon while losing weight")',
    icon: 'Target',
    default_metrics: [
      { metric_key: 'custom_metric_1', label: 'Primary Metric', unit: 'varies', direction: 'achieve', priority: 1 },
      { metric_key: 'custom_metric_2', label: 'Secondary Metric', unit: 'varies', direction: 'achieve', priority: 2 },
    ],
    default_milestones: [
      'Phase 1: Foundation established',
      'Phase 2: Progressive overload/adaptation',
      'Phase 3: Peak performance/maintenance',
      'Cross-domain balance confirmed',
    ],
    recommended_sources: ['healthkit', 'manual', 'multiple'],
  },
];

/**
 * Get a canonical goal type by its type string
 */
export function getCanonicalGoalType(type: string): CanonicalGoalType | undefined {
  return CANONICAL_GOAL_TYPES.find(t => t.type === type);
}

/**
 * Get all canonical goal types
 */
export function getAllCanonicalGoalTypes(): CanonicalGoalType[] {
  return CANONICAL_GOAL_TYPES;
}

/**
 * Determine if a goal type is valid
 */
export function isValidGoalType(type: string): boolean {
  return CANONICAL_GOAL_TYPES.some(t => t.type === type);
}
