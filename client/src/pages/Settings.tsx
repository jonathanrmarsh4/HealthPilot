import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useTimezone } from "@/contexts/TimezoneContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, Loader2, CheckCircle2 } from "lucide-react";
import { healthKitService } from "@/services/healthkit";
import { getPlatform } from "@/mobile/MobileBootstrap";
import { Alert, AlertDescription } from "@/components/ui/alert";

const COMMON_TIMEZONES = [
  { value: "Pacific/Auckland", label: "Auckland (GMT+12)" },
  { value: "Australia/Sydney", label: "Sydney (GMT+10)" },
  { value: "Australia/Brisbane", label: "Brisbane (GMT+10)" },
  { value: "Australia/Perth", label: "Perth (GMT+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (GMT+9)" },
  { value: "Asia/Singapore", label: "Singapore (GMT+8)" },
  { value: "Asia/Dubai", label: "Dubai (GMT+4)" },
  { value: "Europe/London", label: "London (GMT+0)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlin (GMT+1)" },
  { value: "America/New_York", label: "New York (GMT-5)" },
  { value: "America/Chicago", label: "Chicago (GMT-6)" },
  { value: "America/Denver", label: "Denver (GMT-7)" },
  { value: "America/Los_Angeles", label: "Los Angeles (GMT-8)" },
  { value: "UTC", label: "UTC (GMT+0)" },
];

export default function Settings() {
  const { toast } = useToast();
  const { timezone, setTimezone, isLoading: timezoneLoading } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [isHealthKitSyncing, setIsHealthKitSyncing] = useState(false);
  const [healthKitStatus, setHealthKitStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const { isLoading } = useQuery({
    queryKey: ["/api/user/settings"],
    enabled: false,
  });

  const updateTimezoneMutation = useMutation({
    mutationFn: async (tz: string) => {
      return await apiRequest("PATCH", "/api/user/settings", { timezone: tz });
    },
    onSuccess: (_, tz) => {
      setTimezone(tz);
      queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
      toast({
        title: "Settings updated",
        description: "Your timezone preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update timezone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    updateTimezoneMutation.mutate(value);
  };

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

      // Sync data (last 90 days)
      await healthKitService.syncAllHealthData(90);
      
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

  if (timezoneLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your account preferences
          </p>
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regional Settings</CardTitle>
          <CardDescription>
            Configure how dates and times are displayed across the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={selectedTimezone}
              onValueChange={handleTimezoneChange}
              disabled={updateTimezoneMutation.isPending}
            >
              <SelectTrigger id="timezone" data-testid="select-timezone">
                <SelectValue placeholder="Select your timezone" />
              </SelectTrigger>
              <SelectContent>
                {COMMON_TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              All timestamps in the application will be displayed in your selected timezone.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* HealthKit Setup - Only show on iOS */}
      {getPlatform() === 'ios' && (
        <Card>
          <CardHeader>
            <CardTitle>Apple Health Integration</CardTitle>
            <CardDescription>
              Sync your health data from Apple Health to get personalized AI-powered insights
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Heart className="h-4 w-4" />
              <AlertDescription>
                Connect Apple Health to automatically sync your biomarkers, workouts, sleep data, and more.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="grid gap-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Automatic Data Sync</p>
                    <p className="text-muted-foreground">Your health metrics update automatically</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">AI-Powered Insights</p>
                    <p className="text-muted-foreground">Get personalized health recommendations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Privacy First</p>
                    <p className="text-muted-foreground">Your data stays secure on your device</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSetupHealthKit}
                disabled={isHealthKitSyncing}
                size="lg"
                className="w-full"
                data-testid="button-setup-healthkit"
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
                    Set Up Apple Health
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                You'll be asked to grant permission to read your health data from the Health app
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
