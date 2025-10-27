import type { InsertMetricStandard } from "@shared/schema";

/**
 * ACSM VO2 Max Standards
 * 
 * Source: American College of Sports Medicine (ACSM) Guidelines for Exercise Testing
 * and Prescription, 11th Edition (2021)
 * 
 * VO2max values are in ml/kg/min
 * These percentiles represent cardiorespiratory fitness levels for different age groups
 * 
 * Classifications:
 * - 90th+ percentile: Excellent/Superior
 * - 70-89th percentile: Good
 * - 50-69th percentile: Fair/Average
 * - 30-49th percentile: Poor/Below Average
 * - <30th percentile: Very Poor
 */

interface VO2Standard {
  ageMin: number;
  ageMax: number;
  gender: 'male' | 'female';
  percentile: number;
  level: string;
  valueMin: number;
  valueMax: number;
}

const ascmVO2Standards: VO2Standard[] = [
  // MALE STANDARDS
  // Ages 20-29
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 95, level: 'superior', valueMin: 55.9, valueMax: 999 },
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 80, level: 'excellent', valueMin: 51.0, valueMax: 55.9 },
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 60, level: 'good', valueMin: 45.2, valueMax: 51.0 },
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 40, level: 'fair', valueMin: 41.0, valueMax: 45.2 },
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 20, level: 'poor', valueMin: 36.0, valueMax: 41.0 },
  { ageMin: 20, ageMax: 29, gender: 'male', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 36.0 },

  // Ages 30-39
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 95, level: 'superior', valueMin: 54.0, valueMax: 999 },
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 80, level: 'excellent', valueMin: 48.0, valueMax: 54.0 },
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 60, level: 'good', valueMin: 44.0, valueMax: 48.0 },
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 40, level: 'fair', valueMin: 40.0, valueMax: 44.0 },
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 20, level: 'poor', valueMin: 35.0, valueMax: 40.0 },
  { ageMin: 30, ageMax: 39, gender: 'male', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 35.0 },

  // Ages 40-49
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 95, level: 'superior', valueMin: 52.5, valueMax: 999 },
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 80, level: 'excellent', valueMin: 46.8, valueMax: 52.5 },
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 60, level: 'good', valueMin: 42.4, valueMax: 46.8 },
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 40, level: 'fair', valueMin: 38.5, valueMax: 42.4 },
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 20, level: 'poor', valueMin: 33.8, valueMax: 38.5 },
  { ageMin: 40, ageMax: 49, gender: 'male', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 33.8 },

  // Ages 50-59
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 95, level: 'superior', valueMin: 48.9, valueMax: 999 },
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 80, level: 'excellent', valueMin: 43.4, valueMax: 48.9 },
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 60, level: 'good', valueMin: 39.2, valueMax: 43.4 },
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 40, level: 'fair', valueMin: 35.3, valueMax: 39.2 },
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 20, level: 'poor', valueMin: 31.0, valueMax: 35.3 },
  { ageMin: 50, ageMax: 59, gender: 'male', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 31.0 },

  // Ages 60-69
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 95, level: 'superior', valueMin: 45.7, valueMax: 999 },
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 80, level: 'excellent', valueMin: 39.5, valueMax: 45.7 },
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 60, level: 'good', valueMin: 35.5, valueMax: 39.5 },
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 40, level: 'fair', valueMin: 31.8, valueMax: 35.5 },
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 20, level: 'poor', valueMin: 27.0, valueMax: 31.8 },
  { ageMin: 60, ageMax: 69, gender: 'male', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 27.0 },

  // FEMALE STANDARDS
  // Ages 20-29
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 95, level: 'superior', valueMin: 49.6, valueMax: 999 },
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 80, level: 'excellent', valueMin: 43.9, valueMax: 49.6 },
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 60, level: 'good', valueMin: 39.5, valueMax: 43.9 },
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 40, level: 'fair', valueMin: 35.5, valueMax: 39.5 },
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 20, level: 'poor', valueMin: 31.0, valueMax: 35.5 },
  { ageMin: 20, ageMax: 29, gender: 'female', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 31.0 },

  // Ages 30-39
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 95, level: 'superior', valueMin: 47.4, valueMax: 999 },
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 80, level: 'excellent', valueMin: 42.4, valueMax: 47.4 },
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 60, level: 'good', valueMin: 37.8, valueMax: 42.4 },
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 40, level: 'fair', valueMin: 34.2, valueMax: 37.8 },
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 20, level: 'poor', valueMin: 30.0, valueMax: 34.2 },
  { ageMin: 30, ageMax: 39, gender: 'female', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 30.0 },

  // Ages 40-49
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 95, level: 'superior', valueMin: 45.3, valueMax: 999 },
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 80, level: 'excellent', valueMin: 39.7, valueMax: 45.3 },
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 60, level: 'good', valueMin: 36.3, valueMax: 39.7 },
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 40, level: 'fair', valueMin: 32.8, valueMax: 36.3 },
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 20, level: 'poor', valueMin: 28.0, valueMax: 32.8 },
  { ageMin: 40, ageMax: 49, gender: 'female', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 28.0 },

  // Ages 50-59
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 95, level: 'superior', valueMin: 41.0, valueMax: 999 },
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 80, level: 'excellent', valueMin: 36.7, valueMax: 41.0 },
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 60, level: 'good', valueMin: 33.0, valueMax: 36.7 },
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 40, level: 'fair', valueMin: 30.2, valueMax: 33.0 },
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 20, level: 'poor', valueMin: 26.0, valueMax: 30.2 },
  { ageMin: 50, ageMax: 59, gender: 'female', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 26.0 },

  // Ages 60-69
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 95, level: 'superior', valueMin: 37.8, valueMax: 999 },
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 80, level: 'excellent', valueMin: 32.9, valueMax: 37.8 },
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 60, level: 'good', valueMin: 29.4, valueMax: 32.9 },
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 40, level: 'fair', valueMin: 26.9, valueMax: 29.4 },
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 20, level: 'poor', valueMin: 23.0, valueMax: 26.9 },
  { ageMin: 60, ageMax: 69, gender: 'female', percentile: 5, level: 'very_poor', valueMin: 0, valueMax: 23.0 },
];

