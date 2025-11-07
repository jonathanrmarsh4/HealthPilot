import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';
import { handleDeepLink } from './deeplink';

export class OneSignalClient {
  private initialized = false;
  
  async init(appId: string) {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Initialize OneSignal (v5+ API)
      OneSignal.initialize(appId);
      
      // Request notification permission
      OneSignal.Notifications.requestPermission(true);
      
      // Handle notification clicks (when user taps a notification)
      OneSignal.Notifications.addEventListener('click', (event: any) => {
        const data = event?.notification?.additionalData || {};
        if (data?.deepLink) {
          handleDeepLink(data.deepLink);
        }
      });
      
      // Handle foreground notifications (app is open)
      OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: any) => {
        // Show the notification even when app is in foreground
        event.notification.display();
      });

      this.initialized = true;
    } catch (_error) {
      console.error('[OneSignal] Initialization error:', _error);
    }
  }

  async setExternalUserId(userId: string) {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await OneSignal.login(userId);
    } catch (_error) {
      console.error('[OneSignal] Error setting user ID:', _error);
    }
  }

  async removeExternalUserId() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await OneSignal.logout();
    } catch (_error) {
      console.error('[OneSignal] Error removing user ID:', _error);
    }
  }
}

export const oneSignalClient = new OneSignalClient();
