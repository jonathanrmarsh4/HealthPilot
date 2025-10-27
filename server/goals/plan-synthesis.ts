/**
 * Plan Synthesis - Convert conversational context into structured goals
 * 
 * Takes the extracted context from a goal conversation and synthesizes:
 * - Appropriate goal type and metrics
 * - Progressive training plans
 * - Milestones tailored to ability level
 * 
 * Key principles:
 * - Beginner goals → session-based metrics (3x/week sessions)
 * - Advanced goals → volume-based metrics (weekly distance/volume)
 * - Progressive overload with appropriate periodization
 */

import type { ExtractedContext } from './conversation-intelligence';
import type { InsertGoal, InsertGoalMetric, InsertGoalMilestone, InsertGoalPlan } from '@shared/schema';
import { addWeeks, addMonths, format } from 'date-fns';

export interface SynthesizedGoal {
  goal: Omit<InsertGoal, 'id' | 'userId'>;
  metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[];
  milestones: Omit<InsertGoalMilestone, 'id' | 'goalId'>[];
  plans: Omit<InsertGoalPlan, 'id' | 'goalId'>[];
}

/**
 * Main synthesis function - converts extracted context into structured goal
 */
export async function synthesizeGoal(
  context: ExtractedContext,
  initialInput: string,
  userId: string
): Promise<SynthesizedGoal> {
  const isBeginner = context.fitnessLevel === 'beginner' || context.goalType === 'beginner_fitness';
  const isRunningGoal = initialInput.toLowerCase().includes('run');
  const isStrengthGoal = initialInput.toLowerCase().includes('lift') || initialInput.toLowerCase().includes('strength');

  // Determine goal parameters
  const targetDate = context.targetDetails?.targetDate 
    ? new Date(context.targetDetails.targetDate)
    : addMonths(new Date(), isBeginner ? 3 : 2); // Beginners get more time

  const displayName = generateDisplayName(initialInput, context);

  // Build goal object
  const goal: Omit<InsertGoal, 'id' | 'userId'> = {
    name: displayName,
    description: `${context.motivation || 'Personal goal'} - ${context.underlyingNeed || 'Building fitness'}`,
    category: isRunningGoal ? 'endurance' : isStrengthGoal ? 'strength' : 'fitness',
    targetValue: 1, // Placeholder - actual tracking via metrics
    currentValue: 0,
    targetDate,
    unit: 'completion',
    status: 'active',
    priority: 'high',
  };

  // Build metrics based on fitness level
  const metrics = isBeginner 
    ? buildBeginnerMetrics(context, isRunningGoal)
    : buildAdvancedMetrics(context, isRunningGoal);

  // Build milestones
  const milestones = buildMilestones(context, targetDate, isBeginner);

  // Build training plan
  const plans = await buildTrainingPlan(context, isBeginner, isRunningGoal, targetDate);

  return {
    goal,
    metrics,
    milestones,
    plans,
  };
}

/**
 * Generate a friendly display name for the goal
 */
