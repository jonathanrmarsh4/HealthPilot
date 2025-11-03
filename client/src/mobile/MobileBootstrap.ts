/**
 * MobileBootstrap.ts
 * 
 * Native-only initialization for Capacitor apps.
 * Handles status bar styling, splash screen, keyboard adjustments, and back button behavior.
 * 
 * Usage: Import and call `initializeMobile()` in main.tsx BEFORE rendering the app.
 */

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App as CapApp } from '@capacitor/app';

export interface MobileBootstrapOptions {
  statusBarStyle?: 'light' | 'dark';
  enableBackButtonHandler?: boolean;
  enableKeyboardHandling?: boolean;
  enableAutoSync?: boolean; // Enable automatic HealthKit sync on app lifecycle events
}

const defaultOptions: MobileBootstrapOptions = {
  statusBarStyle: 'dark',
  enableBackButtonHandler: true,
  enableKeyboardHandling: true,
  enableAutoSync: true,
};

// Auto-sync state
const AUTO_SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes
const LAST_SYNC_KEY = 'healthkit_last_auto_sync';

/**
 * Determines if the app is running on a native platform (iOS or Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Get the current platform (ios, android, or web)
 */
export function getPlatform(): string {
  return Capacitor.getPlatform();
}

/**
 * Initialize mobile-specific functionality
 * Should be called once at app startup
 */
export async function initializeMobile(
  options: MobileBootstrapOptions = {}
): Promise<void> {
  const config = { ...defaultOptions, ...options };

  if (!isNativePlatform()) {
    console.log('[MobileBootstrap] Running on web, skipping native initialization');
    return;
  }

  console.log(`[MobileBootstrap] Initializing on ${getPlatform()}...`);

  try {
    // Configure Status Bar
    await configureStatusBar(config.statusBarStyle);

    // Handle Splash Screen
    await configureSplashScreen();

    // Configure Keyboard
    if (config.enableKeyboardHandling) {
      await configureKeyboard();
    }

    // Configure Back Button
    if (config.enableBackButtonHandler) {
      configureBackButton();
    }

    // Configure Auto-Sync
    if (config.enableAutoSync && getPlatform() === 'ios') {
      configureAutoSync();
    }

    // Log app info
    await logAppInfo();

    console.log('[MobileBootstrap] ✅ Mobile initialization complete');
  } catch (error) {
    console.error('[MobileBootstrap] ❌ Initialization error:', error);
  }
}

/**
 * Configure the native status bar
 */
async function configureStatusBar(style: 'light' | 'dark' = 'dark'): Promise<void> {
  if (getPlatform() !== 'ios' && getPlatform() !== 'android') {
    return;
  }

  try {
    await StatusBar.setStyle({
      style: style === 'dark' ? Style.Dark : Style.Light,
    });

    if (getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#000000' });
    }

    console.log('[MobileBootstrap] Status bar configured');
  } catch (error) {
    console.warn('[MobileBootstrap] Status bar configuration failed:', error);
  }
}

/**
 * Handle splash screen hiding
 */
async function configureSplashScreen(): Promise<void> {
  try {
    // Splash screen will auto-hide based on capacitor.config.ts
    // But we can manually hide it after app is ready
    await SplashScreen.hide();
    console.log('[MobileBootstrap] Splash screen hidden');
  } catch (error) {
    console.warn('[MobileBootstrap] Splash screen handling failed:', error);
  }
}

/**
 * Configure keyboard behavior
 */
async function configureKeyboard(): Promise<void> {
  try {
    Keyboard.addListener('keyboardWillShow', (info) => {
      console.log('[MobileBootstrap] Keyboard will show', info.keyboardHeight);
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      console.log('[MobileBootstrap] Keyboard will hide');
      document.body.classList.remove('keyboard-open');
    });

    // Keyboard configuration is handled via capacitor.config.ts
    console.log('[MobileBootstrap] Keyboard listeners configured');
  } catch (error) {
    console.warn('[MobileBootstrap] Keyboard configuration failed:', error);
  }
}

/**
 * Configure hardware back button behavior
 */
function configureBackButton(): void {
  try {
    CapApp.addListener('backButton', ({ canGoBack }) => {
      console.log('[MobileBootstrap] Back button pressed, canGoBack:', canGoBack);
      
      // Allow navigation back if possible
      if (canGoBack) {
        window.history.back();
      } else {
        // On root screen, minimize app instead of exiting
        if (getPlatform() === 'android') {
          CapApp.minimizeApp();
        }
      }
    });

    console.log('[MobileBootstrap] Back button handler configured');
  } catch (error) {
    console.warn('[MobileBootstrap] Back button configuration failed:', error);
  }
}

/**
 * Configure automatic HealthKit sync on app lifecycle events
 */
function configureAutoSync(): void {
  try {
    // Trigger sync on app launch (after cooldown check)
    triggerAutoSync('launch');
    
    // Listen for app state changes
    CapApp.addListener('appStateChange', (state) => {
      if (state.isActive) {
        // App came to foreground
        triggerAutoSync('resume');
      }
    });
    
    console.log('[MobileBootstrap] Auto-sync configured (5-minute cooldown)');
  } catch (error) {
    console.warn('[MobileBootstrap] Auto-sync configuration failed:', error);
  }
}

/**
 * Trigger automatic HealthKit sync with smart cooldown
 */
async function triggerAutoSync(trigger: 'launch' | 'resume'): Promise<void> {
  try {
    // Check cooldown
    const lastSyncStr = localStorage.getItem(LAST_SYNC_KEY);
    const now = Date.now();
    
    if (lastSyncStr) {
      const lastSync = parseInt(lastSyncStr, 10);
      const elapsed = now - lastSync;
      
      if (elapsed < AUTO_SYNC_COOLDOWN_MS) {
        const remainingMin = Math.ceil((AUTO_SYNC_COOLDOWN_MS - elapsed) / 60000);
        console.log(`[MobileBootstrap] Auto-sync skipped (cooldown: ${remainingMin}m remaining)`);
        return;
      }
    }
    
    // Update last sync timestamp
    localStorage.setItem(LAST_SYNC_KEY, now.toString());
    
    console.log(`[MobileBootstrap] Triggering auto-sync (${trigger})...`);
    
    // Call the existing sync endpoint
    const response = await fetch('/api/apple-health/sync', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[MobileBootstrap] Auto-sync completed:', result);
    } else {
      console.warn('[MobileBootstrap] Auto-sync failed:', response.status);
    }
  } catch (error) {
    console.error('[MobileBootstrap] Auto-sync error:', error);
  }
}

/**
 * Log app information for debugging
 */
async function logAppInfo(): Promise<void> {
  try {
    const info = await CapApp.getInfo();
    console.log('[MobileBootstrap] App Info:', {
      name: info.name,
      id: info.id,
      version: info.version,
      build: info.build,
    });
  } catch (error) {
    console.warn('[MobileBootstrap] Failed to get app info:', error);
  }
}

/**
 * Check if app has specific permissions (helper for diagnostics)
 */
export async function checkAppState(): Promise<{
  platform: string;
  isNative: boolean;
  appInfo?: any;
}> {
  const platform = getPlatform();
  const isNative = isNativePlatform();

  let appInfo = undefined;
  if (isNative) {
    try {
      appInfo = await CapApp.getInfo();
    } catch (error) {
      console.error('[MobileBootstrap] Failed to get app info:', error);
    }
  }

  return {
    platform,
    isNative,
    appInfo,
  };
}

export default {
  initializeMobile,
  isNativePlatform,
  getPlatform,
  checkAppState,
};
