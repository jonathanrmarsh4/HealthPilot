/**
 * Sleep Stage Normalization
 * 
 * Maps various platform/OS sleep stage values to canonical HealthPilot values.
 * Prevents data loss from unknown or variant stage values from HealthKit.
 */

/**
 * Canonical sleep stage values used in HealthPilot
 */
export type CanonicalSleepStage = 
  | 'awake'
  | 'asleep_core'  // Light sleep
  | 'asleep_deep'  // Deep/slow-wave sleep
  | 'asleep_rem'   // REM sleep
  | 'in_bed'       // In bed but not asleep
  | 'unknown';     // Unknown/unrecognized stage

/**
 * Sleep stage normalization result
 */
export interface NormalizedStage {
  canonical: CanonicalSleepStage;
  original: string;
  normalized: boolean; // True if mapping was applied, false if already canonical
  recognized: boolean; // False if stage was unknown/unrecognized
}

/**
 * Mapping table for sleep stage variants
 * 
 * Sources:
 * - Apple HealthKit: "awake", "asleep", "asleepCore", "asleepDeep", "asleepREM", "inBed"
 * - Health Auto Export: Various formats including snake_case and camelCase
 * - Manual entries: User-entered or legacy values
 */
const STAGE_MAPPINGS: Record<string, CanonicalSleepStage> = {
  // Awake variants
  'awake': 'awake',
  'AWAKE': 'awake',
  
  // Core/Light sleep variants
  'asleep_core': 'asleep_core',
  'asleepCore': 'asleep_core',
  'asleepcore': 'asleep_core',
  'core': 'asleep_core',
  'light': 'asleep_core',
  'asleep_light': 'asleep_core',
  'asleepLight': 'asleep_core',
  'ASLEEP_CORE': 'asleep_core',
  
  // Deep sleep variants
  'asleep_deep': 'asleep_deep',
  'asleepDeep': 'asleep_deep',
  'asleepdeep': 'asleep_deep',
  'deep': 'asleep_deep',
  'ASLEEP_DEEP': 'asleep_deep',
  
  // REM sleep variants
  'asleep_rem': 'asleep_rem',
  'asleepREM': 'asleep_rem',
  'asleepRem': 'asleep_rem',
  'asleeprem': 'asleep_rem',
  'rem': 'asleep_rem',
  'REM': 'asleep_rem',
  'ASLEEP_REM': 'asleep_rem',
  
  // In bed variants
  'in_bed': 'in_bed',
  'inBed': 'in_bed',
  'inbed': 'in_bed',
  'IN_BED': 'in_bed',
  
  // Generic "asleep" (map to core/light)
  'asleep': 'asleep_core',
  'ASLEEP': 'asleep_core',
  'sleeping': 'asleep_core',
  'SLEEPING': 'asleep_core',
  
  // Apple HealthKit numeric values (HKCategoryValueSleepAnalysis)
  // https://developer.apple.com/documentation/healthkit/hkcategoryvaluesleepanalysis
  '0': 'in_bed',        // HKCategoryValueSleepAnalysis.inBed
  '1': 'asleep_core',   // HKCategoryValueSleepAnalysis.asleep (unspecified)
  '2': 'awake',         // HKCategoryValueSleepAnalysis.awake
  '3': 'asleep_core',   // HKCategoryValueSleepAnalysis.core
  '4': 'asleep_deep',   // HKCategoryValueSleepAnalysis.deep
  '5': 'asleep_rem',    // HKCategoryValueSleepAnalysis.rem
};

/**
 * Normalize a sleep stage value to canonical format
 * 
 * @param value - Raw sleep stage value from HealthKit or other source (string or number)
 * @returns Normalized stage with metadata
 */
export function normalizeSleepStage(value: string | number | null | undefined): NormalizedStage {
  // Convert to string and trim whitespace
  const stringValue = value != null ? String(value) : 'unknown';
  const trimmed = stringValue.trim();
  
  // Check if already in canonical form
  const canonicalStages: CanonicalSleepStage[] = [
    'awake', 'asleep_core', 'asleep_deep', 'asleep_rem', 'in_bed', 'unknown'
  ];
  
  if (canonicalStages.includes(trimmed as CanonicalSleepStage)) {
    return {
      canonical: trimmed as CanonicalSleepStage,
      original: stringValue,
      normalized: false,
      recognized: trimmed !== 'unknown'
    };
  }
  
  // Look up in mapping table
  const mapped = STAGE_MAPPINGS[trimmed];
  
  if (mapped) {
    return {
      canonical: mapped,
      original: stringValue,
      normalized: true,
      recognized: true
    };
  }
  
  // Unknown stage - return as 'unknown' but preserve original value for debugging
  console.warn(`[SLEEP_STAGE] Unknown sleep stage value: "${stringValue}" (type: ${typeof value}) - mapping to "unknown"`);
  
  return {
    canonical: 'unknown',
    original: stringValue,
    normalized: true,
    recognized: false
  };
}

/**
 * Normalize an array of sleep samples
 * 
 * @param samples - Raw sleep samples with value field
 * @returns Samples with normalized canonical stage values
 */
export function normalizeSleepSamples<T extends { value: string }>(
  samples: T[]
): Array<T & { canonicalStage: CanonicalSleepStage; stageRecognized: boolean }> {
  return samples.map(sample => {
    const normalized = normalizeSleepStage(sample.value);
    return {
      ...sample,
      canonicalStage: normalized.canonical,
      stageRecognized: normalized.recognized
    };
  });
}

/**
 * Get statistics about stage normalization for debugging
 * 
 * @param samples - Sleep samples
 * @returns Statistics about recognized vs unknown stages
 */
export function getStageMappingStats(samples: Array<{ value: string }>): {
  total: number;
  recognized: number;
  unknown: number;
  unknownValues: string[];
  stageDistribution: Record<string, number>;
} {
  const results = samples.map(s => normalizeSleepStage(s.value));
  
  const unknown = results.filter(r => !r.recognized);
  const unknownValues = [...new Set(unknown.map(u => u.original))];
  
  const stageDistribution: Record<string, number> = {};
  results.forEach(r => {
    const stage = r.canonical;
    stageDistribution[stage] = (stageDistribution[stage] || 0) + 1;
  });
  
  return {
    total: samples.length,
    recognized: results.filter(r => r.recognized).length,
    unknown: unknown.length,
    unknownValues,
    stageDistribution
  };
}

/**
 * Add a custom stage mapping at runtime
 * (useful for supporting new platforms or user-specific values)
 * 
 * @param variant - The variant value to map
 * @param canonical - The canonical stage to map it to
 */
export function addStageMapping(variant: string, canonical: CanonicalSleepStage) {
  STAGE_MAPPINGS[variant.trim()] = canonical;
}
