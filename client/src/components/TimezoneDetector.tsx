import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

/**
 * Component that automatically detects and syncs user's timezone
 * 
 * Features:
 * - Syncs timezone on mount (after login)
 * - Detects timezone changes when user travels
 * - Updates backend automatically via PUT /api/user/timezone
 * - Prevents redundant updates
 * - Monitors visibility changes to detect timezone changes
 */
export function TimezoneDetector() {
  const { isAuthenticated } = useAuth();
  const lastSyncedTimezone = useRef<string | null>(null);
  const syncAttempted = useRef(false);
  
  const { data: profile } = useQuery<{ timezone: string | null }>({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      await apiRequest('/api/user/timezone', {
        method: 'PUT',
        body: JSON.stringify({ timezone }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return timezone;
    },
    onSuccess: (timezone) => {
      // Only mark as synced after successful update
      lastSyncedTimezone.current = timezone;
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      console.log('✅ Timezone synced successfully:', timezone);
    },
    onError: (error) => {
      // Reset flags on error to allow retry
      syncAttempted.current = false;
      lastSyncedTimezone.current = null;
      console.error('❌ Failed to sync timezone, will retry:', error);
    },
  });

  /**
   * Get the user's current timezone using browser APIs
   * Returns IANA timezone identifier (e.g., 'America/New_York')
   */
  const getUserTimezone = (): string | null => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return timezone;
    } catch (error) {
      console.error('Failed to detect timezone:', error);
      return null;
    }
  };

  /**
   * Sync timezone to backend if it has changed
   */
  const syncTimezone = () => {
    if (!isAuthenticated || updateTimezoneMutation.isPending) {
      return;
    }

    const currentTimezone = getUserTimezone();
    
    if (!currentTimezone) {
      return;
    }
    
    // Don't sync if timezone hasn't changed
    if (currentTimezone === lastSyncedTimezone.current) {
      return;
    }

    // Don't sync if it matches the profile timezone (already synced)
    if (profile?.timezone === currentTimezone && syncAttempted.current) {
      lastSyncedTimezone.current = currentTimezone;
      return;
    }

    console.log(`🌍 Timezone detected: ${currentTimezone}`, profile?.timezone ? `(stored: ${profile.timezone})` : '(first sync)');
    
    syncAttempted.current = true;
    // Note: lastSyncedTimezone is set in onSuccess handler to ensure update was successful
    updateTimezoneMutation.mutate(currentTimezone);
  };

  // Initial sync on mount
  useEffect(() => {
    if (isAuthenticated && profile) {
      syncTimezone();
    }
  }, [isAuthenticated, profile]);

  // Listen for visibility changes to detect timezone changes
  // This happens when user travels and returns to the app
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

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
  }, [isAuthenticated, profile, updateTimezoneMutation.isPending]);

  return null;
}