function generateDisplayName(initialInput: string, context: ExtractedContext): string {
  // Clean up the initial input
  let name = initialInput.trim();
  
  // Remove common prefixes
  name = name.replace(/^(i want to|i'd like to|i would like to|my goal is to)\s+/i, '');
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name;
}

/**
 * Build metrics for beginner users
 * Focus on SESSION COUNT, not volume/distance
 */
function buildBeginnerMetrics(context: ExtractedContext, isRunning: boolean): Omit<InsertGoalMetric, 'id' | 'goalId'>[] {
  const sessionsPerWeek = context.timeAvailability?.sessionsPerWeek || 3;
  
  const metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[] = [
    {
      metricKey: 'weekly_sessions',
      displayName: 'Training Sessions per Week',
      targetValue: sessionsPerWeek,
      currentValue: 0,
      unit: 'sessions',
      trackingFrequency: 'weekly',
      dataSource: 'manual',
      priority: 1,
    },
    {
      metricKey: 'consistency_streak',
      displayName: 'Consistency Streak',
      targetValue: 4, // 4 weeks of consistency
      currentValue: 0,
      unit: 'weeks',
      trackingFrequency: 'weekly',
      dataSource: 'manual',
      priority: 2,
    },
  ];

  // Add goal-specific metric
  if (isRunning) {
    // For running beginners, track longest continuous run (not total distance!)
    metrics.push({
      metricKey: 'longest_continuous_run',
      displayName: 'Longest Continuous Run',
      targetValue: context.targetDetails?.distance || 5, // Default to 5km
      currentValue: 0,
      unit: 'km',
      trackingFrequency: 'as_achieved',
      dataSource: 'manual',
      priority: 3,
    });
  }

  return metrics;
}

/**
 * Build metrics for advanced users
 * Can use volume/distance based tracking
 */
function buildAdvancedMetrics(context: ExtractedContext, isRunning: boolean): Omit<InsertGoalMetric, 'id' | 'goalId'>[] {
  const metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[] = [];

  if (isRunning) {
    // Advanced runners track weekly volume
    metrics.push({
      metricKey: 'weekly_running_distance',
      displayName: 'Weekly Running Distance',
      targetValue: 40, // Example for marathon training
      currentValue: 0,
      unit: 'km',
      trackingFrequency: 'weekly',
      dataSource: 'healthkit',
      priority: 1,
    });

    metrics.push({
      metricKey: 'long_run_distance',
      displayName: 'Long Run Distance',
      targetValue: context.targetDetails?.distance || 21, // Half marathon default
      currentValue: 0,
      unit: 'km',
      trackingFrequency: 'weekly',
      dataSource: 'healthkit',
      priority: 2,
    });
  }

  return metrics;
}

/**
 * Build progressive milestones
 */
function buildMilestones(
  context: ExtractedContext,
  targetDate: Date,
  isBeginner: boolean
): Omit<InsertGoalMilestone, 'id' | 'goalId'>[] {
  const milestones: Omit<InsertGoalMilestone, 'id' | 'goalId'>[] = [];
  const weeks = Math.floor((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000));

  if (isBeginner) {
    // Week 2: First milestone
    milestones.push({
      name: 'Complete first week of training',
      description: 'Build the habit - consistency is key!',
      dueDate: addWeeks(new Date(), 1),
      targetValue: 3,
      unit: 'sessions',
      status: 'pending',
      orderIndex: 1,
    });

    // Week 4: Consistency milestone
    milestones.push({
      name: 'One month of consistency',
      description: 'You\'re building a solid foundation',
      dueDate: addWeeks(new Date(), 4),
      targetValue: 12,
      unit: 'sessions',
      status: 'pending',
      orderIndex: 2,
    });

    // Week 8: Progress milestone
    milestones.push({
      name: 'Halfway there',
      description: 'You should feel stronger and more confident',
      dueDate: addWeeks(new Date(), Math.floor(weeks / 2)),
      targetValue: Math.floor(weeks / 2) * (context.timeAvailability?.sessionsPerWeek || 3),
      unit: 'sessions',
      status: 'pending',
      orderIndex: 3,
    });

    // Final milestone
    milestones.push({
      name: 'Goal achieved!',
      description: context.motivation || 'You did it!',
      dueDate: targetDate,
      targetValue: weeks * (context.timeAvailability?.sessionsPerWeek || 3),
      unit: 'sessions',
      status: 'pending',
      orderIndex: 4,
    });
  } else {
    // Advanced milestones based on volume/performance
    milestones.push({
      name: 'Base building phase complete',
      description: 'Aerobic foundation established',
      dueDate: addWeeks(new Date(), 4),
      targetValue: 120,
      unit: 'km',
      status: 'pending',
      orderIndex: 1,
    });
  }

  return milestones;
}

/**
 * Build progressive training plan
 */
async function buildTrainingPlan(
  context: ExtractedContext,
  isBeginner: boolean,
  isRunning: boolean,
  targetDate: Date
): Promise<Omit<InsertGoalPlan, 'id' | 'goalId'>[]> {
  const plans: Omit<InsertGoalPlan, 'id' | 'goalId'>[] = [];
  const sessionsPerWeek = context.timeAvailability?.sessionsPerWeek || 3;
  const preferredDays = context.timeAvailability?.preferredDays || ['Monday', 'Wednesday', 'Friday'];

  if (isBeginner && isRunning) {
    // Beginner running plan - session-based progression
    plans.push({
      planType: 'training',
      period: 'weekly',
      version: 1,
      isActive: 1,
      contentJson: {
        name: 'Beginner Running Program',
        description: 'Progressive run/walk program to build endurance',
        sessionsPerWeek,
        preferredDays,
        constraints: context.constraints || [],
        progression: [
          {
            week: 1,
            sessions: Array(sessionsPerWeek).fill(null).map((_, i) => ({
              day: preferredDays[i] || `Day ${i + 1}`,
              type: 'run_walk',
              duration: 20,
              structure: 'Walk 5 min warmup, then alternate 1 min run / 2 min walk x 5, walk 5 min cooldown',
              notes: 'Focus on consistent easy pace - you should be able to talk',
            })),
          },
          {
            week: 2,
            sessions: Array(sessionsPerWeek).fill(null).map((_, i) => ({
              day: preferredDays[i] || `Day ${i + 1}`,
              type: 'run_walk',
              duration: 22,
              structure: 'Walk 5 min warmup, then alternate 1.5 min run / 1.5 min walk x 5, walk 5 min cooldown',
              notes: 'Gradual increase in running time',
            })),
          },
          {
            week: 3,
            sessions: Array(sessionsPerWeek).fill(null).map((_, i) => ({
              day: preferredDays[i] || `Day ${i + 1}`,
              type: 'run_walk',
              duration: 25,
              structure: 'Walk 5 min warmup, then alternate 2 min run / 1 min walk x 6, walk 5 min cooldown',
              notes: 'You should start to feel more comfortable running',
            })),
          },
          {
            week: 4,
            sessions: Array(sessionsPerWeek).fill(null).map((_, i) => ({
              day: preferredDays[i] || `Day ${i + 1}`,
              type: 'run_walk',
              duration: 28,
              structure: 'Walk 5 min warmup, then alternate 3 min run / 1 min walk x 5, walk 5 min cooldown',
              notes: 'Building confidence and endurance',
            })),
          },
        ],
      },
    });
  } else if (!isBeginner && isRunning) {
    // Advanced running plan - volume-based
    plans.push({
      planType: 'training',
      period: 'block',
      version: 1,
      isActive: 1,
      contentJson: {
        name: 'Advanced Running Program',
        description: 'Periodized training with volume progression',
        weeklyDistance: 40,
        phases: [
          {
            name: 'Base Building',
            weeks: 4,
            focus: 'Aerobic development',
            weeklyDistance: 35,
          },
          {
            name: 'Build',
            weeks: 4,
            focus: 'Volume and tempo',
            weeklyDistance: 50,
          },
          {
            name: 'Peak',
            weeks: 3,
            focus: 'Race-specific work',
            weeklyDistance: 60,
          },
          {
            name: 'Taper',
            weeks: 2,
            focus: 'Recovery and sharpening',
            weeklyDistance: 30,
          },
        ],
      },
    });
  }

  return plans;
}
