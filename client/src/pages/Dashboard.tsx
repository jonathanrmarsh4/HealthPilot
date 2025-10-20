import { HealthMetricCard } from "@/components/HealthMetricCard";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { BiomarkerChartWidget } from "@/components/BiomarkerChartWidget";
import { RecommendationCard } from "@/components/RecommendationCard";
import { QuickStats } from "@/components/QuickStats";
import { TrendLineWidget } from "@/components/TrendLineWidget";
import { AIInsightsWidget } from "@/components/AIInsightsWidget";
import { NextWorkoutWidget } from "@/components/NextWorkoutWidget";
import { TodaysMealsWidget } from "@/components/TodaysMealsWidget";
import { HealthScoreWidget } from "@/components/HealthScoreWidget";
import { SleepScoreDonutWidget } from "@/components/SleepScoreDonutWidget";
import { GoalsSummaryWidget } from "@/components/GoalsSummaryWidget";
import { DataInsightsWidget } from "@/components/DataInsightsWidget";
import { BiologicalAgeWidget } from "@/components/BiologicalAgeWidget";
import { ReadinessScoreWidget } from "@/components/ReadinessScoreWidget";
import { DailyRemindersWidget } from "@/components/DailyRemindersWidget";
import { UpgradeBanner } from "@/components/UpgradeBanner";
import { Heart, Activity, Scale, Droplet, TrendingUp, Zap, Apple, AlertCircle, Dumbbell, Settings2, Eye, EyeOff, ChevronUp, ChevronDown, Dna, TrendingDown, Upload, Shield } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "wouter";
import type { Recommendation } from "@shared/schema";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue, formatValue } from "@/lib/unitConversions";
import { useState, useEffect } from "react";
import { biomarkerDisplayConfig } from "@/lib/biomarkerConfig";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DashboardStats {
  dailySteps: number;
  restingHR: number;
  activeDays: number;
  calories: number;
  heartRate: { value: number; trend: number; lastUpdated: string };
  bloodGlucose: { value: number; trend: number; lastUpdated: string };
  weight: { value: number; trend: number; lastUpdated: string };
}

interface ChartDataPoint {
  date: string;
  value: number;
  unit: string;
  target?: number;
}

const STORAGE_KEY = "dashboard-preferences";
const STORAGE_VERSION_KEY = "dashboard-preferences-version";
const CURRENT_VERSION = "5"; // Increment to force localStorage clear

interface DashboardPreferences {
  visible: string[];
  order: string[];
}

// All available optional widgets (for Manage Widgets)
const ALL_OPTIONAL_WIDGETS = [
  "readiness-score",
  "health-score",
  "sleep-score",
  "goals-summary",
  "ai-insights",
  "data-insights",
  "daily-reminders",
  "quick-stats",
  "next-workout",
  "todays-meals",
  "health-metrics", 
  "blood-glucose-chart",
  "weight-chart"
];

// Default visible widgets (show health overview widgets by default)
const DEFAULT_WIDGETS: string[] = [
  "readiness-score",
  "health-score",
  "sleep-score",
  "goals-summary",
  "ai-insights",
  "data-insights"
];

const WIDGET_CONFIG: Record<string, { title: string; description: string }> = {
  "readiness-score": { title: "Readiness Score", description: "Daily readiness based on sleep, HRV, and recovery" },
  "health-score": { title: "Health Score", description: "Overall health assessment from biomarkers" },
  "sleep-score": { title: "Sleep Score", description: "Sleep quality and duration analysis" },
  "goals-summary": { title: "Goals Summary", description: "Health and fitness goals progress" },
  "ai-insights": { title: "AI Insights", description: "Daily intelligence and pattern discoveries" },
  "data-insights": { title: "Data Insights", description: "Statistical patterns in your health data" },
  "daily-reminders": { title: "Daily Checklist", description: "Track daily health habits and reminders" },
  "quick-stats": { title: "Quick Stats", description: "Daily steps, heart rate, active days, calories" },
  "next-workout": { title: "Next Workout", description: "Upcoming training session" },
  "todays-meals": { title: "Today's Meals", description: "Daily meal plan overview" },
  "health-metrics": { title: "Health Metrics", description: "Heart rate, blood glucose, weight cards" },
  "blood-glucose-chart": { title: "Blood Glucose Chart", description: "7-day glucose trend" },
  "weight-chart": { title: "Weight Chart", description: "12-month weight tracking" },
  "biological-age": { title: "Biological Age", description: "PhenoAge longevity biomarker" }
};

