import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Heart, Loader2, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { healthKitService } from "@/services/healthkit";
import { getPlatform } from "@/mobile/MobileBootstrap";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Preferences } from "@capacitor/preferences";

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

export default function AppleHealthSetup() {
  const { toast } = useToast();
  const [isHealthKitSyncing, setIsHealthKitSyncing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // Poll for job status when we have a jobId
  const { data: jobStatus } = useQuery<SyncJobStatus>({
    queryKey: [`/api/apple-health/sync/status/${currentJobId}`],
    enabled: !!currentJobId && isHealthKitSyncing,
    refetchInterval: (data) => {
      // Stop polling when job is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 1000; // Poll every second while processing
    },
  });

  // Handle job status changes
  useEffect(() => {
    if (!jobStatus) return;

    if (jobStatus.status === 'completed') {
      setIsHealthKitSyncing(false);
      setCurrentJobId(null);
      setHealthKitStatus('success');

      toast({
        title: 'Sync Complete',
        description: jobStatus.result?.message || 'Your health data has been synced successfully',
      });

      // Mark HealthKit setup as complete and invalidate queries
      (async () => {
        await apiRequest('POST', '/api/onboarding/complete-healthkit');
        
        // NOW invalidate queries - data is in the database
        queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
        queryClient.invalidateQueries({ queryKey: ['/api/biomarkers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/sleep-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      })();

      // Reset status after 3 seconds
      setTimeout(() => {
        setHealthKitStatus('idle');
      }, 3000);
    } else if (jobStatus.status === 'failed') {
      setIsHealthKitSyncing(false);
      setCurrentJobId(null);
      setHealthKitStatus('error');

      toast({
        title: 'Sync Failed',
        description: jobStatus.error || 'Failed to sync health data',
        variant: 'destructive',
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setHealthKitStatus('idle');
      }, 3000);
    }
  }, [jobStatus, toast]);

  const handleSetupHealthKit = async () => {
    setIsHealthKitSyncing(true);
    setHealthKitStatus('syncing');
    setCurrentJobId(null);

    try {
      // Check if HealthKit is available
      const available = await healthKitService.isHealthKitAvailable();
      
      if (!available) {
        throw new Error('HealthKit is not available on this device');
      }

      // Request permissions
      const permissionsGranted = await healthKitService.requestPermissions();
      
      if (!permissionsGranted) {
        throw new Error('HealthKit permissions were not granted. Please enable them in Settings.');
      }

      // Get health data (last 7 days to include today's current data + recent history)
      console.log('[AppleHealthSetup] Fetching 7 days of health data...');
      const healthData = await healthKitService.getAllHealthData(7);
      console.log('[AppleHealthSetup] Data fetched, uploading...');
      
      // Send to backend - will get jobId back
      const response = await apiRequest('POST', '/api/apple-health/sync', healthData);
      const result = await response.json();
      
      console.log('[AppleHealthSetup] Upload accepted:', result);
      
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
      
      setIsHealthKitSyncing(false);
      setHealthKitStatus('error');

      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync health data',
        variant: 'destructive',
      });

      // Reset status after 3 seconds
      setTimeout(() => {
        setHealthKitStatus('idle');
      }, 3000);
    }
  };

  const handleClearSyncHistory = async () => {
    try {
      // Clear the sync timestamp from Preferences
      await Preferences.remove({ key: 'healthkit_last_sync' });
      
      console.log('[AppleHealthSetup] Cleared HealthKit sync history');
      
      toast({
        title: 'Sync History Cleared',
        description: 'Your next sync will fetch the full 7 days of data',
      });
    } catch (error: any) {
      console.error('[AppleHealthSetup] Failed to clear sync history:', error);
      
      toast({
        title: 'Error',
        description: 'Failed to clear sync history. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Apple Health Integration</h1>
        <p className="text-muted-foreground mt-2">
          Connect your Apple Health data to get personalized AI-powered insights
        </p>
      </div>

      {/* Native HealthKit Setup - Only show on iOS native app */}
      {getPlatform() === 'ios' && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              Native Apple Health (Recommended)
            </CardTitle>
            <CardDescription>
              Instant setup with direct HealthKit integration - no third-party apps needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                <strong>You're using the native iOS app!</strong> Connect directly to Apple Health for automatic, real-time data sync.
              </AlertDescription>
            </Alert>

            <div className="grid gap-3 text-sm">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Instant Setup</p>
                  <p className="text-muted-foreground">One tap to connect - no manual configuration needed</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Real-Time Sync</p>
                  <p className="text-muted-foreground">Your data updates automatically in the background</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">100% Private</p>
                  <p className="text-muted-foreground">Data stays on your device - no third-party access</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Free Forever</p>
                  <p className="text-muted-foreground">No subscription or in-app purchase required</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSetupHealthKit}
              disabled={isHealthKitSyncing}
              size="lg"
              className="w-full"
              data-testid="button-setup-native-healthkit"
            >
              {isHealthKitSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing Health Data...
                </>
              ) : healthKitStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Sync Complete
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Connect Apple Health Now
                </>
              )}
            </Button>

            <Button
              onClick={handleClearSyncHistory}
              variant="outline"
              size="default"
              className="w-full"
              data-testid="button-clear-sync-history"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear Sync History
            </Button>

            {/* Show progress while syncing */}
            {isHealthKitSyncing && jobStatus && (
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

            <p className="text-xs text-muted-foreground text-center">
              You'll be asked to grant permission to read your health data from the Health app
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Clear sync history to force a full 7-day sync on your next attempt
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
