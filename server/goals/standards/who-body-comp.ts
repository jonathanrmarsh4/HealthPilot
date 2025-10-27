import type { InsertMetricStandard } from "@shared/schema";

/**
 * WHO Body Composition Standards
 * 
 * Source: World Health Organization (WHO) Guidelines
 * 
 * BMI (Body Mass Index) Categories:
 * - Underweight: <18.5
 * - Normal weight: 18.5-24.9
 * - Overweight: 25.0-29.9
 * - Obese Class I: 30.0-34.9
 * - Obese Class II: 35.0-39.9
 * - Obese Class III: ≥40.0
 * 
 * Body Fat Percentage:
 * Based on American Council on Exercise (ACE) and WHO guidelines
 * Stratified by age and gender
 */

interface BodyCompStandard {
  metricKey: string;
  category: string;
  ageMin?: number;
  ageMax?: number;
  gender: 'male' | 'female' | 'all';
  level: string;
  valueMin: number;
  valueMax: number;
  description: string;
}

const bodyCompStandards: BodyCompStandard[] = [
  // BMI STANDARDS (applies to all adults)
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'underweight',
    valueMin: 0,
    valueMax: 18.5,
    description: 'BMI below 18.5 - Underweight',
  },
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'normal',
    valueMin: 18.5,
    valueMax: 24.9,
    description: 'BMI 18.5-24.9 - Normal/Healthy weight',
  },
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'overweight',
    valueMin: 25.0,
    valueMax: 29.9,
    description: 'BMI 25.0-29.9 - Overweight',
  },
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'obese_class_1',
    valueMin: 30.0,
    valueMax: 34.9,
    description: 'BMI 30.0-34.9 - Obese Class I',
  },
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'obese_class_2',
    valueMin: 35.0,
    valueMax: 39.9,
    description: 'BMI 35.0-39.9 - Obese Class II',
  },
  {
    metricKey: 'bmi',
    category: 'body_comp',
    gender: 'all',
    level: 'obese_class_3',
    valueMin: 40.0,
    valueMax: 999,
    description: 'BMI ≥40.0 - Obese Class III',
  },

  // BODY FAT PERCENTAGE - MALE
  // Ages 20-39
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'male',
    level: 'essential',
    valueMin: 2,
    valueMax: 5,
    description: 'Essential fat - minimum for physiological function',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'male',
    level: 'athlete',
    valueMin: 6,
    valueMax: 13,
    description: 'Athletic body fat percentage for males 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'male',
    level: 'fitness',
    valueMin: 14,
    valueMax: 17,
    description: 'Fitness body fat percentage for males 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'male',
    level: 'average',
    valueMin: 18,
    valueMax: 24,
    description: 'Average body fat percentage for males 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'male',
    level: 'overweight',
    valueMin: 25,
    valueMax: 999,
    description: 'Above average/overweight body fat for males 20-39',
  },

  // Ages 40-59
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'male',
    level: 'athlete',
    valueMin: 7,
    valueMax: 15,
    description: 'Athletic body fat percentage for males 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'male',
    level: 'fitness',
    valueMin: 16,
    valueMax: 20,
    description: 'Fitness body fat percentage for males 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'male',
    level: 'average',
    valueMin: 21,
    valueMax: 27,
    description: 'Average body fat percentage for males 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'male',
    level: 'overweight',
    valueMin: 28,
    valueMax: 999,
    description: 'Above average/overweight body fat for males 40-59',
  },

  // Ages 60+
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'male',
    level: 'athlete',
    valueMin: 9,
    valueMax: 17,
    description: 'Athletic body fat percentage for males 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'male',
    level: 'fitness',
    valueMin: 18,
    valueMax: 22,
    description: 'Fitness body fat percentage for males 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'male',
    level: 'average',
    valueMin: 23,
    valueMax: 29,
    description: 'Average body fat percentage for males 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'male',
    level: 'overweight',
    valueMin: 30,
    valueMax: 999,
    description: 'Above average/overweight body fat for males 60+',
  },

  // BODY FAT PERCENTAGE - FEMALE
  // Ages 20-39
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'female',
    level: 'essential',
    valueMin: 10,
    valueMax: 13,
    description: 'Essential fat - minimum for physiological function',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'female',
    level: 'athlete',
    valueMin: 14,
    valueMax: 20,
    description: 'Athletic body fat percentage for females 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'female',
    level: 'fitness',
    valueMin: 21,
    valueMax: 24,
    description: 'Fitness body fat percentage for females 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'female',
    level: 'average',
    valueMin: 25,
    valueMax: 31,
    description: 'Average body fat percentage for females 20-39',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 20,
    ageMax: 39,
    gender: 'female',
    level: 'overweight',
    valueMin: 32,
    valueMax: 999,
    description: 'Above average/overweight body fat for females 20-39',
  },

  // Ages 40-59
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'female',
    level: 'athlete',
    valueMin: 15,
    valueMax: 22,
    description: 'Athletic body fat percentage for females 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'female',
    level: 'fitness',
    valueMin: 23,
    valueMax: 27,
    description: 'Fitness body fat percentage for females 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'female',
    level: 'average',
    valueMin: 28,
    valueMax: 34,
    description: 'Average body fat percentage for females 40-59',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 40,
    ageMax: 59,
    gender: 'female',
    level: 'overweight',
    valueMin: 35,
    valueMax: 999,
    description: 'Above average/overweight body fat for females 40-59',
  },

  // Ages 60+
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'female',
    level: 'athlete',
    valueMin: 16,
    valueMax: 24,
    description: 'Athletic body fat percentage for females 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'female',
    level: 'fitness',
    valueMin: 25,
    valueMax: 29,
    description: 'Fitness body fat percentage for females 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'female',
    level: 'average',
    valueMin: 30,
    valueMax: 36,
    description: 'Average body fat percentage for females 60+',
  },
  {
    metricKey: 'body_fat_pct',
    category: 'body_comp',
    ageMin: 60,
    ageMax: null,
    gender: 'female',
    level: 'overweight',
    valueMin: 37,
    valueMax: 999,
    description: 'Above average/overweight body fat for females 60+',
  },
];

