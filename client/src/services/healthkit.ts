import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';
import HealthKitStats from '@/mobile/plugins/HealthKitStatsPlugin';

// Custom HealthPlugin with extended data type support (26 types vs standard 5)
// Located at ios/HealthKitPlugin/HealthPlugin.swift
const Health = registerPlugin<any>('Health');

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
   * Supports 26 comprehensive health metrics + workouts + sleep
   */
  async requestPermissions(): Promise<boolean> {
    const available = await this.isHealthKitAvailable();
    if (!available) {
      console.log('[HealthKit] Not available on this platform');
      return false;
    }

    try {
      console.log('[HealthKit] Requesting permissions for ALL 26 health data types...');
      const result = await Health.requestAuthorization({
        read: [
          // Original 5 data types
          'steps', 'distance', 'calories', 'heartRate', 'weight',
          
          // Batch 1: 6 cardiovascular metrics
          'heartRateVariability', 'restingHeartRate', 'bloodPressureSystolic', 'bloodPressureDiastolic',
          'oxygenSaturation', 'respiratoryRate',
          
          // Batch 2: 14 additional comprehensive metrics
          'height', 'bmi', 'bodyFatPercentage', 'leanBodyMass',
          'basalEnergyBurned', 'flightsClimbed', 'bloodGlucose', 'bodyTemperature',
          'vo2Max', 'walkingHeartRateAverage', 'waistCircumference',
          'dietaryWater', 'appleExerciseTime', 'appleStandTime',
          
          // Special types
          'sleepAnalysis'
        ] as any[],
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
   * Supports all 26 comprehensive health data types
   */
  private async queryData(
    dataType: 'steps' | 'distance' | 'calories' | 'heartRate' | 'weight' | 
              'heartRateVariability' | 'restingHeartRate' | 'bloodPressureSystolic' | 'bloodPressureDiastolic' |
              'oxygenSaturation' | 'respiratoryRate' |
              'height' | 'bmi' | 'bodyFatPercentage' | 'leanBodyMass' |
              'basalEnergyBurned' | 'flightsClimbed' | 'bloodGlucose' | 'bodyTemperature' |
              'vo2Max' | 'walkingHeartRateAverage' | 'waistCircumference' |
              'dietaryWater' | 'appleExerciseTime' | 'appleStandTime' |
              'sleepAnalysis',
    startDate: Date,
    endDate: Date
  ): Promise<HealthDataSample[]> {
    try {
      console.log(`[HealthKit] Querying ${dataType} from ${startDate.toISOString()} to ${endDate.toISOString()}`);
      const result = await Health.readSamples({
        dataType: dataType as any,
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
   * Get steps data using timezone-aware HKStatisticsQuery for accurate deduplication
   * Returns ONE sample per day with deduplicated totals from all sources
   */
  async getSteps(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    try {
      // Generate array of dates to query
      const dates: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        dates.push(currentDate.toISOString());
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`[HealthKit] Querying deduplicated steps for ${dates.length} days using HKStatisticsQuery`);
      
      // Use our custom plugin that uses HKStatisticsQuery with .cumulativeSum
      const result = await HealthKitStats.getMultiDayStats({ dates });
      
      // Transform to HealthDataSample format
      const samples: HealthDataSample[] = result.results.map(dayResult => ({
        value: dayResult.steps,
        unit: 'count',
        startDate: dayResult.date,
        endDate: dayResult.date,
        uuid: `steps-daily-${dayResult.date}`,
      }));
      
      console.log(`[HealthKit] Retrieved ${samples.length} deduplicated daily step totals`);
      return samples;
    } catch (error) {
      console.error('[HealthKit] Failed to get steps using statistics query, falling back to old method:', error);
      // Fallback to old method if new plugin fails
      return this.queryData('steps', startDate, endDate);
    }
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
    return this.queryData('restingHeartRate', startDate, endDate);
  }

  /**
   * Get HRV (Heart Rate Variability) data
   */
  async getHRV(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('heartRateVariability', startDate, endDate);
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
    return this.queryData('bodyFatPercentage', startDate, endDate);
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
   * Get basal calories data
   */
  async getBasalCalories(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('basalEnergyBurned', startDate, endDate);
  }

  /**
   * Get flights climbed data
   */
  async getFlightsClimbed(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('flightsClimbed', startDate, endDate);
  }

  /**
   * Get oxygen saturation (SpO2) data
   */
  async getOxygenSaturation(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('oxygenSaturation', startDate, endDate);
  }

  /**
   * Get respiratory rate data
   */
  async getRespiratoryRate(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('respiratoryRate', startDate, endDate);
  }

  /**
   * Get body temperature data
   */
  async getBodyTemperature(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bodyTemperature', startDate, endDate);
  }

  /**
   * Get BMI (Body Mass Index) data
   */
  async getBMI(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('bmi', startDate, endDate);
  }

  /**
   * Get height data
   */
  async getHeight(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('height', startDate, endDate);
  }

  /**
   * Get waist circumference data
   */
  async getWaistCircumference(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('waistCircumference', startDate, endDate);
  }

  /**
   * Get dietary water intake data
   */
  async getDietaryWater(startDate: Date, endDate: Date): Promise<HealthDataSample[]> {
    return this.queryData('dietaryWater', startDate, endDate);
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
    try {
      console.log('[HealthKit] Fetching sleep analysis data...');
      
      // Call the new readCategorySamples method we added to the plugin
      const result = await (Health as any).readCategorySamples({
        dataType: 'sleepAnalysis',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 10000,
        ascending: false
      });

      console.log('[HealthKit] Sleep raw result:', result);

      if (!result?.samples || result.samples.length === 0) {
        console.log('[HealthKit] No sleep samples found');
        return [];
      }

      // Map sleep category values to readable names
      const sleepCategoryMap: { [key: number]: string } = {
        0: 'inBed',
        1: 'asleep',
        2: 'awake',
        3: 'core',    // iOS 16+
        4: 'deep',    // iOS 16+
        5: 'rem'      // iOS 16+
      };

      const samples: SleepSample[] = result.samples.map((sample: any) => ({
        value: sample.value,
        category: sleepCategoryMap[sample.value] || 'unknown',
        startDate: sample.startDate,
        endDate: sample.endDate,
        uuid: sample.uuid || `${sample.startDate}-${sample.value}`
      }));

      console.log('[HealthKit] Parsed sleep samples:', samples.length);
      return samples;
    } catch (error) {
      console.error('[HealthKit] Failed to fetch sleep data:', error);
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
