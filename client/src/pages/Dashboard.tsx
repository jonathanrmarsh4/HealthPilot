import { HealthMetricCard } from "@/components/HealthMetricCard";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { QuickStats } from "@/components/QuickStats";
import { Heart, Activity, Scale, Droplet, TrendingUp, Zap, Apple, AlertCircle, Dumbbell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import type { Recommendation } from "@shared/schema";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue, formatValue } from "@/lib/unitConversions";

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

export default function Dashboard() {
  const { unitSystem } = useLocale();
  
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: glucoseData, isLoading: glucoseLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/blood-glucose?days=7"],
  });

  const { data: weightData, isLoading: weightLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/weight?days=28"],
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
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Your personalized health insights and metrics
        </p>
      </div>

      {statsLoading ? (
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
      )}

      {statsLoading ? (
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
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {glucoseLoading ? (
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
        )}
        
        {weightLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : convertedWeightData && convertedWeightData.length > 0 ? (
          <BiomarkerChart
            title="Weight Progress"
            description="4-week weight tracking"
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
        )}
      </div>

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
    </div>
  );
}
