import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export class PushNotificationService {
  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const result = await PushNotifications.checkPermissions();
    if (result.receive === 'granted') {
      return true;
    }

    const permResult = await PushNotifications.requestPermissions();
    return permResult.receive === 'granted';
  }

  async register() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await PushNotifications.register();
    
    // Listen for registration
    await PushNotifications.addListener('registration', (_token) => {
      // Token registered successfully
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (_error) => {
      console.error('[Push] Registration error:', _error);
    });
  }

  async getBadgeCount(): Promise<number> {
    if (!Capacitor.isNativePlatform()) {
      return 0;
    }
    
    try {
      // Note: getBadgeCount may not be available in all versions of @capacitor/push-notifications
      // @ts-ignore - Method may not exist in types but works on iOS
      const result = await PushNotifications.getBadgeCount();
      return result.count || 0;
    } catch {
      return 0;
    }
  }

  async setBadgeCount(count: number) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      // Note: setBadgeCount may not be available in all versions of @capacitor/push-notifications
      // @ts-ignore - Method may not exist in types but works on iOS
      await PushNotifications.setBadgeCount({ count });
    } catch {
      // Silently fail if method not available
    }
  }
}

export const pushNotificationService = new PushNotificationService();
