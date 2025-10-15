import type { IStorage } from "../storage";
import { subDays, addDays, startOfDay, endOfDay } from "date-fns";

export interface ReadinessScore {
  score: number; // 0-100
  quality: "excellent" | "good" | "fair" | "poor";
  factors: {
    sleep: { score: number; weight: number; value?: number };
    hrv: { score: number; weight: number; value?: number };
    restingHR: { score: number; weight: number; value?: number };
    workloadRecovery: { score: number; weight: number };
  };
  recommendation: "ready" | "caution" | "rest";
  reasoning: string;
  recoveryEstimate?: {
    daysUntilReady: number;
    trend: "improving" | "declining" | "stable";
    confidence: "high" | "medium" | "low";
  };
}

/**
 * Calculate daily readiness score based on sleep, HRV, resting HR, and workout load
 * Safety-first approach: prioritizes recovery signals over training plans
 */
export async function calculateReadinessScore(
  userId: string,
  storage: IStorage,
  targetDate: Date = new Date()
): Promise<ReadinessScore> {
  
  // Fetch user's custom weights or use defaults
  const settings = await storage.getReadinessSettings(userId);
  const WEIGHTS = settings ? {
    sleep: settings.sleepWeight,
    hrv: settings.hrvWeight,
    restingHR: settings.restingHRWeight,
    workload: settings.workloadWeight
  } : {
    sleep: 0.45,      // 45% - Most important for recovery
    hrv: 0.30,        // 30% - Key nervous system indicator
    restingHR: 0.15,  // 15% - Secondary vital sign
    workload: 0.10    // 10% - Reduced training load impact for more training flexibility
  };

  // Personal baseline settings
  const usePersonalBaselines = settings?.usePersonalBaselines === 1;
  const personalBaselines = {
    hrv: settings?.personalHrvBaseline,
    restingHR: settings?.personalRestingHrBaseline,
    sleepHours: settings?.personalSleepHoursBaseline
  };

  /**
   * Calculate score based on % deviation from personal baseline
   * @param value - Current measured value
   * @param baseline - User's personal baseline
   * @param higherIsBetter - true for HRV/Sleep, false for Resting HR
   */
  const calculateBaselineScore = (value: number, baseline: number, higherIsBetter: boolean): number => {
    const percentDeviation = ((value - baseline) / baseline) * 100;
    
    if (higherIsBetter) {
      // For HRV and Sleep: higher is better
      // At baseline = 100, above baseline = bonus, below = penalty
      if (percentDeviation >= 0) {
        // Above baseline: 100 + bonus (capped at 100)
        return Math.min(100, 100 + percentDeviation);
      } else {
        // Below baseline: reduce score proportionally
        // -10% = 90 score, -20% = 80 score, etc.
        return Math.max(0, 100 + percentDeviation);
      }
    } else {
      // For Resting HR: lower is better
      // At baseline = 100, below baseline = bonus, above = penalty
      if (percentDeviation <= 0) {
        // Below baseline (lower HR): 100 + bonus (capped at 100)
        return Math.min(100, 100 - percentDeviation);
      } else {
        // Above baseline (higher HR): reduce score proportionally
        // +10% = 90 score, +20% = 80 score, etc.
        return Math.max(0, 100 - percentDeviation);
      }
    }
  };

  const factors = {
    sleep: { score: 50, weight: WEIGHTS.sleep, value: undefined as number | undefined },
    hrv: { score: 50, weight: WEIGHTS.hrv, value: undefined as number | undefined },
    restingHR: { score: 50, weight: WEIGHTS.restingHR, value: undefined as number | undefined },
    workloadRecovery: { score: 50, weight: WEIGHTS.workload }
  };

  // 1. Sleep Quality Score (0-100)
  const yesterday = subDays(targetDate, 1);
  const sleepSessions = await storage.getSleepSessions(userId);
  const recentSleep = sleepSessions
    .filter(s => {
      const sessionDate = new Date(s.bedtime);
      // Allow sessions up to 1 day after target to handle timezone offsets
      // This ensures cross-midnight sessions in positive UTC offsets are included
      return sessionDate >= subDays(yesterday, 1) && sessionDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime())[0];

  if (recentSleep && recentSleep.sleepScore) {
    const sleepHours = recentSleep.totalMinutes / 60;
    factors.sleep.value = sleepHours;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.sleepHours) {
      // Personal baseline scoring for sleep hours
      factors.sleep.score = calculateBaselineScore(sleepHours, personalBaselines.sleepHours, true);
    } else {
      // Standard scoring uses Apple Health sleep score
      factors.sleep.score = recentSleep.sleepScore;
    }
  }

  // 2. HRV Score (0-100) - Higher HRV = Better recovery
  const biomarkers = await storage.getBiomarkers(userId);
  const recentHRV = biomarkers
    .filter(b => b.type === 'hrv')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      // Allow timezone buffer
      return bioDate >= subDays(targetDate, 2) && bioDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  if (recentHRV) {
    const hrvValue = recentHRV.value;
    factors.hrv.value = hrvValue;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.hrv) {
      factors.hrv.score = calculateBaselineScore(hrvValue, personalBaselines.hrv, true);
    } else {
      // Standard HRV scoring: 40-100ms range (SDNN for active individuals)
      // <40ms = poor (0-40), 40-60ms = fair/good (40-75), 60-80ms = good (75-90), >80ms = excellent (90-100)
      if (hrvValue < 40) {
        factors.hrv.score = Math.max(0, (hrvValue / 40) * 40);
      } else if (hrvValue < 60) {
        factors.hrv.score = 40 + ((hrvValue - 40) / 20) * 35;
      } else if (hrvValue < 80) {
        factors.hrv.score = 75 + ((hrvValue - 60) / 20) * 15;
      } else {
        factors.hrv.score = Math.min(100, 90 + ((hrvValue - 80) / 40) * 10);
      }
    }
  }

  // 3. Resting Heart Rate Score (0-100) - Lower RHR = Better recovery
  const recentRHR = biomarkers
    .filter(b => b.type === 'heart-rate')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      // Allow timezone buffer
      return bioDate >= subDays(targetDate, 2) && bioDate <= addDays(targetDate, 1);
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  if (recentRHR) {
    const rhr = recentRHR.value;
    factors.restingHR.value = rhr;
    
    // Use personal baseline if enabled and available
    if (usePersonalBaselines && personalBaselines.restingHR) {
      factors.restingHR.score = calculateBaselineScore(rhr, personalBaselines.restingHR, false);
    } else {
      // Standard RHR scoring: Lower is better for athletes
      // <50 = excellent (90-100), 50-60 = good (70-90), 60-70 = fair (50-70), 70-80 = poor (30-50), >80 = very poor (0-30)
      if (rhr < 50) {
        factors.restingHR.score = Math.min(100, 90 + ((50 - rhr) / 10) * 10);
      } else if (rhr < 60) {
        factors.restingHR.score = 70 + ((60 - rhr) / 10) * 20;
      } else if (rhr < 70) {
        factors.restingHR.score = 50 + ((70 - rhr) / 10) * 20;
      } else if (rhr < 80) {
        factors.restingHR.score = 30 + ((80 - rhr) / 10) * 20;
      } else {
        factors.restingHR.score = Math.max(0, 30 - ((rhr - 80) / 10) * 10);
      }
    }
  }

  // 4. Workload Recovery Score (0-100) - Based on recent training load
  const workoutSessions = await storage.getWorkoutSessions(userId);
  const last7Days = workoutSessions.filter(w => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= subDays(targetDate, 7) && workoutDate < targetDate;
  });

  const last24Hours = workoutSessions.filter(w => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= subDays(targetDate, 1) && workoutDate < targetDate;
  });

  // Calculate intensity from available data (heart rate, workout type, duration)
  const estimateIntensity = (workout: typeof workoutSessions[0]): number => {
    // Recovery sessions are always low intensity
    if (workout.sessionType === 'sauna' || workout.sessionType === 'cold_plunge') {
      return 1;
    }

    // If we have heart rate data, use that
    if (workout.avgHeartRate) {
      if (workout.avgHeartRate < 120) return 1; // low
      if (workout.avgHeartRate < 150) return 2; // moderate
      if (workout.avgHeartRate < 170) return 3; // high
      return 4; // very high
    }

    // Otherwise estimate from workout type
    const highIntensityTypes = ['hiit', 'crossfit', 'running', 'cycling'];
    const moderateTypes = ['strength', 'cardio', 'swimming'];
    
    if (highIntensityTypes.includes(workout.workoutType.toLowerCase())) {
      return 3;
    } else if (moderateTypes.includes(workout.workoutType.toLowerCase())) {
      return 2;
    }
    
    return 2; // default moderate
  };

  let weeklyLoad = 0;
  for (const workout of last7Days) {
    const intensity = estimateIntensity(workout);
    weeklyLoad += intensity * (workout.duration / 60); // hours
  }

  let dailyLoad = 0;
  for (const workout of last24Hours) {
    const intensity = estimateIntensity(workout);
    dailyLoad += intensity * (workout.duration / 60);
  }

  // Workload scoring: Consider both acute (24h) and chronic (7d) load
  // Heavy workout in last 24h = needs more recovery
  if (dailyLoad > 2) {
    // Hard workout yesterday - reduce score significantly
    factors.workloadRecovery.score = Math.max(20, 60 - (dailyLoad * 10));
  } else if (weeklyLoad > 12) {
    // High weekly load - moderate recovery needed
    factors.workloadRecovery.score = Math.max(40, 70 - ((weeklyLoad - 12) * 3));
  } else if (weeklyLoad > 8) {
    // Moderate weekly load - slight recovery consideration
    factors.workloadRecovery.score = 80;
  } else {
    // Low training load - fully recovered
    factors.workloadRecovery.score = 100;
  }

  // Calculate weighted total score
  const totalScore = Math.round(
    factors.sleep.score * factors.sleep.weight +
    factors.hrv.score * factors.hrv.weight +
    factors.restingHR.score * factors.restingHR.weight +
    factors.workloadRecovery.score * factors.workloadRecovery.weight
  );

  // Determine quality and recommendation
  let quality: ReadinessScore["quality"];
  let recommendation: ReadinessScore["recommendation"];
  let reasoning: string;

  if (totalScore >= 80) {
    quality = "excellent";
    recommendation = "ready";
    reasoning = "Your body is well-recovered and ready for challenging workouts. All recovery markers are optimal.";
  } else if (totalScore >= 65) {
    quality = "good";
    recommendation = "ready";
    reasoning = "You're in good shape for training. Consider moderate to high intensity workouts.";
  } else if (totalScore >= 50) {
    quality = "fair";
    recommendation = "caution";
    reasoning = "Your recovery is moderate. Stick to low-moderate intensity workouts or active recovery.";
  } else {
    quality = "poor";
    recommendation = "rest";
    reasoning = "Your body needs rest. Recovery markers indicate you should take it easy or rest completely.";
  }

  // Safety overrides - if any critical factor is very low, recommend rest
  if (factors.sleep.score < 40) {
    recommendation = "rest";
    reasoning = "Poor sleep quality detected. Rest is essential for recovery.";
  } else if (factors.hrv.score < 30 && recentHRV) {
    recommendation = "rest";
    reasoning = "Very low HRV indicates high stress or poor recovery. Rest is recommended.";
  } else if (factors.restingHR.score < 30 && recentRHR) {
    recommendation = "caution";
    reasoning = "Elevated resting heart rate suggests incomplete recovery. Light activity only.";
  }

  // Calculate recovery estimate based on recent trend (last 3 days)
  let recoveryEstimate: ReadinessScore["recoveryEstimate"] | undefined;
  try {
    const recentScores = await storage.getReadinessScores(userId, subDays(targetDate, 3), targetDate);
    
    if (recentScores.length >= 2) {
      // Sort by date ascending to get trend
      const sortedScores = recentScores.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const scores = sortedScores.map(s => s.score);
      
      // Calculate trend using linear regression slope
      const n = scores.length;
      const xMean = (n - 1) / 2;
      const yMean = scores.reduce((sum, val) => sum + val, 0) / n;
      
      let numerator = 0;
      let denominator = 0;
      for (let i = 0; i < n; i++) {
        numerator += (i - xMean) * (scores[i] - yMean);
        denominator += (i - xMean) ** 2;
      }
      
      const slope = denominator !== 0 ? numerator / denominator : 0;
      
      // Determine trend
      let trend: "improving" | "declining" | "stable";
      if (slope > 2) trend = "improving";
      else if (slope < -2) trend = "declining";
      else trend = "stable";
      
      // Estimate days until ready (score >= 65)
      let daysUntilReady = 0;
      const currentScore = totalScore;
      const targetScore = 65;
      
      if (currentScore < targetScore && slope > 0) {
        // Improving trend - estimate based on slope
        daysUntilReady = Math.ceil((targetScore - currentScore) / slope);
        daysUntilReady = Math.min(daysUntilReady, 7); // Cap at 7 days
      } else if (currentScore < targetScore) {
        // Declining or stable - be conservative
        daysUntilReady = trend === "declining" ? 3 : 2;
      }
      
      // Confidence based on data consistency
      const variance = scores.reduce((sum, val) => sum + (val - yMean) ** 2, 0) / n;
      const confidence: "high" | "medium" | "low" = 
        variance < 50 ? "high" : variance < 150 ? "medium" : "low";
      
      recoveryEstimate = {
        daysUntilReady,
        trend,
        confidence
      };
    }
  } catch (error) {
    console.error("Error calculating recovery estimate:", error);
  }

  return {
    score: totalScore,
    quality,
    factors,
    recommendation,
    reasoning,
    recoveryEstimate
  };
}

/**
 * Get quality badge info for readiness score
 */
export function getReadinessQualityInfo(score: number): {
  quality: ReadinessScore["quality"];
  color: string;
  label: string;
} {
  if (score >= 80) {
    return { quality: "excellent", color: "text-green-600 dark:text-green-400", label: "Excellent" };
  } else if (score >= 65) {
    return { quality: "good", color: "text-blue-600 dark:text-blue-400", label: "Good" };
  } else if (score >= 50) {
    return { quality: "fair", color: "text-yellow-600 dark:text-yellow-400", label: "Fair" };
  } else {
    return { quality: "poor", color: "text-red-600 dark:text-red-400", label: "Poor" };
  }
}
