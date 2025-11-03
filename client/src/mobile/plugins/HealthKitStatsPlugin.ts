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
  
  /**
   * Enable background HealthKit delivery monitoring
   */
  enableBackgroundDelivery(): Promise<{ success: boolean; deliveryTypesEnabled?: number }>;
  
  /**
   * Disable background HealthKit delivery monitoring
   */
  disableBackgroundDelivery(): Promise<{ success: boolean }>;
  
  /**
   * Get current sync status and queue statistics
   */
  getSyncStatus(): Promise<{ enabled: boolean; queuedSamples: number; observersActive: number }>;
  
  /**
   * Trigger a foreground sync now (for testing without background delivery)
   */
  triggerBackgroundSyncNow(): Promise<{ success: boolean; dataTypesFetched: number; totalQueuedSamples: number }>;
  
  /**
   * Drain the background queue and return all queued data
   */
  drainBackgroundQueue(): Promise<{ data: Record<string, any[]> }>;
  
  /**
   * Get statistics about the background queue
   */
  getBackgroundQueueStats(): Promise<{ stats: Record<string, number> }>;
  
  /**
   * Reset all stored anchors (for debugging)
   */
  resetAnchors(): Promise<{ success: boolean }>;
}

const HealthKitStats = registerPlugin<HealthKitStatsPlugin>('HealthPilotHKV3', {
  web: () => ({
    async getDailySteps() {
      return { steps: 0, date: '', timezone: 'UTC', startOfDay: '', endOfDay: '' };
    },
    async getMultiDayStats() {
      return { results: [] };
    },
    async enableBackgroundDelivery() {
      return { success: false };
    },
    async disableBackgroundDelivery() {
      return { success: false };
    },
    async getSyncStatus() {
      return { enabled: false, queuedSamples: 0, observersActive: 0 };
    },
    async triggerBackgroundSyncNow() {
      return { success: false, dataTypesFetched: 0, totalQueuedSamples: 0 };
    },
    async drainBackgroundQueue() {
      return { data: {} };
    },
    async getBackgroundQueueStats() {
      return { stats: {} };
    },
    async resetAnchors() {
      return { success: false };
    },
  }),
});

export default HealthKitStats;
