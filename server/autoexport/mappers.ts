/**
 * HealthKit Event Mappers
 * 
 * Route normalized HealthKit events to curated tables
 * Each mapper handles one or more event types and writes to appropriate storage
 */

import type { IStorage } from '../storage';

export interface MapperContext {
  storage: IStorage;
  userId: string;
  alog: (message: string, ...args: any[]) => void;
}

export interface HKEvent {
  type: string;
  tsStart?: Date | null;
  tsEnd?: Date | null;
  tsInstant?: Date | null;
  unit?: string | null;
  valueJson: any;
}

/**
 * Blood Pressure Mapper
 * Handles: blood_pressure
 * Writes to: biomarkers (blood-pressure-systolic, blood-pressure-diastolic)
 */
export async function mapBloodPressure(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  let count = 0;
  
  alog(`🩺 Mapping Blood Pressure event`);
  
  // Support multiple field name variations
  const systolic = event.valueJson.systolic || event.valueJson.sys || event.valueJson.sbp;
  const diastolic = event.valueJson.diastolic || event.valueJson.dia || event.valueJson.dbp;
  
  if (systolic) {
    await storage.upsertBiomarker({
      userId,
      type: "blood-pressure-systolic",
      value: Number(systolic),
      unit: "mmHg",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    count++;
    alog(`  📈 Systolic: ${systolic} mmHg`);
  }
  
  if (diastolic) {
    await storage.upsertBiomarker({
      userId,
      type: "blood-pressure-diastolic",
      value: Number(diastolic),
      unit: "mmHg",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    count++;
    alog(`  📉 Diastolic: ${diastolic} mmHg`);
  }
  
  if (!systolic && !diastolic) {
    alog(`  ⚠️ BP event missing both systolic and diastolic values`);
  }
  
  return count;
}

/**
 * Heart Rate Mapper
 * Handles: heart_rate
 * Writes to: biomarkers (heart-rate)
 */
export async function mapHeartRate(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.bpm || event.valueJson.value || event.valueJson.qty || event.valueJson.Avg;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "heart-rate",
      value: Number(value),
      unit: "bpm",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  💓 Heart Rate: ${value} bpm`);
    return 1;
  }
  
  alog(`  ⚠️ Heart rate event missing value`);
  return 0;
}

/**
 * HRV Mapper
 * Handles: heart_rate_variability
 * Writes to: biomarkers (hrv)
 */
export async function mapHRV(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.ms || event.valueJson.value || event.valueJson.qty || event.valueJson.rmssd || event.valueJson.sdnn;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "hrv",
      value: Number(value),
      unit: "ms",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  📊 HRV: ${value} ms`);
    return 1;
  }
  
  alog(`  ⚠️ HRV event missing value`);
  return 0;
}

/**
 * Resting Heart Rate Mapper
 * Handles: resting_heart_rate
 * Writes to: biomarkers (heart-rate with resting flag)
 */
export async function mapRestingHeartRate(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.bpm || event.valueJson.value || event.valueJson.qty;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "heart-rate", // Store as regular heart-rate (can add source metadata if needed)
      value: Number(value),
      unit: "bpm",
      source: "health-auto-export-resting",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  💤 Resting HR: ${value} bpm`);
    return 1;
  }
  
  return 0;
}

/**
 * Steps Mapper
 * Handles: steps
 * Writes to: biomarkers (steps)
 */
export async function mapSteps(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.count || event.valueJson.value || event.valueJson.qty;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "steps",
      value: Number(value),
      unit: "steps",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  👣 Steps: ${value}`);
    return 1;
  }
  
  return 0;
}

/**
 * Active Energy Mapper
 * Handles: active_energy
 * Writes to: biomarkers (calories)
 */
export async function mapActiveEnergy(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  let value = event.valueJson.kcal || event.valueJson.value || event.valueJson.qty;
  
  // Convert kJ to kcal if needed
  if (event.unit?.toLowerCase() === 'kj') {
    value = value / 4.184;
  }
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "calories",
      value: Number(value),
      unit: "kcal",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  🔥 Active Energy: ${value} kcal`);
    return 1;
  }
  
  return 0;
}

/**
 * Weight Mapper
 * Handles: weight
 * Writes to: biomarkers (weight)
 * Note: Converts kg to lbs for storage
 */
export async function mapWeight(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  let value = event.valueJson.kg || event.valueJson.lbs || event.valueJson.value || event.valueJson.qty;
  let unit = event.unit?.toLowerCase() || '';
  
  // Convert to lbs if in kg
  if (unit === 'kg' || unit === 'kilogram' || event.valueJson.kg) {
    value = value * 2.20462;
    unit = 'lbs';
  }
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "weight",
      value: Number(value),
      unit: "lbs",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  ⚖️  Weight: ${value} lbs`);
    return 1;
  }
  
  return 0;
}

/**
 * Lean Body Mass Mapper
 * Handles: lean_body_mass
 * Writes to: biomarkers (lean-body-mass)
 * Note: Converts kg to lbs for storage
 */
