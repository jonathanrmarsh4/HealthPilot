import { registerPlugin } from '@capacitor/core';
import { apiRequest } from './queryClient';

/**
 * Live Activity Plugin Interface
 */
export interface LiveActivityPlugin {
  startActivity(options: {
    sessionId: string;
    workoutType: string;
    currentExercise: string;
    currentSet: number;
    totalSets: number;
    nextExercise: string;
    restTimeRemaining: number;
    elapsedTime: string;
    heartRate: number;
    heartRateZone: string;
    isPaused: boolean;
  }): Promise<{ activityId: string; pushToken: string }>;
  
  updateActivity(options: {
    currentExercise: string;
    currentSet: number;
    totalSets: number;
    nextExercise: string;
    restTimeRemaining: number;
    elapsedTime: string;
    heartRate: number;
    heartRateZone: string;
    isPaused: boolean;
  }): Promise<void>;
  
  endActivity(options: {
    elapsedTime: string;
  }): Promise<void>;
}

// Register the plugin
const LiveActivity = registerPlugin<LiveActivityPlugin>('LiveActivity', {
  web: () => ({
    // Web fallback (no-op)
    async startActivity() {
      console.log('Live Activities not supported on web');
      return { activityId: '', pushToken: '' };
    },
    async updateActivity() {
      console.log('Live Activities not supported on web');
    },
    async endActivity() {
      console.log('Live Activities not supported on web');
    },
  }),
});

/**
 * Live Activity Manager
 * Handles Live Activity lifecycle and syncs with backend
 */
export class LiveActivityManager {
  private activityId: string | null = null;
  private pushToken: string | null = null;
  private sessionId: string | null = null;
  private updateInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start a Live Activity for a workout session
   */
  async start(
    sessionId: string,
    workoutType: string,
    currentExercise: string,
    nextExercise: string = 'Rest'
  ): Promise<boolean> {
    try {
      this.sessionId = sessionId;
      
      // Start the Live Activity on device
      const result = await LiveActivity.startActivity({
        sessionId,
        workoutType,
        currentExercise,
        currentSet: 1,
        totalSets: 3,
        nextExercise,
        restTimeRemaining: 0,
        elapsedTime: '0:00',
        heartRate: 0,
        heartRateZone: 'Z1',
        isPaused: false,
      });
      
      this.activityId = result.activityId;
      this.pushToken = result.pushToken;
      
      // Register with backend
      if (this.activityId && this.pushToken) {
        await apiRequest('/api/live-activities/register', 'POST', {
          sessionId,
          pushToken: this.pushToken,
          activityId: this.activityId,
        });
        
        console.log('✅ Live Activity started:', this.activityId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
      return false;
    }
  }
  
  /**
   * Update the Live Activity
   */
  async update(data: {
    currentExercise: string;
    currentSet: number;
    totalSets: number;
    nextExercise: string;
    restTimeRemaining: number;
    elapsedTime: string;
    heartRate?: number;
    heartRateZone?: string;
    isPaused?: boolean;
  }): Promise<void> {
    if (!this.activityId || !this.pushToken || !this.sessionId) {
      return;
    }
    
    try {
      // Update via backend (which sends APNs push)
      await apiRequest('/api/live-activities/update', 'POST', {
        sessionId: this.sessionId,
        pushToken: this.pushToken,
        activityId: this.activityId,
        ...data,
        heartRate: data.heartRate || 0,
        heartRateZone: data.heartRateZone || 'Z1',
        isPaused: data.isPaused || false,
      });
      
      console.log('📱 Live Activity updated');
    } catch (error) {
      console.error('Failed to update Live Activity:', error);
    }
  }
  
  /**
   * Update timer in real-time (called every second during rest)
   */
  startTimerUpdates(
    getCurrentState: () => {
      currentExercise: string;
      currentSet: number;
      totalSets: number;
      nextExercise: string;
      restTimeRemaining: number;
      elapsedTime: string;
      heartRate?: number;
      heartRateZone?: string;
    }
  ): void {
    // Clear any existing interval
    this.stopTimerUpdates();
    
    // Update every 15 seconds (to avoid too many push notifications)
    this.updateInterval = setInterval(() => {
      const state = getCurrentState();
      if (state.restTimeRemaining > 0) {
        this.update(state);
      }
    }, 15000); // 15 seconds
  }
  
  /**
   * Stop timer updates
   */
  stopTimerUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  /**
   * End the Live Activity
   */
  async end(elapsedTime: string): Promise<void> {
    if (!this.activityId || !this.pushToken || !this.sessionId) {
      return;
    }
    
    try {
      // Stop timer updates
      this.stopTimerUpdates();
      
      // End via backend
      await apiRequest('/api/live-activities/end', 'POST', {
        sessionId: this.sessionId,
        pushToken: this.pushToken,
        activityId: this.activityId,
        elapsedTime,
      });
      
      console.log('✅ Live Activity ended');
      
      // Reset state
      this.activityId = null;
      this.pushToken = null;
      this.sessionId = null;
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
    }
  }
  
  /**
   * Check if Live Activity is active
   */
  isActive(): boolean {
    return this.activityId !== null;
  }
}

// Export singleton instance
export const liveActivityManager = new LiveActivityManager();
