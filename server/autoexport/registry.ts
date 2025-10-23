/**
 * HealthKit Type Registry
 * 
 * Central configuration for all HealthKit metric types.
 * 
 * - supported: true → route to curated tables
 * - supported: false → RAW only (for future use)
 * - mapper: name of the mapper function to use
 * 
 * ALL types are stored in hk_events_raw regardless of supported status.
 */

export interface HKTypeConfig {
  supported: boolean;
  mapper?: string;
  description?: string;
}

export const HK_TYPE_REGISTRY: Record<string, HKTypeConfig> = {
  // Cardiovascular
  blood_pressure: { 
    supported: true, 
    mapper: "bp",
    description: "Blood pressure (systolic/diastolic) in mmHg"
  },
  heart_rate: { 
    supported: true, 
    mapper: "hr",
    description: "Heart rate in beats per minute"
  },
  heart_rate_variability: { 
    supported: true, 
    mapper: "hrv",
    description: "Heart rate variability (RMSSD/SDNN) in ms"
  },
  resting_heart_rate: { 
    supported: true, 
    mapper: "rhr",
    description: "Resting heart rate in bpm"
  },
  
  // Activity & Energy
  steps: { 
    supported: true, 
    mapper: "steps",
    description: "Step count"
  },
  active_energy: { 
    supported: true, 
    mapper: "energy_active",
    description: "Active energy burned in kcal"
  },
  basal_energy: { 
    supported: true, 
    mapper: "energy_basal",
    description: "Basal/resting energy in kcal"
  },
  total_energy: { 
    supported: true, 
    mapper: "energy_total",
    description: "Total energy expenditure in kcal"
  },
  
  // Body Measurements
  weight: { 
    supported: true, 
    mapper: "weight",
    description: "Body weight (kg/lbs)"
  },
  lean_body_mass: { 
    supported: true, 
    mapper: "lean_mass",
    description: "Lean body mass (kg/lbs)"
  },
  body_fat_percentage: {
    supported: true,
    mapper: "body_fat",
    description: "Body fat percentage"
  },
  height: {
    supported: true,
    mapper: "height",
    description: "Height in cm/inches"
  },
  
  // Sleep
  sleep: { 
    supported: true, 
    mapper: "sleep",
    description: "Sleep session data"
  },
  sleep_analysis: { 
    supported: true, 
    mapper: "sleep",
    description: "Detailed sleep stage analysis"
  },
  
  // Metabolic
  blood_glucose: {
    supported: true,
    mapper: "blood_glucose",
    description: "Blood glucose in mg/dL or mmol/L"
  },
  oxygen_saturation: {
    supported: true,
    mapper: "oxygen_saturation",
    description: "Blood oxygen saturation %"
  },
  
  // Respiratory
  respiratory_rate: {
    supported: true,
    mapper: "respiratory_rate",
    description: "Breaths per minute"
  },
  
  // Temperature
  body_temperature: {
    supported: true,
    mapper: "body_temperature",
    description: "Body temperature (°F/°C)"
  },
  
  // Nutrition
  dietary_energy: {
    supported: false, // RAW only for now
    description: "Calories consumed"
  },
  dietary_protein: {
    supported: false,
    description: "Protein intake in grams"
  },
  dietary_carbs: {
    supported: false,
    description: "Carbohydrate intake in grams"
  },
  dietary_fat: {
    supported: false,
    description: "Fat intake in grams"
  },
  
  // Reproductive Health
  menstruation: {
    supported: false, // Future feature
    description: "Menstrual cycle tracking"
  },
  
  // Advanced Metrics (Future)
  vo2_max: {
    supported: false,
    description: "VO2 max estimate"
  },
  walking_heart_rate_average: {
    supported: false,
    description: "Average heart rate while walking"
  },
  // Add more types as needed - they'll all go to RAW even if not supported
} as const;

/**
 * Feature flags for temporarily disabling type routing
 * Types are still captured in RAW, just not routed to curated tables
 */
export function isTypeRoutingEnabled(type: string): boolean {
  // Check environment-based blocklist
  const blocklist = (process.env.AE_INGEST_BLOCKLIST || "").split(',').map(t => t.trim()).filter(Boolean);
  if (blocklist.includes(type)) {
    return false;
  }
  
  // Check environment-based allowlist (if set, only these types are routed)
  const allowlist = (process.env.AE_INGEST_ALLOWLIST || "").split(',').map(t => t.trim()).filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(type)) {
    return false;
  }
  
  return true;
}

/**
 * Check if a type is supported in the registry
 */
export function isTypeSupported(type: string): boolean {
  return HK_TYPE_REGISTRY[type]?.supported === true;
}

/**
 * Get mapper name for a type
 */
export function getMapper(type: string): string | undefined {
  return HK_TYPE_REGISTRY[type]?.mapper;
}

/**
 * Normalize metric type names to registry format
 * Handles various naming conventions (camelCase, snake_case, Title Case)
 */
export function normalizeTypeName(name: string): string {
  // First, try exact match with registry keys
  if (HK_TYPE_REGISTRY[name]) {
    return name;
  }
  
  // Convert to lowercase and replace spaces/hyphens with underscores
  let normalized = name.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
  
  // Handle common variations
  const variations: Record<string, string> = {
    'bloodpressure': 'blood_pressure',
    'heartrate': 'heart_rate',
    'heartrateVariability': 'heart_rate_variability',
    'restingheartrate': 'resting_heart_rate',
    'leanbodymass': 'lean_body_mass',
    'sleepanalysis': 'sleep_analysis',
    'activeenergy': 'active_energy',
    'activeenergyburned': 'active_energy',
    'basalenergy': 'basal_energy',
    'basalenergyburned': 'basal_energy',
    'totalenergy': 'total_energy',
    'bodyfatpercentage': 'body_fat_percentage',
    'oxygensaturation': 'oxygen_saturation',
    'bloodglucose': 'blood_glucose',
    'respiratoryrate': 'respiratory_rate',
    'bodytemperature': 'body_temperature',
    'stepcount': 'steps',
    'bodyweight': 'weight',
    'weight_body_mass': 'weight',
    'weightBodyMass': 'weight',
  };
  
  if (variations[normalized.replace(/_/g, '')]) {
    normalized = variations[normalized.replace(/_/g, '')];
  }
  
  // If still not in registry, return normalized name
  // It will be captured in RAW but not routed
  return normalized;
}
