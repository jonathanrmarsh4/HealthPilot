import { HealthMetricCard } from "@/components/HealthMetricCard";
import { BiomarkerChart } from "@/components/BiomarkerChart";
import { RecommendationCard } from "@/components/RecommendationCard";
import { QuickStats } from "@/components/QuickStats";
import { Heart, Activity, Scale, Droplet, TrendingUp, Zap, Apple, AlertCircle, Dumbbell } from "lucide-react";

export default function Dashboard() {
  const glucoseData = [
    { date: "Mon", value: 95, target: 100 },
    { date: "Tue", value: 102, target: 100 },
    { date: "Wed", value: 98, target: 100 },
    { date: "Thu", value: 105, target: 100 },
    { date: "Fri", value: 92, target: 100 },
    { date: "Sat", value: 110, target: 100 },
    { date: "Sun", value: 115, target: 100 },
  ];

  const weightData = [
    { date: "Week 1", value: 175 },
    { date: "Week 2", value: 174 },
    { date: "Week 3", value: 173.5 },
    { date: "Week 4", value: 172 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Your personalized health insights and metrics
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
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

      <div className="grid gap-6 md:grid-cols-3">
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
          icon={Droplet}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <BiomarkerChart
          title="Blood Glucose Trend"
          description="7-day fasting glucose levels"
          data={glucoseData}
          unit="mg/dL"
          color="hsl(var(--chart-1))"
        />
        <BiomarkerChart
          title="Weight Progress"
          description="4-week weight tracking"
          data={weightData}
          unit="lbs"
          color="hsl(var(--chart-2))"
        />
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6">AI Recommendations</h2>
        <div className="grid gap-6">
          <RecommendationCard
            title="Elevated Blood Glucose Levels"
            description="Recent readings show above-optimal fasting glucose. Consider dietary adjustments."
            category="Biomarker"
            priority="high"
            icon={AlertCircle}
            details="Your fasting blood glucose has been trending upward over the past week. Consider reducing refined carbohydrates and increasing fiber intake. Consult with your healthcare provider if levels remain elevated."
            actionLabel="Schedule Consultation"
          />
          <RecommendationCard
            title="Increase Protein Intake"
            description="Your recent biomarkers suggest you may benefit from higher protein consumption"
            category="Nutrition"
            priority="medium"
            icon={Apple}
            details="Based on your muscle mass and activity level, aim for 0.8-1g of protein per pound of body weight. Consider adding lean meats, fish, eggs, or plant-based proteins to each meal."
            actionLabel="View Meal Plan"
          />
          <RecommendationCard
            title="Add Resistance Training"
            description="Build muscle mass and improve metabolic health with strength training"
            category="Exercise"
            priority="low"
            icon={Dumbbell}
            details="Incorporate 2-3 resistance training sessions per week. This can help improve insulin sensitivity and overall metabolic health."
            actionLabel="View Program"
          />
        </div>
      </div>
    </div>
  );
}