export async function mapLeanBodyMass(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  let value = event.valueJson.kg || event.valueJson.lbs || event.valueJson.value || event.valueJson.qty;
  let unit = event.unit?.toLowerCase() || '';
  
  // Convert to lbs if in kg
  if (unit === 'kg' || unit === 'kilogram' || event.valueJson.kg) {
    value = value * 2.20462;
    unit = 'lbs';
  }
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "lean-body-mass",
      value: Number(value),
      unit: "lbs",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  💪 Lean Body Mass: ${value} lbs`);
    return 1;
  }
  
  return 0;
}

/**
 * Blood Glucose Mapper
 * Handles: blood_glucose
 * Writes to: biomarkers (blood-glucose)
 */
export async function mapBloodGlucose(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  let value = event.valueJson.mgdL || event.valueJson.value || event.valueJson.qty;
  let unit = event.unit?.toLowerCase() || '';
  
  // Convert mmol/L to mg/dL if needed
  if (unit === 'mmol/l' || unit === 'mmol') {
    value = value * 18.018;
    unit = 'mg/dL';
  }
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "blood-glucose",
      value: Number(value),
      unit: "mg/dL",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  🩸 Blood Glucose: ${value} mg/dL`);
    return 1;
  }
  
  return 0;
}

/**
 * Oxygen Saturation Mapper
 * Handles: oxygen_saturation
 * Writes to: biomarkers (oxygen-saturation)
 */
export async function mapOxygenSaturation(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.percent || event.valueJson.value || event.valueJson.qty;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "oxygen-saturation",
      value: Number(value),
      unit: "%",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  🫁 O2 Saturation: ${value}%`);
    return 1;
  }
  
  return 0;
}

/**
 * Body Temperature Mapper
 * Handles: body_temperature
 * Writes to: biomarkers (body-temperature)
 */
export async function mapBodyTemperature(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  let value = event.valueJson.fahrenheit || event.valueJson.celsius || event.valueJson.value || event.valueJson.qty;
  let unit = event.unit?.toLowerCase() || '';
  
  // Convert Celsius to Fahrenheit if needed
  if (unit === '°c' || unit === 'c' || unit === 'celsius' || event.valueJson.celsius) {
    value = (value * 9/5) + 32;
    unit = '°F';
  }
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "body-temperature",
      value: Number(value),
      unit: "°F",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  🌡️  Temperature: ${value}°F`);
    return 1;
  }
  
  return 0;
}

/**
 * Respiratory Rate Mapper
 * Handles: respiratory_rate
 * Writes to: biomarkers (respiratory-rate)
 */
export async function mapRespiratoryRate(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { storage, userId, alog } = ctx;
  
  const value = event.valueJson.bpm || event.valueJson.value || event.valueJson.qty;
  
  if (value) {
    await storage.upsertBiomarker({
      userId,
      type: "respiratory-rate",
      value: Number(value),
      unit: "breaths/min",
      source: "health-auto-export",
      recordedAt: event.tsInstant || new Date(),
    });
    alog(`  🫁 Respiratory Rate: ${value} breaths/min`);
    return 1;
  }
  
  return 0;
}

/**
 * Sleep Mapper
 * Handles: sleep, sleep_analysis
 * Note: Sleep is complex and handled separately in webhook handler
 * This is a placeholder for consistency
 */
export async function mapSleep(event: HKEvent, ctx: MapperContext): Promise<number> {
  const { alog } = ctx;
  alog(`  🛌 Sleep event detected - handled by specialized sleep processor`);
  return 0; // Actual sleep processing happens in webhook handler
}

/**
 * Mapper Registry
 * Maps mapper names to actual mapper functions
 */
export const MAPPER_FUNCTIONS: Record<string, (event: HKEvent, ctx: MapperContext) => Promise<number>> = {
  bp: mapBloodPressure,
  hr: mapHeartRate,
  hrv: mapHRV,
  rhr: mapRestingHeartRate,
  steps: mapSteps,
  energy_active: mapActiveEnergy,
  energy_basal: mapActiveEnergy, // Same handler
  energy_total: mapActiveEnergy, // Same handler
  weight: mapWeight,
  lean_mass: mapLeanBodyMass,
  blood_glucose: mapBloodGlucose,
  oxygen_saturation: mapOxygenSaturation,
  body_temperature: mapBodyTemperature,
  respiratory_rate: mapRespiratoryRate,
  sleep: mapSleep,
  // Add more mappers as needed
};

/**
 * Execute a mapper for an event
 */
export async function executeMapper(mapperName: string, event: HKEvent, ctx: MapperContext): Promise<number> {
  const mapper = MAPPER_FUNCTIONS[mapperName];
  
  if (!mapper) {
    ctx.alog(`  ⚠️ No mapper function found for: ${mapperName}`);
    return 0;
  }
  
  try {
    return await mapper(event, ctx);
  } catch (error: any) {
    ctx.alog(`  ❌ Mapper "${mapperName}" failed: ${error.message}`);
    // Don't throw - we already saved to RAW, just log the routing failure
    return 0;
  }
}
