/**
 * Feature Flag System for HealthPilot
 * 
 * Controls the progressive rollout of AI/ML features and enables baseline mode
 * for testing core functionality without algorithmic complexity.
 * 
 * Environment Variables:
 * - Backend: Use process.env.FLAG_NAME
 * - Frontend: Use import.meta.env.VITE_FLAG_NAME
 * 
 * All flags default to safe baseline values (AI features OFF, baseline mode ON)
 */

// Flag configuration type
export interface FlagConfig {
  name: string;
  default: boolean;
  level: 'site' | 'user';
  description: string;
}

// All feature flags with their configuration
export const FLAG_DEFINITIONS: Record<string, FlagConfig> = {
  BASELINE_MODE_ENABLED: {
    name: 'BASELINE_MODE_ENABLED',
    default: true,
    level: 'site',
    description: 'Master flag: enables deterministic catalog mode, disables all AI/ML features'
  },
  AI_MEAL_FILTERS_ENABLED: {
    name: 'AI_MEAL_FILTERS_ENABLED',
    default: false,
    level: 'site',
    description: 'Allow AI-powered meal filtering based on user context'
  },
  AI_MEAL_RANKING_ENABLED: {
    name: 'AI_MEAL_RANKING_ENABLED',
    default: false,
    level: 'site',
    description: 'Use AI to rank and sort meal recommendations'
  },
  MEAL_GOAL_FILTER_ENABLED: {
    name: 'MEAL_GOAL_FILTER_ENABLED',
    default: false,
    level: 'site',
    description: 'Filter meals based on user goals (weight loss, muscle gain, etc.)'
  },
  MEAL_PREFERENCE_WEIGHTING_ENABLED: {
    name: 'MEAL_PREFERENCE_WEIGHTING_ENABLED',
    default: false,
    level: 'user',
    description: 'Weight meal recommendations based on user like/dislike history'
  },
  BIOMARKER_FILTER_ENABLED: {
    name: 'BIOMARKER_FILTER_ENABLED',
    default: false,
    level: 'site',
    description: 'Filter meals and workouts based on biomarker data'
  },
  AI_WORKOUT_SELECTION_ENABLED: {
    name: 'AI_WORKOUT_SELECTION_ENABLED',
    default: false,
    level: 'site',
    description: 'Use AI to generate and customize workout plans'
  },
  DAILY_AI_TRAINING_GENERATOR_ENABLED: {
    name: 'DAILY_AI_TRAINING_GENERATOR_ENABLED',
    default: false,
    level: 'site',
    description: 'Enable AI-powered daily training session generator with standards-based workouts'
  },
} as const;

// Type-safe flag names
export type FlagName = keyof typeof FLAG_DEFINITIONS;

/**
 * Get environment variable value with fallback
 * Works on both client (Vite) and server (Node.js)
 * 
 * Priority: process.env (Node.js/tests) > import.meta.env (Vite)
 */
function getEnvVar(name: string): string | undefined {
  // Server-side (Node.js) - check this first for tests and server
  if (typeof process !== 'undefined' && process.env && process.env[name] !== undefined) {
    return process.env[name];
  }
  
  // Client-side (Vite)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[`VITE_${name}`];
  }
  
  return undefined;
}

/**
 * Parse boolean from environment variable or use default
 */
function parseBooleanFlag(envValue: string | undefined, defaultValue: boolean): boolean {
  if (envValue === undefined || envValue === '') {
    return defaultValue;
  }
  
  const normalized = envValue.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Feature flag getter with type safety and BASELINE_MODE override logic
 * 
 * Rules:
 * 1. If BASELINE_MODE_ENABLED is true, all AI features are forced to false
 * 2. Individual flags can be queried but baseline mode takes precedence
 * 3. Environment variables override defaults
 */
class FeatureFlags {
  private cache: Map<FlagName, boolean> = new Map();
  
  /**
   * Check if a specific feature flag is enabled
   */
  isEnabled(flagName: FlagName): boolean {
    // Check cache first
    if (this.cache.has(flagName)) {
      return this.cache.get(flagName)!;
    }
    
    const config = FLAG_DEFINITIONS[flagName];
    if (!config) {
      console.warn(`[FeatureFlags] Unknown flag: ${flagName}`);
      return false;
    }
    
    // Get value from environment or use default
    const envValue = getEnvVar(config.name);
    const rawValue = parseBooleanFlag(envValue, config.default);
    
    // Apply BASELINE_MODE override logic
    let finalValue = rawValue;
    
    // Infrastructure flags that work independently of baseline mode
    const infrastructureFlags: FlagName[] = [
      'BASELINE_MODE_ENABLED'
    ];
    
    // If this is an infrastructure flag, return the raw value
    if (infrastructureFlags.includes(flagName)) {
      finalValue = rawValue;
    } else {
      // For AI features: if BASELINE_MODE is enabled, force all AI features OFF
      const isBaselineEnabled = this.isEnabled('BASELINE_MODE_ENABLED');
      if (isBaselineEnabled) {
        finalValue = false;
      }
    }
    
    // Cache the result
    this.cache.set(flagName, finalValue);
    
    return finalValue;
  }
  
  /**
   * Clear the flag cache (useful for testing or hot-reloading)
   */
  clearCache(): void {
    this.cache.clear();
  }
  
  /**
   * Get all flag states for debugging
   */
  getAllFlags(): Record<FlagName, boolean> {
    const flags: Partial<Record<FlagName, boolean>> = {};
    
    for (const flagName of Object.keys(FLAG_DEFINITIONS) as FlagName[]) {
      flags[flagName] = this.isEnabled(flagName);
    }
    
    return flags as Record<FlagName, boolean>;
  }
  
  /**
   * Check if we're in baseline mode (deterministic catalog, no AI)
   */
  isBaselineMode(): boolean {
    return this.isEnabled('BASELINE_MODE_ENABLED');
  }
}

// Singleton instance
export const flags = new FeatureFlags();

/**
 * Convenience getters for common flag checks
 */
export const isBaselineMode = () => flags.isBaselineMode();
export const canUseAIMealFilters = () => flags.isEnabled('AI_MEAL_FILTERS_ENABLED');
export const canUseAIMealRanking = () => flags.isEnabled('AI_MEAL_RANKING_ENABLED');
export const canUseMealGoalFilter = () => flags.isEnabled('MEAL_GOAL_FILTER_ENABLED');
export const canUseMealPreferenceWeighting = () => flags.isEnabled('MEAL_PREFERENCE_WEIGHTING_ENABLED');
export const canUseBiomarkerFilter = () => flags.isEnabled('BIOMARKER_FILTER_ENABLED');
export const canUseAIWorkoutSelection = () => flags.isEnabled('AI_WORKOUT_SELECTION_ENABLED');
export const canUseDailyAITrainingGenerator = () => flags.isEnabled('DAILY_AI_TRAINING_GENERATOR_ENABLED');

/**
 * Development helper: log all flag states
 */
export function logFlagStates(): void {
  const allFlags = flags.getAllFlags();
  console.log('[FeatureFlags] Current flag states:', allFlags);
}
