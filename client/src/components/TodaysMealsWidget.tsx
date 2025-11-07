import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Apple, Clock, Flame, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

interface MealPlan {
  id: string;
  name: string;
  description: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: number;
  recipe: string;
  tags: string[];
}

const MEAL_ORDER = ["Breakfast", "Lunch", "Dinner", "Snack"];

export function TodaysMealsWidget() {
  const { data: meals, isLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
  });

  if (isLoading) {
    return (
      <Card data-testid="widget-todays-meals">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Today&apos;s Meals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!meals || meals.length === 0) {
    return (
      <Card data-testid="widget-todays-meals">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Today&apos;s Meals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            No meal plan yet. Get personalized nutrition recommendations.
          </p>
          <Link href="/chat">
            <Button variant="outline" size="sm" className="w-full" data-testid="button-create-meal-plan">
              Create Meal Plan →
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Group meals by type and pick one from each
  const mealsByType = meals.reduce((acc, meal) => {
    const type = meal.mealType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(meal);
    return acc;
  }, {} as Record<string, MealPlan[]>);

  // Get one meal from each type in order
  const todaysMeals = MEAL_ORDER
    .map(type => mealsByType[type]?.[0])
    .filter(Boolean) as MealPlan[];

  // If no meals match the standard types, just show first 3
  const displayMeals = todaysMeals.length > 0 ? todaysMeals.slice(0, 3) : meals.slice(0, 3);

  const totalCalories = displayMeals.reduce((sum, meal) => sum + meal.calories, 0);

  const getMealIcon = (type: string) => {
    const normalizedType = type.toLowerCase();
    if (normalizedType.includes('breakfast')) return '🌅';
    if (normalizedType.includes('lunch')) return '☀️';
    if (normalizedType.includes('dinner')) return '🌙';
    return '🍽️';
  };

  return (
    <Card data-testid="widget-todays-meals">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Apple className="h-5 w-5 text-primary" />
            Today&apos;s Meals
          </div>
          <Badge variant="secondary" className="text-xs" data-testid="badge-total-calories">
            {totalCalories} cal
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {displayMeals.map((meal, idx) => (
            <div key={meal.id} className="flex items-start gap-3 p-3 rounded-md hover-elevate">
              <span className="text-2xl mt-0.5">{getMealIcon(meal.mealType)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium text-sm truncate" data-testid={`text-meal-name-${idx}`}>
                    {meal.name}
                  </h4>
                  <Badge variant="outline" className="text-xs shrink-0" data-testid={`badge-meal-type-${idx}`}>
                    {meal.mealType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Flame className="h-3 w-3" />
                    <span data-testid={`text-meal-calories-${idx}`}>{meal.calories} cal</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span data-testid={`text-meal-preptime-${idx}`}>{meal.prepTime} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span data-testid={`text-meal-macros-${idx}`}>
                    P: {meal.protein}g · C: {meal.carbs}g · F: {meal.fat}g
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/meals">
          <Button variant="outline" size="sm" className="w-full" data-testid="button-view-all-meals">
            View All Meals <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
