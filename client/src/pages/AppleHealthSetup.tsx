import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Download, Settings, Zap, CheckCircle2, Copy, ExternalLink, Key, User } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

interface WebhookCredentials {
  userId: string;
  webhookSecret: string;
  webhookUrl: string;
}

export default function AppleHealthSetup() {
  const { toast } = useToast();
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  
  const { data: credentials, isLoading } = useQuery<WebhookCredentials>({
    queryKey: ["/api/user/webhook-credentials"],
  });

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
        <h1 className="text-4xl font-bold tracking-tight">Apple HealthKit Integration</h1>
        <p className="text-muted-foreground mt-2">
          Automatically sync your Apple Health data using Health Auto Export
        </p>
      </div>

      <Alert>
        <Smartphone className="h-4 w-4" />
        <AlertDescription>
          This integration uses the <strong>Health Auto Export</strong> iOS app to automatically send your Apple Health data to this dashboard. 
          The app costs around $5-10 for the premium version with REST API support.
        </AlertDescription>
      </Alert>

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
