/**
 * Muscle Group Tracking Utilities
 * 
 * Functions to analyze workout sessions and record muscle group engagements
 */

import { classifyExerciseMuscleGroups, ENGAGEMENT_LEVELS } from "../config/muscleGroups";
import type { IStorage } from "../storage";
// Unused types - kept for future reference
// import type { Exercise, ExerciseSet } from "@shared/schema";

/**
 * Analyze a completed workout session and record muscle group engagements
 * 
 * This function:
 * 1. Gets all exercises and sets from the workout session
 * 2. Classifies each exercise to determine muscle groups targeted
 * 3. Calculates total sets and volume per muscle group
 * 4. Records engagements in the database
 */
export async function recordWorkoutMuscleGroupEngagements(
  storage: IStorage,
  userId: string,
  workoutSessionId: string
): Promise<void> {
  try {
    // Get all exercises for this session
    const exercises = await storage.getExercisesForSession(workoutSessionId, userId);
    const sets = await storage.getSetsForSession(workoutSessionId, userId);
    
    if (exercises.length === 0 || sets.length === 0) {
      console.log(`⚠️  No exercises or sets found for workout ${workoutSessionId}, skipping muscle group tracking`);
      return;
    }
    
    // Filter only completed sets (handle both boolean and numeric values)
    const completedSets = sets.filter(s => s.completed === 1 || s.completed === true);
    
    if (completedSets.length === 0) {
      console.log(`⚠️  No completed sets found for workout ${workoutSessionId}, skipping muscle group tracking`);
      return;
    }
    
    // Track engagements by muscle group and level
    const engagements = new Map<string, { 
      primary: { sets: number; volume: number };
      secondary: { sets: number; volume: number };
    }>();
    
    // Analyze each exercise
    for (const exercise of exercises) {
      // Get completed sets for this exercise
      const exerciseSets = completedSets.filter(s => s.exerciseId === exercise.id);
      
      if (exerciseSets.length === 0) continue;
      
      // Classify exercise to get muscle groups
      const muscleMapping = classifyExerciseMuscleGroups(exercise.name);
      
      // Calculate total sets and volume for this exercise
      const totalSets = exerciseSets.length;
      const totalVolume = exerciseSets.reduce((sum, set) => {
        if (set.weight !== null && set.reps !== null) {
          return sum + (set.weight * set.reps);
        }
        return sum;
      }, 0);
      
      // Record primary muscle groups
      for (const muscleGroup of muscleMapping.primary) {
        if (!engagements.has(muscleGroup)) {
          engagements.set(muscleGroup, {
            primary: { sets: 0, volume: 0 },
            secondary: { sets: 0, volume: 0 },
          });
        }
        const engagement = engagements.get(muscleGroup)!;
        engagement.primary.sets += totalSets;
        engagement.primary.volume += totalVolume;
      }
      
      // Record secondary muscle groups
      for (const muscleGroup of muscleMapping.secondary) {
        if (!engagements.has(muscleGroup)) {
          engagements.set(muscleGroup, {
            primary: { sets: 0, volume: 0 },
            secondary: { sets: 0, volume: 0 },
          });
        }
        const engagement = engagements.get(muscleGroup)!;
        engagement.secondary.sets += totalSets;
        engagement.secondary.volume += totalVolume;
      }
    }
    
    // Record engagements in database
    const recordPromises: Promise<void>[] = [];
    
    for (const [muscleGroup, data] of engagements.entries()) {
      // Record primary engagement if there are any primary sets
      if (data.primary.sets > 0) {
        recordPromises.push(
          storage.recordMuscleGroupEngagement(
            userId,
            workoutSessionId,
            muscleGroup,
            ENGAGEMENT_LEVELS.PRIMARY,
            data.primary.sets,
            data.primary.volume > 0 ? data.primary.volume : undefined
          )
        );
      }
      
      // Record secondary engagement if there are any secondary sets
      if (data.secondary.sets > 0) {
        recordPromises.push(
          storage.recordMuscleGroupEngagement(
            userId,
            workoutSessionId,
            muscleGroup,
            ENGAGEMENT_LEVELS.SECONDARY,
            data.secondary.sets,
            data.secondary.volume > 0 ? data.secondary.volume : undefined
          )
        );
      }
    }
    
    await Promise.all(recordPromises);
    
    console.log(`✅ Recorded muscle group engagements for workout ${workoutSessionId}:`, {
      muscleGroups: Array.from(engagements.keys()),
      totalRecords: recordPromises.length,
    });
    
  } catch (error) {
    console.error(`❌ Error recording muscle group engagements for workout ${workoutSessionId}:`, error);
    // Don't throw - muscle group tracking is non-critical and shouldn't break workout completion
  }
}

/**
 * Check if a workout session has any completed sets
 */
export async function hasCompletedSets(
  storage: IStorage,
  userId: string,
  workoutSessionId: string
): Promise<boolean> {
  const sets = await storage.getSetsForSession(workoutSessionId, userId);
  return sets.some(s => s.completed === 1);
}
