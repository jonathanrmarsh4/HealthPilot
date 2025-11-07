import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Battery, Moon, Heart, Zap, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface ReadinessData {
  score: number;
  quality: "excellent" | "good" | "fair" | "poor";
  recommendation: "ready" | "caution" | "rest";
  reasoning: string;
  factors: {
    sleep: { score: number; weight: number; value?: number };
    hrv: { score: number; weight: number; value?: number };
    restingHR: { score: number; weight: number; value?: number };
    workloadRecovery: { score: number; weight: number };
  };
}

export function ReadinessWidget() {
  const { data: readiness, isLoading } = useQuery<ReadinessData>({
    queryKey: ["/api/training/readiness"],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-readiness">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Daily Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-48 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!readiness) {
    return (
      <Card data-testid="card-readiness">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="h-5 w-5" />
            Daily Readiness
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-muted-foreground">
          Track sleep and biomarkers to see your readiness score
        </CardContent>
      </Card>
    );
  }

  const { score, quality, recommendation, reasoning, factors } = readiness;

  // Determine color based on recommendation
  const getRecommendationColor = () => {
    switch (recommendation) {
      case "ready":
        return { bg: "bg-green-500", text: "text-green-600 dark:text-green-400", gradient: "from-green-500 to-emerald-500" };
      case "caution":
        return { bg: "bg-yellow-500", text: "text-yellow-600 dark:text-yellow-400", gradient: "from-yellow-500 to-amber-500" };
      case "rest":
        return { bg: "bg-red-500", text: "text-red-600 dark:text-red-400", gradient: "from-red-500 to-rose-500" };
      default:
        return { bg: "bg-gray-500", text: "text-gray-600 dark:text-gray-400", gradient: "from-gray-500 to-slate-500" };
    }
  };

  // const getBadgeVariant = (quality: string) => {
    switch (quality) {
      case "excellent":
        return "default";
      case "good":
        return "secondary";
      case "fair":
        return "outline";
      default:
        return "destructive";
    }
  };

  const colors = getRecommendationColor();

  // Fuel gauge data (semicircle visualization)
  const gaugeData = [
    { name: "score", value: score, color: colors.bg.replace("bg-", "") },
    { name: "remaining", value: 100 - score, color: "transparent" }
  ];

  const getRecommendationIcon = () => {
    switch (recommendation) {
      case "ready":
        return <Zap className="h-4 w-4 text-green-600 dark:text-green-400" data-testid="icon-ready" />;
      case "caution":
        return <Activity className="h-4 w-4 text-yellow-600 dark:text-yellow-400" data-testid="icon-caution" />;
      case "rest":
        return <Moon className="h-4 w-4 text-red-600 dark:text-red-400" data-testid="icon-rest" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card data-testid="card-readiness" className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2">
          <Battery className="h-5 w-5" />
          Daily Readiness
        </CardTitle>
        <Badge variant={getBadgeVariant(quality)} className="capitalize" data-testid="badge-readiness-quality">
          {quality}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fuel Gauge Visualization */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center justify-center flex-col pt-8">
            <div className={`text-5xl font-bold bg-gradient-to-r ${colors.gradient} bg-clip-text text-transparent`} data-testid="value-readiness-score">
              {score}
            </div>
            <div className="text-xs text-muted-foreground">Readiness Score</div>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={gaugeData}
                cx="50%"
                cy="80%"
                startAngle={180}
                endAngle={0}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={0}
                dataKey="value"
              >
                <Cell fill={`hsl(var(--${gaugeData[0].color}))`} />
                <Cell fill="hsl(var(--muted))" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recommendation Badge */}
        <div className={`flex items-center gap-2 justify-center p-3 rounded-lg bg-gradient-to-r ${colors.gradient} bg-opacity-10`}>
          {getRecommendationIcon()}
          <span className={`font-semibold capitalize ${colors.text}`} data-testid="text-recommendation">
            {recommendation === "ready" ? "Ready to Train" : recommendation === "caution" ? "Train with Caution" : "Rest Day Recommended"}
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-sm text-muted-foreground text-center leading-relaxed" data-testid="text-reasoning">
          {reasoning}
        </p>

        {/* Component Breakdown */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="flex items-center gap-2">
            <Moon className="h-3.5 w-3.5 text-purple-500" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Sleep</div>
              <div className="text-sm font-semibold" data-testid="value-sleep-score">
                {Math.round(factors.sleep.score)}%
              </div>
            </div>
          </div>
          
          {factors.hrv.value !== undefined && (
            <div className="flex items-center gap-2">
              <Heart className="h-3.5 w-3.5 text-red-500" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">HRV</div>
                <div className="text-sm font-semibold" data-testid="value-hrv-score">
                  {Math.round(factors.hrv.score)}%
                </div>
              </div>
            </div>
          )}
          
          {factors.restingHR.value !== undefined && (
            <div className="flex items-center gap-2">
              <Activity className="h-3.5 w-3.5 text-blue-500" />
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">Resting HR</div>
                <div className="text-sm font-semibold" data-testid="value-rhr-score">
                  {Math.round(factors.restingHR.score)}%
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Recovery</div>
              <div className="text-sm font-semibold" data-testid="value-workload-score">
                {Math.round(factors.workloadRecovery.score)}%
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
