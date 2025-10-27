import type { InsertMetricStandard } from "@shared/schema";

/**
 * Jack Daniels' VDOT Running Calculator
 * 
 * Source: "Daniels' Running Formula" by Jack Daniels, PhD
 * VDOT = VO2max adjusted for running economy
 * 
 * This calculator provides:
 * 1. VDOT calculation from race performances
 * 2. Training pace recommendations (Easy, Marathon, Threshold, Interval, Repetition)
 * 3. Race time predictions for different distances
 * 
 * VDOT ranges:
 * - 30-40: Beginner/recreational runner
 * - 40-50: Intermediate runner
 * - 50-60: Advanced runner
 * - 60-70: Elite amateur
 * - 70+: World-class athlete
 */

/**
 * Calculate VDOT from race time and distance
 * @param distanceMeters - Race distance in meters
 * @param timeSeconds - Race time in seconds
 * @returns VDOT score
 */
export function calculateVDOT(distanceMeters: number, timeSeconds: number): number {
  // Jack Daniels' VDOT formula
  // VO2 = -4.60 + 0.182258 * v + 0.000104 * v^2
  // where v = velocity in meters/minute
  
  const velocityMetersPerMin = distanceMeters / (timeSeconds / 60);
  const percentMax = 0.8 + 0.1894393 * Math.exp(-0.012778 * (timeSeconds / 60)) + 0.2989558 * Math.exp(-0.1932605 * (timeSeconds / 60));
  
  const vo2 = -4.60 + 0.182258 * velocityMetersPerMin + 0.000104 * Math.pow(velocityMetersPerMin, 2);
  const vdot = vo2 / percentMax;
  
  return Math.round(vdot * 10) / 10;
}

/**
 * Calculate training paces based on VDOT
 * Returns paces in seconds per kilometer
 */
export function calculateTrainingPaces(vdot: number): {
  easy: { min: number; max: number };
  marathon: number;
  threshold: number;
  interval: number;
  repetition: number;
} {
  // These are simplified formulas based on Jack Daniels' tables
  // In practice, you'd use lookup tables, but formulas provide good approximations
  
  const vo2MaxVelocity = (vdot + 4.60) / 0.182258; // Simplified inverse
  const baseSecondsPerKm = (1000 / vo2MaxVelocity) * 60;
  
  return {
    easy: {
      min: baseSecondsPerKm * 1.35, // 59-74% VO2max
      max: baseSecondsPerKm * 1.50,
    },
    marathon: baseSecondsPerKm * 1.15, // 80-90% VO2max
    threshold: baseSecondsPerKm * 1.05, // 88-92% VO2max (tempo pace)
    interval: baseSecondsPerKm * 0.95, // 95-100% VO2max (3-5 min repeats)
    repetition: baseSecondsPerKm * 0.85, // 105-120% VO2max (200m-400m repeats)
  };
}

/**
 * Predict race time for a given distance based on VDOT
 * @param vdot - VDOT score
 * @param distanceMeters - Target race distance in meters
 * @returns Predicted time in seconds
 */
export function predictRaceTime(vdot: number, distanceMeters: number): number {
  // Simplified prediction - in practice, use Daniels' race equivalency tables
  const vo2 = vdot * 0.85; // Approximate race effort at ~85% of VDOT
  const velocityMetersPerMin = (vo2 + 4.60) / 0.182258;
  const timeMinutes = distanceMeters / velocityMetersPerMin;
  
  return Math.round(timeMinutes * 60);
}

/**
 * VDOT-based standards for different running goals
 */
interface VDOTStandard {
  level: string;
  vdotMin: number;
  vdotMax: number;
  description: string;
}

const vdotStandards: VDOTStandard[] = [
  { level: 'beginner', vdotMin: 25, vdotMax: 35, description: 'New to running or returning after break' },
  { level: 'recreational', vdotMin: 35, vdotMax: 45, description: 'Regular runner, 3-4 days/week' },
  { level: 'intermediate', vdotMin: 45, vdotMax: 55, description: 'Serious runner, structured training' },
  { level: 'advanced', vdotMin: 55, vdotMax: 65, description: 'Competitive runner, high volume training' },
  { level: 'elite', vdotMin: 65, vdotMax: 75, description: 'Elite amateur or professional runner' },
  { level: 'world_class', vdotMin: 75, vdotMax: 999, description: 'World-class athlete' },
];

/**
 * Convert VDOT standards to database format
 * These are general VDOT benchmarks, not age/gender specific
 */
export function getVDOTStandards(): Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] {
  return vdotStandards.map(standard => ({
    metricKey: 'vdot',
    standardType: 'absolute_value',
    category: 'running',
    ageMin: null,
    ageMax: null,
    gender: 'all',
    valueMin: standard.vdotMin,
    valueMax: standard.vdotMax,
    valueSingle: null,
    unit: 'vdot',
    percentile: null,
    level: standard.level,
    sourceName: 'Jack Daniels',
    sourceUrl: 'https://runsmartproject.com/calculator/',
    sourceDescription: "Jack Daniels' Running Formula - VDOT running calculator and training paces",
    confidenceScore: 1.0,
    evidenceLevel: 'professional_org',
    isActive: 1,
    verifiedByAdmin: 1,
    lastVerifiedAt: new Date('2025-01-01'),
  }));
}

/**
 * Common race distances in meters
 */
export const RACE_DISTANCES = {
  '5K': 5000,
  '10K': 10000,
  'HALF_MARATHON': 21097.5,
  'MARATHON': 42195,
} as const;

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format pace as min/km or min/mile
 */
export function formatPace(secondsPerKm: number, unit: 'km' | 'mile' = 'km'): string {
  const multiplier = unit === 'mile' ? 1.60934 : 1;
  const totalSeconds = secondsPerKm * multiplier;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}/${unit}`;
}
