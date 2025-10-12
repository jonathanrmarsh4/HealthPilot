import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Heart, Moon, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

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

  const getScoreColor = (quality: string) => {
    switch (quality) {
      case 'Excellent':
        return 'bg-green-500 dark:bg-green-600';
      case 'Good':
        return 'bg-blue-500 dark:bg-blue-600';
      case 'Fair':
        return 'bg-yellow-500 dark:bg-yellow-600';
      default:
        return 'bg-red-500 dark:bg-red-600';
    }
  };

  const getBadgeVariant = (quality: string) => {
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
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Activity Level',
      value: healthScore.components.activity,
      max: 25,
      icon: Activity,
      color: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Vital Signs',
      value: healthScore.components.biomarkers,
      max: 45,
      icon: Heart,
      color: 'bg-purple-500',
      textColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

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
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={`w-32 h-32 rounded-full ${getScoreColor(healthScore.quality)} flex items-center justify-center`}>
              <div className="text-center text-white">
                <div className="text-4xl font-bold" data-testid="text-health-score">{healthScore.score}</div>
                <div className="text-sm opacity-90">out of 100</div>
              </div>
            </div>
          </div>
        </div>

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
