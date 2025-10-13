import { useQuery } from "@tanstack/react-query";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { BiomarkerConfig } from "@/lib/biomarkerConfig";
import { unitConfigs, convertValue } from "@/lib/unitConversions";

interface BiomarkerChartWidgetProps {
  type: string;
  config: BiomarkerConfig;
  unitSystem: "imperial" | "metric";
}

interface ChartDataPoint {
  date: string;
  value: number;
  unit: string;
  target?: number;
}

export function BiomarkerChartWidget({ type, config, unitSystem }: BiomarkerChartWidgetProps) {
  const { data, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
  });

  const unitConfig = unitConfigs[type as keyof typeof unitConfigs];
  const targetUnit = unitConfig ? unitConfig[unitSystem].unit : "";

  const convertedData = data?.map(point => {
    const storedUnit = point.unit;
    
    // Only convert if stored unit differs from target unit
    if (unitConfig && storedUnit !== targetUnit) {
      return {
        ...point,
        value: convertValue(point.value, type as keyof typeof unitConfigs, storedUnit, targetUnit),
        target: point.target !== undefined 
          ? convertValue(point.target, type as keyof typeof unitConfigs, storedUnit, targetUnit)
          : undefined,
        unit: targetUnit,
      };
    }
    return point;
  });

  // Get reference range based on display unit
  const getConvertedReferenceRange = () => {
    // Use new unit-aware reference ranges if available
    if (config.referenceRanges) {
      // If biomarker has unit configs, match by unit
      if (unitConfig && unitConfig[unitSystem]) {
        const targetUnitForRange = unitConfig[unitSystem].unit;
        
        // Try to match reference range by unit
        if (config.referenceRanges.metric?.unit === targetUnitForRange) {
          return { low: config.referenceRanges.metric.low, high: config.referenceRanges.metric.high };
        }
        if (config.referenceRanges.imperial?.unit === targetUnitForRange) {
          return { low: config.referenceRanges.imperial.low, high: config.referenceRanges.imperial.high };
        }
        
        // Default to metric if using metric system, imperial otherwise
        if (unitSystem === 'metric' && config.referenceRanges.metric) {
          return { low: config.referenceRanges.metric.low, high: config.referenceRanges.metric.high };
        }
        if (unitSystem === 'imperial' && config.referenceRanges.imperial) {
          return { low: config.referenceRanges.imperial.low, high: config.referenceRanges.imperial.high };
        }
      }
    }
    
    // Legacy: Fall back to old referenceRange
    if (!config.referenceRange) return undefined;
    
    if (unitConfig && unitConfig.imperial && unitConfig.metric) {
      const imperialUnit = unitConfig.imperial.unit;
      const targetUnitForRange = unitConfig[unitSystem].unit;
      
      // Convert reference ranges from imperial to display unit
      if (imperialUnit !== targetUnitForRange) {
        return {
          low: convertValue(config.referenceRange.low, type as keyof typeof unitConfigs, imperialUnit, targetUnitForRange),
          high: convertValue(config.referenceRange.high, type as keyof typeof unitConfigs, imperialUnit, targetUnitForRange),
        };
      }
    }
    
    return config.referenceRange;
  };

  const convertedReferenceRange = getConvertedReferenceRange();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!convertedData || convertedData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No {config.title.toLowerCase()} data available
        </CardContent>
      </Card>
    );
  }

  return (
    <BiomarkerChart
      title={config.title}
      description={config.description}
      data={convertedData}
      unit={targetUnit}
      color={config.color}
      referenceRange={convertedReferenceRange}
    />
  );
}
