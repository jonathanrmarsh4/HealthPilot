/**
 * Metric Registry for Dynamic Insights Discovery
 * Defines all known metrics and their families
 */

export type MetricId = string;
export type FamilyId = "cardio" | "sleep" | "bp" | "activity" | "body_comp" | "resp" | "glucose" | "biomarker" | "other";

export interface MetricSpec {
  id: MetricId;
  family: FamilyId;
  unit?: string;
  kind: "instant" | "interval" | "value";
  source: "curated" | "raw";
  mapper?: string;  // Query hint (table/column)
  preferredAgg?: "mean" | "min" | "max" | "sum" | "last";
}

export interface FamilySpec {
  title: string;
  weight: number;  // Importance multiplier for scoring
}

export interface Registry {
  metrics: Record<MetricId, MetricSpec>;
  families: Record<FamilyId, FamilySpec>;
}

// Initialize registry with known curated metrics
const baseRegistry: Registry = {
  families: {
    cardio: { title: "Cardiovascular", weight: 1.2 },
    sleep: { title: "Sleep & Recovery", weight: 1.1 },
    bp: { title: "Blood Pressure", weight: 1.3 },
    activity: { title: "Activity & Movement", weight: 0.9 },
    body_comp: { title: "Body Composition", weight: 1.0 },
    resp: { title: "Respiratory", weight: 1.1 },
    glucose: { title: "Blood Glucose", weight: 1.2 },
    biomarker: { title: "Lab Biomarkers", weight: 1.0 },
    other: { title: "Other Metrics", weight: 0.7 }
  },
  metrics: {
    // Cardio metrics
    "heart_rate": { id: "heart_rate", family: "cardio", unit: "bpm", kind: "instant", source: "raw", mapper: "hk_heart_rate", preferredAgg: "mean" },
    "resting_heart_rate": { id: "resting_heart_rate", family: "cardio", unit: "bpm", kind: "value", source: "raw", mapper: "hk_resting_heart_rate", preferredAgg: "mean" },
    "hrv": { id: "hrv", family: "cardio", unit: "ms", kind: "value", source: "raw", mapper: "hk_hrv", preferredAgg: "mean" },
    "heart_rate_variability_sdnn": { id: "heart_rate_variability_sdnn", family: "cardio", unit: "ms", kind: "value", source: "raw", mapper: "hk_hrv", preferredAgg: "mean" },
    
    // Sleep metrics
    "sleep_asleep_core": { id: "sleep_asleep_core", family: "sleep", unit: "min", kind: "interval", source: "curated", mapper: "sleep_sessions", preferredAgg: "sum" },
    "sleep_asleep_deep": { id: "sleep_asleep_deep", family: "sleep", unit: "min", kind: "interval", source: "curated", mapper: "sleep_sessions", preferredAgg: "sum" },
    "sleep_asleep_rem": { id: "sleep_asleep_rem", family: "sleep", unit: "min", kind: "interval", source: "curated", mapper: "sleep_sessions", preferredAgg: "sum" },
    "sleep_awake": { id: "sleep_awake", family: "sleep", unit: "min", kind: "interval", source: "curated", mapper: "sleep_sessions", preferredAgg: "sum" },
    "sleep_in_bed": { id: "sleep_in_bed", family: "sleep", unit: "min", kind: "interval", source: "curated", mapper: "sleep_sessions", preferredAgg: "sum" },
    "sleep_score": { id: "sleep_score", family: "sleep", unit: "score", kind: "value", source: "curated", mapper: "sleep_sessions", preferredAgg: "last" },
    
    // Activity metrics
    "steps": { id: "steps", family: "activity", unit: "count", kind: "value", source: "raw", mapper: "hk_steps", preferredAgg: "sum" },
    "active_energy": { id: "active_energy", family: "activity", unit: "kcal", kind: "value", source: "raw", mapper: "hk_active_energy", preferredAgg: "sum" },
    "distance_walking_running": { id: "distance_walking_running", family: "activity", unit: "km", kind: "value", source: "raw", mapper: "hk_distance", preferredAgg: "sum" },
    "flights_climbed": { id: "flights_climbed", family: "activity", unit: "count", kind: "value", source: "raw", mapper: "hk_flights", preferredAgg: "sum" },
    
    // Body composition
    "weight": { id: "weight", family: "body_comp", unit: "kg", kind: "value", source: "raw", mapper: "hk_weight", preferredAgg: "last" },
    "lean_body_mass": { id: "lean_body_mass", family: "body_comp", unit: "kg", kind: "value", source: "raw", mapper: "hk_lean_mass", preferredAgg: "last" },
    "body_fat_percentage": { id: "body_fat_percentage", family: "body_comp", unit: "%", kind: "value", source: "raw", mapper: "hk_body_fat", preferredAgg: "last" },
    "bmi": { id: "bmi", family: "body_comp", unit: "kg/m²", kind: "value", source: "raw", mapper: "hk_bmi", preferredAgg: "last" },
    
    // Blood pressure
    "blood_pressure_systolic": { id: "blood_pressure_systolic", family: "bp", unit: "mmHg", kind: "value", source: "curated", mapper: "biomarkers", preferredAgg: "mean" },
    "blood_pressure_diastolic": { id: "blood_pressure_diastolic", family: "bp", unit: "mmHg", kind: "value", source: "curated", mapper: "biomarkers", preferredAgg: "mean" },
    
    // Respiratory
    "respiratory_rate": { id: "respiratory_rate", family: "resp", unit: "br/min", kind: "value", source: "raw", mapper: "hk_resp_rate", preferredAgg: "mean" },
    "oxygen_saturation": { id: "oxygen_saturation", family: "resp", unit: "%", kind: "value", source: "raw", mapper: "hk_spo2", preferredAgg: "mean" },
    
    // Glucose
    "blood_glucose": { id: "blood_glucose", family: "glucose", unit: "mg/dL", kind: "value", source: "curated", mapper: "biomarkers", preferredAgg: "mean" }
  }
};

let registry: Registry = JSON.parse(JSON.stringify(baseRegistry));

/**
 * Reset registry to base state
 */
export function resetRegistry() {
  registry = JSON.parse(JSON.stringify(baseRegistry));
}

/**
 * Get current registry
 */
export function getRegistry(): Registry {
  return registry;
}

/**
 * Register a new metric dynamically
 */
export function registerMetric(spec: MetricSpec) {
  if (!registry.metrics[spec.id]) {
    registry.metrics[spec.id] = spec;
  }
}

/**
 * Get metric spec by ID
 */
export function getMetric(id: MetricId): MetricSpec | undefined {
  return registry.metrics[id];
}

/**
 * Get all metrics in a family
 */
export function getMetricsByFamily(family: FamilyId): MetricSpec[] {
  return Object.values(registry.metrics).filter(m => m.family === family);
}

/**
 * Get family weight for scoring
 */
export function getFamilyWeight(family: FamilyId): number {
  return registry.families[family]?.weight || 1.0;
}
