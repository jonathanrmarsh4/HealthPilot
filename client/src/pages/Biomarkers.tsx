import { DataInputForm } from "@/components/DataInputForm";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/contexts/LocaleContext";
import { unitConfigs, convertValue } from "@/lib/unitConversions";

interface ChartDataPoint {
  date: string;
  value: number;
  target?: number;
}

interface Biomarker {
  id: string;
  type: string;
  value: number;
  unit: string;
  recordedAt: string;
  source: string;
}

const biomarkerDisplayConfig: Record<string, { title: string; description: string; days: number; color: string }> = {
  "blood-glucose": {
    title: "Blood Glucose",
    description: "30-day trend",
    days: 30,
    color: "hsl(var(--chart-2))"
  },
  "cholesterol": {
    title: "Total Cholesterol",
    description: "6-month trend",
    days: 180,
    color: "hsl(var(--chart-1))"
  },
  "blood-pressure": {
    title: "Blood Pressure (Systolic)",
    description: "4-week average",
    days: 28,
    color: "hsl(var(--chart-3))"
  },
  "heart-rate": {
    title: "Resting Heart Rate",
    description: "7-day average",
    days: 7,
    color: "hsl(var(--chart-4))"
  },
  "weight": {
    title: "Body Weight",
    description: "3-month trend",
    days: 90,
    color: "hsl(var(--chart-5))"
  },
  "steps": {
    title: "Daily Steps",
    description: "7-day average",
    days: 7,
    color: "hsl(var(--chart-1))"
  },
  "bmi": {
    title: "Body Mass Index",
    description: "3-month trend",
    days: 90,
    color: "hsl(var(--chart-3))"
  }
};

export default function Biomarkers() {
  const { unitSystem } = useLocale();
  
  // Get all biomarkers to determine which types exist
  const { data: allBiomarkers, isLoading: biomarkersLoading } = useQuery<Biomarker[]>({
    queryKey: ["/api/biomarkers"],
  });

  // Get unique biomarker types that have data
  const availableTypes = Array.from(new Set(allBiomarkers?.map(b => b.type) || []));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Biomarkers</h1>
        <p className="text-muted-foreground mt-2">
          Track and analyze your key health biomarkers over time
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataInputForm />
        
        {biomarkersLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : availableTypes.length > 0 ? (
          <BiomarkerTypeChart type={availableTypes[0]} />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No biomarker data available. Upload health records or manually enter data to get started.
            </CardContent>
          </Card>
        )}
      </div>

      {!biomarkersLoading && availableTypes.length > 1 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {availableTypes.slice(1).map(type => (
            <BiomarkerTypeChart key={type} type={type} />
          ))}
        </div>
      )}
    </div>
  );
}

function BiomarkerTypeChart({ type }: { type: string }) {
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
      // Find the original unit from the config
      const originalUnit = biomarkerConfig.imperial.unit;
      const targetUnit = biomarkerConfig[unitSystem].unit;
      
      return {
        ...point,
        value: convertValue(point.value, type, originalUnit, targetUnit),
      };
    }
    return point;
  });

  const displayUnit = unitConfigs[type]?.[unitSystem]?.unit || chartData?.[0]?.value !== undefined ? 
    (type === "steps" ? "steps" : 
     type === "heart-rate" ? "bpm" : 
     type === "blood-pressure" ? "mmHg" :
     type === "bmi" ? "BMI" : "units") : "units";

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
      unit={displayUnit}
      color={config.color}
    />
  );
}
