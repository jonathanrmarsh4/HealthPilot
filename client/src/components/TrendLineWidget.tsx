import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/contexts/LocaleContext";
import { useTimezone } from "@/contexts/TimezoneContext";
import { unitConfigs, convertValue } from "@/lib/unitConversions";
import { biomarkerDisplayConfig } from "@/lib/biomarkerConfig";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { formatDate } from "@/lib/timezone";
import { BiomarkerDetailModal } from "./BiomarkerDetailModal";

interface ChartDataPoint {
  date: string;
  value: number;
  unit: string;
}

interface TrendLineWidgetProps {
  type: string;
}

export function TrendLineWidget({ type }: TrendLineWidgetProps) {
  const { unitSystem } = useLocale();
  const { timezone } = useTimezone();
  const [modalOpen, setModalOpen] = useState(false);
  
  const config = biomarkerDisplayConfig[type] || {
    title: type.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: "Recent trend",
    days: 730, // 2 years to show historical data from PDFs
    color: "hsl(var(--chart-2))"
  };

  const { data: chartData, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
  });

  // Convert data if needed for this biomarker type
  const convertedData = chartData?.map(point => {
    const biomarkerConfig = unitConfigs[type as keyof typeof unitConfigs];
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      const storedUnit = point.unit; // Use the actual stored unit
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      // Only convert if stored unit differs from target unit
      if (storedUnit !== targetUnit) {
        return {
          ...point,
          value: convertValue(point.value, type as any, storedUnit, targetUnit),
          unit: targetUnit, // Update unit to match the converted value
        };
      }
    }
    return point;
  });

  const displayUnit = unitConfigs[type as keyof typeof unitConfigs]?.[unitSystem]?.unit || "";
  
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
  const latestDate = convertedData?.[convertedData.length - 1]?.date;

  // Format the test date
  const formatTestDate = (dateStr: string) => {
    try {
      return formatDate(dateStr, timezone, 'MMM d, yyyy');
    } catch {
      return dateStr;
    }
  };

  // Check reference range status
  const getRangeStatus = () => {
    if (!config.referenceRange || latestValue === undefined) return null;
    
    const biomarkerConfig = unitConfigs[type as keyof typeof unitConfigs];
    
    // Reference ranges are defined in imperial units (see biomarkerConfig comments)
    // Convert them to the display unit for comparison with the displayed value
    let lowThreshold = config.referenceRange.low;
    let highThreshold = config.referenceRange.high;
    
    if (biomarkerConfig && biomarkerConfig.imperial && biomarkerConfig.metric) {
      const imperialUnit = biomarkerConfig.imperial.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      // Convert reference ranges from imperial to display unit
      if (imperialUnit !== targetUnit) {
        lowThreshold = convertValue(config.referenceRange.low, type as any, imperialUnit, targetUnit);
        highThreshold = convertValue(config.referenceRange.high, type as any, imperialUnit, targetUnit);
      }
    }
    
    // Compare the converted display value with the converted thresholds
    // Both are now in the same unit (display unit)
    if (latestValue < lowThreshold) return { status: "below", label: "Below Range" };
    if (latestValue > highThreshold) return { status: "above", label: "Above Range" };
    return { status: "normal", label: "In Range" };
  };

  const rangeStatus = getRangeStatus();

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
    <>
      <Card 
        className="hover-elevate cursor-pointer" 
        data-testid={`trend-widget-${type}`}
        onClick={() => setModalOpen(true)}
      >
        <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" data-testid={`trend-title-${type}`}>
              {config.title}
            </h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold" data-testid={`trend-value-${type}`}>
                {latestValue?.toFixed(config.decimals ?? 1)}
              </span>
              {displayUnit && (
                <span className="text-xs text-muted-foreground">{displayUnit}</span>
              )}
            </div>
            {latestDate && (
              <div className="text-xs text-muted-foreground mt-0.5" data-testid={`trend-date-${type}`}>
                Tested: {formatTestDate(latestDate)}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-1">
              {trend && (
                <div className="flex items-center gap-1">
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
                    {trend.direction === "stable" ? "Stable" : `${trend.value.toFixed(0)}%`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {convertedData.length} readings
                  </span>
                </div>
              )}
              {rangeStatus && (
                <Badge 
                  variant={rangeStatus.status === "normal" ? "default" : "destructive"}
                  className="text-xs"
                  data-testid={`range-status-${type}`}
                >
                  {rangeStatus.label}
                </Badge>
              )}
            </div>
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

      <BiomarkerDetailModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        type={type}
        config={config}
      />
    </>
  );
}
