import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Smartphone, Download, Settings, Zap, CheckCircle2, Copy, ExternalLink, Key, User, Heart, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { healthKitService } from "@/services/healthkit";
import { getPlatform } from "@/mobile/MobileBootstrap";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WebhookCredentials {
  userId: string;
  webhookSecret: string;
  webhookUrl: string;
}

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
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [isHealthKitSyncing, setIsHealthKitSyncing] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [currentPlatform, setCurrentPlatform] = useState<string>('');
  
  const { data: credentials, isLoading } = useQuery<WebhookCredentials>({
    queryKey: ["/api/user/webhook-credentials"],
  });

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

  useEffect(() => {
    // Debug platform detection
    const platform = getPlatform();
    setCurrentPlatform(platform);
    console.log('[AppleHealthSetup] Platform detected:', platform);
    console.log('[AppleHealthSetup] Is iOS?', platform === 'ios');
  }, []);

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

      // Get health data (last 1 day for reliable initial sync)
      console.log('[AppleHealthSetup] Fetching 1 day of health data...');
      const healthData = await healthKitService.getAllHealthData(1);
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

  const copyToClipboard = (text: string, type: 'url' | 'userId' | 'secret') => {
    navigator.clipboard.writeText(text);
    
    if (type === 'url') {
      setCopiedUrl(true);
      toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'userId') {
      setCopiedUserId(true);
      toast({ title: "Copied!", description: "User ID copied to clipboard" });
      setTimeout(() => setCopiedUserId(false), 2000);
    } else {
      setCopiedSecret(true);
      toast({ title: "Copied!", description: "Webhook Secret copied to clipboard" });
      setTimeout(() => setCopiedSecret(false), 2000);
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
          </CardContent>
        </Card>
      )}

      {/* Webhook-based integration (fallback for web or manual preference) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getPlatform() === 'ios' ? (
              <>
                <Smartphone className="h-5 w-5" />
                Alternative: Webhook Integration
              </>
            ) : (
              <>
                <Smartphone className="h-5 w-5" />
                Webhook Integration via Health Auto Export
              </>
            )}
          </CardTitle>
          <CardDescription>
            {getPlatform() === 'ios' 
              ? 'Already using another health app? You can also sync via Health Auto Export webhooks'
              : 'Automatically sync your Apple Health data using the Health Auto Export iOS app'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <Smartphone className="h-4 w-4" />
            <AlertDescription>
              This method uses the <strong>Health Auto Export</strong> iOS app to send your Apple Health data to this dashboard. 
              The app costs around $5-10 for the premium version with REST API support.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            Your Production Environment Settings
          </CardTitle>
          <CardDescription>
            Your unique webhook credentials are automatically generated for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <p className="text-sm font-medium">Production Webhook URL:</p>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="bg-background rounded-md p-3 border">
                <code className="text-sm break-all">{credentials?.webhookUrl}</code>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This URL automatically uses your production domain (healthpilot.pro) and is secured with HTTPS.
            </p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Your User ID:</p>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="bg-background rounded-md p-3 border">
                <code className="text-sm">{credentials?.userId}</code>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This identifies your account and ensures your health data is sent to the correct user.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Webhook Secret (Authentication Key):</p>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="bg-background rounded-md p-3 border">
                <code className="text-sm break-all">{credentials?.webhookSecret}</code>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              This secret authenticates requests from Health Auto Export and prevents unauthorized data submissions.
            </p>
          </div>

          <Alert className="mt-4">
            <AlertDescription className="text-xs">
              <strong>Security:</strong> These credentials are unique to your account and should be entered exactly as shown in the Health Auto Export app. 
              All data is transmitted over HTTPS encryption directly from your iPhone to your production dashboard at healthpilot.pro.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Download className="h-8 w-8 text-primary" />
              <Badge>Step 1</Badge>
            </div>
            <CardTitle>Download the App</CardTitle>
            <CardDescription>Install Health Auto Export from the App Store</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => window.open("https://apps.apple.com/us/app/health-auto-export-json-csv/id1115567069", "_blank")}
              data-testid="button-download-app"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open App Store
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Settings className="h-8 w-8 text-primary" />
              <Badge>Step 2</Badge>
            </div>
            <CardTitle>Configure Export</CardTitle>
            <CardDescription>Set up automatic data sync to this dashboard</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              In the app, create a new REST API automation with these settings:
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Zap className="h-8 w-8 text-primary" />
              <Badge>Step 3</Badge>
            </div>
            <CardTitle>Start Syncing</CardTitle>
            <CardDescription>Your health data will automatically sync</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <span>Heart Rate</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <span>Blood Glucose</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <span>Weight & Steps</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <span>Sleep Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-chart-4" />
                <span>Workouts</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detailed Setup Instructions</CardTitle>
          <CardDescription>Follow these steps to configure Health Auto Export</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">1</span>
                Install & Purchase Premium
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Download "Health Auto Export - JSON+CSV" from the App Store and purchase the Premium version 
                (required for REST API automation). A 7-day free trial is available.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">2</span>
                Create REST API Automation
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Open the app and tap "Automations" → "+" → "REST API"
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">3</span>
                Configure Automation Settings
              </h3>
              <div className="ml-8 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Webhook URL:</p>
                  {isLoading ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-muted px-3 py-2 rounded text-sm overflow-x-auto">
                        {credentials?.webhookUrl}
                      </code>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(credentials?.webhookUrl || '', 'url')}
                        data-testid="button-copy-webhook"
                      >
                        {copiedUrl ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Method:</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm">POST</code>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Format:</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm">JSON</code>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Custom Headers (Required for Authentication):</p>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground min-w-[140px]">X-User-Id:</span>
                      {isLoading ? (
                        <Skeleton className="h-8 flex-1" />
                      ) : (
                        <>
                          <code className="flex-1 bg-muted px-3 py-1 rounded text-sm overflow-x-auto">
                            {credentials?.userId}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(credentials?.userId || '', 'userId')}
                            data-testid="button-copy-userid"
                          >
                            {copiedUserId ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-muted-foreground min-w-[140px]">X-Webhook-Secret:</span>
                      {isLoading ? (
                        <Skeleton className="h-8 flex-1" />
                      ) : (
                        <>
                          <code className="flex-1 bg-muted px-3 py-1 rounded text-sm overflow-x-auto">
                            {credentials?.webhookSecret}
                          </code>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => copyToClipboard(credentials?.webhookSecret || '', 'secret')}
                            data-testid="button-copy-secret"
                          >
                            {copiedSecret ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Data Type:</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm">Health Metrics</code>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Period:</p>
                  <code className="bg-muted px-3 py-1 rounded text-sm">Since Last Sync (or Today)</code>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Metrics to Export:</p>
                  <p className="text-sm text-muted-foreground">
                    Select: Heart Rate, Blood Glucose, Weight, Steps, Active Energy, Blood Pressure, 
                    Oxygen Saturation, Body Temperature, Sleep Analysis, <strong>Workout</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">4</span>
                Set Sync Schedule
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Choose how often to sync (e.g., every hour, every 6 hours, or daily). The app will automatically 
                send your health data to this dashboard at the configured interval.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm">5</span>
                Test the Connection
              </h3>
              <p className="text-sm text-muted-foreground ml-8">
                Use the "Test" button in the app to send a test export. Check your Biomarkers page to verify 
                the data is being received correctly.
              </p>
            </div>
          </div>

          <Alert>
            <AlertDescription>
              <strong>Privacy Note:</strong> Health Auto Export is 100% private with no account required. 
              All data is sent directly from your iPhone to this dashboard. No third-party services have access to your health data.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Supported Health Metrics</CardTitle>
          <CardDescription>The following Apple Health metrics will be automatically imported</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              "Heart Rate",
              "Blood Glucose",
              "Weight",
              "Steps",
              "Calories Burned",
              "Blood Pressure",
              "Oxygen Saturation",
              "Body Temperature",
              "Sleep Hours",
              "Workout Sessions"
            ].map((metric) => (
              <div key={metric} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <CheckCircle2 className="h-4 w-4 text-chart-4 shrink-0" />
                <span className="text-sm">{metric}</span>
              </div>
            ))}
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
              <li>Make sure you have the Premium version of Health Auto Export</li>
              <li>Check that the webhook URL is correct</li>
              <li>Verify your iPhone has internet connection</li>
              <li>Try using the "Test" button in the app to send a manual export</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-1">Missing metrics?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
              <li>Ensure the metrics are enabled in the Health Auto Export automation settings</li>
              <li>Some metrics require specific Apple devices (e.g., Blood Oxygen requires Apple Watch Series 6+)</li>
              <li>Check that you've granted Health Auto Export permission to access the metrics in iPhone Settings → Health</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
