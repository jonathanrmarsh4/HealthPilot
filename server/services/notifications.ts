import { eventBus } from '../lib/eventBus';
import { oneSignalService } from './onesignal';
import type { IStorage } from '../storage';
import { isNotificationsLayerEnabled } from '@shared/config/flags';
import type { NotificationEventMap } from '@shared/types/notification-events';
import { toZonedTime } from 'date-fns-tz';

/**
 * Check if current time is within quiet hours
 * @param quietHours - Format: "22:00-07:00"
 * @param userTimezone - User's timezone (e.g., "America/Los_Angeles")
 */
function isInQuietHours(quietHours: string | null, userTimezone: string = 'UTC'): boolean {
  if (!quietHours) {
    return false;
  }

  try {
    const [start, end] = quietHours.split('-');
    if (!start || !end) {
      return false;
    }

    // Get current time in USER'S timezone (not server time!)
    const now = toZonedTime(new Date(), userTimezone);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Parse start/end times
    const [startHour, startMinute = 0] = start.split(':').map(Number);
    const [endHour, endMinute = 0] = end.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    // Handle overnight range (e.g., 22:00-07:00)
    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch (error) {
    console.warn('[NotificationOrchestrator] Invalid quiet hours format:', quietHours);
    return false;
  }
}

/**
 * Common notification dispatch logic
 */
async function dispatchNotification(
  storage: IStorage,
  params: {
    userId: string;
    channel: string;
    title: string;
    body: string;
    deepLink?: string;
    payload?: any;
    priority?: string;
  }
): Promise<void> {
  const { userId, channel, title, body, deepLink, payload, priority } = params;

  // Check if user has this channel enabled
  const channels = await storage.getNotificationChannels(userId);
  const channelPref = channels.find(c => c.channel === channel);
  
  // Treat missing channel as ENABLED by default (opt-out model)
  if (channelPref && !channelPref.enabled) {
    console.log(`[NotificationOrchestrator] Channel ${channel} disabled for user ${userId}`);
    return; // Only skip if explicitly disabled
  }

  // Get user's timezone from their profile
  const user = await storage.getUser(userId);
  const userTimezone = user?.timezone || 'UTC';

  // Check quiet hours using USER timezone (critical bypasses quiet hours)
  if (priority !== 'critical' && isInQuietHours(channelPref?.quietHours || null, userTimezone)) {
    console.log(`[NotificationOrchestrator] Skipping ${channel} notification for user ${userId} (quiet hours in ${userTimezone})`);
    return;
  }

  // Create notification in database
  const notification = await storage.createNotification({
    userId,
    channel,
    title,
    body,
    deepLink,
    status: 'pending',
    payload,
  });

  // Send via OneSignal
  const result = await oneSignalService.sendPush({
    userIds: [userId],
    title,
    body,
    data: { deepLink, notificationId: notification.id },
  });

  // Update notification status
  if (result.success) {
    await storage.updateNotificationStatus(notification.id, 'sent');
    await storage.createNotificationEvent({
      notificationId: notification.id,
      event: 'sent',
      meta: { messageId: result.messageId },
    });
  } else {
    await storage.updateNotificationStatus(notification.id, 'failed', result.error);
    await storage.createNotificationEvent({
      notificationId: notification.id,
      event: 'failed',
      meta: { error: result.error },
    });
  }
}

/**
 * Initialize notification orchestrator - listens to EventBus events and dispatches notifications
 */
export function initNotificationOrchestrator(storage: IStorage): void {
  if (!isNotificationsLayerEnabled()) {
    console.log('[NotificationOrchestrator] Disabled by feature flag');
    return;
  }

  console.log('[NotificationOrchestrator] Initializing event handlers...');

  // insight:generated - AI-generated health insights
  eventBus.on('insight:generated', async (payload: NotificationEventMap['insight:generated']) => {
    await dispatchNotification(storage, {
      userId: payload.userId,
      channel: 'insight',
      title: payload.title,
      body: payload.summary,
      deepLink: payload.deepLink,
      payload,
      priority: payload.priority,
    });
  });

  // biomarker:alert - Critical biomarker alerts
  eventBus.on('biomarker:alert', async (payload: NotificationEventMap['biomarker:alert']) => {
    await dispatchNotification(storage, {
      userId: payload.userId,
      channel: 'health_alert',
      title: `${payload.biomarkerName} Alert`,
      body: payload.message,
      deepLink: payload.deepLink,
      payload,
      priority: payload.status === 'critical' ? 'critical' : 'high',
    });
  });

  // recovery:alert - Recovery and rest recommendations
  eventBus.on('recovery:alert', async (payload: NotificationEventMap['recovery:alert']) => {
    await dispatchNotification(storage, {
      userId: payload.userId,
      channel: 'recovery_alert',
      title: 'Recovery Alert',
      body: payload.message,
      deepLink: payload.deepLink,
      payload,
      priority: 'medium',
    });
  });

  // workout:scheduled - Workout reminders
  eventBus.on('workout:scheduled', async (payload: NotificationEventMap['workout:scheduled']) => {
    await dispatchNotification(storage, {
      userId: payload.userId,
      channel: 'workout_reminder',
      title: `Workout Scheduled: ${payload.workoutType}`,
      body: `You have a ${payload.workoutType} workout scheduled for ${payload.date}${payload.scheduledTime ? ` at ${payload.scheduledTime}` : ''}`,
      deepLink: `healthpilot://training/workout/${payload.workoutId}`,
      payload,
      priority: 'low',
    });
  });

  // supplement:reminder - Supplement intake reminders
  eventBus.on('supplement:reminder', async (payload: NotificationEventMap['supplement:reminder']) => {
    await dispatchNotification(storage, {
      userId: payload.userId,
      channel: 'supplement_reminder',
      title: 'Supplement Reminder',
      body: `Time to take ${payload.supplementName}`,
      deepLink: payload.deepLink,
      payload,
      priority: 'low',
    });
  });

  console.log('[NotificationOrchestrator] Event handlers registered successfully');
}
