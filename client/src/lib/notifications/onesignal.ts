import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';
import { handleDeepLink } from './deeplink';

export class OneSignalClient {
  private initialized = false;
  
  async init(appId: string) {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      console.log('[OneSignal] Skipping initialization:', { initialized: this.initialized, isNative: Capacitor.isNativePlatform() });
      return;
    }

    try {
      console.log('[OneSignal] Initializing with app ID:', appId);
      
      // Initialize OneSignal (v5+ API)
      OneSignal.initialize(appId);
      
      // Request notification permission
      OneSignal.Notifications.requestPermission(true);
      console.log('[OneSignal] Permission requested');
      
      // Handle notification clicks (when user taps a notification)
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        console.log('[OneSignal] Notification clicked:', event);
        const data = event?.notification?.additionalData || {};
        if (data?.deepLink) {
          handleDeepLink(data.deepLink);
        }
      });
      
      // Handle foreground notifications (app is open)
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        console.log('[OneSignal] Notification received in foreground:', event);
        // Show the notification even when app is in foreground
        event.notification.display();
      });

      this.initialized = true;
      console.log('[OneSignal] Initialization complete');
    } catch (error) {
      console.error('[OneSignal] Initialization error:', error);
    }
  }

  async setExternalUserId(userId: string) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      console.log('[OneSignal] Setting external user ID:', userId);
      await OneSignal.login(userId);
      console.log('[OneSignal] User logged in successfully');
    } catch (error) {
      console.error('[OneSignal] Error setting user ID:', error);
    }
  }

  async removeExternalUserId() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      console.log('[OneSignal] Removing external user ID');
      await OneSignal.logout();
      console.log('[OneSignal] User logged out successfully');
    } catch (error) {
      console.error('[OneSignal] Error removing user ID:', error);
    }
  }
}

export const oneSignalClient = new OneSignalClient();
