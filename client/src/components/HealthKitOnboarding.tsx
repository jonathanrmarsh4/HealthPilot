import { useState, useEffect, useRef } from 'react';
import { healthKitService } from '@/services/healthkit';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Loader2, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isNativePlatform } from '@/mobile/MobileBootstrap';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface HealthKitOnboardingProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function HealthKitOnboarding({ onComplete, onSkip }: HealthKitOnboardingProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState<boolean>(false);
  const [checkFailed, setCheckFailed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const { toast } = useToast();

  // Check HealthKit availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    if (!isNativePlatform()) {
      console.log('[HealthKitOnboarding] Not on native platform, skipping');
      setIsHealthKitAvailable(false);
      setIsChecking(false);
      return;
    }

    console.log('[HealthKitOnboarding] Checking HealthKit availability...');
    setIsChecking(true);
    setCheckFailed(false);
    
    try {
      const available = await healthKitService.isHealthKitAvailable();
      console.log('[HealthKitOnboarding] HealthKit available:', available);
      setIsHealthKitAvailable(available);
      setIsChecking(false);
      
      // If check returned false (timeout or error), mark as failed
      if (!available) {
        setCheckFailed(true);
      }
    } catch (error) {
      console.error('[HealthKitOnboarding] Error checking availability:', error);
      setIsHealthKitAvailable(false);
      setCheckFailed(true);
      setIsChecking(false);
    }
  };

  const handleSetupHealthKit = async () => {
    if (!isHealthKitAvailable) {
      toast({
        title: 'Not Available',
        description: 'HealthKit is only available on iOS devices',
        variant: 'destructive',
      });
      return;
    }

    setIsSyncing(true);
    setSyncStatus('syncing');
    setErrorMessage('');

    try {
      // Request permissions first
      console.log('[HealthKitOnboarding] Requesting permissions...');
      const permissionsGranted = await healthKitService.requestPermissions();
      
      if (!permissionsGranted) {
        throw new Error('HealthKit permissions were not granted. You can enable them later in Settings.');
      }
      console.log('[HealthKitOnboarding] Permissions granted');

      // Get health data from HealthKit (last 90 days for initial sync)
      console.log('[HealthKitOnboarding] Fetching health data from HealthKit...');
      const healthData = await healthKitService.getAllHealthData(90);
      console.log('[HealthKitOnboarding] Health data retrieved:', {
        steps: healthData.steps.length,
        hrv: healthData.hrv.length,
        sleep: healthData.sleep.length,
        workouts: healthData.workouts.length,
      });
      
      // Send data to backend
      console.log('[HealthKitOnboarding] Sending data to backend...');
      await apiRequest('POST', '/api/apple-health/sync', healthData);
      console.log('[HealthKitOnboarding] Data sent successfully');
      
      setSyncStatus('success');
      
      toast({
        title: 'Sync Complete',
        description: 'Your health data has been synced successfully',
      });

      // Mark HealthKit setup as complete
      await apiRequest('POST', '/api/onboarding/complete-healthkit');
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      queryClient.invalidateQueries({ queryKey: ['/api/biomarkers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });

      // Complete onboarding
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('HealthKit sync failed:', error);
      
      setSyncStatus('error');
      setErrorMessage(error.message || 'Failed to sync health data');

      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync health data',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSkip = async () => {
    try {
      // Mark HealthKit setup as complete (even though skipped)
      await apiRequest('POST', '/api/onboarding/complete-healthkit');
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/status'] });
      onSkip();
    } catch (error) {
      console.error('Failed to skip HealthKit setup:', error);
      onSkip(); // Skip anyway
    }
  };

  // Auto-skip if HealthKit is not available (web or Android) AND the check didn't fail
  // Using ref to prevent infinite loops
  const hasAutoSkipped = useRef(false);
  const [isAutoSkipping, setIsAutoSkipping] = useState(false);
  
  useEffect(() => {
    if (!isChecking && !isHealthKitAvailable && !checkFailed && !hasAutoSkipped.current) {
      hasAutoSkipped.current = true;
      setIsAutoSkipping(true);
      console.log('[HealthKitOnboarding] Auto-skipping (not on iOS or plugin unavailable)');
      handleSkip();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChecking, isHealthKitAvailable, checkFailed]);

  // Show loader while checking availability or auto-skipping
  if (isChecking || isAutoSkipping) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">
          {isChecking ? 'Checking health data availability...' : 'Setting up your account...'}
        </p>
      </div>
    );
  }

  // If HealthKit check failed (timeout or error), show retry option
  if (checkFailed && !isHealthKitAvailable) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-destructive/10 rounded-full">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-3xl">Connection Issue</CardTitle>
            <CardDescription className="text-base mt-2">
              We couldn&apos;t connect to Apple Health. This might be due to a temporary issue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription className="text-sm">
                You can try again or skip this step and set up Apple Health sync later from the Biomarkers page.
              </AlertDescription>
            </Alert>

            <div className="flex flex-col gap-3">
              <Button
                onClick={() => checkAvailability()}
                size="lg"
                className="w-full"
                data-testid="button-retry-healthkit"
              >
                <Heart className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button
                onClick={handleSkip}
                variant="ghost"
                size="lg"
                className="w-full"
                data-testid="button-skip-healthkit"
              >
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Heart className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Sync Your Health Data</CardTitle>
          <CardDescription className="text-base mt-2">
            Connect your Apple Health data to get personalized AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Benefits */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex gap-3">
              <div className="mt-1">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Comprehensive Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  Sync workouts, sleep, heart rate, HRV, and more
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="mt-1">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold">Personalized Insights</h4>
                <p className="text-sm text-muted-foreground">
                  Get AI recommendations based on your real health data
                </p>
              </div>
            </div>
          </div>

          {/* Privacy info */}
          <Alert>
            <AlertDescription className="text-sm">
              🔒 Your health data is encrypted and private. We only access data you explicitly grant permission for.
              You can change permissions anytime in iOS Settings.
            </AlertDescription>
          </Alert>

          {/* Sync status */}
          {syncStatus === 'syncing' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-primary/5 rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Syncing your health data...</span>
            </div>
          )}

          {syncStatus === 'success' && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-500">Sync complete! Loading your dashboard...</span>
            </div>
          )}

          {syncStatus === 'error' && (
            <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium text-destructive">{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleSetupHealthKit}
              disabled={isSyncing || syncStatus === 'success'}
              size="lg"
              className="w-full"
              data-testid="button-setup-healthkit"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : syncStatus === 'success' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Sync Complete
                </>
              ) : (
                <>
                  <Heart className="h-4 w-4 mr-2" />
                  Connect Apple Health
                </>
              )}
            </Button>
            
            {syncStatus !== 'success' && (
              <Button
                onClick={handleSkip}
                disabled={isSyncing}
                variant="ghost"
                size="lg"
                className="w-full"
                data-testid="button-skip-healthkit"
              >
                Skip for Now
              </Button>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            You can sync your health data later from the Biomarkers page
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
