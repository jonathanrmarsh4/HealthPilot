import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Heart, Moon, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

interface HealthScoreData {
  score: number;
  quality: string;
  components: {
    sleep: number;
    activity: number;
    biomarkers: number;
  };
  details: {
    avgSleepScore: number;
    avgDailySteps: number;
    workoutDays: number;
    biomarkerCount: number;
  };
}

export function HealthScoreWidget() {
  const { data: healthScore, isLoading } = useQuery<HealthScoreData>({
    queryKey: ["/api/dashboard/health-score"],
  });
  
  const [animatedWidths, setAnimatedWidths] = useState<number[]>([0, 0, 0]);

  // Trigger animations when data loads
  useEffect(() => {
    if (healthScore) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const sleep = (healthScore.components.sleep / 30) * 100;
        const activity = (healthScore.components.activity / 25) * 100;
        const vitals = (healthScore.components.biomarkers / 45) * 100;
        setAnimatedWidths([
          Math.max(sleep, sleep === 0 ? 10 : 0),
          Math.max(activity, activity === 0 ? 10 : 0),
          Math.max(vitals, vitals === 0 ? 10 : 0)
        ]);
      }, 50);
    }
  }, [healthScore]);

  if (isLoading) {
    return (
      <Card data-testid="card-health-score">
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!healthScore) {
    return (
      <Card data-testid="card-health-score">
        <CardHeader>
          <CardTitle>Health Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Start tracking your health to see your score
        </CardContent>
      </Card>
    );
  }

  // const getBadgeVariant = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'default';
      case 'Good':
        return 'secondary';
      case 'Fair':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  const componentData = [
    {
      label: 'Sleep Quality',
      value: healthScore.components.sleep,
      max: 30,
      icon: Moon,
      color: 'bg-blue-500',
      donutColor: '#3b82f6',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Activity Level',
      value: healthScore.components.activity,
      max: 25,
      icon: Activity,
      color: 'bg-green-500',
      donutColor: '#22c55e',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Vital Signs',
      value: healthScore.components.biomarkers,
      max: 45,
      icon: Heart,
      color: 'bg-purple-500',
      donutColor: '#a855f7',
      textColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

  // Prepare donut chart data
  const donutData = componentData.map(component => ({
    name: component.label,
    value: component.value > 0 ? component.value : 0.1, // Minimum value for visibility
    displayValue: component.value,
    color: component.donutColor,
  }));

  return (
    <Card data-testid="card-health-score">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Health Score</span>
          <Badge variant={getBadgeVariant(healthScore.quality)} data-testid="badge-health-quality">
            {healthScore.quality}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Donut Chart */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                  <Label
                    value={healthScore.score}
                    position="center"
                    className="text-4xl font-bold"
                    fill="hsl(var(--foreground))"
                  />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center mt-12">
                <div className="text-xs text-muted-foreground">out of 100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Animated Bars */}
        <div className="space-y-4">
          {componentData.map((component, index) => {
            const percentage = (component.value / component.max) * 100;
            const Icon = component.icon;
            const isZero = percentage === 0;
            
            return (
              <div key={component.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${component.textColor}`} />
                    <span className="font-medium">{component.label}</span>
                  </div>
                  <span className={`font-semibold ${component.textColor}`} data-testid={`text-${component.label.toLowerCase().replace(' ', '-')}-value`}>
                    {component.value}/{component.max}
                  </span>
                </div>
                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${component.color} rounded-full transition-all duration-1000 ease-out ${isZero ? 'opacity-20' : 'opacity-100'}`}
                    style={{
                      width: `${animatedWidths[index]}%`,
                      transitionDelay: `${index * 150}ms`
                    }}
                    data-testid={`bar-${component.label.toLowerCase().replace(' ', '-')}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <TrendingUp className="h-3 w-3" />
          <span>
            Based on {healthScore.details.workoutDays} workout days, {healthScore.details.avgDailySteps.toLocaleString()} avg steps
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
