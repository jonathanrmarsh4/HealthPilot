import { HealthMetricCard } from "@/components/HealthMetricCard";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { QuickStats } from "@/components/QuickStats";
import { Heart, Activity, Scale, Droplet, TrendingUp, Zap, Apple, AlertCircle, Dumbbell, Settings2, Eye, EyeOff } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Recommendation } from "@shared/schema";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue, formatValue } from "@/lib/unitConversions";
import { useState, useEffect } from "react";

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
  target?: number;
}

const STORAGE_KEY = "dashboard-preferences";

interface DashboardPreferences {
  visible: string[];
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
        return JSON.parse(stored);
      } catch {
        return { visible: DEFAULT_WIDGETS };
      }
    }
    return { visible: DEFAULT_WIDGETS };
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
    setPreferences({ visible: DEFAULT_WIDGETS });
  };

  const hideAll = () => {
    setPreferences({ visible: [] });
  };

  const isVisible = (widget: string) => preferences.visible.includes(widget);
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: glucoseData, isLoading: glucoseLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/blood-glucose?days=7"],
  });

  const { data: weightData, isLoading: weightLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/weight?days=365"],
  });

  const { data: recommendations, isLoading: recommendationsLoading } = useQuery<Recommendation[]>({
    queryKey: ["/api/recommendations"],
  });

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

  const convertedGlucoseData = glucoseData?.map(point => ({
    ...point,
    value: convertValue(point.value, "blood-glucose", "mg/dL", unitConfigs["blood-glucose"][unitSystem].unit),
  }));

  const convertedWeightData = weightData?.map(point => ({
    ...point,
    value: convertValue(point.value, "weight", "lbs", unitConfigs.weight[unitSystem].unit),
  }));

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
            
            <div className="mt-6 space-y-4">
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

              <div className="space-y-2">
                {DEFAULT_WIDGETS.map((widget) => {
                  const config = WIDGET_CONFIG[widget];
                  const visible = isVisible(widget);
                  
                  return (
                    <div
                      key={widget}
                      className="flex items-center gap-2 p-3 rounded-md border"
                      data-testid={`widget-item-${widget}`}
                    >
                      <div className="flex flex-col gap-1 flex-1">
                        <span className="font-medium">{config.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {config.description}
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

      {isVisible("quick-stats") && (statsLoading ? (
        <div className="grid gap-6 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-4">
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
        <div className="text-center py-8 text-muted-foreground">
          No stats available. Start tracking your health data.
        </div>
      ))}

      {isVisible("health-metrics") && (statsLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-6 md:grid-cols-3">
          <HealthMetricCard
            title="Heart Rate"
            value={stats.heartRate.value.toString()}
            unit={unitConfigs["heart-rate"][unitSystem].unit}
            trend={stats.heartRate.trend}
            status={stats.heartRate.value < 100 ? "optimal" : "warning"}
            icon={Heart}
            lastUpdated={stats.heartRate.lastUpdated}
          />
          <HealthMetricCard
            title="Blood Glucose"
            value={formatValue(
              convertValue(stats.bloodGlucose.value, "blood-glucose", "mg/dL", unitConfigs["blood-glucose"][unitSystem].unit),
              "blood-glucose"
            )}
            unit={unitConfigs["blood-glucose"][unitSystem].unit}
            trend={stats.bloodGlucose.trend}
            status={
              convertValue(stats.bloodGlucose.value, "blood-glucose", "mg/dL", unitConfigs["blood-glucose"][unitSystem].unit) <= 
              (unitSystem === "metric" ? 5.5 : 100) ? "optimal" : "warning"
            }
            icon={Droplet}
            lastUpdated={stats.bloodGlucose.lastUpdated}
          />
          <HealthMetricCard
            title="Weight"
            value={formatValue(
              convertValue(stats.weight.value, "weight", "lbs", unitConfigs.weight[unitSystem].unit),
              "weight"
            )}
            unit={unitConfigs.weight[unitSystem].unit}
            trend={stats.weight.trend}
            status="optimal"
            icon={Scale}
            lastUpdated={stats.weight.lastUpdated}
          />
        </div>
      ) : null)}

      <div className="grid gap-6 lg:grid-cols-2">
        {isVisible("blood-glucose-chart") && (glucoseLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : convertedGlucoseData && convertedGlucoseData.length > 0 ? (
          <BiomarkerChart
            title="Blood Glucose Trend"
            description="7-day fasting glucose levels"
            data={convertedGlucoseData}
            unit={unitConfigs["blood-glucose"][unitSystem].unit}
            color="hsl(var(--chart-1))"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No glucose data available
            </CardContent>
          </Card>
        ))}
        
        {isVisible("weight-chart") && (weightLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : convertedWeightData && convertedWeightData.length > 0 ? (
          <BiomarkerChart
            title="Weight Progress"
            description="12-month weight tracking"
            data={convertedWeightData}
            unit={unitConfigs.weight[unitSystem].unit}
            color="hsl(var(--chart-2))"
            domain={unitSystem === "metric" ? [60, 80] : [132, 176]}
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No weight data available
            </CardContent>
          </Card>
        ))}
      </div>

      {isVisible("recommendations") && (
        <div>
          <h2 className="text-2xl font-semibold mb-6">AI Recommendations</h2>
          {recommendationsLoading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : recommendations && recommendations.length > 0 ? (
            <div className="grid gap-6">
              {recommendations.slice(0, 3).map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  title={rec.title}
                  description={rec.description}
                  category={rec.category}
                  priority={rec.priority as "high" | "medium" | "low"}
                  icon={getCategoryIcon(rec.category)}
                  details={rec.details || ""}
                  actionLabel={rec.actionLabel || "View Details"}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                No recommendations available. Add health data to get personalized insights.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
