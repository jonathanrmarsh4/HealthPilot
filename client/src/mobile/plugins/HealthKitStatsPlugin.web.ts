import type { HealthKitStatsPlugin } from './HealthKitStatsPlugin';

export class HealthKitStatsPluginWeb implements HealthKitStatsPlugin {
  async getDailySteps(options: { date: string }): Promise<{
    steps: number;
    date: string;
    timezone: string;
    startOfDay: string;
    endOfDay: string;
  }> {
    console.log('[HealthKitStats] Web fallback - getDailySteps not supported');
    return {
      steps: 0,
      date: options.date,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      startOfDay: options.date,
      endOfDay: options.date,
    };
  }

  async getMultiDayStats(options: { dates: string[] }): Promise<{
    results: Array<{
      steps: number;
      date: string;
    }>;
  }> {
    console.log('[HealthKitStats] Web fallback - getMultiDayStats not supported');
    return {
      results: options.dates.map(date => ({
        steps: 0,
        date,
      })),
    };
  }
}
