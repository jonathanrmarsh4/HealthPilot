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

  // Calculate weighted contributions for multicolored segments
  const totalWeightedScore = 
    readinessScore.factors.sleep.score * readinessScore.factors.sleep.weight +
    readinessScore.factors.hrv.score * readinessScore.factors.hrv.weight +
    readinessScore.factors.restingHR.score * readinessScore.factors.restingHR.weight +
    readinessScore.factors.workloadRecovery.score * readinessScore.factors.workloadRecovery.weight;

  // Guard against division by zero - fallback to equal distribution if no data
  const safePercentage = (value: number) => {
    if (totalWeightedScore <= 0) return 25; // Equal 25% for each factor if no data
    return Math.round((value / totalWeightedScore) * 100);
  };

  const readinessChartData = [
    { 
      name: 'Sleep', 
      value: readinessScore.factors.sleep.score * readinessScore.factors.sleep.weight, 
      color: '#3b82f6', // Blue
      percentage: safePercentage(readinessScore.factors.sleep.score * readinessScore.factors.sleep.weight)
    },
    { 
      name: 'HRV', 
      value: readinessScore.factors.hrv.score * readinessScore.factors.hrv.weight, 
      color: '#10b981', // Green
      percentage: safePercentage(readinessScore.factors.hrv.score * readinessScore.factors.hrv.weight)
    },
    { 
      name: 'Rest HR', 
      value: readinessScore.factors.restingHR.score * readinessScore.factors.restingHR.weight, 
      color: '#ef4444', // Red
      percentage: safePercentage(readinessScore.factors.restingHR.score * readinessScore.factors.restingHR.weight)
    },
    { 
      name: 'Recovery', 
      value: readinessScore.factors.workloadRecovery.score * readinessScore.factors.workloadRecovery.weight, 
      color: '#8b5cf6', // Purple
      percentage: safePercentage(readinessScore.factors.workloadRecovery.score * readinessScore.factors.workloadRecovery.weight)
    },
    { 
      name: 'Remaining', 
      value: 100 - readinessScore.score, 
      color: 'hsl(var(--muted))',
      percentage: 0
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
        <div className="flex items-center justify-center">
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
                paddingAngle={1}
                dataKey="value"
              >
                {readinessChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <text
                x="50%"
                y="65%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground text-3xl font-bold"
                data-testid="text-readiness-score"
              >
                {readinessScore.score}
              </text>
              <text
                x="50%"
                y="80%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-xs uppercase tracking-wide"
              >
                {readinessScore.recommendation}
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Factor Breakdown with percentages */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {readinessChartData.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: item.color }}
              />
              <span className="text-muted-foreground">{item.name}</span>
              <span className="font-medium ml-auto" data-testid={`text-readiness-${item.name.toLowerCase().replace(/\s+/g, '-')}-percentage`}>
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
