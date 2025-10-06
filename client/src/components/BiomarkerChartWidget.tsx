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
  target?: number;
}

export function BiomarkerChartWidget({ type, config, unitSystem }: BiomarkerChartWidgetProps) {
  const { data, isLoading } = useQuery<ChartDataPoint[]>({
    queryKey: [`/api/biomarkers/chart/${type}?days=${config.days}`],
  });

  const unitConfig = unitConfigs[type as keyof typeof unitConfigs];
  const targetUnit = unitConfig ? unitConfig[unitSystem].unit : "";
  const sourceUnit = unitConfig ? unitConfig.imperial.unit : "";

  const convertedData = data?.map(point => ({
    ...point,
    value: unitConfig 
      ? convertValue(point.value, type as keyof typeof unitConfigs, sourceUnit, targetUnit)
      : point.value,
  }));

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
    />
  );
}
