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
import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

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
  const [quietHoursStart, setQuietHoursStart] = useState('22:00');
  const [quietHoursEnd, setQuietHoursEnd] = useState('07:00');

  useEffect(() => {
    setSelectedTimezone(timezone);
  }, [timezone]);

  const { isLoading } = useQuery({
    queryKey: ["/api/user/settings"],
    enabled: false,
  });

  const { data: channelsData, isLoading: channelsLoading } = useQuery({
    queryKey: ['/api/notifications/channels'],
  });
  
  const notificationChannels = channelsData?.channels || [];

  useEffect(() => {
    if (notificationChannels.length > 0) {
      const firstChannel = notificationChannels[0];
      const currentQuietHours = firstChannel?.quietHours || '22:00-07:00';
      const [start, end] = currentQuietHours.split('-');
      setQuietHoursStart(start);
      setQuietHoursEnd(end);
    }
  }, [notificationChannels]);

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

  const updateChannelMutation = useMutation({
    mutationFn: async ({ channel, enabled }: { channel: string; enabled: boolean }) => {
      return await apiRequest('POST', '/api/notifications/channels', { channel, enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/channels'] });
      toast({
        title: 'Settings updated',
        description: 'Your notification preferences have been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update notification settings. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const updateQuietHoursMutation = useMutation({
    mutationFn: async ({ channel, quietHours }: { channel: string; quietHours: string }) => {
      return await apiRequest('POST', '/api/notifications/channels', { channel, quietHours });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/channels'] });
      toast({
        title: 'Quiet hours updated',
        description: 'Your quiet hours have been saved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update quiet hours. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleTimezoneChange = (value: string) => {
    setSelectedTimezone(value);
    updateTimezoneMutation.mutate(value);
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose which notifications you want to receive and set quiet hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {channelsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <>
              <div className="space-y-4">
                <h4 className="text-sm font-semibold">Notification Types</h4>
                
                {/* Recovery Insights */}
                {(() => {
                  const channel = notificationChannels.find(c => c.channel === 'recovery_alert');
                  return (
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="space-y-1">
                        <Label htmlFor="recovery-insights" className="text-sm font-medium cursor-pointer">
                          Recovery Insights
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          AI-powered insights about your recovery metrics
                        </p>
                      </div>
                      <Switch
                        id="recovery-insights"
                        checked={channel?.enabled ?? true}
                        onCheckedChange={(enabled) => 
                          updateChannelMutation.mutate({ channel: 'recovery_alert', enabled })
                        }
                        data-testid="switch-recovery-insights"
                      />
                    </div>
                  );
                })()}

                {/* Biomarker Alerts */}
                {(() => {
                  const channel = notificationChannels.find(c => c.channel === 'health_alert');
                  return (
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="space-y-1">
                        <Label htmlFor="biomarker-alerts" className="text-sm font-medium cursor-pointer">
                          Biomarker Alerts
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Get notified when biomarkers are out of range
                        </p>
                      </div>
                      <Switch
                        id="biomarker-alerts"
                        checked={channel?.enabled ?? true}
                        onCheckedChange={(enabled) => 
                          updateChannelMutation.mutate({ channel: 'health_alert', enabled })
                        }
                        data-testid="switch-biomarker-alerts"
                      />
                    </div>
                  );
                })()}

                {/* Supplement Reminders */}
                {(() => {
                  const channel = notificationChannels.find(c => c.channel === 'supplement_reminder');
                  return (
                    <div className="flex items-center justify-between py-3 border-b">
                      <div className="space-y-1">
                        <Label htmlFor="supplement-reminders" className="text-sm font-medium cursor-pointer">
                          Supplement Reminders
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Daily reminders for your supplement schedule
                        </p>
                      </div>
                      <Switch
                        id="supplement-reminders"
                        checked={channel?.enabled ?? true}
                        onCheckedChange={(enabled) => 
                          updateChannelMutation.mutate({ channel: 'supplement_reminder', enabled })
                        }
                        data-testid="switch-supplement-reminders"
                      />
                    </div>
                  );
                })()}

                {/* Workout Reminders */}
                {(() => {
                  const channel = notificationChannels.find(c => c.channel === 'workout_reminder');
                  return (
                    <div className="flex items-center justify-between py-3">
                      <div className="space-y-1">
                        <Label htmlFor="workout-reminders" className="text-sm font-medium cursor-pointer">
                          Workout Reminders
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Reminders for scheduled training sessions
                        </p>
                      </div>
                      <Switch
                        id="workout-reminders"
                        checked={channel?.enabled ?? true}
                        onCheckedChange={(enabled) => 
                          updateChannelMutation.mutate({ channel: 'workout_reminder', enabled })
                        }
                        data-testid="switch-workout-reminders"
                      />
                    </div>
                  );
                })()}
              </div>

              {/* Quiet Hours Section */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <h4 className="text-sm font-semibold mb-1">Quiet Hours</h4>
                  <p className="text-xs text-muted-foreground">
                    Set a time range when you don't want to receive notifications (critical alerts will still come through)
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiet-hours-start" className="text-sm">Start Time</Label>
                    <Input
                      id="quiet-hours-start"
                      type="time"
                      value={quietHoursStart}
                      onChange={(e) => setQuietHoursStart(e.target.value)}
                      onBlur={() => {
                        const newQuietHours = `${quietHoursStart}-${quietHoursEnd}`;
                        ['recovery_alert', 'health_alert', 'supplement_reminder', 'workout_reminder'].forEach(channel => {
                          updateQuietHoursMutation.mutate({ channel, quietHours: newQuietHours });
                        });
                      }}
                      data-testid="input-quiet-hours-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiet-hours-end" className="text-sm">End Time</Label>
                    <Input
                      id="quiet-hours-end"
                      type="time"
                      value={quietHoursEnd}
                      onChange={(e) => setQuietHoursEnd(e.target.value)}
                      onBlur={() => {
                        const newQuietHours = `${quietHoursStart}-${quietHoursEnd}`;
                        ['recovery_alert', 'health_alert', 'supplement_reminder', 'workout_reminder'].forEach(channel => {
                          updateQuietHoursMutation.mutate({ channel, quietHours: newQuietHours });
                        });
                      }}
                      data-testid="input-quiet-hours-end"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
