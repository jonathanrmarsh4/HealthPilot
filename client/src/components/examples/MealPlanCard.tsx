import { MealPlanCard } from "../MealPlanCard";

export default function MealPlanCardExample() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 p-6">
      <MealPlanCard
        mealType="Breakfast"
        name="Greek Yogurt Power Bowl"
        description="High-protein breakfast with berries, almonds, and honey"
        calories={385}
        protein={28}
        carbs={42}
        fat={12}
        prepTime={10}
        tags={["High Protein", "Quick"]}
      />
      <MealPlanCard
        mealType="Lunch"
        name="Grilled Salmon Salad"
        description="Omega-3 rich salmon with mixed greens and quinoa"
        calories={520}
        protein={38}
        carbs={45}
        fat={18}
        prepTime={25}
        tags={["Heart Healthy"]}
      />
      <MealPlanCard
        mealType="Dinner"
        name="Chicken Stir-Fry"
        description="Lean chicken breast with colorful vegetables over brown rice"
        calories={485}
        protein={42}
        carbs={52}
        fat={10}
        prepTime={30}
        tags={["Low Fat"]}
      />
    </div>
  );
}
