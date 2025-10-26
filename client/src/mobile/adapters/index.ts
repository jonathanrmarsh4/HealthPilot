/**
 * Mobile Adapters Index
 * 
 * Centralized export of all mobile adapters for easy importing throughout the app.
 */

export { getSecureStorage, testSecureStorage } from './SecureStorageAdapter';
export type { SecureStorageAdapter } from './SecureStorageAdapter';

export { getHealthKitAdapter, testHealthKitAdapter } from './HealthKitAdapter';
export type { 
  HealthKitAdapter,
  HealthDataType,
  HealthKitPermissions,
  HealthDataQuery,
  HealthDataSample 
} from './HealthKitAdapter';

export { getHapticsAdapter } from './HapticsAdapter';
export type { HapticsAdapter } from './HapticsAdapter';

export { getShareAdapter } from './ShareAdapter';
export type { ShareAdapter, ShareOptions } from './ShareAdapter';

export { getBrowserAdapter } from './BrowserAdapter';
export type { BrowserAdapter } from './BrowserAdapter';
