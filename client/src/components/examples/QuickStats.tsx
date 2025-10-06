import { QuickStats } from "../QuickStats";
import { Activity, Heart, TrendingUp, Zap } from "lucide-react";

export default function QuickStatsExample() {
  return (
    <div className="grid gap-6 md:grid-cols-4 p-6">
      <QuickStats
        icon={Activity}
        label="Daily Steps"
        value="8,247"
        trend="+12%"
        trendDirection="up"
      />
      <QuickStats
        icon={Heart}
        label="Resting HR"
        value="62 bpm"
        trend="-3%"
        trendDirection="down"
      />
      <QuickStats
        icon={TrendingUp}
        label="Active Days"
        value="5/7"
        trend="71%"
      />
      <QuickStats
        icon={Zap}
        label="Calories"
        value="2,145"
        trend="+5%"
        trendDirection="up"
      />
    </div>
  );
}
