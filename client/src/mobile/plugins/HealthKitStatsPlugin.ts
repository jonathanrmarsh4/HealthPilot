import { registerPlugin } from '@capacitor/core';

export interface DailyStepsResult {
  steps: number;
  date: string;
  timezone: string;
  startOfDay: string;
  endOfDay: string;
}

export interface MultiDayStatsResult {
  results: {
    steps: number;
    date: string;
    timezone: string;
  }[];
}

export interface HealthKitStatsPlugin {
  /**
   * Get deduplicated step count for a specific day using device's current timezone
   * @param options.date ISO 8601 date string (e.g., "2024-11-02T00:00:00Z")
   */
  getDailySteps(options: { date: string }): Promise<DailyStepsResult>;
  
  /**
   * Get deduplicated step counts for multiple days
   * @param options.dates Array of ISO 8601 date strings
   */
  getMultiDayStats(options: { dates: string[] }): Promise<MultiDayStatsResult>;
}

const HealthKitStats = registerPlugin<HealthKitStatsPlugin>('HealthKitStatsPlugin', {
  web: () => ({
    async getDailySteps() {
      return { steps: 0, date: '', timezone: 'UTC', startOfDay: '', endOfDay: '' };
    },
    async getMultiDayStats() {
      return { results: [] };
    },
  }),
});

export default HealthKitStats;
