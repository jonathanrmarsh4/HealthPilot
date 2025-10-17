import { useState } from "react";
import { SwipeableMealCard } from "./SwipeableMealCard";
import { Button } from "@/components/ui/button";
import { ChevronLeft, RotateCcw, Sparkles } from "lucide-react";
import type { MealPlan } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MealSwipeViewProps {
  meals: MealPlan[];
  onMealTap: (meal: MealPlan) => void;
  onBackToCalendar: () => void;
}

export function MealSwipeView({ meals, onMealTap, onBackToCalendar }: MealSwipeViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedMeals, setSwipedMeals] = useState<string[]>([]);
  const { toast } = useToast();

  const feedbackMutation = useMutation({
    mutationFn: async (feedback: {
      mealPlanId: string;
      feedback: string;
      swipeDirection: string;
      mealName: string;
      mealType: string;
      cuisines?: string[];
      dishTypes?: string[];
      calories: number;
    }) => {
      const res = await apiRequest("POST", "/api/meal-feedback", feedback);
      return res.json();
    },
    onError: (error: Error) => {
      console.error("Failed to save feedback:", error);
    },
  });

  const handleSwipeLeft = (meal: MealPlan) => {
    // Left swipe = Skip (good but not now)
    feedbackMutation.mutate({
      mealPlanId: meal.id,
      feedback: "skip",
      swipeDirection: "left",
      mealName: meal.name,
      mealType: meal.mealType,
      cuisines: meal.cuisines || [],
      dishTypes: meal.dishTypes || [],
      calories: meal.calories,
    });

    setSwipedMeals([...swipedMeals, meal.id]);
    setCurrentIndex(currentIndex + 1);
  };

  const handleSwipeRight = (meal: MealPlan) => {
    // Right swipe = Dislike (bad meal)
    feedbackMutation.mutate({
      mealPlanId: meal.id,
      feedback: "dislike",
      swipeDirection: "right",
      mealName: meal.name,
      mealType: meal.mealType,
      cuisines: meal.cuisines || [],
      dishTypes: meal.dishTypes || [],
      calories: meal.calories,
    });

    setSwipedMeals([...swipedMeals, meal.id]);
    setCurrentIndex(currentIndex + 1);
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setSwipedMeals(swipedMeals.slice(0, -1));
    }
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setSwipedMeals([]);
  };

  const visibleMeals = meals.slice(currentIndex, currentIndex + 3);
  const hasMoreMeals = currentIndex < meals.length;
  const canUndo = currentIndex > 0;

  if (!hasMoreMeals) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6" data-testid="container-no-meals">
        <div className="text-center space-y-2">
          <Sparkles className="h-16 w-16 mx-auto text-primary" />
          <h3 className="text-2xl font-semibold" data-testid="text-all-done-title">All done!</h3>
          <p className="text-muted-foreground max-w-md" data-testid="text-all-done-message">
            You've reviewed all available meals. We'll use your feedback to suggest better meals next time!
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleReset} variant="outline" data-testid="button-review-again">
            <RotateCcw className="mr-2 h-4 w-4" />
            Review Again
          </Button>
          <Button onClick={onBackToCalendar} data-testid="button-back-calendar">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Calendar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBackToCalendar}
          data-testid="button-back-to-calendar"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Calendar
        </Button>
        <div className="text-sm text-muted-foreground" data-testid="text-meal-counter">
          {currentIndex + 1} / {meals.length}
        </div>
        {canUndo && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            data-testid="button-undo"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Undo
          </Button>
        )}
      </div>

      {/* Swipe Card Stack */}
      <div className="relative h-[600px] max-w-md mx-auto" data-testid="container-swipe-stack">
        {visibleMeals.map((meal, index) => (
          <SwipeableMealCard
            key={meal.id}
            meal={meal}
            onSwipeLeft={handleSwipeLeft}
            onSwipeRight={handleSwipeRight}
            onTap={onMealTap}
            isTopCard={index === 0}
            stackPosition={index}
          />
        ))}
      </div>

      {/* Action Hints */}
      <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="text-green-500">←</span>
          </div>
          <span>Skip</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="text-red-500">→</span>
          </div>
          <span>Dislike</span>
        </div>
      </div>
    </div>
  );
}
