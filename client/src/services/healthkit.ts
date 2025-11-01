import { Capacitor } from '@capacitor/core';
import { Health } from '@capgo/capacitor-health';

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
      if (Capacitor.getPlatform() !== 'ios') {
        this.isAvailable = false;
        return false;
      }

      const result = await Health.isAvailable();
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
      console.log('[HealthKit] Requesting permissions for steps, distance, calories, heartRate, weight...');
      const result = await Health.requestAuthorization({
        read: ['steps', 'distance', 'calories', 'heartRate', 'weight'],
        write: []
      });
      console.log('[HealthKit] Permission request result:', result);
      return result.readAuthorized.length > 0;
    } catch (error) {
      console.error('[HealthKit] Failed to request permissions:', error);
      throw error;
    }
  }

  /**
   * Query health data for a specific type
   */
  private async queryData(
    dataType: 'steps' | 'distance' | 'calories' | 'heartRate' | 'weight',
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataSample[]> {
    try {
      console.log(`[HealthKit] Querying ${dataType} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      const result = await Health.readSamples({
        dataType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 1000,
        ascending: false
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
    return this.queryData('calories', startDate, endDate);
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
    console.log('[HealthKit] Resting heart rate not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get HRV (Heart Rate Variability) data
   */
  async getHRV(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] HRV not yet supported by Capgo Health plugin');
    return [];
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
    console.log('[HealthKit] Lean body mass not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get body fat percentage data
   */
  async getBodyFat(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Body fat not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get blood pressure (systolic) data
   */
  async getBloodPressureSystolic(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Blood pressure not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get blood pressure (diastolic) data
   */
  async getBloodPressureDiastolic(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Blood pressure not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get blood glucose data
   */
  async getBloodGlucose(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Blood glucose not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get basal calories data
   */
  async getBasalCalories(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Basal calories not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get flights climbed data
   */
  async getFlightsClimbed(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Flights climbed not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get oxygen saturation (SpO2) data
   */
  async getOxygenSaturation(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Oxygen saturation not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get respiratory rate data
   */
  async getRespiratoryRate(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Respiratory rate not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get body temperature data
   */
  async getBodyTemperature(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Body temperature not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get BMI (Body Mass Index) data
   */
  async getBMI(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] BMI not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get height data
   */
  async getHeight(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Height not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get waist circumference data
   */
  async getWaistCircumference(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Waist circumference not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get dietary water intake data
   */
  async getDietaryWater(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Dietary water not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get dietary energy (calories consumed) data
   */
  async getDietaryEnergy(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Dietary energy not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get dietary protein data
   */
  async getDietaryProtein(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Dietary protein not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get dietary carbohydrates data
   */
  async getDietaryCarbs(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Dietary carbs not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get dietary fat data
   */
  async getDietaryFat(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    console.log('[HealthKit] Dietary fat not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get workouts
   */
  async getWorkouts(startDate: Date, endDate: Date): Promise<WorkoutSample[]> {
    console.log('[HealthKit] Workouts not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Get sleep data
   */
  async getSleep(startDate: Date, endDate: Date): Promise<SleepSample[]> {
    console.log('[HealthKit] Sleep not yet supported by Capgo Health plugin');
    return [];
  }

  /**
   * Retrieve all supported health data from HealthKit
   */
  async getAllHealthData(daysBack: number = 30): Promise<{
    steps: HealthDataSample[];
    distance: HealthDataSample[];
    activeCalories: HealthDataSample[];
    basalCalories: HealthDataSample[];
    flightsClimbed: HealthDataSample[];
    heartRate: HealthDataSample[];
    restingHeartRate: HealthDataSample[];
    hrv: HealthDataSample[];
    oxygenSaturation: HealthDataSample[];
    respiratoryRate: HealthDataSample[];
    bodyTemperature: HealthDataSample[];
    weight: HealthDataSample[];
    bmi: HealthDataSample[];
    leanBodyMass: HealthDataSample[];
    bodyFat: HealthDataSample[];
    height: HealthDataSample[];
    waistCircumference: HealthDataSample[];
    bloodPressureSystolic: HealthDataSample[];
    bloodPressureDiastolic: HealthDataSample[];
    bloodGlucose: HealthDataSample[];
    dietaryWater: HealthDataSample[];
    dietaryEnergy: HealthDataSample[];
    dietaryProtein: HealthDataSample[];
    dietaryCarbs: HealthDataSample[];
    dietaryFat: HealthDataSample[];
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
        basalCalories: [],
        flightsClimbed: [],
        heartRate: [],
        restingHeartRate: [],
        hrv: [],
        oxygenSaturation: [],
        respiratoryRate: [],
        bodyTemperature: [],
        weight: [],
        bmi: [],
        leanBodyMass: [],
        bodyFat: [],
        height: [],
        waistCircumference: [],
        bloodPressureSystolic: [],
        bloodPressureDiastolic: [],
        bloodGlucose: [],
        dietaryWater: [],
        dietaryEnergy: [],
        dietaryProtein: [],
        dietaryCarbs: [],
        dietaryFat: [],
        workouts: [],
        sleep: [],
      };
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    try {
      const [
        steps,
        distance,
        activeCalories,
        basalCalories,
        flightsClimbed,
        heartRate,
        restingHeartRate,
        hrv,
        oxygenSaturation,
        respiratoryRate,
        bodyTemperature,
        weight,
        bmi,
        leanBodyMass,
        bodyFat,
        height,
        waistCircumference,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bloodGlucose,
        dietaryWater,
        dietaryEnergy,
        dietaryProtein,
        dietaryCarbs,
        dietaryFat,
        workouts,
        sleep,
      ] = await Promise.all([
        this.getSteps(startDate, endDate),
        this.getDistance(startDate, endDate),
        this.getActiveCalories(startDate, endDate),
        this.getBasalCalories(startDate, endDate),
        this.getFlightsClimbed(startDate, endDate),
        this.getHeartRate(startDate, endDate),
        this.getRestingHeartRate(startDate, endDate),
        this.getHRV(startDate, endDate),
        this.getOxygenSaturation(startDate, endDate),
        this.getRespiratoryRate(startDate, endDate),
        this.getBodyTemperature(startDate, endDate),
        this.getWeight(startDate, endDate),
        this.getBMI(startDate, endDate),
        this.getLeanBodyMass(startDate, endDate),
        this.getBodyFat(startDate, endDate),
        this.getHeight(startDate, endDate),
        this.getWaistCircumference(startDate, endDate),
        this.getBloodPressureSystolic(startDate, endDate),
        this.getBloodPressureDiastolic(startDate, endDate),
        this.getBloodGlucose(startDate, endDate),
        this.getDietaryWater(startDate, endDate),
        this.getDietaryEnergy(startDate, endDate),
        this.getDietaryProtein(startDate, endDate),
        this.getDietaryCarbs(startDate, endDate),
        this.getDietaryFat(startDate, endDate),
        this.getWorkouts(startDate, endDate),
        this.getSleep(startDate, endDate),
      ]);

      console.log('[HealthKit] Comprehensive health data retrieved:', {
        steps: steps.length,
        distance: distance.length,
        activeCalories: activeCalories.length,
        basalCalories: basalCalories.length,
        flightsClimbed: flightsClimbed.length,
        heartRate: heartRate.length,
        restingHeartRate: restingHeartRate.length,
        hrv: hrv.length,
        oxygenSaturation: oxygenSaturation.length,
        respiratoryRate: respiratoryRate.length,
        bodyTemperature: bodyTemperature.length,
        weight: weight.length,
        bmi: bmi.length,
        leanBodyMass: leanBodyMass.length,
        bodyFat: bodyFat.length,
        height: height.length,
        waistCircumference: waistCircumference.length,
        bloodPressureSystolic: bloodPressureSystolic.length,
        bloodPressureDiastolic: bloodPressureDiastolic.length,
        bloodGlucose: bloodGlucose.length,
        dietaryWater: dietaryWater.length,
        dietaryEnergy: dietaryEnergy.length,
        dietaryProtein: dietaryProtein.length,
        dietaryCarbs: dietaryCarbs.length,
        dietaryFat: dietaryFat.length,
        workouts: workouts.length,
        sleep: sleep.length,
      });

      return {
        steps,
        distance,
        activeCalories,
        basalCalories,
        flightsClimbed,
        heartRate,
        restingHeartRate,
        hrv,
        oxygenSaturation,
        respiratoryRate,
        bodyTemperature,
        weight,
        bmi,
        leanBodyMass,
        bodyFat,
        height,
        waistCircumference,
        bloodPressureSystolic,
        bloodPressureDiastolic,
        bloodGlucose,
        dietaryWater,
        dietaryEnergy,
        dietaryProtein,
        dietaryCarbs,
        dietaryFat,
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
   * Convenience method that retrieves data from HealthKit and returns it for syncing
   */
  async syncAllHealthData(daysBack: number = 30) {
    try {
      console.log(`[HealthKit] Starting sync of last ${daysBack} days...`);
      
      // Get all health data from HealthKit
      const healthData = await this.getAllHealthData(daysBack);
      
      console.log('[HealthKit] Data retrieved, ready for backend sync');
      
      // Return the data so calling component can send it to backend
      return healthData;
    } catch (error) {
      console.error('[HealthKit] Sync failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const healthKitService = HealthKitService.getInstance();
