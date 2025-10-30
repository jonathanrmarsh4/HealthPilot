import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { healthKitService } from '@/services/healthkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Smartphone, Download, CheckCircle2, XCircle, Info, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl, queryClient, apiRequest } from '@/lib/queryClient';
import { isNativePlatform } from '@/mobile/MobileBootstrap';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';
import { useQuery } from '@tanstack/react-query';

interface SyncJobStatus {
  jobId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: {
    totalSamples: number;
    processedSamples: number;
    currentBatch?: string;
  };
  result?: {
    insertedCount: number;
    message: string;
  };
  error?: string;
}

export function HealthKitSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState<boolean | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<{
    success: boolean;
    message: string;
    count?: number;
  } | null>(null);
  const { toast } = useToast();

  // Poll for job status when we have a jobId
  const { data: jobStatus } = useQuery<SyncJobStatus>({
    queryKey: [`/api/apple-health/sync/status/${currentJobId}`],
    enabled: !!currentJobId && isSyncing,
    refetchInterval: (data) => {
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 1000; // Poll every second while processing
    },
  });

  const platform = Capacitor.getPlatform();

  // Check HealthKit availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      const available = await healthKitService.isHealthKitAvailable();
      setIsHealthKitAvailable(available);
    };
    checkAvailability();
  }, []);

  // Handle job status changes
  useEffect(() => {
    if (!jobStatus) return;

    if (jobStatus.status === 'completed') {
      setIsSyncing(false);
      setCurrentJobId(null);
      setLastSyncResult({
        success: true,
        message: jobStatus.result?.message || 'Sync completed successfully',
        count: jobStatus.result?.insertedCount,
      });

      toast({
        title: 'Sync Complete',
        description: jobStatus.result?.message || 'Your health data has been synced successfully',
      });

      // NOW invalidate queries - data is in the database
      queryClient.invalidateQueries({ queryKey: ['/api/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/sleep-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    } else if (jobStatus.status === 'failed') {
      setIsSyncing(false);
      setCurrentJobId(null);
      setLastSyncResult({
        success: false,
        message: jobStatus.error || 'Sync failed',
      });

      toast({
        title: 'Sync Failed',
        description: jobStatus.error || 'Failed to sync health data',
        variant: 'destructive',
      });
    }
  }, [jobStatus, toast]);

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
    setCurrentJobId(null);

    try {
      // Request permissions first
      const permissionsGranted = await healthKitService.requestPermissions();
      
      if (!permissionsGranted) {
        throw new Error('HealthKit permissions not granted');
      }

      // Get health data from HealthKit (7 days to include today's current data + recent history)
      console.log('[HealthKitSync] Fetching 7 days of health data...');
      const healthData = await healthKitService.getAllHealthData(7);
      
      console.log('[HealthKitSync] Data fetched, uploading to server...');
      
      // Send to backend - will get jobId back
      const response = await apiRequest('POST', '/api/apple-health/sync', healthData);
      const result = await response.json();
      
      console.log('[HealthKitSync] Upload accepted:', result);
      
      // Start polling for status
      if (result.jobId) {
        setCurrentJobId(result.jobId);
        toast({
          title: 'Processing',
          description: `Syncing ${result.totalSamples} health data samples...`,
        });
      } else {
        throw new Error('No job ID received from server');
      }
      
    } catch (error: any) {
      console.error('HealthKit sync failed:', error);
      
      setIsSyncing(false);
      setLastSyncResult({
        success: false,
        message: error.message || 'Failed to sync health data',
      });

      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync health data',
        variant: 'destructive',
      });
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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

        {/* Show progress while syncing */}
        {isSyncing && jobStatus && (
          <div className="space-y-2" data-testid="sync-progress">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {jobStatus.progress.currentBatch || 'Processing...'}
              </span>
              <span className="font-medium">
                {jobStatus.progress.processedSamples} / {jobStatus.progress.totalSamples}
              </span>
            </div>
            <Progress 
              value={(jobStatus.progress.processedSamples / jobStatus.progress.totalSamples) * 100} 
              className="h-2"
            />
          </div>
        )}

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
              {lastSyncResult.count !== undefined && (
                <span className="block text-sm mt-1">
                  {lastSyncResult.count} records synced
                </span>
              )}
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
