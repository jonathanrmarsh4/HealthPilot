/**
 * ShareAdapter.ts
 * 
 * Native sharing abstraction using Capacitor Share API.
 * Provides native share dialogs on mobile and web share API fallback.
 */

import { Share } from '@capacitor/share';
import { isNativePlatform } from '../MobileBootstrap';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

export interface ShareAdapter {
  canShare(): Promise<boolean>;
  share(options: ShareOptions): Promise<boolean>;
  shareText(text: string, title?: string): Promise<boolean>;
  shareUrl(url: string, title?: string): Promise<boolean>;
}

class NativeShareAdapter implements ShareAdapter {
  async canShare(): Promise<boolean> {
    return true; // Always available on native
  }

  async share(options: ShareOptions): Promise<boolean> {
    try {
      await Share.share({
        title: options.title,
        text: options.text,
        url: options.url,
        dialogTitle: options.dialogTitle || 'Share',
      });
      return true;
    } catch (error) {
      console.error('[Share] Failed to share:', error);
      return false;
    }
  }

  async shareText(text: string, title?: string): Promise<boolean> {
    return this.share({ text, title });
  }

  async shareUrl(url: string, title?: string): Promise<boolean> {
    return this.share({ url, title });
  }
}

class WebShareAdapter implements ShareAdapter {
  async canShare(): Promise<boolean> {
    return 'share' in navigator;
  }

  async share(options: ShareOptions): Promise<boolean> {
    if (!('share' in navigator)) {
      console.warn('[Share] Web Share API not available');
      return false;
    }

    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url,
      });
      return true;
    } catch (error) {
      console.error('[Share] Failed to share:', error);
      return false;
    }
  }

  async shareText(text: string, title?: string): Promise<boolean> {
    return this.share({ text, title });
  }

  async shareUrl(url: string, title?: string): Promise<boolean> {
    return this.share({ url, title });
  }
}

let instance: ShareAdapter | null = null;

export function getShareAdapter(): ShareAdapter {
  if (!instance) {
    instance = isNativePlatform() ? new NativeShareAdapter() : new WebShareAdapter();
  }
  return instance;
}

export default { getShareAdapter };
