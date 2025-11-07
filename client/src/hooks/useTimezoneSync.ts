import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

/**
 * Hook that automatically detects and syncs the user's timezone to the backend.
 * 
 * Features:
 * - Syncs timezone on mount (after login)
 * - Detects timezone changes when user travels
 * - Updates backend automatically
 * - Prevents redundant updates
 * 
 * Usage:
 * Call this hook once in your app's root component after authentication
 * ```tsx
 * useTimezoneSync();
 * ```
 */
export function useTimezoneSync() {
  const lastSyncedTimezone = useRef<string | null>(null);
  const syncInProgress = useRef(false);

  /**
   * Get the user's current timezone using browser APIs
   * Returns IANA timezone identifier (e.g., 'America/New_York')
   */
  const getUserTimezone = (): string => {
    try {
      // Use Intl.DateTimeFormat to get IANA timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return timezone;
    } catch (_error) {
      console.error('Failed to detect timezone:', _error);
      // Fallback to UTC if detection fails
      return 'UTC';
    }
  };

  /**
   * Sync timezone to backend if it has changed
   */
  const syncTimezone = async () => {
    // Prevent concurrent syncs
    if (syncInProgress.current) {
      return;
    }

    const currentTimezone = getUserTimezone();
    
    // Don't sync if timezone hasn't changed
    if (currentTimezone === lastSyncedTimezone.current) {
      return;
    }

    syncInProgress.current = true;

    try {
      await apiRequest('/api/user/timezone', {
        method: 'PUT',
        body: JSON.stringify({ timezone: currentTimezone }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      lastSyncedTimezone.current = currentTimezone;
    } catch (_error) {
      console.error('Failed to sync timezone:', _error);
      // Don't throw - timezone sync is not critical to app functionality
    } finally {
      syncInProgress.current = false;
    }
  };

  useEffect(() => {
    // Sync timezone immediately on mount (after login)
    syncTimezone();

    // Listen for visibility changes to detect timezone changes
    // This happens when user travels and returns to the app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check and sync timezone when app becomes visible
        syncTimezone();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also check periodically in case timezone changes while app is active
    // (rare but possible if user manually changes system timezone)
    const intervalId = setInterval(() => {
      syncTimezone();
    }, 60 * 60 * 1000); // Check every hour

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return the current timezone for components that need it
  return getUserTimezone();
}
