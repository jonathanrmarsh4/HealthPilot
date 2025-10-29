import { Capacitor } from '@capacitor/core';
import { Health } from 'capacitor-health';

// Type augmentation for capacitor-health (incomplete TypeScript definitions)
interface CapacitorHealthPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(options: { read: string[]; write: string[] }): Promise<void>;
  query(options: {
    sampleType: string;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<any[]>;
}

const HealthPlugin = Health as any as CapacitorHealthPlugin;

export interface HealthKitPermissions {
  read: string[];
  write: string[];
}

export interface HealthDataQuery {
  sampleName: string;
  startDate: string;
  endDate: string;
  limit?: number;
}

export interface HealthDataSample {
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  uuid?: string;
}

/**
 * HealthKit service for iOS native health data integration
 * This replaces the webhook-based Apple Health sync with direct HealthKit access
 */
export class HealthKitService {
  private static instance: HealthKitService;
  private isAvailable: boolean | null = null;

  private constructor() {
    // Don't cache availability at construction - check dynamically
  }

  static getInstance(): HealthKitService {
    if (!HealthKitService.instance) {
      HealthKitService.instance = new HealthKitService();
    }
    return HealthKitService.instance;
  }

  /**
   * Check if HealthKit is available on this device
   * Uses plugin availability check, not just platform detection
   * 
   * Important: Does NOT cache timeout/error results to allow retry on next attempt
   */
  async isHealthKitAvailable(): Promise<boolean> {
    // Return cached result ONLY if we successfully determined availability
    if (this.isAvailable !== null) {
      return this.isAvailable;
    }

    try {
      // Check if we're on iOS platform first
      if (Capacitor.getPlatform() !== 'ios') {
        this.isAvailable = false;
        return false;
      }

      // Try to call the plugin to verify it's actually available
      // Add timeout to prevent hanging if plugin doesn't respond
      const timeoutPromise = new Promise<{ available: boolean }>((_, reject) => {
        setTimeout(() => reject(new Error('HealthKit availability check timed out after 8s')), 8000);
      });
      
      const availabilityPromise = HealthPlugin.isAvailable();
      
      const result = await Promise.race([availabilityPromise, timeoutPromise]);
      
      // Only cache the result if we got a definitive answer from the plugin
      this.isAvailable = result?.available ?? false;
      console.log('[HealthKit] Availability check result:', this.isAvailable);
      return this.isAvailable;
    } catch (error: any) {
      // Plugin not available or timed out
      // DO NOT cache false result - allow retry on next attempt
      const isTimeout = error?.message?.includes('timed out');
      console.warn(`[HealthKit] Plugin check failed (timeout: ${isTimeout}):`, error.message);
      
      // Return false for this attempt, but don't cache it
      // This allows the check to be retried later
      return false;
    }
  }

  /**
   * Request permissions for all health data types used by the app
   */
  async requestPermissions(): Promise<boolean> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('HealthKit not available on this platform');
      return false;
    }

    try {
      const permissions: HealthKitPermissions = {
        read: [
          'steps',
          'distance',
          'calories',
          'heart_rate',
          'hrv',
          'sleep',
          'workouts',
          'weight',
          'body_fat_percentage',
          'lean_body_mass',
          'resting_heart_rate',
        ],
        write: ['workouts'], // Allow writing workout data back to Health
      };

      await HealthPlugin.requestAuthorization(permissions);
      console.log('HealthKit permissions granted');
      return true;
    } catch (error) {
      console.error('Failed to request HealthKit permissions:', error);
      return false;
    }
  }

  /**
   * Get steps data for a date range
   */
  async getSteps(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'steps',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0, // 0 = all data
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get steps:', error);
      return [];
    }
  }

  /**
   * Get HRV (Heart Rate Variability) data
   */
  async getHRV(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'heart_rate_variability',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get HRV:', error);
      return [];
    }
  }

  /**
   * Get resting heart rate data
   */
  async getRestingHeartRate(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'heart_rate',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get resting heart rate:', error);
      return [];
    }
  }

  /**
   * Get sleep data
   */
  async getSleep(startDate: Date, endDate: Date = new Date()): Promise<any[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'sleep',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get sleep data:', error);
      return [];
    }
  }

  /**
   * Get workout data
   */
  async getWorkouts(startDate: Date, endDate: Date = new Date()): Promise<any[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'workouts',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get workouts:', error);
      return [];
    }
  }

  /**
   * Get weight data
   */
  async getWeight(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'weight',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get weight:', error);
      return [];
    }
  }

  /**
   * Get body fat percentage data
   */
  async getBodyFatPercentage(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'body_fat_percentage',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get body fat percentage:', error);
      return [];
    }
  }

  /**
   * Get lean body mass data
   */
  async getLeanBodyMass(startDate: Date, endDate: Date = new Date()): Promise<HealthDataSample[]> {
    const available = await this.isHealthKitAvailable();
    if (!available) return [];

    try {
      const result = await HealthPlugin.query({
        sampleType: 'lean_body_mass',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 0,
      });

      return result || [];
    } catch (error) {
      console.error('Failed to get lean body mass:', error);
      return [];
    }
  }

  /**
   * Sync all health data to the backend
   * This replaces the webhook-based sync system
   */
  async syncAllHealthData(daysBack: number = 30): Promise<void> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('HealthKit not available, skipping sync');
      return;
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    try {
      // Get all data types in parallel
      const [
        steps,
        hrv,
        restingHR,
        sleep,
        workouts,
        weight,
        bodyFat,
        leanMass,
      ] = await Promise.all([
        this.getSteps(startDate, endDate),
        this.getHRV(startDate, endDate),
        this.getRestingHeartRate(startDate, endDate),
        this.getSleep(startDate, endDate),
        this.getWorkouts(startDate, endDate),
        this.getWeight(startDate, endDate),
        this.getBodyFatPercentage(startDate, endDate),
        this.getLeanBodyMass(startDate, endDate),
      ]);

      // Send to backend API (this will be implemented in the next task)
      const healthData = {
        steps,
        hrv,
        restingHR,
        sleep,
        workouts,
        weight,
        bodyFat,
        leanMass,
      };

      // TODO: Send to backend via API
      console.log('Health data retrieved:', healthData);
      
      // POST to /api/apple-health/sync endpoint
      const { apiRequest } = await import('@/lib/queryClient');
      const response = await apiRequest('/api/apple-health/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(healthData),
      });

      console.log('Health data synced successfully');
    } catch (error) {
      console.error('Failed to sync health data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const healthKitService = HealthKitService.getInstance();
