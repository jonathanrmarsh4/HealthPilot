import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue } from "@/lib/unitConversions";
import { biomarkerDisplayConfig } from "@/lib/biomarkerConfig";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface ChartDataPoint {
  date: string;
  value: number;
}

interface TrendLineWidgetProps {
  type: string;
}

export function TrendLineWidget({ type }: TrendLineWidgetProps) {
  const { unitSystem } = useLocale();
  
  const config = biomarkerDisplayConfig[type] || {
    title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: "Recent trend",
    days: 30,
    color: "hsl(var(--chart-2))"
  };

  const { data: chartData, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
  });

  // Convert data if needed for this biomarker type
  const convertedData = chartData?.map(point => {
    const biomarkerConfig = unitConfigs[type];
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      const originalUnit = biomarkerConfig.imperial.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      return {
        ...point,
        value: convertValue(point.value, type, originalUnit, targetUnit),
      };
    }
    return point;
  });

  const displayUnit = unitConfigs[type]?.[unitSystem]?.unit || "";
  
  // Calculate trend
  const getTrend = () => {
    if (!convertedData || convertedData.length < 2) return null;
    
    const firstValue = convertedData[0].value;
    const lastValue = convertedData[convertedData.length - 1].value;
    const change = lastValue - firstValue;
    const percentChange = (change / firstValue) * 100;
    
    if (Math.abs(percentChange) < 1) return { direction: "stable", value: 0 };
    if (change > 0) return { direction: "up", value: percentChange };
    return { direction: "down", value: Math.abs(percentChange) };
  };

  const trend = getTrend();
  const latestValue = convertedData?.[convertedData.length - 1]?.value;

  if (isLoading) {
    return (
      <Card className="hover-elevate">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!convertedData || convertedData.length === 0) {
    return null;
  }

  return (
    <Card className="hover-elevate" data-testid={`trend-widget-${type}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" data-testid={`trend-title-${type}`}>
              {config.title}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold" data-testid={`trend-value-${type}`}>
                {latestValue?.toFixed(1)}
              </span>
              {displayUnit && (
                <span className="text-xs text-muted-foreground">{displayUnit}</span>
              )}
            </div>
            {trend && (
              <div className="flex items-center gap-1 mt-1">
                {trend.direction === "up" && (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                )}
                {trend.direction === "down" && (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                {trend.direction === "stable" && (
                  <Minus className="h-3 w-3 text-muted-foreground" />
                )}
                <span className={`text-xs ${
                  trend.direction === "up" ? "text-green-500" : 
                  trend.direction === "down" ? "text-red-500" : 
                  "text-muted-foreground"
                }`}>
                  {trend.direction === "stable" ? "Stable" : `${trend.value.toFixed(1)}%`}
                </span>
                <span className="text-xs text-muted-foreground">
                  {convertedData.length} readings
                </span>
              </div>
            )}
          </div>
          
          <div className="w-24 h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={convertedData}>
                <YAxis hide domain={['dataMin', 'dataMax']} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={config.color} 
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
