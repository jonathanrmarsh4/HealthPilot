import { registerPlugin } from '@capacitor/core';

export interface HealthKitStatsPlugin {
  getDailySteps(options: { date: string }): Promise<{
    steps: number;
    date: string;
    timezone: string;
    startOfDay: string;
    endOfDay: string;
  }>;
  
  getMultiDayStats(options: { dates: string[] }): Promise<{
    results: Array<{
      steps: number;
      date: string;
    }>;
  }>;
}

const HealthKitStats = registerPlugin<HealthKitStatsPlugin>('HealthKitStatsPluginV2', {
  web: () => import('./HealthKitStatsPlugin.web').then(m => new m.HealthKitStatsPluginWeb()),
});

export default HealthKitStats;
