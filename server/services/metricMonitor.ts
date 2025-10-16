import { db } from "../db";
import { biomarkers, goals, workoutSessions, sleepSessions, reminderCompletions, userResponsePatterns, proactiveSuggestions } from "@shared/schema";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

export interface MetricDeficit {
  metricType: 'steps' | 'active_minutes' | 'sleep' | 'supplements' | 'workouts';
  currentValue: number;
  targetValue: number;
  deficit: number;
  priority: 'high' | 'medium' | 'low';
}

interface OptimalTiming {
  timeOfDay: string;
  hourOfDay: number;
  acceptanceRate: number;
}

export class MetricMonitorService {
  /**
   * Check all metrics for a user and identify deficits
   */
  async checkMetrics(userId: string): Promise<MetricDeficit[]> {
    const deficits: MetricDeficit[] = [];
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // 1. Check Steps
    const stepsDeficit = await this.checkSteps(userId, startOfToday, endOfToday);
    if (stepsDeficit) deficits.push(stepsDeficit);

    // 2. Check Active Minutes
    const activeMinutesDeficit = await this.checkActiveMinutes(userId, startOfToday, endOfToday);
    if (activeMinutesDeficit) deficits.push(activeMinutesDeficit);

    // 3. Check Sleep (for last night)
    const sleepDeficit = await this.checkSleep(userId);
    if (sleepDeficit) deficits.push(sleepDeficit);

    // 4. Check Supplements
    const supplementsDeficit = await this.checkSupplements(userId, startOfToday);
    if (supplementsDeficit) deficits.push(supplementsDeficit);

    // 5. Check Workouts
    const workoutsDeficit = await this.checkWorkouts(userId, startOfToday, endOfToday);
    if (workoutsDeficit) deficits.push(workoutsDeficit);

    return deficits;
  }

