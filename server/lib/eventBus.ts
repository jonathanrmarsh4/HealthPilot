/**
 * Type-Safe Event Bus for HealthPilot
 * 
 * Lightweight event system for decoupling notification logic from business logic.
 * Supports strongly-typed events with automatic type inference for payloads.
 */

import type { NotificationEventMap, NotificationEventName } from '@shared/types/notification-events';

type EventHandler<T> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers: Map<string, Set<EventHandler<any>>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends NotificationEventName>(
    eventName: K,
    handler: EventHandler<NotificationEventMap[K]>
  ): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }

    this.handlers.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventName, handler);
    };
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends NotificationEventName>(
    eventName: K,
    handler: EventHandler<NotificationEventMap[K]>
  ): void {
    const eventHandlers = this.handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<K extends NotificationEventName>(
    eventName: K,
    payload: NotificationEventMap[K]
  ): Promise<void> {
    const eventHandlers = this.handlers.get(eventName);
    
    if (!eventHandlers || eventHandlers.size === 0) {
      // No handlers registered - this is fine, just log for debugging
      console.log(`[EventBus] No handlers for event: ${eventName}`);
      return;
    }

    // Execute all handlers in parallel
    const promises = Array.from(eventHandlers).map(async (handler) => {
      try {
        await handler(payload);
      } catch (error) {
        console.error(`[EventBus] Error in handler for ${eventName}:`, error);
        // Don't re-throw - one handler failure shouldn't block others
      }
    });

    await Promise.all(promises);
  }

  /**
   * Get count of handlers for an event (useful for testing)
   */
  getHandlerCount(eventName: NotificationEventName): number {
    return this.handlers.get(eventName)?.size || 0;
  }

  /**
   * Clear all handlers (useful for testing)
   */
  clearAll(): void {
    this.handlers.clear();
  }

  /**
   * Clear handlers for a specific event
   */
  clear(eventName: NotificationEventName): void {
    this.handlers.delete(eventName);
  }
}

// Singleton instance
export const eventBus = new EventBus();

/**
 * Convenience emitter functions for common events
 */

export async function emitInsightGenerated(payload: NotificationEventMap['insight:generated']) {
  await eventBus.emit('insight:generated', payload);
}

export async function emitWorkoutScheduled(payload: NotificationEventMap['workout:scheduled']) {
  await eventBus.emit('workout:scheduled', payload);
}

export async function emitSupplementReminder(payload: NotificationEventMap['supplement:reminder']) {
  await eventBus.emit('supplement:reminder', payload);
}

export async function emitBiomarkerAlert(payload: NotificationEventMap['biomarker:alert']) {
  await eventBus.emit('biomarker:alert', payload);
}

export async function emitRecoveryAlert(payload: NotificationEventMap['recovery:alert']) {
  await eventBus.emit('recovery:alert', payload);
}

export async function emitNotificationCreated(payload: NotificationEventMap['notification:created']) {
  await eventBus.emit('notification:created', payload);
}

export async function emitNotificationDelivered(payload: NotificationEventMap['notification:delivered']) {
  await eventBus.emit('notification:delivered', payload);
}

export async function emitNotificationRead(payload: NotificationEventMap['notification:read']) {
  await eventBus.emit('notification:read', payload);
}

export async function emitReminderScheduled(payload: NotificationEventMap['reminder:scheduled']) {
  await eventBus.emit('reminder:scheduled', payload);
}

export async function emitReminderTriggered(payload: NotificationEventMap['reminder:triggered']) {
  await eventBus.emit('reminder:triggered', payload);
}

export async function emitNotificationFailed(payload: NotificationEventMap['notification:failed']) {
  await eventBus.emit('notification:failed', payload);
}

export async function emitNotificationDismissed(payload: NotificationEventMap['notification:dismissed']) {
  await eventBus.emit('notification:dismissed', payload);
}
