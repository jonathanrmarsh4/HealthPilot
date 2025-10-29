/**
 * Domain Event Contracts for Notification System
 * 
 * Defines strongly-typed events that can trigger notifications across the system.
 * These events decouple notification logic from core business logic.
 */

// Event payload types
export interface InsightGeneratedEvent {
  userId: string;
  insightId: string;
  insightType: 'biomarker' | 'training' | 'recovery' | 'symptom' | 'general';
  title: string;
  summary: string;
  deepLink?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

export interface WorkoutScheduledEvent {
  userId: string;
  workoutId: string;
  date: string;
  workoutType: string;
  scheduledTime?: string;
}

export interface SupplementReminderEvent {
  userId: string;
  supplementId?: string;
  supplementName: string;
  time: string;
  deepLink?: string;
}

export interface BiomarkerAlertEvent {
  userId: string;
  biomarkerName: string;
  value: number;
  unit: string;
  status: 'critical' | 'high' | 'low' | 'optimal';
  message: string;
  deepLink?: string;
}

export interface RecoveryAlertEvent {
  userId: string;
  alertType: 'poor_sleep' | 'high_hrv' | 'low_hrv' | 'overtraining' | 'rest_needed';
  message: string;
  deepLink?: string;
}

export interface NotificationCreatedEvent {
  notificationId: string;
  userId: string;
  channel: string;
}

export interface NotificationDeliveredEvent {
  notificationId: string;
  providerMessageId?: string;
  deliveredAt: Date;
}

export interface NotificationReadEvent {
  notificationId: string;
  readAt: Date;
}

export interface ReminderScheduledEvent {
  reminderId: string;
  userId: string;
  type: string;
  schedule: string;
}

export interface ReminderTriggeredEvent {
  reminderId: string;
  userId: string;
  type: string;
}

export interface NotificationFailedEvent {
  notificationId: string;
  errorType: 'delivery_failed' | 'invalid_token' | 'rate_limited' | 'unknown';
  errorMessage: string;
  failedAt: Date;
}

export interface NotificationDismissedEvent {
  notificationId: string;
  dismissedAt: Date;
  dismissMethod?: 'swipe' | 'clear_all' | 'auto';
}

// Event map for type safety
export interface NotificationEventMap {
  'insight:generated': InsightGeneratedEvent;
  'workout:scheduled': WorkoutScheduledEvent;
  'supplement:reminder': SupplementReminderEvent;
  'biomarker:alert': BiomarkerAlertEvent;
  'recovery:alert': RecoveryAlertEvent;
  'notification:created': NotificationCreatedEvent;
  'notification:delivered': NotificationDeliveredEvent;
  'notification:read': NotificationReadEvent;
  'notification:failed': NotificationFailedEvent;
  'notification:dismissed': NotificationDismissedEvent;
  'reminder:scheduled': ReminderScheduledEvent;
  'reminder:triggered': ReminderTriggeredEvent;
}

export type NotificationEventName = keyof NotificationEventMap;
