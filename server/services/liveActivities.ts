import OneSignalPkg from '@onesignal/node-onesignal';
const { OneSignalClient } = OneSignalPkg as any;

/**
 * Live Activities Service
 * Manages push notifications to update iOS Live Activities
 */

interface LiveActivityData {
  currentExercise: string;
  currentSet: number;
  totalSets: number;
  nextExercise: string;
  restTimeRemaining: number;
  elapsedTime: string;
  heartRate: number;
  heartRateZone: string;
  isPaused: boolean;
}

export class LiveActivityService {
  private client: OneSignalClient | null = null;
  
  constructor() {
    const appId = process.env.ONESIGNAL_APP_ID;
    const apiKey = process.env.ONESIGNAL_API_KEY;
    
    if (appId && apiKey) {
      const configuration = OneSignalClient.createConfiguration({
        appKey: apiKey,
      });
      this.client = new OneSignalClient(configuration);
    } else {
      console.warn('⚠️ OneSignal credentials not configured for Live Activities');
    }
  }
  
  /**
   * Update a Live Activity via push notification
   */
  async updateLiveActivity(
    pushToken: string,
    activityId: string,
    data: LiveActivityData
  ): Promise<void> {
    if (!this.client) {
      console.warn('OneSignal not configured, skipping Live Activity update');
      return;
    }
    
    try {
      // Send APNs push notification to update Live Activity
      const notification = {
        app_id: process.env.ONESIGNAL_APP_ID!,
        include_ios_tokens: [pushToken],
        content_available: true,
        apns_push_type_override: 'liveactivity',
        data: {
          'event': 'update',
          'attributes-type': 'WorkoutAttributes',
          'attributes': {
            'content-state': data
          }
        }
      };
      
      await this.client.createNotification(notification as any);
      console.log(`✅ Live Activity updated: ${activityId}`);
    } catch (error) {
      console.error('Error updating Live Activity:', error);
      throw error;
    }
  }
  
  /**
   * End a Live Activity
   */
  async endLiveActivity(
    pushToken: string,
    activityId: string,
    finalData: Partial<LiveActivityData>
  ): Promise<void> {
    if (!this.client) {
      console.warn('OneSignal not configured, skipping Live Activity end');
      return;
    }
    
    try {
      const notification = {
        app_id: process.env.ONESIGNAL_APP_ID!,
        include_ios_tokens: [pushToken],
        content_available: true,
        apns_push_type_override: 'liveactivity',
        data: {
          'event': 'end',
          'attributes-type': 'WorkoutAttributes',
          'attributes': {
            'content-state': {
              ...finalData,
              currentExercise: 'Workout Complete',
              restTimeRemaining: 0
            }
          },
          'dismissal-date': Math.floor(Date.now() / 1000) + 5 // Dismiss after 5 seconds
        }
      };
      
      await this.client.createNotification(notification as any);
      console.log(`✅ Live Activity ended: ${activityId}`);
    } catch (error) {
      console.error('Error ending Live Activity:', error);
      throw error;
    }
  }
}

export const liveActivityService = new LiveActivityService();
