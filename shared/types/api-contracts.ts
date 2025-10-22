/**
 * API Contract Types and Validation Schemas
 * 
 * Zod schemas for API request/response validation in baseline mode.
 * These ensure data integrity and provide clear error messages when
 * invalid data is encountered.
 */

import { z } from 'zod';

/**
 * Meal data contract (from meal_library table)
 */
export const MealSchema = z.object({
  id: z.string().uuid(),
  spoonacularRecipeId: z.number().nullable().optional(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
  readyInMinutes: z.number().int().positive().nullable().optional(),
  servings: z.number().int().positive().default(1),
  // Nutrition
  calories: z.number().int().nonnegative().nullable().optional(),
  protein: z.number().nonnegative().nullable().optional(),
  carbs: z.number().nonnegative().nullable().optional(),
  fat: z.number().nonnegative().nullable().optional(),
  // Recipe details
  ingredients: z.any().nullable().optional(), // JSONB
  instructions: z.string().nullable().optional(),
  extendedIngredients: z.any().nullable().optional(), // JSONB
  // Categorization
  cuisines: z.array(z.string()).nullable().optional(),
  dishTypes: z.array(z.string()).nullable().optional(),
  diets: z.array(z.string()).nullable().optional(),
  mealTypes: z.array(z.enum(['breakfast', 'lunch', 'dinner', 'snack'])).nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  // Performance metrics
  totalServed: z.number().int().nonnegative().default(0),
  thumbsUpCount: z.number().int().nonnegative().default(0),
  thumbsDownCount: z.number().int().nonnegative().default(0),
  conversionRate: z.number().min(0).max(1).default(0),
  // Status
  status: z.enum(['active', 'flagged_for_deletion', 'replaced']).default('active'),
  flaggedAt: z.date().nullable().optional(),
  replacedAt: z.date().nullable().optional(),
  importedAt: z.date(),
  updatedAt: z.date(),
});

export type Meal = z.infer<typeof MealSchema>;

/**
 * Exercise data contract (from exercises table)
 */
export const ExerciseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  muscles: z.array(z.string()).min(1), // ['chest', 'triceps', etc.]
  equipment: z.string().min(1), // 'barbell', 'dumbbell', etc.
  incrementStep: z.number().positive().default(2.5),
  tempoDefault: z.string().nullable().optional(), // '3-1-1'
  restDefault: z.number().int().positive().default(90),
  instructions: z.string().nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('intermediate'),
  category: z.string().min(1), // 'compound', 'isolation', 'cardio', 'flexibility'
  trackingType: z.enum(['weight_reps', 'bodyweight_reps', 'distance_duration', 'duration_only']).default('weight_reps'),
  exercisedbId: z.string().nullable().optional(), // ExerciseDB ID for GIFs
  createdAt: z.date(),
});

export type Exercise = z.infer<typeof ExerciseSchema>;

/**
 * Paginated API response contract
 */
export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    page: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

/**
 * Meal API query parameters (baseline mode)
 */
export const MealQueryParamsSchema = z.object({
  page: z.number().int().nonnegative().default(0),
  limit: z.number().int().positive().min(1).max(100).default(24),
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  tag: z.string().optional(), // Simple tag filtering (e.g., 'vegetarian')
  // AI-related params are IGNORED in baseline mode
  // They're defined here for backwards compatibility but will be stripped
  goalFilter: z.any().optional(),
  biomarkerFilter: z.any().optional(),
  preferenceWeighting: z.any().optional(),
});

export type MealQueryParams = z.infer<typeof MealQueryParamsSchema>;

/**
 * Validate and sanitize meal query parameters for baseline mode
 * Strips all AI-related params when baseline mode is active
 */
export function validateMealQueryParams(
  rawParams: unknown,
  baselineMode: boolean
): MealQueryParams {
  const parsed = MealQueryParamsSchema.parse(rawParams);
  
  if (baselineMode) {
    // In baseline mode, remove AI-related parameters
    const { goalFilter, biomarkerFilter, preferenceWeighting, ...baselineParams } = parsed;
    return baselineParams;
  }
  
  return parsed;
}

/**
 * Safe meal parsing with individual record error handling
 * Invalid records are skipped with structured warnings
 */
export function parseMealsSafely(rawMeals: unknown[]): {
  valid: Meal[];
  errors: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: Meal[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];
  
  rawMeals.forEach((rawMeal, index) => {
    const result = MealSchema.safeParse(rawMeal);
    
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({ index, error: result.error });
      console.warn(
        `[MealValidation] Skipped invalid meal at index ${index}:`,
        result.error.format()
      );
    }
  });
  
  return { valid, errors };
}

/**
 * Safe exercise parsing with individual record error handling
 */
export function parseExercisesSafely(rawExercises: unknown[]): {
  valid: Exercise[];
  errors: Array<{ index: number; error: z.ZodError }>;
} {
  const valid: Exercise[] = [];
  const errors: Array<{ index: number; error: z.ZodError }> = [];
  
  rawExercises.forEach((rawExercise, index) => {
    const result = ExerciseSchema.safeParse(rawExercise);
    
    if (result.success) {
      valid.push(result.data);
    } else {
      errors.push({ index, error: result.error });
      console.warn(
        `[ExerciseValidation] Skipped invalid exercise at index ${index}:`,
        result.error.format()
      );
    }
  });
  
  return { valid, errors };
}
