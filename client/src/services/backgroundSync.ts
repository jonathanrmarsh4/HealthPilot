/**
 * BackgroundSyncService.ts
 * 
 * Manages automatic background HealthKit sync
 * - Monitors app foreground events
 * - Drains background queue when app becomes active
 * - Uploads queued data to backend via existing webhook
 */

import { getHealthKitAdapter } from '@/mobile/adapters/HealthKitAdapter';
import { apiRequest } from '@/lib/queryClient';

export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isMonitoring = false;
  private isUploading = false;

  private constructor() {}

  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Start monitoring for app foreground events and auto-drain
   */
  async start(): Promise<void> {
    if (this.isMonitoring) {
      console.log('[BackgroundSync] Already monitoring');
      return;
    }

    const adapter = getHealthKitAdapter();
    const isAvailable = adapter.isAvailable();
    
    if (!isAvailable) {
      console.log('[BackgroundSync] HealthKit not available, skipping');
      return;
    }

    // Check if background sync is enabled
    const isEnabled = await adapter.isBackgroundSyncEnabled();
    if (!isEnabled) {
      console.log('[BackgroundSync] Background sync not enabled, skipping monitoring');
      return;
    }

    // Start listening for app foreground events
    adapter.startAppStateMonitoring(async () => {
      console.log('[BackgroundSync] App came to foreground, draining queue...');
      await this.drainAndUpload();
    });

    this.isMonitoring = true;
    console.log('[BackgroundSync] Monitoring started');
  }

  /**
   * Stop monitoring for app foreground events
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    const adapter = getHealthKitAdapter();
    adapter.stopAppStateMonitoring();
    
    this.isMonitoring = false;
    console.log('[BackgroundSync] Monitoring stopped');
  }

  /**
   * Drain the background queue and upload to backend
   */
  async drainAndUpload(): Promise<{
    success: boolean;
    samplesUploaded: number;
    error?: string;
  }> {
    if (this.isUploading) {
      console.log('[BackgroundSync] Upload already in progress, skipping');
      return { success: false, samplesUploaded: 0, error: 'Upload already in progress' };
    }

    this.isUploading = true;

    try {
      const adapter = getHealthKitAdapter();
      
      // Get queued data
      const queueData = await adapter.drainBackgroundQueue();
      
      // Check if there's any data to upload
      const totalSamples = Object.values(queueData).reduce((sum, samples) => sum + samples.length, 0);
      
      if (totalSamples === 0) {
        console.log('[BackgroundSync] No queued data to upload');
        return { success: true, samplesUploaded: 0 };
      }

      console.log(`[BackgroundSync] Found ${totalSamples} samples to upload`);
      
      // Transform to backend format
      const backendData = this.transformToBackendFormat(queueData);
      
      // Upload to backend
      await apiRequest('POST', '/api/apple-health/sync', backendData);
      
      console.log(`[BackgroundSync] Successfully uploaded ${totalSamples} samples`);
      
      return {
        success: true,
        samplesUploaded: totalSamples,
      };
    } catch (error: any) {
      console.error('[BackgroundSync] Failed to drain and upload:', error);
      return {
        success: false,
        samplesUploaded: 0,
        error: error.message || 'Upload failed',
      };
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Transform background queue data to match backend API format
   */
  private transformToBackendFormat(queueData: any): any {
    const result: any = {};

    for (const [dataType, samples] of Object.entries(queueData)) {
      if (!Array.isArray(samples) || samples.length === 0) {
        continue;
      }

      // Map internal data type names to backend expected names
      const backendKey = this.mapDataTypeToBackendKey(dataType);
      
      result[backendKey] = samples.map((sample: any) => ({
        value: sample.value,
        unit: sample.unit,
        startDate: sample.date.toISOString ? sample.date.toISOString() : sample.date,
        endDate: sample.date.toISOString ? sample.date.toISOString() : sample.date,
        uuid: sample.uuid || `bg-${Date.now()}-${Math.random()}`,
        sourceName: sample.sourceName || 'HealthKit Background Sync',
        sourceId: sample.sourceId || 'com.apple.health',
      }));
    }

    return result;
  }

  /**
   * Map internal data type names to backend API keys
   */
  private mapDataTypeToBackendKey(dataType: string): string {
    const mapping: Record<string, string> = {
      'steps': 'steps',
      'heartRate': 'heartRate',
      'sleepAnalysis': 'sleep',
      'distance': 'distance',
      'calories': 'calories',
      'weight': 'weight',
      'hrv': 'heartRateVariability',
      'restingHeartRate': 'restingHeartRate',
    };

    return mapping[dataType] || dataType;
  }

  /**
   * Get current queue statistics
   */
  async getQueueStats(): Promise<Record<string, number>> {
    const adapter = getHealthKitAdapter();
    
    if (!adapter.isAvailable()) {
      return {};
    }

    try {
      return await adapter.getBackgroundQueueStats();
    } catch (error) {
      console.error('[BackgroundSync] Failed to get queue stats:', error);
      return {};
    }
  }

  /**
   * Check if background sync is enabled
   */
  async isEnabled(): Promise<boolean> {
    const adapter = getHealthKitAdapter();
    
    if (!adapter.isAvailable()) {
      return false;
    }

    try {
      return await adapter.isBackgroundSyncEnabled();
    } catch (error) {
      console.error('[BackgroundSync] Failed to check if enabled:', error);
      return false;
    }
  }

  /**
   * Enable background sync
   */
  async enable(): Promise<boolean> {
    const adapter = getHealthKitAdapter();
    
    if (!adapter.isAvailable()) {
      console.log('[BackgroundSync] HealthKit not available');
      return false;
    }

    try {
      const success = await adapter.enableBackgroundSync();
      
      if (success) {
        // Start monitoring after enabling
        await this.start();
      }
      
      return success;
    } catch (error) {
      console.error('[BackgroundSync] Failed to enable:', error);
      return false;
    }
  }

  /**
   * Disable background sync
   */
  async disable(): Promise<boolean> {
    const adapter = getHealthKitAdapter();
    
    if (!adapter.isAvailable()) {
      return false;
    }

    try {
      // Stop monitoring first
      this.stop();
      
      // Disable on native side
      return await adapter.disableBackgroundSync();
    } catch (error) {
      console.error('[BackgroundSync] Failed to disable:', error);
      return false;
    }
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
