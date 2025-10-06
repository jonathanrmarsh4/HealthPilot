import { RecommendationCard } from "@/components/RecommendationCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Apple, Dumbbell, AlertCircle, TrendingUp, Brain } from "lucide-react";

export default function AIInsights() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">AI Insights</h1>
        <p className="text-muted-foreground mt-2">
          Personalized health recommendations powered by artificial intelligence
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Analysis Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Health Records</span>
              <Badge className="bg-chart-4 text-white">3 Analyzed</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Biomarkers</span>
              <Badge className="bg-chart-4 text-white">12 Tracked</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recommendations</span>
              <Badge className="bg-chart-5 text-white">6 Active</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-4" />
              Health Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-5xl font-bold tracking-tight">82</div>
              <p className="text-sm text-muted-foreground">
                Above average health score based on your metrics
              </p>
              <div className="flex gap-2 mt-4">
                <Badge className="bg-chart-4/10 text-chart-4">+5 this month</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Your AI assistant has reviewed your latest health data and identified
              key areas for improvement in nutrition and exercise patterns.
            </p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Personalized Recommendations</h2>
        <div className="grid gap-6">
          <RecommendationCard
            title="Elevated Blood Glucose Levels"
            description="Recent readings show above-optimal fasting glucose. Consider dietary adjustments."
            category="Biomarker"
            priority="high"
            icon={AlertCircle}
            details="Your fasting blood glucose has been trending upward over the past week, averaging 115 mg/dL. The AI analysis suggests this may be related to increased carbohydrate intake in the evenings. Consider reducing refined carbohydrates and increasing fiber intake. Consult with your healthcare provider if levels remain elevated."
            actionLabel="Schedule Consultation"
          />
          <RecommendationCard
            title="Increase Protein Intake"
            description="Your recent biomarkers suggest you may benefit from higher protein consumption"
            category="Nutrition"
            priority="medium"
            icon={Apple}
            details="Based on your muscle mass, activity level, and recent lab work, the AI recommends aiming for 0.8-1g of protein per pound of body weight (approximately 140-172g daily). Your current average is 95g. Consider adding lean meats, fish, eggs, or plant-based proteins to each meal."
            actionLabel="View Meal Plan"
          />
          <RecommendationCard
            title="Add Resistance Training"
            description="Build muscle mass and improve metabolic health with strength training"
            category="Exercise"
            priority="medium"
            icon={Dumbbell}
            details="Your cardiovascular fitness is excellent, but incorporating 2-3 resistance training sessions per week could help improve insulin sensitivity, bone density, and overall metabolic health. The AI has generated a beginner-friendly program tailored to your schedule."
            actionLabel="View Program"
          />
          <RecommendationCard
            title="Optimize Sleep Schedule"
            description="Inconsistent sleep patterns detected in your recent data"
            category="Lifestyle"
            priority="low"
            icon={Brain}
            details="Your sleep duration varies significantly (5.5-8.5 hours). Consistent sleep of 7-9 hours can improve biomarker recovery and overall health outcomes."
            actionLabel="View Sleep Tips"
          />
        </div>
      </div>
    </div>
  );
}