/**
 * Convert body composition standards to database format
 */
export function getBodyCompositionStandards(): Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] {
  return bodyCompStandards.map(standard => ({
    metricKey: standard.metricKey,
    standardType: 'absolute_value',
    category: standard.category,
    ageMin: standard.ageMin ?? null,
    ageMax: standard.ageMax ?? null,
    gender: standard.gender,
    valueMin: standard.valueMin,
    valueMax: standard.valueMax,
    valueSingle: null,
    unit: standard.metricKey === 'bmi' ? 'kg/m²' : '%',
    percentile: null,
    level: standard.level,
    sourceName: 'WHO/ACE',
    sourceUrl: 'https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight',
    sourceDescription: 'WHO BMI Guidelines and ACE Body Fat Percentage Charts',
    confidenceScore: 1.0,
    evidenceLevel: 'professional_org',
    isActive: 1,
    verifiedByAdmin: 1,
    lastVerifiedAt: new Date('2025-01-01'),
  }));
}

/**
 * Calculate BMI from height and weight
 * @param weightKg - Weight in kilograms
 * @param heightCm - Height in centimeters
 * @returns BMI value
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * Classify BMI category
 */
export function classifyBMI(bmi: number): string {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25.0) return 'normal';
  if (bmi < 30.0) return 'overweight';
  if (bmi < 35.0) return 'obese_class_1';
  if (bmi < 40.0) return 'obese_class_2';
  return 'obese_class_3';
}

/**
 * Classify body fat percentage
 */
export function classifyBodyFat(
  bodyFatPct: number,
  age: number,
  gender: 'male' | 'female'
): string {
  const ageGroup = age < 40 ? 20 : age < 60 ? 40 : 60;
  
  const relevantStandards = bodyCompStandards.filter(
    s => s.metricKey === 'body_fat_pct' &&
         s.gender === gender &&
         (s.ageMin === null || ageGroup >= s.ageMin) &&
         (s.ageMax === null || ageGroup <= s.ageMax)
  );

  for (const standard of relevantStandards) {
    if (bodyFatPct >= standard.valueMin && bodyFatPct < standard.valueMax) {
      return standard.level;
    }
  }

  return 'unknown';
}
