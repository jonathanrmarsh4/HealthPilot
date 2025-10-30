import { registerPlugin } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';

export interface HealthDataSample {
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  uuid?: string;
}

export interface WorkoutSample {
  workoutType: number;
  workoutTypeName: string;
  startDate: string;
  endDate: string;
  duration: number;
  distance?: number;
  distanceUnit?: string;
  energy?: number;
  energyUnit?: string;
  uuid: string;
}

export interface SleepSample {
  value: number;
  category: string; // 'asleep' | 'awake' | 'core' | 'deep' | 'rem' | 'inBed'
  startDate: string;
  endDate: string;
  uuid: string;
}

export interface HealthPilotHealthKitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ success: boolean }>;
  queryHealthData(options: {
    dataType: string;
    startDate: string;
    endDate: string;
  }): Promise<{ samples?: HealthDataSample[]; workouts?: WorkoutSample[]; sleepSamples?: SleepSample[] }>;
}

const HealthPilotHealthKit = registerPlugin<HealthPilotHealthKitPlugin>('HealthPilotHealthKit');

/**
 * HealthKit service for iOS native health data integration
 * Supports comprehensive data types: HRV, sleep, weight, body composition, resting HR, steps, workouts, etc.
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
      // Check if running on native iOS platform
      if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') {
        this.isAvailable = false;
        return false;
      }

      const result = await HealthPilotHealthKit.isAvailable();
      this.isAvailable = result?.available ?? false;
      console.log('[HealthKit] Availability check result:', this.isAvailable);
      return this.isAvailable;
    } catch (error: any) {
      console.warn('[HealthKit] Plugin check failed:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  /**
   * Request permissions for all supported health data types
   */
  async requestPermissions(): Promise<boolean> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('[HealthKit] Not available on this platform');
      return false;
    }

    try {
      console.log('[HealthKit] Requesting permissions...');
      const result = await HealthPilotHealthKit.requestAuthorization();
      console.log('[HealthKit] Permission request result:', result);
      return result.success;
    } catch (error) {
      console.error('[HealthKit] Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Query health data for a specific type
   */
  private async queryData(
    dataType: string,
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataSample[]> {
    try {
      // Remove milliseconds for Swift compatibility (ISO8601DateFormatter quirk)
      const startDateString = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      const endDateString = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      console.log(`[HealthKit] Querying ${dataType} from ${startDateString} to ${endDateString}`);
      const result = await HealthPilotHealthKit.queryHealthData({
        dataType,
        startDate: startDateString,
        endDate: endDateString,
      });
      console.log(`[HealthKit] ${dataType} returned ${result.samples?.length || 0} samples`);
      if (result.samples && result.samples.length > 0) {
        console.log(`[HealthKit] ${dataType} sample example:`, result.samples[0]);
      }
      return result.samples || [];
    } catch (error) {
      console.error(`[HealthKit] Failed to query ${dataType}:`, error);
      return [];
    }
  }

  /**
   * Get steps data
   */
  async getSteps(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('steps', startDate, endDate);
  }

  /**
   * Get distance data
   */
  async getDistance(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('distance', startDate, endDate);
  }

  /**
   * Get active calories data
   */
  async getActiveCalories(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('activeCalories', startDate, endDate);
  }

  /**
   * Get heart rate data
   */
  async getHeartRate(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('heartRate', startDate, endDate);
  }

  /**
   * Get resting heart rate data
   */
  async getRestingHeartRate(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('restingHeartRate', startDate, endDate);
  }

  /**
   * Get HRV (Heart Rate Variability) data
   */
  async getHRV(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('hrv', startDate, endDate);
  }

  /**
   * Get weight data
   */
  async getWeight(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('weight', startDate, endDate);
  }

  /**
   * Get lean body mass data
   */
  async getLeanBodyMass(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('leanBodyMass', startDate, endDate);
  }

  /**
   * Get body fat percentage data
   */
  async getBodyFat(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bodyFat', startDate, endDate);
  }

  /**
   * Get blood pressure (systolic) data
   */
  async getBloodPressureSystolic(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bloodPressureSystolic', startDate, endDate);
  }

  /**
   * Get blood pressure (diastolic) data
   */
  async getBloodPressureDiastolic(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bloodPressureDiastolic', startDate, endDate);
  }

  /**
   * Get blood glucose data
   */
  async getBloodGlucose(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bloodGlucose', startDate, endDate);
  }

  /**
   * Get workouts
   */
  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutSample[]> {
    try {
      // Remove milliseconds for Swift compatibility
      const startDateString = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      const endDateString = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      console.log(`[HealthKit] Querying workouts from ${startDateString} to ${endDateString}`);
      const result = await HealthPilotHealthKit.queryHealthData({
        dataType: 'workouts',
        startDate: startDateString,
        endDate: endDateString,
      });
      console.log(`[HealthKit] Workouts returned ${result.workouts?.length || 0} items`);
      if (result.workouts && result.workouts.length > 0) {
        console.log(`[HealthKit] Workout example:`, result.workouts[0]);
      }
      return result.workouts || [];
    } catch (error) {
      console.error('[HealthKit] Failed to get workouts:', error);
      return [];
    }
  }

  /**
   * Get sleep data
   */
  async getSleep(startDate: Date, endDate: Date): Promise<SleepSample[]> {
    try {
      // Remove milliseconds for Swift compatibility
      const startDateString = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      const endDateString = endDate.toISOString().replace(/\.\d{3}Z$/, 'Z');
      
      console.log(`[HealthKit] Querying sleep from ${startDateString} to ${endDateString}`);
      const result = await HealthPilotHealthKit.queryHealthData({
        dataType: 'sleep',
        startDate: startDateString,
        endDate: endDateString,
      });
      console.log(`[HealthKit] Sleep returned ${result.sleepSamples?.length || 0} samples`);
      if (result.sleepSamples && result.sleepSamples.length > 0) {
        console.log(`[HealthKit] Sleep sample example:`, result.sleepSamples[0]);
      }
      return result.sleepSamples || [];
    } catch (error) {
      console.error('[HealthKit] Failed to get sleep:', error);
      return [];
    }
  }

  /**
   * Retrieve all supported health data from HealthKit
   */
  async getAllHealthData(daysBack: number = 30): Promise<{
    steps: HealthDataSample[];
    distance: HealthDataSample[];
    activeCalories: HealthDataSample[];
    heartRate: HealthDataSample[];
    restingHeartRate: HealthDataSample[];
    hrv: HealthDataSample[];
    weight: HealthDataSample[];
    leanBodyMass: HealthDataSample[];
    bodyFat: HealthDataSample[];
    bloodPressureSystolic: HealthDataSample[];
    bloodPressureDiastolic: HealthDataSample[];
    bloodGlucose: HealthDataSample[];
    workouts: WorkoutSample[];
    sleep: SleepSample[];
  }> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('[HealthKit] Not available, returning empty data');
      return {
        steps: [],
        distance: [],
        activeCalories: [],
        heartRate: [],
        restingHeartRate: [],
        hrv: [],
        weight: [],
        leanBodyMass: [],
        bodyFat: [],
        bloodPressureSystolic: [],
        bloodPressureDiastolic: [],
        bloodGlucose: [],
        workouts: [],
        sleep: [],
      };
    }

    // Fetch complete days: from start of (today - daysBack) to end of today
    // This ensures we get ALL of today's data, not just from current time
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999); // End of today
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0); // Start of that day
    
    console.log(`[HealthKit] Fetching ${daysBack} complete days: ${startDate.toISOString()} to ${endDate.toISOString()}`);

    try {
      const [
        steps,
        distance,
        activeCalories,
        heartRate,
        restingHeartRate,
        hrv,
        weight,
        leanBodyMass,
        bodyFat,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bloodGlucose,
        workouts,
        sleep,
      ] = await Promise.all([
        this.getSteps(startDate, endDate),
        this.getDistance(startDate, endDate),
        this.getActiveCalories(startDate, endDate),
        this.getHeartRate(startDate, endDate),
        this.getRestingHeartRate(startDate, endDate),
        this.getHRV(startDate, endDate),
        this.getWeight(startDate, endDate),
        this.getLeanBodyMass(startDate, endDate),
        this.getBodyFat(startDate, endDate),
        this.getBloodPressureSystolic(startDate, endDate),
        this.getBloodPressureDiastolic(startDate, endDate),
        this.getBloodGlucose(startDate, endDate),
        this.getWorkouts(startDate, endDate),
        this.getSleep(startDate, endDate),
      ]);

      console.log('[HealthKit] Comprehensive health data retrieved:', {
        steps: steps.length,
        distance: distance.length,
        activeCalories: activeCalories.length,
        heartRate: heartRate.length,
        restingHeartRate: restingHeartRate.length,
        hrv: hrv.length,
        weight: weight.length,
        leanBodyMass: leanBodyMass.length,
        bodyFat: bodyFat.length,
        bloodPressureSystolic: bloodPressureSystolic.length,
        bloodPressureDiastolic: bloodPressureDiastolic.length,
        bloodGlucose: bloodGlucose.length,
        workouts: workouts.length,
        sleep: sleep.length,
      });

      return {
        steps,
        distance,
        activeCalories,
        heartRate,
        restingHeartRate,
        hrv,
        weight,
        leanBodyMass,
        bodyFat,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bloodGlucose,
        workouts,
        sleep,
      };
    } catch (error) {
      console.error('[HealthKit] Failed to retrieve comprehensive health data:', error);
      throw error;
    }
  }

  /**
   * Sync all health data to backend
   * Retrieves data from HealthKit and sends it to the backend API
   */
  async syncAllHealthData(daysBack: number = 30): Promise<void> {
    try {
      console.log(`[HealthKit] Starting sync of last ${daysBack} days...`);
      
      // Get all health data from HealthKit
      const healthData = await this.getAllHealthData(daysBack);
      
      console.log('[HealthKit] Data retrieved, sending to backend...', {
        steps: healthData.steps.length,
        workouts: healthData.workouts.length,
        sleep: healthData.sleep.length,
      });
      
      // Import apiRequest dynamically to avoid circular dependencies
      const { apiRequest } = await import('../lib/queryClient');
      
      // Send to backend using apiRequest (handles mobile vs web API URLs)
      const response = await apiRequest('POST', '/api/mobile/healthkit/sync', { healthData });
      const result = await response.json();
      
      console.log('[HealthKit] Sync complete:', result);
      
      return;
    } catch (error) {
      console.error('[HealthKit] Sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const healthKitService = HealthKitService.getInstance();
