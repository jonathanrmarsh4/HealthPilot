import { HealthMetricCard } from "@/components/HealthMetricCard";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { BiomarkerChartWidget } from "@/components/BiomarkerChartWidget";
import { RecommendationCard } from "@/components/RecommendationCard";
import { QuickStats } from "@/components/QuickStats";
import { TrendLineWidget } from "@/components/TrendLineWidget";
import { Heart, Activity, Scale, Droplet, TrendingUp, Zap, Apple, AlertCircle, Dumbbell, Settings2, Eye, EyeOff, ChevronUp, ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
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

interface DashboardPreferences {
  visible: string[];
  order: string[];
}

const DEFAULT_WIDGETS = [
  "quick-stats",
  "health-metrics", 
  "blood-glucose-chart",
  "weight-chart",
  "recommendations"
];

const WIDGET_CONFIG: Record<string, { title: string; description: string }> = {
  "quick-stats": { title: "Quick Stats", description: "Daily steps, heart rate, active days, calories" },
  "health-metrics": { title: "Health Metrics", description: "Heart rate, blood glucose, weight cards" },
  "blood-glucose-chart": { title: "Blood Glucose Chart", description: "7-day glucose trend" },
  "weight-chart": { title: "Weight Chart", description: "12-month weight tracking" },
  "recommendations": { title: "AI Recommendations", description: "Personalized health insights" }
};

export default function Dashboard() {
  const { unitSystem } = useLocale();
  
  const [preferences, setPreferences] = useState<DashboardPreferences>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return {
          visible: parsed.visible || DEFAULT_WIDGETS,
          order: parsed.order || DEFAULT_WIDGETS
        };
      } catch {
        return { visible: DEFAULT_WIDGETS, order: DEFAULT_WIDGETS };
      }
    }
    return { visible: DEFAULT_WIDGETS, order: DEFAULT_WIDGETS };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }, [preferences]);

  const toggleVisibility = (widget: string) => {
    setPreferences(prev => ({
      ...prev,
      visible: prev.visible.includes(widget)
        ? prev.visible.filter(w => w !== widget)
        : [...prev.visible, widget]
    }));
  };

  const showAll = () => {
    setPreferences(prev => ({ ...prev, visible: [...prev.order] }));
  };

  const hideAll = () => {
    setPreferences(prev => ({ ...prev, visible: [] }));
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

  const { data: allBiomarkers } = useQuery<Array<{ type: string }>>({
    queryKey: ["/api/biomarkers"],
  });

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
    ...DEFAULT_WIDGETS,
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

      case "recommendations":
        return recommendationsLoading ? (
          <Card key={widget}>
            <CardContent className="p-6">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        ) : recommendations && recommendations.length > 0 ? (
          <Card key={widget}>
            <CardHeader>
              <CardTitle>AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendations.slice(0, 3).map((rec) => (
                <div key={rec.id} className="flex items-start gap-3 p-3 rounded-md hover-elevate">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{rec.title}</span>
                      <Badge variant={rec.priority === 'high' ? 'destructive' : rec.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{rec.description}</p>
                  </div>
                </div>
              ))}
              <Link href="/ai-insights">
                <Button variant="outline" size="sm" className="w-full mt-2" data-testid="button-view-all-recommendations">
                  View All Insights →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card key={widget}>
            <CardContent className="p-6 text-center text-muted-foreground">
              No recommendations available
            </CardContent>
          </Card>
        );

      default:
        if (widget.startsWith('biomarker-')) {
          const type = widget.replace('biomarker-', '');
          const config = biomarkerDisplayConfig[type];
          if (!config) return null;

          return (
            <BiomarkerChartWidget
              key={widget}
              type={type}
              config={config}
              unitSystem={unitSystem}
            />
          );
        }
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Your personalized health insights and metrics
          </p>
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="default" data-testid="button-manage-dashboard">
              <Settings2 className="h-4 w-4 mr-2" />
              Manage Dashboard
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Manage Dashboard</SheetTitle>
              <SheetDescription>
                Show or hide dashboard widgets and charts
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
                {allWidgets
                  .sort((a, b) => {
                    const aVisible = isVisible(a);
                    const bVisible = isVisible(b);
                    if (aVisible === bVisible) return 0;
                    return aVisible ? -1 : 1;
                  })
                  .map((widget, index, sortedArray) => {
                  const config = allWidgetConfigs[widget];
                  const visible = isVisible(widget);
                  const originalIndex = allWidgets.indexOf(widget);
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === allWidgets.length - 1;
                  
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

      {allWidgets.filter(w => w === 'quick-stats' || w === 'health-metrics').map(widget => renderWidget(widget))}
      
      <div className="grid gap-6 lg:grid-cols-3">
        {allWidgets.filter(w => w !== 'quick-stats' && w !== 'health-metrics').map(widget => renderWidget(widget))}
      </div>
    </div>
  );
}
