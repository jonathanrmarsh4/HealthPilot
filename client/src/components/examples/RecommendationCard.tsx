import { RecommendationCard } from "../RecommendationCard";
import { Apple, Dumbbell, AlertCircle } from "lucide-react";

export default function RecommendationCardExample() {
  return (
    <div className="grid gap-6 p-6">
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
        title="Elevated Blood Glucose Levels"
        description="Recent readings show above-optimal fasting glucose. Consider dietary adjustments."
        category="Biomarker"
        priority="high"
        icon={AlertCircle}
        details="Your fasting blood glucose has been trending upward. Consider reducing refined carbohydrates and increasing fiber intake. Consult with your healthcare provider if levels remain elevated."
        actionLabel="Schedule Consultation"
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
  );
}
