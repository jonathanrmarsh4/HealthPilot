import { MealPlanCard } from "@/components/MealPlanCard";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

const mockMeals = [
  {
    mealType: "Breakfast" as const,
    name: "Greek Yogurt Power Bowl",
    description: "High-protein breakfast with berries, almonds, and honey",
    calories: 385,
    protein: 28,
    carbs: 42,
    fat: 12,
    prepTime: 10,
    tags: ["High Protein", "Quick"],
  },
  {
    mealType: "Lunch" as const,
    name: "Grilled Salmon Salad",
    description: "Omega-3 rich salmon with mixed greens and quinoa",
    calories: 520,
    protein: 38,
    carbs: 45,
    fat: 18,
    prepTime: 25,
    tags: ["Heart Healthy"],
  },
  {
    mealType: "Dinner" as const,
    name: "Chicken Stir-Fry",
    description: "Lean chicken breast with colorful vegetables over brown rice",
    calories: 485,
    protein: 42,
    carbs: 52,
    fat: 10,
    prepTime: 30,
    tags: ["Low Fat"],
  },
  {
    mealType: "Snack" as const,
    name: "Apple with Almond Butter",
    description: "Sliced apple with natural almond butter",
    calories: 195,
    protein: 6,
    carbs: 24,
    fat: 9,
    prepTime: 5,
    tags: ["Quick", "Portable"],
  },
];

export default function MealPlans() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Meal Plans</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated meal suggestions tailored to your health goals
          </p>
        </div>
        <Button onClick={() => console.log("Generate new meal plan")} data-testid="button-generate-plan">
          <Sparkles className="mr-2 h-4 w-4" />
          Generate New Plan
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockMeals.map((meal, idx) => (
          <MealPlanCard key={idx} {...meal} />
        ))}
      </div>
    </div>
  );
}
