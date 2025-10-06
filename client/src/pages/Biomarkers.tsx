import { DataInputForm } from "@/components/DataInputForm";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface ChartDataPoint {
  date: string;
  value: number;
  target?: number;
}

export default function Biomarkers() {
  const { data: heartRateData, isLoading: heartRateLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/heart-rate?days=7"],
  });

  const { data: cholesterolData, isLoading: cholesterolLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/cholesterol?days=180"],
  });

  const { data: bloodPressureData, isLoading: bloodPressureLoading } = useQuery<ChartDataPoint[]>({
    queryKey: ["/api/biomarkers/chart/blood-pressure?days=28"],
  });

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
        {heartRateLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : heartRateData && heartRateData.length > 0 ? (
          <BiomarkerChart
            title="Resting Heart Rate"
            description="7-day average"
            data={heartRateData}
            unit="bpm"
            color="hsl(var(--chart-4))"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No heart rate data available
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {cholesterolLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : cholesterolData && cholesterolData.length > 0 ? (
          <BiomarkerChart
            title="Total Cholesterol"
            description="6-month trend"
            data={cholesterolData}
            unit="mg/dL"
            color="hsl(var(--chart-1))"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No cholesterol data available
            </CardContent>
          </Card>
        )}
        
        {bloodPressureLoading ? (
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ) : bloodPressureData && bloodPressureData.length > 0 ? (
          <BiomarkerChart
            title="Blood Pressure (Systolic)"
            description="4-week average"
            data={bloodPressureData}
            unit="mmHg"
            color="hsl(var(--chart-3))"
          />
        ) : (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No blood pressure data available
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
