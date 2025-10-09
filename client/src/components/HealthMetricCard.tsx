import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";

type MetricStatus = "optimal" | "warning" | "critical";

interface HealthMetricCardProps {
  title: string;
  value: string;
  unit: string;
  trend?: number;
  status: MetricStatus;
  icon: LucideIcon;
  lastUpdated?: string;
  sparklineData?: number[];
  referenceRange?: {
    low: number;
    high: number;
  };
}

const statusConfig = {
  optimal: {
    badge: "bg-chart-4 text-white",
    label: "Optimal",
  },
  warning: {
    badge: "bg-chart-5 text-white",
    label: "Attention",
  },
  critical: {
    badge: "bg-destructive text-destructive-foreground",
    label: "Critical",
  },
};

export function HealthMetricCard({
  title,
  value,
  unit,
  trend,
  status,
  icon: Icon,
  lastUpdated,
  referenceRange,
}: HealthMetricCardProps) {
  const config = statusConfig[status];
  
  const TrendIcon = trend === undefined ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const trendColor = trend === undefined ? "text-muted-foreground" : trend > 0 ? "text-chart-4" : "text-destructive";

  return (
    <Card data-testid={`card-metric-${title.toLowerCase().replace(/\s/g, "-")}`}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight" data-testid={`text-value-${title.toLowerCase().replace(/\s/g, "-")}`}>
              {value}
            </span>
            <span className="text-lg text-muted-foreground">{unit}</span>
          </div>
          
          {referenceRange && (
            <div className="text-xs text-muted-foreground" data-testid={`text-reference-range-${title.toLowerCase().replace(/\s/g, "-")}`}>
              Reference: {referenceRange.low.toFixed(1)}-{referenceRange.high.toFixed(1)} {unit}
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {trend !== undefined && (
                <div className={`flex items-center gap-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {Math.abs(trend)}%
                  </span>
                </div>
              )}
              {lastUpdated && (
                <span className="text-xs text-muted-foreground">
                  {lastUpdated}
                </span>
              )}
            </div>
            <Badge className={config.badge} data-testid={`badge-status-${status}`}>
              {config.label}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
