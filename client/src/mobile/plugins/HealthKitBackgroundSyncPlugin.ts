import { registerPlugin } from '@capacitor/core';

export interface HealthKitBackgroundSyncPlugin {
  enableBackgroundSync(): Promise<{ success: boolean }>;
  disableBackgroundSync(): Promise<{ success: boolean }>;
  isBackgroundSyncEnabled(): Promise<{ enabled: boolean }>;
  drainBackgroundQueue(): Promise<{ data: Record<string, any[]> }>;
  getBackgroundQueueStats(): Promise<{ stats: Record<string, number> }>;
}

const HealthKitBackgroundSync = registerPlugin<HealthKitBackgroundSyncPlugin>('HealthKitBackgroundSyncPlugin', {
  web: () => ({
    async enableBackgroundSync() {
      return { success: false };
    },
    async disableBackgroundSync() {
      return { success: false };
    },
    async isBackgroundSyncEnabled() {
      return { enabled: false };
    },
    async drainBackgroundQueue() {
      return { data: {} };
    },
    async getBackgroundQueueStats() {
      return { stats: {} };
    },
  }),
});

export default HealthKitBackgroundSync;