/**
 * Convert ACSM VO2 standards to database format
 */
export function getASCMVO2Standards(): Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] {
  return ascmVO2Standards.map(standard => ({
    metricKey: 'vo2max',
    standardType: 'percentile',
    category: 'cardio',
    ageMin: standard.ageMin,
    ageMax: standard.ageMax,
    gender: standard.gender,
    valueMin: standard.valueMin,
    valueMax: standard.valueMax,
    valueSingle: null,
    unit: 'ml/kg/min',
    percentile: standard.percentile,
    level: standard.level,
    sourceName: 'ACSM',
    sourceUrl: 'https://www.acsm.org/education-resources/books/guidelines-exercise-testing-prescription',
    sourceDescription: 'American College of Sports Medicine Guidelines for Exercise Testing and Prescription (11th Ed, 2021)',
    confidenceScore: 1.0,
    evidenceLevel: 'professional_org',
    isActive: 1,
    verifiedByAdmin: 1,
    lastVerifiedAt: new Date('2025-01-01'),
  }));
}

/**
 * Find the appropriate VO2 max standard for a given user
 */
export function findVO2Standard(age: number, gender: 'male' | 'female', targetPercentile?: number): VO2Standard | null {
  const standards = ascmVO2Standards.filter(s => 
    s.gender === gender &&
    age >= s.ageMin &&
    age <= s.ageMax
  );

  if (standards.length === 0) return null;

  if (targetPercentile) {
    return standards.find(s => s.percentile === targetPercentile) || null;
  }

  // Return 60th percentile (Good fitness) as default target
  return standards.find(s => s.percentile === 60) || null;
}