  /**
   * Check steps progress
   */
  private async checkSteps(userId: string, startOfToday: Date, endOfToday: Date): Promise<MetricDeficit | null> {
    // Get steps goal
    const stepsGoal = await db.select()
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.metricType, 'steps'),
        eq(goals.status, 'active')
      ))
      .limit(1);

    if (!stepsGoal.length) return null;

    // Get today's steps from biomarkers
    const todaysSteps = await db.select()
      .from(biomarkers)
      .where(and(
        eq(biomarkers.userId, userId),
        eq(biomarkers.type, 'steps'),
        gte(biomarkers.recordedAt, startOfToday),
        lte(biomarkers.recordedAt, endOfToday)
      ))
      .orderBy(desc(biomarkers.recordedAt))
      .limit(1);

    const currentSteps = todaysSteps.length > 0 ? todaysSteps[0].value : 0;
    const targetSteps = stepsGoal[0].targetValue;
    const deficit = targetSteps - currentSteps;

    // Only return deficit if significantly behind
    if (deficit > 1000) {
      return {
        metricType: 'steps',
        currentValue: currentSteps,
        targetValue: targetSteps,
        deficit,
        priority: deficit > 5000 ? 'high' : deficit > 3000 ? 'medium' : 'low'
      };
    }

    return null;
  }

  /**
   * Check active minutes progress
   */
  private async checkActiveMinutes(userId: string, startOfToday: Date, endOfToday: Date): Promise<MetricDeficit | null> {
    // Get active minutes goal
    const activeGoal = await db.select()
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.metricType, 'active_minutes'),
        eq(goals.status, 'active')
      ))
      .limit(1);

    if (!activeGoal.length) return null;

    // Calculate today's active minutes from workouts
    const todaysWorkouts = await db.select()
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startTime, startOfToday),
        lte(workoutSessions.endTime, endOfToday)
      ));

    const currentMinutes = todaysWorkouts.reduce((sum, w) => sum + (w.duration || 0), 0);
    const targetMinutes = activeGoal[0].targetValue;
    const deficit = targetMinutes - currentMinutes;

    // Only return deficit if significantly behind
    if (deficit > 15) {
      return {
        metricType: 'active_minutes',
        currentValue: currentMinutes,
        targetValue: targetMinutes,
        deficit,
        priority: deficit > 45 ? 'high' : deficit > 30 ? 'medium' : 'low'
      };
    }

    return null;
  }

  /**
   * Check sleep quality (for last night)
   */
  private async checkSleep(userId: string): Promise<MetricDeficit | null> {
    // Get sleep goal
    const sleepGoal = await db.select()
      .from(goals)
      .where(and(
        eq(goals.userId, userId),
        eq(goals.metricType, 'sleep_hours'),
        eq(goals.status, 'active')
      ))
      .limit(1);

    if (!sleepGoal.length) return null;

    // Get last night's sleep
    const yesterday = subDays(new Date(), 1);
    const lastSleep = await db.select()
      .from(sleepSessions)
      .where(and(
        eq(sleepSessions.userId, userId),
        gte(sleepSessions.bedtime, startOfDay(yesterday))
      ))
      .orderBy(desc(sleepSessions.bedtime))
      .limit(1);

    if (!lastSleep.length) return null;

    const currentHours = (lastSleep[0].totalMinutes || 0) / 60;
    const targetHours = sleepGoal[0].targetValue;
    const deficit = targetHours - currentHours;

    // Only return deficit if significantly behind (already happened, so low priority)
    if (deficit > 1) {
      return {
        metricType: 'sleep',
        currentValue: currentHours,
        targetValue: targetHours,
        deficit,
        priority: 'low' // Can't fix past sleep, but can suggest recovery
      };
    }

    return null;
  }

  /**
   * Check supplement adherence
   */
  private async checkSupplements(userId: string, startOfToday: Date): Promise<MetricDeficit | null> {
    const todayStr = format(startOfToday, 'yyyy-MM-dd');

    // Count today's completed supplements
    const completed = await db.select({ count: sql<number>`count(*)` })
      .from(reminderCompletions)
      .where(and(
        eq(reminderCompletions.userId, userId),
        eq(reminderCompletions.date, todayStr)
      ));

    const completedCount = Number(completed[0]?.count || 0);

    // This is a simpler check - we'll suggest if no supplements taken today
    // In a full implementation, we'd check against total active supplements
    if (completedCount === 0) {
      return {
        metricType: 'supplements',
        currentValue: 0,
        targetValue: 1, // At least one supplement
        deficit: 1,
        priority: 'low'
      };
    }

    return null;
  }

  /**
   * Check workout completion
   */
  private async checkWorkouts(userId: string, startOfToday: Date, endOfToday: Date): Promise<MetricDeficit | null> {
    // Check if workout was completed today
    const todaysWorkouts = await db.select()
      .from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        gte(workoutSessions.startTime, startOfToday),
        lte(workoutSessions.endTime, endOfToday)
      ));

    // If no workout today, suggest one
    if (todaysWorkouts.length === 0) {
      return {
        metricType: 'workouts',
        currentValue: 0,
        targetValue: 1,
        deficit: 1,
        priority: 'medium'
      };
    }

    return null;
  }

  /**
   * Learn optimal intervention timing for a user
   */
  async getOptimalTiming(userId: string, metricType: string): Promise<OptimalTiming | null> {
    // Get user's response patterns for this metric type
    const patterns = await db.select()
      .from(userResponsePatterns)
      .where(and(
        eq(userResponsePatterns.userId, userId),
        eq(userResponsePatterns.metricType, metricType)
      ));

    if (patterns.length === 0) return null;

    // Group by time of day and calculate acceptance rate
    const timeGroups = patterns.reduce((acc, pattern) => {
      const key = `${pattern.timeOfDay}_${pattern.hourOfDay}`;
      if (!acc[key]) {
        acc[key] = { 
          timeOfDay: pattern.timeOfDay,
          hourOfDay: pattern.hourOfDay,
          total: 0,
          accepted: 0
        };
      }
      acc[key].total++;
      if (pattern.response === 'accepted') {
        acc[key].accepted++;
      }
      return acc;
    }, {} as Record<string, { timeOfDay: string; hourOfDay: number; total: number; accepted: number }>);

    // Find time slot with highest acceptance rate
    let bestTiming: OptimalTiming | null = null;
    let highestRate = 0;

    Object.values(timeGroups).forEach(group => {
      const rate = group.accepted / group.total;
      if (rate > highestRate && group.total >= 3) { // Need at least 3 samples
        highestRate = rate;
        bestTiming = {
          timeOfDay: group.timeOfDay,
          hourOfDay: group.hourOfDay,
          acceptanceRate: rate
        };
      }
    });

    return bestTiming;
  }

  /**
   * Check if we should intervene now based on optimal timing
   */
  async shouldIntervene(userId: string, metricType: string): Promise<boolean> {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Get optimal timing if we have learned it
    const optimalTiming = await this.getOptimalTiming(userId, metricType);
    
    if (optimalTiming) {
      // If we know user's preferred time, only intervene then
      // Allow ±1 hour window
      const hourDiff = Math.abs(currentHour - optimalTiming.hourOfDay);
      return hourDiff <= 1;
    }

    // Default intervention windows if we haven't learned user's patterns yet
    // Morning: 6-9, Afternoon: 12-14, Evening: 17-21
    const timeOfDay = this.getTimeOfDay(currentHour);
    
    // For steps/activity, best to intervene in evening when there's still time
    if (metricType === 'steps' || metricType === 'active_minutes') {
      return timeOfDay === 'evening';
    }

    // For workouts, afternoon or evening
    if (metricType === 'workouts') {
      return timeOfDay === 'afternoon' || timeOfDay === 'evening';
    }

    // For supplements, morning or with meals
    if (metricType === 'supplements') {
      return timeOfDay === 'morning' || timeOfDay === 'afternoon';
    }

    return false;
  }

  /**
   * Get time of day category
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /**
   * Check if suggestion already exists and is still valid
   */
  async hasActiveSuggestion(userId: string, metricType: string): Promise<boolean> {
    const activeSuggestion = await db.select()
      .from(proactiveSuggestions)
      .where(and(
        eq(proactiveSuggestions.userId, userId),
        eq(proactiveSuggestions.metricType, metricType),
        eq(proactiveSuggestions.status, 'pending'),
        gte(proactiveSuggestions.expiresAt, new Date())
      ))
      .limit(1);

    return activeSuggestion.length > 0;
  }
}

export const metricMonitor = new MetricMonitorService();
