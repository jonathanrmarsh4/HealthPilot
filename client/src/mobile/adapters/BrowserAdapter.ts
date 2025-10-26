/**
 * BrowserAdapter.ts
 * 
 * Browser/In-App Browser abstraction for opening external URLs.
 * Important for OAuth flows and external content.
 */

import { Browser } from '@capacitor/browser';
import { isNativePlatform } from '../MobileBootstrap';

export interface BrowserAdapter {
  open(url: string, target?: '_blank' | '_system'): Promise<void>;
  close(): Promise<void>;
  openInApp(url: string): Promise<void>;
  openInSystem(url: string): Promise<void>;
}

class NativeBrowserAdapter implements BrowserAdapter {
  async open(url: string, target: '_blank' | '_system' = '_blank'): Promise<void> {
    if (target === '_system') {
      await this.openInSystem(url);
    } else {
      await this.openInApp(url);
    }
  }

  async close(): Promise<void> {
    await Browser.close();
  }

  async openInApp(url: string): Promise<void> {
    await Browser.open({
      url,
      presentationStyle: 'popover',
      toolbarColor: '#000000',
    });
  }

  async openInSystem(url: string): Promise<void> {
    await Browser.open({
      url,
      windowName: '_system',
    });
  }
}

class WebBrowserAdapter implements BrowserAdapter {
  async open(url: string, target: '_blank' | '_system' = '_blank'): Promise<void> {
    window.open(url, target);
  }

  async close(): Promise<void> {
    // Not applicable for web
    console.warn('[Browser] Close not supported on web');
  }

  async openInApp(url: string): Promise<void> {
    window.open(url, '_blank');
  }

  async openInSystem(url: string): Promise<void> {
    window.open(url, '_blank');
  }
}

let instance: BrowserAdapter | null = null;

export function getBrowserAdapter(): BrowserAdapter {
  if (!instance) {
    instance = isNativePlatform() ? new NativeBrowserAdapter() : new WebBrowserAdapter();
  }
  return instance;
}

export default { getBrowserAdapter };
