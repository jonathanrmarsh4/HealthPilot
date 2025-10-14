import type { IStorage } from "../storage";
import { subDays } from "date-fns";

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
}

/**
 * Calculate daily readiness score based on sleep, HRV, resting HR, and workout load
 * Safety-first approach: prioritizes recovery signals over training plans
 */
export async function calculateReadinessScore(
  userId: number,
  storage: IStorage,
  targetDate: Date = new Date()
): Promise<ReadinessScore> {
  
  // Weights for each factor (must sum to 1.0)
  const WEIGHTS = {
    sleep: 0.40,      // 40% - Most important for recovery
    hrv: 0.30,        // 30% - Key nervous system indicator
    restingHR: 0.15,  // 15% - Secondary vital sign
    workload: 0.15    // 15% - Training load impact
  };

  const factors = {
    sleep: { score: 50, weight: WEIGHTS.sleep, value: undefined as number | undefined },
    hrv: { score: 50, weight: WEIGHTS.hrv, value: undefined as number | undefined },
    restingHR: { score: 50, weight: WEIGHTS.restingHR, value: undefined as number | undefined },
    workloadRecovery: { score: 50, weight: WEIGHTS.workload }
  };

  const userIdStr = String(userId);

  // 1. Sleep Quality Score (0-100)
  const yesterday = subDays(targetDate, 1);
  const sleepSessions = await storage.getSleepSessions(userIdStr);
  const recentSleep = sleepSessions
    .filter(s => {
      const sessionDate = new Date(s.bedtime);
      return sessionDate >= subDays(yesterday, 1) && sessionDate <= targetDate;
    })
    .sort((a, b) => new Date(b.bedtime).getTime() - new Date(a.bedtime).getTime())[0];

  if (recentSleep && recentSleep.sleepScore) {
    factors.sleep.score = recentSleep.sleepScore;
    factors.sleep.value = recentSleep.totalMinutes / 60; // hours
  }

  // 2. HRV Score (0-100) - Higher HRV = Better recovery
  const biomarkers = await storage.getBiomarkers(userIdStr);
  const recentHRV = biomarkers
    .filter(b => b.type === 'hrv')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      return bioDate >= subDays(targetDate, 2) && bioDate <= targetDate;
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  if (recentHRV) {
    const hrvValue = recentHRV.value;
    factors.hrv.value = hrvValue;
    
    // HRV scoring: 40-100ms range (SDNN for active individuals)
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

  // 3. Resting Heart Rate Score (0-100) - Lower RHR = Better recovery
  const recentRHR = biomarkers
    .filter(b => b.type === 'heart-rate')
    .filter(b => {
      const bioDate = new Date(b.recordedAt);
      return bioDate >= subDays(targetDate, 2) && bioDate <= targetDate;
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0];

  if (recentRHR) {
    const rhr = recentRHR.value;
    factors.restingHR.value = rhr;
    
    // RHR scoring: Lower is better for athletes
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

  // 4. Workload Recovery Score (0-100) - Based on recent training load
  const workoutSessions = await storage.getWorkoutSessions(userIdStr);
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

  return {
    score: totalScore,
    quality,
    factors,
    recommendation,
    reasoning
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
