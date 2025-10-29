import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { handleDeepLink } from './deeplink';

export class LocalNotificationService {
  private initialized = false;

  async init() {
    if (this.initialized || !Capacitor.isNativePlatform()) {
      return;
    }

    // Request permissions
    await this.requestPermissions();

    // Handle notification clicks
    await LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
      const data = notification.notification.extra;
      if (data?.deepLink) {
        handleDeepLink(data.deepLink);
      }
    });

    this.initialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const result = await LocalNotifications.checkPermissions();
    if (result.display === 'granted') {
      return true;
    }

    const permResult = await LocalNotifications.requestPermissions();
    return permResult.display === 'granted';
  }

  async schedule(params: {
    id: number;
    title: string;
    body: string;
    at: Date;
    deepLink?: string;
  }) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await LocalNotifications.schedule({
      notifications: [{
        id: params.id,
        title: params.title,
        body: params.body,
        schedule: { at: params.at },
        extra: { deepLink: params.deepLink },
      }],
    });
  }

  async cancel(ids: number[]) {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    await LocalNotifications.cancel({ notifications: ids.map(id => ({ id })) });
  }
}

export const localNotificationService = new LocalNotificationService();
