import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '@/services/healthkit';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Download, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

      // Sync data - retrieve from HealthKit
      const healthData = await healthKitService.syncAllHealthData(30); // Last 30 days
      
      // Send to backend
      console.log('[HealthKitSync] Sending health data to backend...');
      await apiRequest('POST', '/api/apple-health/sync', healthData);
      console.log('[HealthKitSync] Data sent to backend successfully');
      
      setLastSyncResult({
        success: true,
        message: 'Successfully synced health data from HealthKit',
      });

      toast({
        title: 'Sync Complete',
        description: 'Your health data has been synced successfully',
      });
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
        {/* Manual Sync */}
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Sync data from the last 30 days including steps, HRV, sleep, workouts, and biomarkers.
          </p>
          <p className="text-xs text-muted-foreground">
            Auto-sync is enabled by default when you open or resume the app.
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
                Manual Sync Now
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
