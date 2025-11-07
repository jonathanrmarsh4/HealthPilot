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
    await PushNotifications.addListener('registration', (token) => {
      // Token registered successfully
    });

    // Listen for registration errors
    await PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error:', error);
    });
  }

  async getBadgeCount(): Promise<number> {
    if (!Capacitor.isNativePlatform()) {
      return 0;
    }
    
    try {
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

    await PushNotifications.setBadgeCount({ count });
  }
}

export const pushNotificationService = new PushNotificationService();