export default function Dashboard() {
  const { unitSystem } = useLocale();
  const { toast } = useToast();
  
  // Handle checkout success/cancel redirects
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const upgradeStatus = params.get('upgrade');
    
    if (upgradeStatus === 'success') {
      toast({
        title: "Welcome to Premium!",
        description: "Your subscription is now active. Enjoy unlimited AI chat, meal plans, and more!",
        duration: 7000,
      });
      // Clean up URL while preserving current pathname
      window.history.replaceState({}, '', window.location.pathname);
    } else if (upgradeStatus === 'cancelled') {
      toast({
        title: "Upgrade cancelled",
        description: "No worries! You can upgrade anytime from the Pricing page.",
        variant: "default",
        duration: 5000,
      });
      // Clean up URL while preserving current pathname
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [toast]);
  
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    // Check version - if old or missing, clear localStorage and start fresh
    const storedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
    if (storedVersion !== CURRENT_VERSION) {
      console.log("Clearing old dashboard preferences (version mismatch)");
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
      return { visible: DEFAULT_WIDGETS, order: DEFAULT_WIDGETS };
    }
    
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Safety: Filter out any invalid widget IDs from corrupted cache
        // Only allow widgets that exist in ALL_OPTIONAL_WIDGETS or valid biomarker configs
        const validVisible = Array.isArray(parsed.visible) 
          ? parsed.visible.filter((w: string) => {
              if (ALL_OPTIONAL_WIDGETS.includes(w)) return true;
              // Allow biomarker widgets only if config exists
              if (w.startsWith('biomarker-')) {
                const type = w.replace('biomarker-', '');
                return biomarkerDisplayConfig[type] !== undefined;
              }
              return false;
            })
          : DEFAULT_WIDGETS;
        const validOrder = Array.isArray(parsed.order)
          ? parsed.order.filter((w: string) => {
              if (ALL_OPTIONAL_WIDGETS.includes(w)) return true;
              // Allow biomarker widgets only if config exists
              if (w.startsWith('biomarker-')) {
                const type = w.replace('biomarker-', '');
                return biomarkerDisplayConfig[type] !== undefined;
              }
              return false;
            })
          : ALL_OPTIONAL_WIDGETS;
        
        // If filtered arrays are empty, use defaults
        return {
          visible: validVisible.length > 0 ? validVisible : DEFAULT_WIDGETS,
          order: validOrder.length > 0 ? validOrder : DEFAULT_WIDGETS
        };
      } catch {
        return { visible: DEFAULT_WIDGETS, order: DEFAULT_WIDGETS };
      }
    }
    return { visible: DEFAULT_WIDGETS, order: DEFAULT_WIDGETS };
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load preferences from API (null means no preferences saved yet)
  const { data: savedPreferences } = useQuery<DashboardPreferences | null>({
    queryKey: ["/api/user/dashboard-preferences"],
  });

  // Sync saved preferences from API with local state
  // null = no preferences saved yet (use defaults)
  // empty visible array = user deliberately hid all widgets (respect that)
  useEffect(() => {
    if (savedPreferences !== undefined && savedPreferences !== null) {
      // Safety: Validate preferences from API before using them
      const safePreferences = {
        visible: Array.isArray(savedPreferences.visible) 
          ? savedPreferences.visible.filter((w: string) => {
              if (ALL_OPTIONAL_WIDGETS.includes(w)) return true;
              // Allow biomarker widgets only if config exists
              if (w.startsWith('biomarker-')) {
                const type = w.replace('biomarker-', '');
                return biomarkerDisplayConfig[type] !== undefined;
              }
              return false;
            })
          : DEFAULT_WIDGETS,
        order: Array.isArray(savedPreferences.order)
          ? savedPreferences.order.filter((w: string) => {
              if (ALL_OPTIONAL_WIDGETS.includes(w)) return true;
              // Allow biomarker widgets only if config exists
              if (w.startsWith('biomarker-')) {
                const type = w.replace('biomarker-', '');
                return biomarkerDisplayConfig[type] !== undefined;
              }
              return false;
            })
          : ALL_OPTIONAL_WIDGETS
      };
      
      // Always update with validated preferences (empty visible array is valid)
      setPreferences(safePreferences);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safePreferences));
    }
    setIsInitialLoad(false);
  }, [savedPreferences]);

  // Save preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (prefs: DashboardPreferences) => {
      const response = await apiRequest("PATCH", "/api/user/dashboard-preferences", prefs);
      return response.json();
    },
  });

  // Save to both localStorage and API when preferences change (but not on initial load)
  useEffect(() => {
    if (isInitialLoad) return;
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    // Debounce API call to avoid too many requests
    const timeoutId = setTimeout(() => {
      savePreferencesMutation.mutate(preferences);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [preferences, isInitialLoad]);

  const toggleVisibility = (widget: string) => {
    setPreferences(prev => ({
      ...prev,
      visible: prev.visible.includes(widget)
        ? prev.visible.filter(w => w !== widget)
        : [...prev.visible, widget]
    }));
  };

  const showAll = () => {
    setPreferences(prev => ({ 
      ...prev, 
      order: allAvailableWidgets,
      visible: allAvailableWidgets 
    }));
  };

  const hideAll = () => {
    setPreferences(prev => ({ 
      ...prev,
      order: allAvailableWidgets,
      visible: [] 
    }));
  };

  const moveUp = (widget: string) => {
    setPreferences(prev => {
      const index = prev.order.indexOf(widget);
      if (index <= 0) return prev;
      
      const newOrder = [...prev.order];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      
      return { ...prev, order: newOrder };
    });
  };

  const moveDown = (widget: string) => {
    setPreferences(prev => {
      const index = prev.order.indexOf(widget);
      if (index === -1 || index >= prev.order.length - 1) return prev;
      
      const newOrder = [...prev.order];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      
      return { ...prev, order: newOrder };
    });
  };

  const isVisible = (widget: string) => preferences.visible.includes(widget);
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: glucoseData, isLoading: glucoseLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/blood-glucose?days=180"],
  });

  const { data: weightData, isLoading: weightLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/weight?days=180"],
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const { data: biologicalAgeData } = useQuery<{ canCalculate: boolean }>({
    queryKey: ["/api/biological-age"],
  });

  const { data: allBiomarkers } = useQuery<Array<{ type: string }>>({
    queryKey: ["/api/biomarkers"],
  });

  const { data: currentUser } = useQuery<{ role: string; subscriptionTier: string }>({
    queryKey: ["/api/auth/user"],
  });

  const isAdmin = currentUser?.role === 'admin';

  const availableBiomarkerTypes = Array.from(new Set(allBiomarkers?.map(b => b.type) || []));

  const allWidgetConfigs = {
    ...WIDGET_CONFIG,
    ...Object.fromEntries(
      availableBiomarkerTypes.map(type => [
        `biomarker-${type}`,
        {
          title: biomarkerDisplayConfig[type]?.title || type,
          description: biomarkerDisplayConfig[type]?.description || "Health metric chart"
        }
      ])
    )
  };

  const allAvailableWidgets = [
    ...ALL_OPTIONAL_WIDGETS,
    ...availableBiomarkerTypes
      .filter(type => type !== 'blood-glucose' && type !== 'weight')
      .map(type => `biomarker-${type}`)
  ];

  // Sync new widgets with order array
  useEffect(() => {
    setPreferences(prev => {
      const newWidgets = allAvailableWidgets.filter(w => !prev.order.includes(w));
      if (newWidgets.length === 0) return prev;
      
      return {
        ...prev,
        order: [...prev.order, ...newWidgets],
        visible: [...prev.visible, ...newWidgets]
      };
    });
  }, [allAvailableWidgets.join(',')]);

  const allWidgets = preferences.order.filter(w => allAvailableWidgets.includes(w));

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'biomarker':
        return AlertCircle;
      case 'nutrition':
        return Apple;
      case 'exercise':
        return Dumbbell;
      default:
        return AlertCircle;
    }
  };

  const convertedGlucoseData = glucoseData?.map(point => {
    const storedUnit = point.unit;
    const targetUnit = unitConfigs["blood-glucose"][unitSystem].unit;
    
    if (storedUnit !== targetUnit) {
      return {
        ...point,
        value: convertValue(point.value, "blood-glucose", storedUnit, targetUnit),
        target: point.target !== undefined
          ? convertValue(point.target, "blood-glucose", storedUnit, targetUnit)
          : undefined,
        unit: targetUnit,
      };
    }
    return point;
  });

  const convertedWeightData = weightData?.map(point => {
    const storedUnit = point.unit;
    const targetUnit = unitConfigs.weight[unitSystem].unit;
    
    if (storedUnit !== targetUnit) {
      return {
        ...point,
        value: convertValue(point.value, "weight", storedUnit, targetUnit),
        target: point.target !== undefined
          ? convertValue(point.target, "weight", storedUnit, targetUnit)
          : undefined,
        unit: targetUnit,
      };
    }
    return point;
  });

  const renderWidget = (widget: string) => {
    if (!isVisible(widget)) return null;

    switch (widget) {
      case "daily-reminders":
        return <DailyRemindersWidget key={widget} />;

      case "quick-stats":
        return statsLoading ? (
          <div key={widget} className="grid gap-6 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : stats ? (
          <div key={widget} className="grid gap-6 md:grid-cols-4">
            <QuickStats
              icon={Activity}
              label="Daily Steps"
              value={stats.dailySteps.toLocaleString()}
              trend="+12%"
              trendDirection="up"
            />
            <QuickStats
              icon={Heart}
              label="Resting HR"
              value={`${stats.restingHR} bpm`}
              trend="-3%"
              trendDirection="down"
            />
            <QuickStats
              icon={TrendingUp}
              label="Active Days"
              value={`${stats.activeDays}/7`}
              trend={`${Math.round((stats.activeDays / 7) * 100)}%`}
            />
            <QuickStats
              icon={Zap}
              label="Calories"
              value={stats.calories.toLocaleString()}
              trend="+5%"
              trendDirection="up"
            />
          </div>
        ) : (
          <div key={widget} className="text-center py-8 text-muted-foreground">
            No stats available. Start tracking your health data.
          </div>
        );

      case "readiness-score":
        return <ReadinessScoreWidget key={widget} />;

      case "health-score":
        return <HealthScoreWidget key={widget} />;

      case "sleep-score":
        return <SleepScoreDonutWidget key={widget} />;

      case "goals-summary":
        return <GoalsSummaryWidget key={widget} />;

      case "ai-insights":
        return <AIInsightsWidget key={widget} />;

      case "data-insights":
        return <DataInsightsWidget key={widget} />;

      case "next-workout":
        return <NextWorkoutWidget key={widget} />;

      case "todays-meals":
        return <TodaysMealsWidget key={widget} />;

      case "health-metrics":
        const glucoseConfig = biomarkerDisplayConfig["blood-glucose"];
        const glucoseRefRange = glucoseConfig?.referenceRange;
        
        // Convert reference range from imperial (mg/dL) to current unit system
        const convertedGlucoseRange = glucoseRefRange && unitSystem === "metric" 
          ? {
              low: convertValue(glucoseRefRange.low, "blood-glucose", "mg/dL", "mmol/L"),
              high: convertValue(glucoseRefRange.high, "blood-glucose", "mg/dL", "mmol/L")
            }
          : glucoseRefRange;
        
        return (
          <div key={widget} className="grid gap-6 md:grid-cols-3">
            <TrendLineWidget type="heart-rate" />
            <HealthMetricCard
              title="Blood Glucose"
              value={formatValue(
                convertValue(stats?.bloodGlucose.value || 0, "blood-glucose", "mg/dL", unitConfigs["blood-glucose"][unitSystem].unit),
                "blood-glucose"
              )}
              unit={unitConfigs["blood-glucose"][unitSystem].unit}
              trend={stats?.bloodGlucose.trend}
              status={
                convertValue(stats?.bloodGlucose.value || 0, "blood-glucose", "mg/dL", unitConfigs["blood-glucose"][unitSystem].unit) <= 
                (unitSystem === "metric" ? 5.5 : 100) ? "optimal" : "warning"
              }
              icon={Droplet}
              lastUpdated={stats?.bloodGlucose.lastUpdated}
              referenceRange={convertedGlucoseRange}
            />
            <TrendLineWidget type="weight" />
          </div>
        );

      case "blood-glucose-chart":
        return glucoseLoading ? (
          <Card key={widget}>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : convertedGlucoseData && convertedGlucoseData.length > 0 ? (
          <BiomarkerChart
            key={widget}
            title="Blood Glucose Trend"
            description="6-month glucose levels"
            data={convertedGlucoseData}
            unit={unitConfigs["blood-glucose"][unitSystem].unit}
            color="hsl(var(--chart-1))"
          />
        ) : (
          <Card key={widget}>
            <CardContent className="p-6 text-center text-muted-foreground">
              No glucose data available
            </CardContent>
          </Card>
        );

      case "weight-chart":
        return weightLoading ? (
          <Card key={widget}>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : convertedWeightData && convertedWeightData.length > 0 ? (
          <BiomarkerChart
            key={widget}
            title="Weight Progress"
            description="6-month weight tracking"
            data={convertedWeightData}
            unit={unitConfigs.weight[unitSystem].unit}
            color="hsl(var(--chart-2))"
            domain={unitSystem === "metric" ? [60, 80] : [132, 176]}
          />
        ) : (
          <Card key={widget}>
            <CardContent className="p-6 text-center text-muted-foreground">
              No weight data available
            </CardContent>
          </Card>
        );

      case "biological-age":
        return <BiologicalAgeWidget key={widget} />;

      default:
        if (widget.startsWith('biomarker-')) {
          const type = widget.replace('biomarker-', '');
          const config = biomarkerDisplayConfig[type];
          
          // Skip if no config exists for this biomarker type
          if (!config) {
            console.warn(`No config found for biomarker type: ${type}`);
            return null;
          }

          return (
            <BiomarkerChartWidget
              key={widget}
              type={type}
              config={config}
              unitSystem={unitSystem}
            />
          );
        }
        
        // Unknown widget type - skip silently
        console.warn(`Unknown widget type: ${widget}`);
        return null;
    }
  };

  // All widgets are now manageable
  const optionalWidgets = allWidgets;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-2 md:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 md:mt-2 text-sm md:text-base">
            Your personalized health insights and metrics
          </p>
        </div>
        
        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          {isAdmin && (
            <Link href="/admin">
              <Button variant="outline" size="icon" className="md:w-auto md:px-4" data-testid="button-admin-panel">
                <Shield className="h-4 w-4" />
                <span className="hidden md:inline md:ml-2">Admin</span>
              </Button>
            </Link>
          )}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:w-auto md:px-4" data-testid="button-manage-dashboard">
                <Settings2 className="h-4 w-4" />
                <span className="hidden md:inline md:ml-2">Manage Widgets</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px] md:w-[540px]">
            <SheetHeader>
              <SheetTitle>Manage Dashboard Widgets</SheetTitle>
              <SheetDescription>
                Show, hide, or reorder all dashboard widgets to customize your view.
              </SheetDescription>
            </SheetHeader>
            
            <div className="mt-6 space-y-4 flex flex-col h-[calc(100vh-12rem)]">
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={showAll}
                  data-testid="button-show-all"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Show All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={hideAll}
                  data-testid="button-hide-all"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide All
                </Button>
              </div>

              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {optionalWidgets
                  .sort((a, b) => {
                    const aVisible = isVisible(a);
                    const bVisible = isVisible(b);
                    if (aVisible === bVisible) return 0;
                    return aVisible ? -1 : 1;
                  })
                  .map((widget, index, sortedArray) => {
                  const config = allWidgetConfigs[widget];
                  const visible = isVisible(widget);
                  const originalIndex = optionalWidgets.indexOf(widget);
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === optionalWidgets.length - 1;
                  
                  return (
                    <div
                      key={widget}
                      className="flex items-center gap-2 p-3 rounded-md border"
                      data-testid={`widget-item-${widget}`}
                    >
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveUp(widget)}
                          disabled={isFirst}
                          data-testid={`button-move-up-${widget}`}
                          className="h-6 w-6"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => moveDown(widget)}
                          disabled={isLast}
                          data-testid={`button-move-down-${widget}`}
                          className="h-6 w-6"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-medium">{config?.title || widget}</span>
                        <span className="text-sm text-muted-foreground">
                          {config?.description || "Health widget"}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleVisibility(widget)}
                        data-testid={`button-toggle-${widget}`}
                      >
                        {visible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {currentUser?.subscriptionTier === "free" && <UpgradeBanner />}

      {/* All Widgets - Fully Manageable with Respected Order */}
      {optionalWidgets.some(w => isVisible(w)) && (
        <div className="space-y-6">
          {(() => {
            const visibleWidgets = optionalWidgets.filter(w => isVisible(w));
            const groups: JSX.Element[] = [];
            let currentGrid3Col: string[] = [];
            let currentGrid2Col: string[] = [];
            
            const getWidgetLayoutType = (w: string): 'full-width' | 'grid-3' | 'grid-2' => {
              if (w === 'quick-stats' || w === 'health-metrics') return 'full-width';
              if (w === 'ai-insights' || w === 'data-insights') return 'grid-2';
              return 'grid-3';
            };
            
            const flushGrid3Col = () => {
              if (currentGrid3Col.length > 0) {
                groups.push(
                  <div key={`grid-3-${groups.length}`} className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {currentGrid3Col.map(w => renderWidget(w))}
                  </div>
                );
                currentGrid3Col = [];
              }
            };
            
            const flushGrid2Col = () => {
              if (currentGrid2Col.length > 0) {
                groups.push(
                  <div key={`grid-2-${groups.length}`} className="grid gap-6 md:grid-cols-2">
                    {currentGrid2Col.map(w => renderWidget(w))}
                  </div>
                );
                currentGrid2Col = [];
              }
            };
            
            visibleWidgets.forEach(widget => {
              const layoutType = getWidgetLayoutType(widget);
              
              if (layoutType === 'full-width') {
                flushGrid3Col();
                flushGrid2Col();
                groups.push(<div key={widget}>{renderWidget(widget)}</div>);
              } else if (layoutType === 'grid-3') {
                flushGrid2Col();
                currentGrid3Col.push(widget);
              } else if (layoutType === 'grid-2') {
                flushGrid3Col();
                currentGrid2Col.push(widget);
              }
            });
            
            flushGrid3Col();
            flushGrid2Col();
            
            return groups;
          })()}
        </div>
      )}
    </div>
  );
}
