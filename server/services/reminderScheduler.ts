import { storage } from '../storage';
import { eventBus } from '../lib/eventBus';
import { isNotificationsLayerEnabled } from '@shared/config/flags';

class ReminderScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  start() {
    if (this.isRunning || !isNotificationsLayerEnabled()) {
      return;
    }

    console.log('[ReminderScheduler] Starting...');
    this.isRunning = true;

    // Check every minute for due reminders
    this.intervalId = setInterval(() => {
      this.checkReminders();
    }, 60000); // 1 minute

    // Also check immediately on start
    this.checkReminders();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[ReminderScheduler] Stopped');
  }

  private async checkReminders() {
    try {
      const now = new Date();
      const currentHour = String(now.getHours()).padStart(2, '0');
      const currentMinute = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;

      console.log(`[ReminderScheduler] Checking reminders at ${currentTime}`);

      // Get all enabled reminders
      const reminders = await storage.getAllEnabledReminders();

      for (const reminder of reminders) {
        // Parse schedule (supports multiple times: "09:00" or "09:00,14:00,20:00")
        const scheduledTimes = reminder.schedule.split(',').map(t => t.trim());

        // Check if current time matches any scheduled time
        if (scheduledTimes.includes(currentTime)) {
          // Check if we already sent this reminder at THIS TIME today
          // lastSentAt stores the exact datetime of last send (including hour:minute)
          const lastSent = reminder.lastSentAt ? new Date(reminder.lastSentAt) : null;

          let shouldSend = true;
          if (lastSent) {
            // Check if we sent at this exact time slot today
            const lastSentHour = String(lastSent.getHours()).padStart(2, '0');
            const lastSentMinute = String(lastSent.getMinutes()).padStart(2, '0');
            const lastSentTime = `${lastSentHour}:${lastSentMinute}`;
            const lastSentDate = lastSent.toDateString();
            const today = new Date().toDateString();
            
            // Skip if we already sent at this exact time today
            if (lastSentDate === today && lastSentTime === currentTime) {
              shouldSend = false;
            }
          }

          if (shouldSend) {
            console.log(`[ReminderScheduler] Sending reminder: ${reminder.title} at ${currentTime}`);
            await this.sendReminder(reminder);
            
            // Update lastSentAt to current datetime (including hour:minute)
            await storage.updateReminderLastSent(reminder.id, now);
          }
        }
      }
    } catch (error) {
      console.error('[ReminderScheduler] Error checking reminders:', error);
    }
  }

  private async sendReminder(reminder: any) {
    // Emit event based on reminder type
    switch (reminder.type) {
      case 'supplement':
        eventBus.emit('supplement:reminder', {
          userId: reminder.userId,
          supplementId: reminder.metadata?.supplementId,
          supplementName: reminder.title,
          time: reminder.schedule, // Required: scheduled time(s) like "09:00" or "09:00,14:00,20:00"
          deepLink: `healthpilot://supplements`,
        });
        break;

      case 'workout':
        eventBus.emit('workout:scheduled', {
          userId: reminder.userId,
          workoutId: reminder.metadata?.workoutId || new Date().toISOString().split('T')[0],
          workoutType: reminder.title,
          date: new Date().toISOString().split('T')[0],
          scheduledTime: reminder.schedule,
        });
        break;

      case 'recovery':
        eventBus.emit('recovery:alert', {
          userId: reminder.userId,
          alertType: (reminder.metadata?.alertType as any) || 'rest_needed', // Default to rest_needed
          message: reminder.body,
          deepLink: `healthpilot://recovery`,
        });
        break;

      default:
        console.warn(`[ReminderScheduler] Unknown reminder type: ${reminder.type}`);
    }
  }
}

export const reminderScheduler = new ReminderScheduler();
