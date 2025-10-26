/**
 * HapticsAdapter.ts
 * 
 * Haptic feedback abstraction for native and web platforms.
 * Provides impact, notification, and selection feedback.
 */

import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { isNativePlatform } from '../MobileBootstrap';

export interface HapticsAdapter {
  impact(style?: 'light' | 'medium' | 'heavy'): Promise<void>;
  notification(type?: 'success' | 'warning' | 'error'): Promise<void>;
  selection(): Promise<void>;
  vibrate(duration?: number): Promise<void>;
}

class NativeHapticsAdapter implements HapticsAdapter {
  async impact(style: 'light' | 'medium' | 'heavy' = 'medium'): Promise<void> {
    const styleMap = {
      light: ImpactStyle.Light,
      medium: ImpactStyle.Medium,
      heavy: ImpactStyle.Heavy,
    };

    await Haptics.impact({ style: styleMap[style] });
  }

  async notification(type: 'success' | 'warning' | 'error' = 'success'): Promise<void> {
    const typeMap = {
      success: NotificationType.Success,
      warning: NotificationType.Warning,
      error: NotificationType.Error,
    };

    await Haptics.notification({ type: typeMap[type] });
  }

  async selection(): Promise<void> {
    await Haptics.selectionStart();
    await Haptics.selectionChanged();
    await Haptics.selectionEnd();
  }

  async vibrate(duration: number = 300): Promise<void> {
    await Haptics.vibrate({ duration });
  }
}

class WebHapticsAdapter implements HapticsAdapter {
  async impact(_style?: 'light' | 'medium' | 'heavy'): Promise<void> {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }

  async notification(_type?: 'success' | 'warning' | 'error'): Promise<void> {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }

  async selection(): Promise<void> {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }

  async vibrate(duration: number = 300): Promise<void> {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }
}

let instance: HapticsAdapter | null = null;

export function getHapticsAdapter(): HapticsAdapter {
  if (!instance) {
    instance = isNativePlatform() ? new NativeHapticsAdapter() : new WebHapticsAdapter();
  }
  return instance;
}

export default { getHapticsAdapter };
