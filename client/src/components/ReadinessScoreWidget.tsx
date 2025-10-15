import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Heart, Moon, Zap, Settings } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface ReadinessScore {
  score: number;
  quality: string;
  recommendation: "ready" | "caution" | "rest";
  reasoning: string;
  factors: {
    sleep: { score: number; weight: number; value?: number };
    hrv: { score: number; weight: number; value?: number };
    restingHR: { score: number; weight: number; value?: number };
    workloadRecovery: { score: number; weight: number };
  };
}

export function ReadinessScoreWidget() {
  const [, setLocation] = useLocation();
  const { data: readinessScore, isLoading } = useQuery<ReadinessScore>({
    queryKey: ["/api/training/readiness"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-readiness-score">
        <CardHeader>
          <CardTitle>Readiness Score</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!readinessScore) {
    return (
      <Card data-testid="card-readiness-score">
        <CardHeader>
          <CardTitle>Readiness Score</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Calculating your readiness...
        </CardContent>
      </Card>
    );
  }

  const getRecommendationBadgeVariant = (rec: string) => {
    if (rec === 'ready') return 'default';
    if (rec === 'caution') return 'secondary';
    return 'destructive';
  };

  const readinessChartData = [
    { 
      name: 'Ready', 
      value: readinessScore.score >= 70 ? readinessScore.score : 0, 
      color: 'hsl(var(--chart-1))' 
    },
    { 
      name: 'Caution', 
      value: readinessScore.score >= 40 && readinessScore.score < 70 ? readinessScore.score : 0, 
      color: 'hsl(var(--chart-2))' 
    },
    { 
      name: 'Rest', 
      value: readinessScore.score < 40 ? readinessScore.score : 0, 
      color: 'hsl(var(--chart-3))' 
    },
    { 
      name: 'Remaining', 
      value: 100 - readinessScore.score, 
      color: 'hsl(var(--muted))' 
    }
  ];

  return (
    <Card data-testid="card-readiness-score">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Readiness Score
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={getRecommendationBadgeVariant(readinessScore.recommendation)}
              data-testid="badge-readiness-quality"
            >
              {readinessScore.quality}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setLocation("/training/readiness-settings")}
              data-testid="button-readiness-settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Semicircle Gauge Chart */}
        <div className="relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={readinessChartData}
                cx="50%"
                cy="75%"
                innerRadius={50}
                outerRadius={70}
                startAngle={180}
                endAngle={0}
                dataKey="value"
              >
                {readinessChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center mb-8">
              <div className="text-3xl font-bold" data-testid="text-readiness-score">
                {readinessScore.score}
              </div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide">
                {readinessScore.recommendation}
              </div>
            </div>
          </div>
        </div>

        {/* Compact Factor Breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Moon className="h-3.5 w-3.5 text-blue-500" />
              Sleep
            </span>
            <span className="font-semibold" data-testid="text-readiness-sleep-score">
              {Math.round(readinessScore.factors.sleep.score)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-green-500" />
              HRV
            </span>
            <span className="font-semibold" data-testid="text-readiness-hrv-score">
              {Math.round(readinessScore.factors.hrv.score)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              Rest HR
            </span>
            <span className="font-semibold" data-testid="text-readiness-rhr-score">
              {Math.round(readinessScore.factors.restingHR.score)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-purple-500" />
              Recovery
            </span>
            <span className="font-semibold" data-testid="text-readiness-recovery-score">
              {Math.round(readinessScore.factors.workloadRecovery.score)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
