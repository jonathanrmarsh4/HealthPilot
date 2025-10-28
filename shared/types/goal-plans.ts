/**
 * Goal Plan Types - Structured schemas for AI-generated training plans
 * 
 * Supports both:
 * 1. Rich display of comprehensive training plans (Stage 1)
 * 2. Individual workout session extraction for scheduling (Stage 2)
 */

import { z } from 'zod';

/**
 * Individual training session within a week
 */
export const TrainingSessionSchema = z.object({
  sessionTemplateId: z.string(), // Unique ID for this session template (e.g., "phase1-week1-session1")
  dayOfWeek: z.number().min(1).max(7).optional(), // 1=Monday, 7=Sunday (optional - can be user-selected)
  dayOffset: z.number().min(0).optional(), // Alternative: days from phase start (0-6 for week 1, 7-13 for week 2, etc.)
  sessionType: z.enum([
    'run', 'hike', 'bike', 'swim', 'strength', 'cross_training', 
    'recovery', 'flexibility', 'intervals', 'tempo', 'long_endurance',
    'hill_repeats', 'stairs', 'equipment_adaptation', 'rest'
  ]),
  title: z.string(), // "Long Hike with Pack" or "Tempo Run" or "Leg Strength"
  objective: z.string(), // "Build endurance at altitude" or "Improve lactate threshold"
  durationMinutes: z.number().positive().optional(), // Target duration
  distance: z.object({
    value: z.number().positive(),
    unit: z.enum(['km', 'mi', 'meters', 'feet']),
  }).optional(),
  elevation: z.object({
    value: z.number().positive(),
    unit: z.enum(['m', 'ft']),
  }).optional(),
  packWeight: z.object({
    value: z.number().nonnegative(),
    unit: z.enum(['kg', 'lbs']),
  }).optional(), // For hiking/rucking
  intensity: z.enum(['very_light', 'light', 'moderate', 'hard', 'very_hard']).optional(),
  perceivedExertionTarget: z.number().min(1).max(10).optional(), // RPE 1-10
  heartRateZone: z.number().min(1).max(5).optional(), // HR Zone 1-5
  structure: z.string(), // Detailed workout structure: "5 min warmup, 8x3 min climbs, 5 min cooldown"
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number().positive().optional(),
    reps: z.string().optional(), // "8-12" or "AMRAP" or "60 seconds"
    weight: z.string().optional(), // "50% 1RM" or "bodyweight" or "moderate"
    notes: z.string().optional(),
  })).optional(), // For strength sessions
  equipment: z.array(z.string()).optional(), // ["trekking poles", "weighted backpack", "dumbbells"]
  notes: z.string().optional(), // Additional guidance: "Focus on comfortable pace - you should be able to talk"
  recoveryEmphasis: z.boolean().default(false), // Mark recovery-focused sessions
});

export type TrainingSession = z.infer<typeof TrainingSessionSchema>;

/**
 * A week of training within a phase
 */
export const TrainingWeekSchema = z.object({
  weekNumber: z.number().positive(), // Week number within phase (1, 2, 3, etc.)
  weekLabel: z.string().optional(), // "Week 1" or "Base Building Week 3"
  focus: z.string().optional(), // "Building aerobic base" or "Peak volume week"
  totalVolume: z.object({
    value: z.number().nonnegative(),
    unit: z.enum(['km', 'mi', 'hours', 'sessions']),
  }).optional(),
  sessions: z.array(TrainingSessionSchema),
  weeklyNotes: z.string().optional(), // "Deload week - reduce volume by 40%"
});

export type TrainingWeek = z.infer<typeof TrainingWeekSchema>;

/**
 * A training phase (Base, Build, Specific, Peak, Taper, etc.)
 */
export const TrainingPhaseSchema = z.object({
  phaseName: z.string(), // "Base Conditioning" or "Hiking Specific" or "Taper"
  phaseNumber: z.number().positive(), // 1, 2, 3, etc.
  durationWeeks: z.number().positive(),
  startDate: z.string().optional(), // ISO date string (can be calculated from goal target date)
  endDate: z.string().optional(),
  objective: z.string(), // "Build aerobic foundation and general strength"
  focus: z.array(z.string()), // ["Low-intensity endurance", "Functional gym work", "Mobility"]
  weeks: z.array(TrainingWeekSchema),
  phaseNotes: z.string().optional(), // Additional context for this phase
});

export type TrainingPhase = z.infer<typeof TrainingPhaseSchema>;

/**
 * Equipment adaptation guidance
 */
