import { HealthMetricCard } from "../HealthMetricCard";
import { Heart, Activity, Scale } from "lucide-react";

export default function HealthMetricCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-3 p-6">
      <HealthMetricCard
        title="Heart Rate"
        value="68"
        unit="bpm"
        trend={-2.5}
        status="optimal"
        icon={Heart}
        lastUpdated="2 hours ago"
      />
      <HealthMetricCard
        title="Blood Glucose"
        value="115"
        unit="mg/dL"
        trend={8}
        status="warning"
        icon={Activity}
        lastUpdated="1 day ago"
      />
      <HealthMetricCard
        title="Weight"
        value="172"
        unit="lbs"
        trend={-1.2}
        status="optimal"
        icon={Scale}
        lastUpdated="Today"
      />
    </div>
  );
}
