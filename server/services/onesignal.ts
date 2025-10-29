import { isNotificationsLayerEnabled, canUsePushNotifications } from '@shared/config/flags';

interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class OneSignalService {
  private appId: string | undefined;
  private apiKey: string | undefined;

  constructor() {
    this.appId = process.env.ONESIGNAL_APP_ID;
    this.apiKey = process.env.ONESIGNAL_REST_API_KEY;
  }

  async sendPush(params: {
    userIds: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
  }): Promise<PushResult> {
    // Feature flag guard
    if (!isNotificationsLayerEnabled() || !canUsePushNotifications()) {
      console.log('[OneSignal] Push notifications disabled by feature flag');
      return { success: false, error: 'Push notifications disabled' };
    }

    // API key guard
    if (!this.appId || !this.apiKey) {
      console.warn('[OneSignal] Missing credentials - set ONESIGNAL_APP_ID and ONESIGNAL_REST_API_KEY');
      return { success: false, error: 'Missing credentials' };
    }

    try {
      // OneSignal REST API v1 - Create notification
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.apiKey}`,
        },
        body: JSON.stringify({
          app_id: this.appId,
          include_external_user_ids: params.userIds,
          headings: { en: params.title },
          contents: { en: params.body },
          data: params.data || {},
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[OneSignal] API error:', response.status, errorText);
        return { 
          success: false, 
          error: `OneSignal API error: ${response.status}` 
        };
      }

      const result = await response.json();
      console.log(`[OneSignal] Notification sent successfully. ID: ${result.id}`);
      
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error: any) {
      console.error('[OneSignal] Send push failed:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

export const oneSignalService = new OneSignalService();