export const EquipmentGuidanceSchema = z.object({
  equipmentType: z.string(), // "hiking boots" or "weighted backpack"
  startPhase: z.number().positive(), // Phase number to introduce
  progressionNotes: z.string(), // "Begin hiking in your actual boots by Jan 2026. Progress pack weight gradually..."
});

export type EquipmentGuidance = z.infer<typeof EquipmentGuidanceSchema>;

/**
 * Strength training focus areas
 */
export const StrengthFocusSchema = z.object({
  movement: z.string(), // "Step-Ups (weighted)" or "Romanian Deadlift"
  targetSetsReps: z.string(), // "3x12 each leg" or "3x10"
  purpose: z.string(), // "Mimics uphill hiking" or "Posterior chain strength"
});

export type StrengthFocus = z.infer<typeof StrengthFocusSchema>;

/**
 * Recovery and mindset guidance
 */
export const RecoveryGuidanceSchema = z.object({
  recoveryStrategies: z.array(z.string()), // ["Monthly massage or physio check-ins", "Track HRV"]
  mindsetTips: z.array(z.string()), // ["Hike in bad weather sometimes - builds resilience"]
  nutritionGuidance: z.string().optional(), // "Keep protein high (1.6-2 g/kg/day)"
  healthMonitoring: z.array(z.string()).optional(), // ["Schedule GP check before heavy load training"]
});

export type RecoveryGuidance = z.infer<typeof RecoveryGuidanceSchema>;

/**
 * Complete AI-generated training plan content
 * This is stored in goal_plans.contentJson
 */
export const GoalPlanContentSchema = z.object({
  planVersion: z.literal('2.0'), // Version identifier for schema evolution
  generatedAt: z.string(), // ISO timestamp
  goalSummary: z.object({
    goalText: z.string(), // "Hike the Kokoda track by October 2026"
    targetDate: z.string(), // ISO date
    goalType: z.string(), // "endurance_event" or "strength" or "body_composition"
    userAge: z.number().positive().optional(),
    userFitnessLevel: z.string().optional(), // "beginner", "intermediate", "advanced"
  }),
  planOverview: z.object({
    totalDurationWeeks: z.number().positive(),
    phasesCount: z.number().positive(),
    primaryFocus: z.string(), // "Building endurance, leg strength, and hiking-specific conditioning"
    adaptations: z.array(z.string()).optional(), // Personalized based on user data
  }),
  phases: z.array(TrainingPhaseSchema),
  equipmentGuidance: z.array(EquipmentGuidanceSchema).optional(),
  strengthFocus: z.array(StrengthFocusSchema).optional(),
  recoveryGuidance: RecoveryGuidanceSchema.optional(),
  additionalNotes: z.string().optional(), // Any extra context or recommendations
});

export type GoalPlanContent = z.infer<typeof GoalPlanContentSchema>;

/**
 * Validation helper with detailed error messages
 */
export function validateGoalPlanContent(data: unknown): {
  success: boolean;
  data?: GoalPlanContent;
  error?: z.ZodError;
} {
  const result = GoalPlanContentSchema.safeParse(data);
  
  if (!result.success) {
    console.error('[GoalPlanValidation] Invalid plan structure:', result.error.format());
    return { success: false, error: result.error };
  }
  
  return { success: true, data: result.data };
}

/**
 * Flatten training plan into individual schedulable sessions
 * Used to populate goal_plan_sessions table for Stage 2 scheduling
 */
export function flattenPlanToSessions(
  goalPlanId: string,
  planContent: GoalPlanContent
): Array<{
  goalPlanId: string;
  sessionTemplateId: string;
  phaseNumber: number;
  phaseName: string;
  weekNumber: number;
  weekLabel: string;
  sessionData: TrainingSession;
}> {
  const flattened: Array<{
    goalPlanId: string;
    sessionTemplateId: string;
    phaseNumber: number;
    phaseName: string;
    weekNumber: number;
    weekLabel: string;
    sessionData: TrainingSession;
  }> = [];

  planContent.phases.forEach((phase) => {
    phase.weeks.forEach((week) => {
      week.sessions.forEach((session) => {
        flattened.push({
          goalPlanId,
          sessionTemplateId: session.sessionTemplateId,
          phaseNumber: phase.phaseNumber,
          phaseName: phase.phaseName,
          weekNumber: week.weekNumber,
          weekLabel: week.weekLabel || `Week ${week.weekNumber}`,
          sessionData: session,
        });
      });
    });
  });

  return flattened;
}
