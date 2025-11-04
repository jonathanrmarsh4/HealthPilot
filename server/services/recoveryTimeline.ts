import { storage } from "../storage";
import { 
  applyWorkoutFatigue, 
  applyRecoveryBoost, 
  getCurrentRecoveryState,
  MUSCLE_GROUPS,
  type MuscleGroup 
} from "./fatigue";

/**
 * Recovery Timeline Event Tracking
 * 
 * Records key recovery milestones throughout the day:
 * - Daily morning baseline (fresh state)
 * - Workout completions (fatigue application)
 * - Recovery protocol completions (recovery boost)
 */

/**
 * Record a workout completion and apply fatigue to muscle groups
 * Creates a timeline event showing the drop in recovery scores
 */
export async function recordWorkoutCompletion(
  userId: string,
  workoutSessionId: string,
  completedAt: Date = new Date()
): Promise<void> {
  // Apply workout fatigue to muscle group recovery states
  await applyWorkoutFatigue(userId, workoutSessionId, completedAt);
  
  // Get current recovery state after applying fatigue
  const recoveryState = await getCurrentRecoveryState(userId);
  
  // Get workout details for metadata
  const workout = await storage.getWorkoutSession(workoutSessionId, userId);
  
  // Create timeline event
  await storage.createRecoveryTimelineEvent({
    userId,
    timestamp: completedAt.toISOString(),
    eventType: 'workout_completed',
    systemicScore: recoveryState.systemic,
    muscleScores: recoveryState.muscleGroups,
    eventMetadata: {
      workoutSessionId,
      workoutType: workout?.workoutType,
      duration: workout?.duration,
      calories: workout?.calories,
    },
  });
}

/**
 * Record a recovery protocol completion and apply boost to muscle groups
 * Creates a timeline event showing the improvement in recovery scores
 */
export async function recordProtocolCompletion(
  userId: string,
  protocolId: string,
  protocolName: string,
  completedAt: Date = new Date()
): Promise<void> {
  // Apply recovery boost to muscle group recovery states
  await applyRecoveryBoost(userId, protocolName, completedAt);
  
  // Get current recovery state after applying boost
  const recoveryState = await getCurrentRecoveryState(userId);
  
  // Create timeline event
  await storage.createRecoveryTimelineEvent({
    userId,
    timestamp: completedAt.toISOString(),
    eventType: 'protocol_completed',
    systemicScore: recoveryState.systemic,
    muscleScores: recoveryState.muscleGroups,
    eventMetadata: {
      protocolId,
      protocolName,
    },
  });
}

/**
 * Record a daily baseline snapshot
 * This captures the user's recovery state at the start of the day
 * Useful for showing the recovery curve over time
 */
export async function recordDailyBaseline(userId: string): Promise<void> {
  const now = new Date();
  
  // Get current recovery state
  const recoveryState = await getCurrentRecoveryState(userId);
  
  // Create timeline event
  await storage.createRecoveryTimelineEvent({
    userId,
    timestamp: now.toISOString(),
    eventType: 'baseline',
    systemicScore: recoveryState.systemic,
    muscleScores: recoveryState.muscleGroups,
    eventMetadata: {
      note: 'Daily morning baseline snapshot',
    },
  });
}

/**
 * Get recovery timeline for visualization
 * Returns events from the last N days with muscle group scores
 */
export async function getRecoveryTimeline(
  userId: string,
  days: number = 7
): Promise<{
  events: Array<{
    timestamp: Date;
    eventType: string;
    systemicScore: number;
    muscleScores: Record<MuscleGroup, number>;
    eventMetadata?: any;
  }>;
  currentState: {
    systemic: number;
    muscleGroups: Record<MuscleGroup, number>;
  };
}> {
  const { subDays } = await import('date-fns');
  const now = new Date();
  const startDate = subDays(now, days);
  
  // Get timeline events
  const events = await storage.getRecoveryTimelineEvents(userId, startDate, now);
  
  // Get current recovery state
  const currentState = await getCurrentRecoveryState(userId);
  
  return {
    events: events.map(e => ({
      timestamp: new Date(e.timestamp),
      eventType: e.eventType,
      systemicScore: e.systemicScore,
      muscleScores: e.muscleScores as Record<MuscleGroup, number>,
      eventMetadata: e.eventMetadata,
    })),
    currentState: {
      systemic: currentState.systemic,
      muscleGroups: currentState.muscleGroups,
    },
  };
}

/**
 * Initialize muscle group recovery for a new user
 * Creates initial recovery records with 100% scores
 */
export async function initializeMuscleGroupRecovery(userId: string): Promise<void> {
  for (const muscleGroup of MUSCLE_GROUPS) {
    await storage.updateMuscleGroupRecovery(userId, muscleGroup, {
      recoveryScore: 100,
      fatigueDamage: 0,
      lastWorkoutAt: null,
    });
  }
  
  // Record initial baseline
  await recordDailyBaseline(userId);
}
