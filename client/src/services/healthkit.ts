import { Capacitor } from '@capacitor/core';
import { Health } from 'capacitor-health';

export interface HealthDataSample {
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  uuid?: string;
}

/**
 * HealthKit service for iOS native health data integration
 * Uses capacitor-health plugin - limited to supported data types:
 * - Steps, Active Calories, Workouts, Heart Rate (via workouts), Distance (via workouts)
 */
export class HealthKitService {
  private static instance: HealthKitService;
  private isAvailable: boolean | null = null;

  private constructor() {}

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * Check if HealthKit is available on this device
   */
  async isHealthKitAvailable(): Promise<boolean> {
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      if (Capacitor.getPlatform() !== 'ios') {
        this.isAvailable = false;
        return false;
      }

      const timeoutPromise = new Promise<{ available: boolean }>((_, reject) => {
        setTimeout(() => reject(new Error('HealthKit availability check timed out after 8s')), 8000);
      });
      
      const availabilityPromise = Health.isHealthAvailable();
      const result = await Promise.race([availabilityPromise, timeoutPromise]);
      
      this.isAvailable = result?.available ?? false;
      console.log('[HealthKit] Availability check result:', this.isAvailable);
      return this.isAvailable;
    } catch (error: any) {
      const isTimeout = error?.message?.includes('timed out');
      console.warn(`[HealthKit] Plugin check failed (timeout: ${isTimeout}):`, error.message);
      return false;
    }
  }

  /**
   * Request permissions for supported health data types
   * capacitor-health only supports: steps, workouts, active calories, total calories, distance, heart rate, mindfulness
   */
  async requestPermissions(): Promise<boolean> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('[HealthKit] Not available on this platform');
      return false;
    }

    try {
      console.log('[HealthKit] Requesting permissions...');
      
      const result = await Health.requestHealthPermissions({
        permissions: [
          'READ_STEPS',
          'READ_WORKOUTS',
          'READ_ACTIVE_CALORIES',
          'READ_TOTAL_CALORIES',
          'READ_DISTANCE',
          'READ_HEART_RATE',
        ]
      });

      console.log('[HealthKit] Permission request result:', result);
      return true; // iOS always returns true (can't detect if denied)
    } catch (error) {
      console.error('[HealthKit] Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Get steps data
   */
  async getSteps(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    try {
      const result = await Health.queryAggregated({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataType: 'steps',
        bucket: 'day'
      });

      return result.aggregatedData.map(sample => ({
        value: sample.value,
        unit: 'count',
        startDate: sample.startDate,
        endDate: sample.endDate,
      }));
    } catch (error) {
      console.error('[HealthKit] Failed to get steps:', error);
      return [];
    }
  }

  /**
   * Get active calories data
   */
  async getActiveCalories(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    try {
      const result = await Health.queryAggregated({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        dataType: 'active-calories',
        bucket: 'day'
      });

      return result.aggregatedData.map(sample => ({
        value: sample.value,
        unit: 'kcal',
        startDate: sample.startDate,
        endDate: sample.endDate,
      }));
    } catch (error) {
      console.error('[HealthKit] Failed to get active calories:', error);
      return [];
    }
  }

  /**
   * Get workouts with optional heart rate, route, and steps
   */
  async getWorkouts(startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const result = await Health.queryWorkouts({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeHeartRate: true,
        includeRoute: false,
        includeSteps: true,
      });

      return result.workouts || [];
    } catch (error) {
      console.error('[HealthKit] Failed to get workouts:', error);
      return [];
    }
  }

  /**
   * Retrieve all supported health data from HealthKit
   * Limited to what capacitor-health plugin supports
   */
  async getAllHealthData(daysBack: number = 30): Promise<{
    steps: HealthDataSample[];
    activeCalories: HealthDataSample[];
    workouts: any[];
  }> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('[HealthKit] Not available, returning empty data');
      return {
        steps: [],
        activeCalories: [],
        workouts: [],
      };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    try {
      const [steps, activeCalories, workouts] = await Promise.all([
        this.getSteps(startDate, endDate),
        this.getActiveCalories(startDate, endDate),
        this.getWorkouts(startDate, endDate),
      ]);

      console.log('[HealthKit] Health data retrieved:', {
        steps: steps.length,
        activeCalories: activeCalories.length,
        workouts: workouts.length,
      });

      return {
        steps,
        activeCalories,
        workouts,
      };
    } catch (error) {
      console.error('[HealthKit] Failed to retrieve health data:', error);
      throw error;
    }
  }

  /**
   * @deprecated Use getAllHealthData() and send to backend from the caller
   */
  async syncAllHealthData(daysBack: number = 30): Promise<void> {
    console.warn('[HealthKit] syncAllHealthData() is deprecated. Use getAllHealthData() instead.');
    await this.getAllHealthData(daysBack);
  }
}

// Export singleton instance
export const healthKitService = HealthKitService.getInstance();
