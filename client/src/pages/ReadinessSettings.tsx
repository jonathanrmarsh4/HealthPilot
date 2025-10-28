import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Loader2, Save, RotateCcw, AlertCircle, Info, Sparkles, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ReadinessSettings() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/training/readiness/settings"],
  });

  // Local state for weight adjustments
  const [sleepWeight, setSleepWeight] = useState(40);
  const [hrvWeight, setHrvWeight] = useState(30);
  const [restingHRWeight, setRestingHRWeight] = useState(15);
  const [workloadWeight, setWorkloadWeight] = useState(15);
  const [alertThreshold, setAlertThreshold] = useState(50);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [usePersonalBaselines, setUsePersonalBaselines] = useState(false);
  const [personalHrvBaseline, setPersonalHrvBaseline] = useState<number | null>(null);
  const [personalRestingHrBaseline, setPersonalRestingHrBaseline] = useState<number | null>(null);
  const [personalSleepHoursBaseline, setPersonalSleepHoursBaseline] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local state when settings load
  useEffect(() => {
    if (settings) {
      setSleepWeight(Math.round(settings.sleepWeight * 100));
      setHrvWeight(Math.round(settings.hrvWeight * 100));
      setRestingHRWeight(Math.round(settings.restingHRWeight * 100));
      setWorkloadWeight(Math.round(settings.workloadWeight * 100));
      setAlertThreshold(settings.alertThreshold);
      setAlertsEnabled(settings.alertsEnabled === 1);
      setUsePersonalBaselines(settings.usePersonalBaselines === 1);
      setPersonalHrvBaseline(settings.personalHrvBaseline);
      setPersonalRestingHrBaseline(settings.personalRestingHrBaseline);
      setPersonalSleepHoursBaseline(settings.personalSleepHoursBaseline);
    }
  }, [settings]);

  // Calculate total weight (should always be 100)
  const totalWeight = sleepWeight + hrvWeight + restingHRWeight + workloadWeight;
  const isValidWeight = totalWeight === 100;

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/training/readiness/settings", {
        sleepWeight: sleepWeight / 100,
        hrvWeight: hrvWeight / 100,
        restingHRWeight: restingHRWeight / 100,
        workloadWeight: workloadWeight / 100,
        alertThreshold,
        alertsEnabled: alertsEnabled ? 1 : 0,
        usePersonalBaselines: usePersonalBaselines ? 1 : 0,
        personalHrvBaseline,
        personalRestingHrBaseline,
        personalSleepHoursBaseline,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/training/readiness/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/readiness"] });
      queryClient.invalidateQueries({ queryKey: ["/api/training/daily-recommendation"] });
      setHasChanges(false);
      toast({
        title: "Settings saved",
        description: "Your readiness score will now use your custom weights",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-calculate baselines mutation
  const autoCalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("/api/training/readiness/auto-calculate-baselines");
      return await response.json();
    },
    onSuccess: (data) => {
      const totalDataPoints = data.dataPoints.hrv + data.dataPoints.restingHR + data.dataPoints.sleep;
      
      if (totalDataPoints === 0) {
        toast({
          title: "Insufficient data",
          description: "No health data found in the last 30 days. Try syncing your health data or manually enter baselines.",
          variant: "destructive",
        });
        return;
      }
      
      if (data.personalHrvBaseline != null) setPersonalHrvBaseline(data.personalHrvBaseline);
      if (data.personalRestingHrBaseline != null) setPersonalRestingHrBaseline(data.personalRestingHrBaseline);
      if (data.personalSleepHoursBaseline != null) setPersonalSleepHoursBaseline(data.personalSleepHoursBaseline);
      
      toast({
        title: "Baselines calculated",
        description: `Based on ${totalDataPoints} data points from the last 30 days`,
      });
      setHasChanges(true);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to calculate baselines",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reset to defaults
  const resetToDefaults = () => {
    setSleepWeight(40);
    setHrvWeight(30);
    setRestingHRWeight(15);
    setWorkloadWeight(15);
    setAlertThreshold(50);
    setAlertsEnabled(true);
    setUsePersonalBaselines(false);
    setPersonalHrvBaseline(null);
    setPersonalRestingHrBaseline(null);
    setPersonalSleepHoursBaseline(null);
    setHasChanges(true);
  };

  // Track changes
  useEffect(() => {
    if (settings) {
      const changed = 
        sleepWeight !== Math.round(settings.sleepWeight * 100) ||
        hrvWeight !== Math.round(settings.hrvWeight * 100) ||
        restingHRWeight !== Math.round(settings.restingHRWeight * 100) ||
        workloadWeight !== Math.round(settings.workloadWeight * 100) ||
        alertThreshold !== settings.alertThreshold ||
        alertsEnabled !== (settings.alertsEnabled === 1) ||
        usePersonalBaselines !== (settings.usePersonalBaselines === 1) ||
        personalHrvBaseline !== settings.personalHrvBaseline ||
        personalRestingHrBaseline !== settings.personalRestingHrBaseline ||
        personalSleepHoursBaseline !== settings.personalSleepHoursBaseline;
      setHasChanges(changed);
    }
  }, [sleepWeight, hrvWeight, restingHRWeight, workloadWeight, alertThreshold, alertsEnabled, usePersonalBaselines, personalHrvBaseline, personalRestingHrBaseline, personalSleepHoursBaseline, settings]);

  // Auto-adjust weights to maintain 100% total
  const handleWeightChange = (factor: string, value: number) => {
    // Start with current weights
    const newWeights = {
      sleep: sleepWeight,
      hrv: hrvWeight,
      restingHR: restingHRWeight,
      workload: workloadWeight,
    };

    // Update the changed factor
    newWeights[factor as keyof typeof newWeights] = value;

    // Calculate how much we need to redistribute
    const currentTotal = value + (factor === 'sleep' ? 0 : sleepWeight) + 
                         (factor === 'hrv' ? 0 : hrvWeight) + 
                         (factor === 'restingHR' ? 0 : restingHRWeight) + 
                         (factor === 'workload' ? 0 : workloadWeight);
    const diff = currentTotal - 100;

    if (diff !== 0) {
      // Get other factors to adjust
      const others = ['sleep', 'hrv', 'restingHR', 'workload'].filter(f => f !== factor);
      
      // Distribute the difference proportionally
      const otherTotal = others.reduce((sum, f) => sum + newWeights[f as keyof typeof newWeights], 0);
      
      if (otherTotal > 0) {
        // Adjust proportionally
        others.forEach((other) => {
          const currentWeight = newWeights[other as keyof typeof newWeights];
          const proportion = currentWeight / otherTotal;
          const adjustment = diff * proportion;
          newWeights[other as keyof typeof newWeights] = Math.max(0, Math.round(currentWeight - adjustment));
        });

        // Ensure exact 100% by adjusting the first factor if needed
        const newTotal = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
        if (newTotal !== 100) {
          const firstOther = others[0] as keyof typeof newWeights;
          newWeights[firstOther] += (100 - newTotal);
        }
      }
    }

    setSleepWeight(newWeights.sleep);
    setHrvWeight(newWeights.hrv);
    setRestingHRWeight(newWeights.restingHR);
    setWorkloadWeight(newWeights.workload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold" data-testid="heading-readiness-settings">Readiness Settings</h1>
        <p className="text-muted-foreground mt-1">Customize how your daily readiness score is calculated</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Factor Weights</span>
            <Badge variant={isValidWeight ? "default" : "destructive"} data-testid="badge-total-weight">
              {totalWeight}%
            </Badge>
          </CardTitle>
          <CardDescription>
            Adjust how much each factor contributes to your readiness score. Total must equal 100%.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sleep Weight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Sleep Quality</Label>
              <span className="text-sm font-medium" data-testid="value-sleep-weight">{sleepWeight}%</span>
            </div>
            <Slider
              value={[sleepWeight]}
              onValueChange={([value]) => handleWeightChange('sleep', value)}
              min={0}
              max={100}
              step={5}
              data-testid="slider-sleep-weight"
            />
            <p className="text-xs text-muted-foreground">
              Most important for recovery - measures sleep duration and quality
            </p>
          </div>

          <Separator />

          {/* HRV Weight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Heart Rate Variability (HRV)</Label>
              <span className="text-sm font-medium" data-testid="value-hrv-weight">{hrvWeight}%</span>
            </div>
            <Slider
              value={[hrvWeight]}
              onValueChange={([value]) => handleWeightChange('hrv', value)}
              min={0}
              max={100}
              step={5}
              data-testid="slider-hrv-weight"
            />
            <p className="text-xs text-muted-foreground">
              Key nervous system indicator - higher HRV indicates better recovery
            </p>
          </div>

          <Separator />

          {/* Resting HR Weight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Resting Heart Rate</Label>
              <span className="text-sm font-medium" data-testid="value-resting-hr-weight">{restingHRWeight}%</span>
            </div>
            <Slider
              value={[restingHRWeight]}
              onValueChange={([value]) => handleWeightChange('restingHR', value)}
              min={0}
              max={100}
              step={5}
              data-testid="slider-resting-hr-weight"
            />
            <p className="text-xs text-muted-foreground">
              Secondary vital sign - lower resting HR typically indicates better fitness
            </p>
          </div>

          <Separator />

          {/* Workload Weight */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Training Load Recovery</Label>
              <span className="text-sm font-medium" data-testid="value-workload-weight">{workloadWeight}%</span>
            </div>
            <Slider
              value={[workloadWeight]}
              onValueChange={([value]) => handleWeightChange('workload', value)}
              min={0}
              max={100}
              step={5}
              data-testid="slider-workload-weight"
            />
            <p className="text-xs text-muted-foreground">
              Recent training impact - considers both acute (24h) and chronic (7d) load
            </p>
          </div>

          {!isValidWeight && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Total weight must equal 100%. Currently at {totalWeight}%.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
          <CardDescription>
            Get notified when your readiness score drops below a threshold
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="alerts-enabled" className="text-base">Enable Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Show warning when readiness is low
              </p>
            </div>
            <Switch
              id="alerts-enabled"
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
              data-testid="switch-alerts-enabled"
            />
          </div>

          {alertsEnabled && (
            <>
              <Separator />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Alert Threshold</Label>
                  <span className="text-sm font-medium" data-testid="value-alert-threshold">{alertThreshold}</span>
                </div>
                <Slider
                  value={[alertThreshold]}
                  onValueChange={([value]) => setAlertThreshold(value)}
                  min={30}
                  max={70}
                  step={5}
                  data-testid="slider-alert-threshold"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when readiness score falls below this value
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Personal Baselines
          </CardTitle>
          <CardDescription>
            Score based on YOUR normal values instead of population averages. Perfect if you have naturally low HRV or high heart rate.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="use-personal-baselines" className="text-base">Enable Personal Baselines</Label>
              <p className="text-sm text-muted-foreground">
                Score relative to your typical values when well-rested
              </p>
            </div>
            <Switch
              id="use-personal-baselines"
              checked={usePersonalBaselines}
              onCheckedChange={setUsePersonalBaselines}
              data-testid="switch-use-personal-baselines"
            />
          </div>

          {usePersonalBaselines && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => autoCalculateMutation.mutate()}
                    disabled={autoCalculateMutation.isPending}
                    data-testid="button-auto-calculate"
                  >
                    {autoCalculateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-3 w-3" />
                        Auto-Calculate from Last 30 Days
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Sets baselines to your 30-day averages
                  </p>
                </div>

                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hrv-baseline">Your Typical HRV (ms)</Label>
                    <Input
                      id="hrv-baseline"
                      type="number"
                      placeholder="e.g., 30"
                      value={personalHrvBaseline ?? ""}
                      onChange={(e) => setPersonalHrvBaseline(e.target.value ? parseFloat(e.target.value) : null)}
                      data-testid="input-hrv-baseline"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your HRV when well-rested (even if "low" by population standards)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resting-hr-baseline">Your Typical Resting HR (bpm)</Label>
                    <Input
                      id="resting-hr-baseline"
                      type="number"
                      placeholder="e.g., 75"
                      value={personalRestingHrBaseline ?? ""}
                      onChange={(e) => setPersonalRestingHrBaseline(e.target.value ? parseFloat(e.target.value) : null)}
                      data-testid="input-resting-hr-baseline"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your resting HR when well-rested (even if "high" by population standards)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sleep-baseline">Your Typical Sleep Hours</Label>
                    <Input
                      id="sleep-baseline"
                      type="number"
                      step="0.5"
                      placeholder="e.g., 7.5"
                      value={personalSleepHoursBaseline ?? ""}
                      onChange={(e) => setPersonalSleepHoursBaseline(e.target.value ? parseFloat(e.target.value) : null)}
                      data-testid="input-sleep-baseline"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your ideal sleep duration when well-rested
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    When enabled, you'll score 100% when at YOUR baseline. Below baseline = lower score. Above baseline (for HRV) = bonus!
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Changes to these settings will affect future readiness calculations. Your historical scores remain unchanged.
        </AlertDescription>
      </Alert>

      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={!hasChanges || !isValidWeight || saveMutation.isPending}
          data-testid="button-save-settings"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={resetToDefaults}
          data-testid="button-reset-defaults"
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset to Defaults
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate("/training")}
          data-testid="button-back-to-training"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Training
        </Button>
      </div>
    </div>
  );
}
