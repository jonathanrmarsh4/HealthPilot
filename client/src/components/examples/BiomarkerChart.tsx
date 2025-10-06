import { BiomarkerChart } from "../BiomarkerChart";

const glucoseData = [
  { date: "Mon", value: 95, target: 100 },
  { date: "Tue", value: 102, target: 100 },
  { date: "Wed", value: 98, target: 100 },
  { date: "Thu", value: 105, target: 100 },
  { date: "Fri", value: 92, target: 100 },
  { date: "Sat", value: 110, target: 100 },
  { date: "Sun", value: 115, target: 100 },
];

export default function BiomarkerChartExample() {
  return (
    <div className="p-6">
      <BiomarkerChart
        title="Blood Glucose Trend"
        description="7-day fasting glucose levels"
        data={glucoseData}
        unit="mg/dL"
        color="hsl(var(--chart-1))"
      />
    </div>
  );
}
