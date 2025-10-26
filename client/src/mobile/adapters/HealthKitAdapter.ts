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

// Lazy load Health plugin only when needed (prevents bundling in web builds)
let Health: any = null;
let healthPluginAttempted = false;

function getHealthPlugin(): any {
  if (!healthPluginAttempted) {
    healthPluginAttempted = true;
    if (typeof window !== 'undefined' && isNativePlatform()) {
      try {
        // Dynamic import only on native platforms
        const healthModule = (window as any).capacitorHealth;
        if (healthModule) {
          Health = healthModule.Health;
        }
      } catch (e) {
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
      console.log('[HealthKit] Requesting authorization for:', permissions.read);
      
      const result = await plugin.requestAuthorization({
        read: permissions.read,
        write: permissions.write || [],
      });

      console.log('[HealthKit] Authorization result:', result);
      return result.granted === true;
    } catch (error: any) {
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
    } catch (error) {
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
      console.log('[HealthKit] Reading samples:', query);

      const result = await plugin.queryHKitSampleType({
        sampleName: query.dataType,
        startDate: query.startDate.toISOString(),
        endDate: query.endDate.toISOString(),
        limit: query.limit || 100,
      });

      if (!result.resultData || result.resultData.length === 0) {
        console.log('[HealthKit] No samples found');
        return [];
      }

      return result.resultData.map((sample: any) => ({
        value: parseFloat(sample.value || sample.quantity || 0),
        unit: sample.unit || '',
        date: new Date(sample.startDate || sample.date),
        sourceId: sample.sourceId,
        sourceName: sample.sourceName,
      }));
    } catch (error: any) {
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
    
    console.log(`[HealthKit] Using ${instance.isAvailable() ? 'Native' : 'Mock'} adapter`);
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
  details?: any;
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
  } catch (error: any) {
    return {
      success: false,
      available: true,
      error: error.message,
    };
  }
}

export default {
  getHealthKitAdapter,
  testHealthKitAdapter,
};
