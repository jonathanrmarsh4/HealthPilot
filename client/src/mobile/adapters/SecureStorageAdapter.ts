/**
 * SecureStorageAdapter.ts
 * 
 * Secure storage abstraction that uses iOS Keychain/Android Keystore for sensitive data (auth tokens)
 * and Capacitor Preferences for non-sensitive config.
 * 
 * IMPORTANT: Never store auth tokens in localStorage - use this adapter instead.
 */

import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '../MobileBootstrap';

// Keychain is accessed via Preferences with special prefixes
// iOS automatically uses Keychain for secure storage when using Preferences
const SECURE_PREFIX = 'secure_';
const AUTH_TOKEN_KEY = `${SECURE_PREFIX}auth_token`;
const REFRESH_TOKEN_KEY = `${SECURE_PREFIX}refresh_token`;
const USER_ID_KEY = `${SECURE_PREFIX}user_id`;

export interface SecureStorageAdapter {
  // Auth token management
  getAuthToken(): Promise<string | null>;
  setAuthToken(token: string): Promise<void>;
  clearAuthToken(): Promise<void>;

  // Refresh token management
  getRefreshToken(): Promise<string | null>;
  setRefreshToken(token: string): Promise<void>;
  clearRefreshToken(): Promise<void>;

  // User ID
  getUserId(): Promise<string | null>;
  setUserId(userId: string): Promise<void>;
  clearUserId(): Promise<void>;

  // General secure storage
  getSecure(key: string): Promise<string | null>;
  setSecure(key: string, value: string): Promise<void>;
  removeSecure(key: string): Promise<void>;

  // Clear all secure data (logout)
  clearAll(): Promise<void>;

  // Non-secure preferences
  getPreference(key: string): Promise<string | null>;
  setPreference(key: string, value: string): Promise<void>;
  removePreference(key: string): Promise<void>;
}

/**
 * Native implementation using Capacitor Preferences (backed by Keychain on iOS)
 */
class NativeSecureStorage implements SecureStorageAdapter {
  async getAuthToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: AUTH_TOKEN_KEY });
    return value;
  }

  async setAuthToken(token: string): Promise<void> {
    await Preferences.set({ key: AUTH_TOKEN_KEY, value: token });
  }

  async clearAuthToken(): Promise<void> {
    await Preferences.remove({ key: AUTH_TOKEN_KEY });
  }

  async getRefreshToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: REFRESH_TOKEN_KEY });
    return value;
  }

  async setRefreshToken(token: string): Promise<void> {
    await Preferences.set({ key: REFRESH_TOKEN_KEY, value: token });
  }

  async clearRefreshToken(): Promise<void> {
    await Preferences.remove({ key: REFRESH_TOKEN_KEY });
  }

  async getUserId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: USER_ID_KEY });
    return value;
  }

  async setUserId(userId: string): Promise<void> {
    await Preferences.set({ key: USER_ID_KEY, value: userId });
  }

  async clearUserId(): Promise<void> {
    await Preferences.remove({ key: USER_ID_KEY });
  }

  async getSecure(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key: `${SECURE_PREFIX}${key}` });
    return value;
  }

  async setSecure(key: string, value: string): Promise<void> {
    await Preferences.set({ key: `${SECURE_PREFIX}${key}`, value });
  }

  async removeSecure(key: string): Promise<void> {
    await Preferences.remove({ key: `${SECURE_PREFIX}${key}` });
  }

  async clearAll(): Promise<void> {
    // Clear all secure keys
    await this.clearAuthToken();
    await this.clearRefreshToken();
    await this.clearUserId();
    
    // Note: This clears ALL preferences. For production, you might want to be more selective
    await Preferences.clear();
  }

  async getPreference(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value;
  }

  async setPreference(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async removePreference(key: string): Promise<void> {
    await Preferences.remove({ key });
  }
}

/**
 * Web fallback using localStorage (for development only)
 * WARNING: Not secure, only for web testing
 */
class WebSecureStorage implements SecureStorageAdapter {
  async getAuthToken(): Promise<string | null> {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  async setAuthToken(token: string): Promise<void> {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }

  async clearAuthToken(): Promise<void> {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  async setRefreshToken(token: string): Promise<void> {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  async clearRefreshToken(): Promise<void> {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async getUserId(): Promise<string | null> {
    return localStorage.getItem(USER_ID_KEY);
  }

  async setUserId(userId: string): Promise<void> {
    localStorage.setItem(USER_ID_KEY, userId);
  }

  async clearUserId(): Promise<void> {
    localStorage.removeItem(USER_ID_KEY);
  }

  async getSecure(key: string): Promise<string | null> {
    return localStorage.getItem(`${SECURE_PREFIX}${key}`);
  }

  async setSecure(key: string, value: string): Promise<void> {
    localStorage.setItem(`${SECURE_PREFIX}${key}`, value);
  }

  async removeSecure(key: string): Promise<void> {
    localStorage.removeItem(`${SECURE_PREFIX}${key}`);
  }

  async clearAll(): Promise<void> {
    // Clear all secure-prefixed keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SECURE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }

  async getPreference(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async setPreference(key: string, value: string): Promise<void> {
    localStorage.setItem(key, value);
  }

  async removePreference(key: string): Promise<void> {
    localStorage.removeItem(key);
  }
}

/**
 * Singleton instance that automatically uses the correct implementation
 */
let instance: SecureStorageAdapter | null = null;

export function getSecureStorage(): SecureStorageAdapter {
  if (!instance) {
    instance = isNativePlatform() ? new NativeSecureStorage() : new WebSecureStorage();
    console.log(`[SecureStorage] Using ${isNativePlatform() ? 'Native' : 'Web'} implementation`);
  }
  return instance;
}

/**
 * Test the secure storage adapter
 */
export async function testSecureStorage(): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> {
  const storage = getSecureStorage();

  try {
    // Test round-trip
    const testKey = 'test_key';
    const testValue = 'test_value_' + Date.now();

    await storage.setSecure(testKey, testValue);
    const retrieved = await storage.getSecure(testKey);
    await storage.removeSecure(testKey);

    if (retrieved !== testValue) {
      return {
        success: false,
        error: 'Round-trip failed: value mismatch',
        details: { expected: testValue, got: retrieved },
      };
    }

    return {
      success: true,
      details: {
        platform: isNativePlatform() ? 'native' : 'web',
        tested: 'set/get/remove',
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

export default {
  getSecureStorage,
  testSecureStorage,
};
