import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function TimezoneDetector() {
  const { user, isAuthenticated } = useAuth();
  
  const { data: profile } = useQuery<{ timezone: string | null }>({
    queryKey: ['/api/profile'],
    enabled: isAuthenticated,
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (timezone: string) => {
      await apiRequest('PATCH', '/api/profile', { timezone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  useEffect(() => {
    if (isAuthenticated && profile && !profile.timezone && !updateTimezoneMutation.isPending) {
      const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      if (browserTimezone) {
        console.log('🌍 Auto-detected timezone:', browserTimezone);
        updateTimezoneMutation.mutate(browserTimezone);
      }
    }
  }, [isAuthenticated, profile, updateTimezoneMutation]);

  return null;
}
