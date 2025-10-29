import { Capacitor } from '@capacitor/core';
import OneSignal from 'onesignal-cordova-plugin';
import { handleDeepLink } from './deeplink';

export class OneSignalClient {
  private initialized = false;
  
  async init(appId: string) {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    // Initialize OneSignal
    OneSignal.setAppId(appId);
    
    // Request notification permission
    OneSignal.promptForPushNotificationsWithUserResponse((accepted) => {
      console.log('[OneSignal] Permission', accepted ? 'granted' : 'denied');
    });

    // Handle notification clicks (when user taps a notification)
    OneSignal.setNotificationOpenedHandler((openedEvent) => {
      const data = openedEvent.notification.additionalData;
      if (data?.deepLink) {
        handleDeepLink(data.deepLink);
      }
    });

    // Handle foreground notifications (app is open)
    OneSignal.setNotificationWillShowInForegroundHandler((notificationReceivedEvent) => {
      const notification = notificationReceivedEvent.getNotification();
      // Show the notification even when app is in foreground
      notificationReceivedEvent.complete(notification);
    });

    this.initialized = true;
  }

  async setExternalUserId(userId: string) {
    if (!Capacitor.isNativePlatform()) return;
    OneSignal.setExternalUserId(userId);
  }

  async removeExternalUserId() {
    if (!Capacitor.isNativePlatform()) return;
    OneSignal.removeExternalUserId();
  }
}

export const oneSignalClient = new OneSignalClient();
