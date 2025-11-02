import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Heart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { healthKitService } from "@/services/healthkit";
import { getPlatform } from "@/mobile/MobileBootstrap";
import { apiRequest } from "@/lib/queryClient";

export default function AppleHealthSetup() {
  const { toast } = useToast();
  const [isHealthKitSyncing, setIsHealthKitSyncing] = useState(false);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentPlatform, setCurrentPlatform] = useState<string>('');

  useEffect(() => {
    // Debug platform detection
    const platform = getPlatform();
    setCurrentPlatform(platform);
    console.log('[AppleHealthSetup] Platform detected:', platform);
    console.log('[AppleHealthSetup] Is iOS?', platform === 'ios');
  }, []);

  const handleSetupHealthKit = async () => {
    setIsHealthKitSyncing(true);
    setHealthKitStatus('syncing');

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

      // Get health data (last 90 days)
      const healthData = await healthKitService.getAllHealthData(90);
      
      // Send to backend
      await apiRequest('POST', '/api/apple-health/sync', healthData);
      
      setHealthKitStatus('success');
      
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

      // Reset status after 3 seconds
      setTimeout(() => {
        setHealthKitStatus('idle');
      }, 3000);
    } catch (error: any) {
      console.error('HealthKit sync failed:', error);
      
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
    } finally {
      setIsHealthKitSyncing(false);
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

      {/* Debug Platform Info - Remove after testing */}
      <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">🔧 Platform Debug Info</CardTitle>
          <CardDescription>
            This shows what platform is detected (this card will be removed after debugging)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>Detected Platform:</strong> <code className="bg-muted px-2 py-1 rounded">{currentPlatform || 'Loading...'}</code></p>
            <p><strong>Is iOS?</strong> {getPlatform() === 'ios' ? '✅ YES' : '❌ NO'}</p>
            <p><strong>Native HealthKit Section Visible?</strong> {getPlatform() === 'ios' ? '✅ YES (should appear below)' : '❌ NO (running in browser or web)'}</p>
          </div>
        </CardContent>
      </Card>

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

            <p className="text-xs text-muted-foreground text-center">
              You'll be asked to grant permission to read your health data from the Health app
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Supported Health Metrics</CardTitle>
          <CardDescription>The following Apple Health metrics are automatically synced from your iPhone</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Cardiovascular</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Heart Rate",
                  "Resting Heart Rate",
                  "Heart Rate Variability (HRV)",
                  "Blood Pressure"
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Activity & Energy</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Steps",
                  "Active Energy Burned",
                  "Basal Energy (BMR)",
                  "Total Energy Expenditure"
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Body Measurements</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Body Weight",
                  "Height",
                  "Body Fat Percentage",
                  "Lean Body Mass"
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Metabolic & Vitals</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Blood Glucose",
                  "Oxygen Saturation",
                  "Respiratory Rate",
                  "Body Temperature"
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Sleep & Recovery</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  "Sleep Analysis",
                  "Sleep Duration",
                  "Sleep Stages"
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                    <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                    <span className="text-sm">{metric}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Data not syncing?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Make sure you've tapped the "Connect Apple Health Now" button and granted permissions</li>
              <li>Verify your iPhone has internet connection</li>
              <li>Check that HealthPilot has permission in Settings → Privacy → Health</li>
              <li>Try syncing again by revisiting this page</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Missing metrics?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Some metrics require specific Apple devices (e.g., Blood Oxygen requires Apple Watch Series 6+)</li>
              <li>Check that you've granted permission for specific metrics in Settings → Privacy → Health → HealthPilot</li>
              <li>Ensure data exists in your Apple Health app for the metrics you want to sync</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
