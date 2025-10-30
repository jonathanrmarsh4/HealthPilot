import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '@/services/healthkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Download, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl, queryClient } from '@/lib/queryClient';
import { isNativePlatform } from '@/mobile/MobileBootstrap';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

export function HealthKitSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState<boolean | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const { toast } = useToast();

  const platform = Capacitor.getPlatform();

  // Check HealthKit availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await healthKitService.isHealthKitAvailable();
      setIsHealthKitAvailable(available);
    };
    checkAvailability();
  }, []);

  const handleSync = async () => {
    if (!isHealthKitAvailable) {
      toast({
        title: 'Not Available',
        description: 'HealthKit is only available on iOS devices',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      // Request permissions first
      const permissionsGranted = await healthKitService.requestPermissions();
      
      if (!permissionsGranted) {
        throw new Error('HealthKit permissions not granted');
      }

      // Get health data from HealthKit (1 day for reliable sync)
      console.log('[HealthKitSync] Fetching 1 day of health data...');
      const healthData = await healthKitService.getAllHealthData(1);
      
      console.log('[HealthKitSync] Data fetched, uploading to server...');
      
      // Send to backend with extended timeout (2 minutes)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 min timeout
        
        const apiUrl = `${getApiBaseUrl()}/api/apple-health/sync`;
        console.log('[HealthKitSync] Uploading to:', apiUrl);
        
        // Get auth headers for mobile
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        
        if (isNativePlatform()) {
          try {
            const token = await SecureStorage.get('sessionToken');
            if (token) {
              headers['Authorization'] = `Bearer ${token}`;
            }
          } catch (error) {
            console.warn('[HealthKitSync] No session token found');
          }
        }
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(healthData),
          credentials: 'include',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Upload failed');
        }
        
        const result = await response.json();
        console.log('[HealthKitSync] Upload successful:', result);
      } catch (uploadError: any) {
        console.error('[HealthKitSync] Upload error:', uploadError);
        if (uploadError.name === 'AbortError') {
          throw new Error('Upload timed out after 2 minutes. Your data may still be processing.');
        }
        throw uploadError;
      }
      
      setLastSyncResult({
        success: true,
        message: 'Successfully synced health data from HealthKit',
      });

      toast({
        title: 'Sync Complete',
        description: 'Your health data has been synced successfully',
      });

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } catch (error: any) {
      console.error('HealthKit sync failed:', error);
      
      setLastSyncResult({
        success: false,
        message: error.message || 'Failed to sync health data',
      });

      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync health data',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Show loading state while checking availability
  if (isHealthKitAvailable === null) {
    return (
      <Card data-testid="card-healthkit-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Apple Health Sync
          </CardTitle>
          <CardDescription>
            Checking HealthKit availability...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8" data-testid="loader-healthkit-check">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show web fallback if HealthKit not available
  if (!isHealthKitAvailable) {
    return (
      <Card data-testid="card-healthkit-unavailable">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Apple Health Sync
          </CardTitle>
          <CardDescription>
            Native HealthKit integration for iOS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert data-testid="alert-healthkit-web">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <strong>iOS App Required</strong>
              <p className="mt-2">
                Apple Health sync is only available in the iOS native app. 
                Currently viewing on: <span className="font-medium">{platform}</span>
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                To sync health data on web, use the Health Auto Export app with webhook integration.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // iOS native app UI
  return (
    <Card data-testid="card-healthkit-sync">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Apple Health Sync
        </CardTitle>
        <CardDescription>
          Sync your health data directly from HealthKit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Quick sync of today's data including steps, HRV, sleep, workouts, and biomarkers.
          </p>

          <Button
            onClick={handleSync}
            disabled={isSyncing}
            className="w-full"
            data-testid="button-sync-healthkit"
          >
            {isSyncing ? (
              <>
                <Download className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Sync Health Data
              </>
            )}
          </Button>
        </div>

        {lastSyncResult && (
          <Alert
            variant={lastSyncResult.success ? 'default' : 'destructive'}
            data-testid={lastSyncResult.success ? 'alert-sync-success' : 'alert-sync-error'}
          >
            {lastSyncResult.success ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {lastSyncResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground">
          <p>First time? You'll be asked to grant permissions to access your Health data.</p>
        </div>
      </CardContent>
    </Card>
  );
}
