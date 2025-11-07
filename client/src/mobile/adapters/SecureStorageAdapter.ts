/**
 * SecureStorageAdapter.ts
 * 
 * Secure storage abstraction that uses iOS Keychain/Android Keystore for sensitive data (auth tokens)
 * and Capacitor Preferences for non-sensitive config.
 * 
 * IMPORTANT: Never store auth tokens in localStorage - use this adapter instead.
 * 
 * Uses @aparajita/capacitor-secure-storage which provides:
 * - iOS: Keychain storage
 * - Android: EncryptedSharedPreferences (Android Keystore)
 * - Web: localStorage fallback (dev only)
 */

import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { Preferences } from '@capacitor/preferences';
import { isNativePlatform } from '../MobileBootstrap';

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_ID_KEY = 'user_id';

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
 * Native implementation using @aparajita/capacitor-secure-storage
 * iOS: Keychain
 * Android: EncryptedSharedPreferences (Android Keystore)
 */
class NativeSecureStorage implements SecureStorageAdapter {
  async getAuthToken(): Promise<string | null> {
    try {
      const result = await SecureStorage.get({ key: AUTH_TOKEN_KEY });
      return result.value || null;
    } catch {
      return null;
    }
  }

  async setAuthToken(token: string): Promise<void> {
    await SecureStorage.set({ key: AUTH_TOKEN_KEY, value: token });
  }

  async clearAuthToken(): Promise<void> {
    try {
      await SecureStorage.remove({ key: AUTH_TOKEN_KEY });
    } catch {
      // Key might not exist, ignore error
    }
  }

  async getRefreshToken(): Promise<string | null> {
    try {
      const result = await SecureStorage.get({ key: REFRESH_TOKEN_KEY });
      return result.value || null;
    } catch {
      return null;
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    await SecureStorage.set({ key: REFRESH_TOKEN_KEY, value: token });
  }

  async clearRefreshToken(): Promise<void> {
    try {
      await SecureStorage.remove({ key: REFRESH_TOKEN_KEY });
    } catch {
      // Key might not exist, ignore error
    }
  }

  async getUserId(): Promise<string | null> {
    try {
      const result = await SecureStorage.get({ key: USER_ID_KEY });
      return result.value || null;
    } catch {
      return null;
    }
  }

  async setUserId(userId: string): Promise<void> {
    await SecureStorage.set({ key: USER_ID_KEY, value: userId });
  }

  async clearUserId(): Promise<void> {
    try {
      await SecureStorage.remove({ key: USER_ID_KEY });
    } catch {
      // Key might not exist, ignore error
    }
  }

  async getSecure(key: string): Promise<string | null> {
    try {
      const result = await SecureStorage.get({ key });
      return result.value || null;
    } catch {
      return null;
    }
  }

  async setSecure(key: string, value: string): Promise<void> {
    await SecureStorage.set({ key, value });
  }

  async removeSecure(key: string): Promise<void> {
    try {
      await SecureStorage.remove({ key });
    } catch {
      // Key might not exist, ignore error
    }
  }

  async clearAll(): Promise<void> {
    // Clear all secure keys
    await this.clearAuthToken();
    await this.clearRefreshToken();
    await this.clearUserId();
    
    // Clear all keys from secure storage
    try {
      await SecureStorage.clear();
    } catch {
      // Ignore errors
    }
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
 * Web fallback using Preferences (for development only)
 * WARNING: Not Keychain-backed, only for web testing
 * Production apps should only use native platforms
 */
class WebSecureStorage implements SecureStorageAdapter {
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
    const { value } = await Preferences.get({ key });
    return value;
  }

  async setSecure(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  }

  async removeSecure(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  async clearAll(): Promise<void> {
    await this.clearAuthToken();
    await this.clearRefreshToken();
    await this.clearUserId();
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
 * Singleton instance that automatically uses the correct implementation
 */
let instance: SecureStorageAdapter | null = null;

export function getSecureStorage(): SecureStorageAdapter {
  if (!instance) {
    instance = isNativePlatform() ? new NativeSecureStorage() : new WebSecureStorage();
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
