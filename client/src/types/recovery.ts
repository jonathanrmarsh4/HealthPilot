export type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms" | "core";

export interface RecoveryState {
  systemic: number;
  muscleGroups: Record<MuscleGroup, number>;
  biometricFactors: {
    hrv?: number;
    restingHR?: number;
    sleep?: number;
    [key: string]: number | undefined;
  };
}

export interface TimelineEvent {
  date: string;
  systemicScore: number;
  muscleScores: Record<MuscleGroup, number>;
  events?: {
    type: "workout" | "protocol" | "baseline";
    name: string;
    time?: string;
  }[];
}

export function getRecoveryColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function getRecoveryProgressColor(score: number): string {
  if (score >= 80) return "bg-green-600 dark:bg-green-400";
  if (score >= 60) return "bg-blue-600 dark:bg-blue-400";
  if (score >= 40) return "bg-yellow-600 dark:bg-yellow-400";
  return "bg-red-600 dark:bg-red-400";
}
