import { DataInputForm } from "@/components/DataInputForm";
import { BiomarkerChart } from "@/components/BiomarkerChart";

const cholesterolData = [
  { date: "Jan", value: 185, target: 200 },
  { date: "Feb", value: 180, target: 200 },
  { date: "Mar", value: 175, target: 200 },
  { date: "Apr", value: 178, target: 200 },
  { date: "May", value: 172, target: 200 },
  { date: "Jun", value: 170, target: 200 },
];

const bloodPressureData = [
  { date: "Week 1", value: 125 },
  { date: "Week 2", value: 122 },
  { date: "Week 3", value: 120 },
  { date: "Week 4", value: 118 },
];

const heartRateData = [
  { date: "Mon", value: 68 },
  { date: "Tue", value: 65 },
  { date: "Wed", value: 67 },
  { date: "Thu", value: 66 },
  { date: "Fri", value: 64 },
  { date: "Sat", value: 62 },
  { date: "Sun", value: 63 },
];

export default function Biomarkers() {
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
        <BiomarkerChart
          title="Resting Heart Rate"
          description="7-day average"
          data={heartRateData}
          unit="bpm"
          color="hsl(var(--chart-4))"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <BiomarkerChart
          title="Total Cholesterol"
          description="6-month trend"
          data={cholesterolData}
          unit="mg/dL"
          color="hsl(var(--chart-1))"
        />
        <BiomarkerChart
          title="Blood Pressure (Systolic)"
          description="4-week average"
          data={bloodPressureData}
          unit="mmHg"
          color="hsl(var(--chart-3))"
        />
      </div>
    </div>
  );
}
