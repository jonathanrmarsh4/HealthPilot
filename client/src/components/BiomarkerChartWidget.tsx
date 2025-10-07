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

  // Convert reference range if needed
  let convertedReferenceRange = config.referenceRange;
  if (config.referenceRange && unitConfig && unitConfig.imperial && unitConfig.metric) {
    const imperialUnit = unitConfig.imperial.unit;
    const targetUnitForRange = unitConfig[unitSystem].unit;
    
    // Reference ranges are defined in imperial units
    if (imperialUnit !== targetUnitForRange) {
      convertedReferenceRange = {
        low: convertValue(config.referenceRange.low, type as keyof typeof unitConfigs, imperialUnit, targetUnitForRange),
        high: convertValue(config.referenceRange.high, type as keyof typeof unitConfigs, imperialUnit, targetUnitForRange),
      };
    }
  }

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
