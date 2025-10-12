import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Heart, Moon, TrendingUp } from "lucide-react";

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
      <CardContent className="space-y-4">
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

        <div className="grid grid-cols-3 gap-3 pt-2">
          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
            <Moon className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Sleep</div>
            <div className="text-sm font-semibold" data-testid="text-sleep-component">{healthScore.components.sleep}</div>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Activity</div>
            <div className="text-sm font-semibold" data-testid="text-activity-component">{healthScore.components.activity}</div>
          </div>
          <div className="flex flex-col items-center gap-1 p-2 rounded-md bg-muted/50">
            <Heart className="h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">Vitals</div>
            <div className="text-sm font-semibold" data-testid="text-biomarkers-component">{healthScore.components.biomarkers}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2">
          <TrendingUp className="h-3 w-3" />
          <span>
            Based on {healthScore.details.workoutDays} workout days, {healthScore.details.avgDailySteps.toLocaleString()} avg steps
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
