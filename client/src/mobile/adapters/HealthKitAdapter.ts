/**
 * HealthKitAdapter.ts
 * 
 * Typed TypeScript facade for reading Health data via the capacitor-health plugin.
 * Provides granular scopes, typed queries, and graceful degradation when permissions are denied.
 * 
 * HealthKit Data Types Supported:
 * - Heart Rate (HRV, Resting HR, Active HR)
 * - Oxygen Saturation (SpO2)
 * - Body Temperature
 * - Sleep Analysis
 * - Activity (Steps, Active Energy, Distance)
 * - ECG metadata availability
 */

import { isNativePlatform, getPlatform } from '../MobileBootstrap';

// Type for the Health plugin
interface HealthPlugin {
  requestAuthorization(params: { read: string[]; write: string[] }): Promise<{ granted: boolean }>;
  checkPermissions(params: { read: string[] }): Promise<{ granted: boolean }>;
  query(params: { dataType: string; startDate: string; endDate: string; limit?: number }): Promise<{ resultData: unknown[] }>;
  queryHKitSampleType(params: { sampleName: string; startDate: string; endDate: string; limit?: number }): Promise<{ resultData: RawHealthSample[] }>;
  [key: string]: unknown;
}

// Type for raw data from HealthKit plugin
interface RawHealthSample {
  value?: number;
  quantity?: number;
  unit?: string;
  startDate?: string;
  date?: string;
  sourceId?: string;
  sourceName?: string;
}

// Lazy load Health plugin only when needed (prevents bundling in web builds)
let Health: HealthPlugin | null = null;
let healthPluginAttempted = false;

function getHealthPlugin(): HealthPlugin | null {
  if (!healthPluginAttempted) {
    healthPluginAttempted = true;
    if (typeof window !== 'undefined' && isNativePlatform()) {
      try {
        // Dynamic import only on native platforms
        const healthModule = (window as unknown as { capacitorHealth?: { Health: HealthPlugin } }).capacitorHealth;
        if (healthModule) {
          Health = healthModule.Health;
        }
      } catch {
        console.warn('[HealthKit] capacitor-health plugin not available');
      }
    }
  }
  return Health;
}

export type HealthDataType =
  | 'heartRate'
  | 'heartRateVariability'
  | 'restingHeartRate'
  | 'oxygenSaturation'
  | 'bodyTemperature'
  | 'sleepAnalysis'
  | 'steps'
  | 'activeEnergyBurned'
  | 'distanceWalkingRunning'
  | 'ecgCount';

export interface HealthKitPermissions {
  read: HealthDataType[];
  write?: HealthDataType[];
}

export interface HealthDataQuery {
  dataType: HealthDataType;
  startDate: Date;
  endDate: Date;
  limit?: number;
}

export interface HealthDataSample {
  value: number;
  unit: string;
  date: Date;
  sourceId?: string;
  sourceName?: string;
}

export interface BackgroundQueueData {
  [dataType: string]: HealthDataSample[];
}

export interface HealthKitAdapter {
  isAvailable(): boolean;
  requestAuthorization(permissions: HealthKitPermissions): Promise<boolean>;
  checkPermission(dataType: HealthDataType): Promise<'authorized' | 'denied' | 'notDetermined'>;
  readSamples(query: HealthDataQuery): Promise<HealthDataSample[]>;
  getLatestSample(dataType: HealthDataType): Promise<HealthDataSample | null>;
}

/**
 * Native HealthKit implementation (iOS only)
 */
class NativeHealthKitAdapter implements HealthKitAdapter {
  
  isAvailable(): boolean {
    return getPlatform() === 'ios';
  }

  async requestAuthorization(permissions: HealthKitPermissions): Promise<boolean> {
    const plugin = getHealthPlugin();
    if (!this.isAvailable() || !plugin) {
      console.warn('[HealthKit] Not available on this platform');
      return false;
    }

    try {
      const result = await plugin.requestAuthorization({
        read: permissions.read,
        write: permissions.write || [],
      });

      return result.granted === true;
    } catch (error) {
      console.error('[HealthKit] Authorization failed:', error);
      return false;
    }
  }

  async checkPermission(dataType: HealthDataType): Promise<'authorized' | 'denied' | 'notDetermined'> {
    const plugin = getHealthPlugin();
    if (!this.isAvailable() || !plugin) {
      return 'denied';
    }

    try {
      const result = await plugin.checkPermissions({
        read: [dataType],
      });

      return result.granted ? 'authorized' : 'denied';
    } catch {
      return 'notDetermined';
    }
  }

  async readSamples(query: HealthDataQuery): Promise<HealthDataSample[]> {
    const plugin = getHealthPlugin();
    if (!this.isAvailable() || !plugin) {
      console.warn('[HealthKit] Not available on this platform');
      return [];
    }

    try {
      const result = await plugin.queryHKitSampleType({
        sampleName: query.dataType,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        limit: query.limit || 100,
      });

      if (!result.resultData || result.resultData.length === 0) {
        return [];
      }

      return result.resultData.map((sample) => ({
        value: parseFloat(sample.value || sample.quantity || 0),
        unit: sample.unit || '',
        date: new Date(sample.startDate || sample.date),
        sourceId: sample.sourceId,
        sourceName: sample.sourceName,
      }));
    } catch (error) {
      console.error('[HealthKit] Failed to read samples:', error);
      return [];
    }
  }

  async getLatestSample(dataType: HealthDataType): Promise<HealthDataSample | null> {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const samples = await this.readSamples({
      dataType,
      startDate: last30Days,
      endDate: now,
      limit: 1,
    });

    return samples.length > 0 ? samples[0] : null;
  }
  
}

/**
 * Mock adapter for web/Android (graceful degradation)
 */
class MockHealthKitAdapter implements HealthKitAdapter {
  isAvailable(): boolean {
    return false;
  }

  async requestAuthorization(_permissions: HealthKitPermissions): Promise<boolean> {
    console.warn('[HealthKit] Mock adapter: authorization not available');
    return false;
  }

  async checkPermission(_dataType: HealthDataType): Promise<'authorized' | 'denied' | 'notDetermined'> {
    return 'denied';
  }

  async readSamples(_query: HealthDataQuery): Promise<HealthDataSample[]> {
    console.warn('[HealthKit] Mock adapter: no samples available');
    return [];
  }

  async getLatestSample(_dataType: HealthDataType): Promise<HealthDataSample | null> {
    return null;
  }
  
}

/**
 * Singleton instance
 */
let instance: HealthKitAdapter | null = null;

export function getHealthKitAdapter(): HealthKitAdapter {
  if (!instance) {
    instance = isNativePlatform() && getPlatform() === 'ios'
      ? new NativeHealthKitAdapter()
      : new MockHealthKitAdapter();
  }
  return instance;
}

/**
 * Test the HealthKit adapter
 */
export async function testHealthKitAdapter(): Promise<{
  success: boolean;
  available: boolean;
  error?: string;
  details?: {
    message?: string;
    platform?: string;
    heartRatePermission?: string;
  };
}> {
  const adapter = getHealthKitAdapter();
  const available = adapter.isAvailable();

  if (!available) {
    return {
      success: true,
      available: false,
      details: { message: 'HealthKit not available on this platform (expected on web/Android)' },
    };
  }

  try {
    // Test permission check
    const permission = await adapter.checkPermission('heartRate');
    
    return {
      success: true,
      available: true,
      details: {
        platform: getPlatform(),
        heartRatePermission: permission,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      available: true,
      error: errorMessage,
    };
  }
}

export default {
  getHealthKitAdapter,
  testHealthKitAdapter,
};
