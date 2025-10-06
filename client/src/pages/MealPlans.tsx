import { MealPlanCard } from "@/components/MealPlanCard";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import type { MealPlan } from "@shared/schema";

export default function MealPlans() {
  const { toast } = useToast();
  
  const { data: meals, isLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meal-plans/generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({
        title: "Success",
        description: "New meal plan generated successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate meal plan",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Meal Plans</h1>
          <p className="text-muted-foreground mt-2">
            AI-generated meal suggestions tailored to your health goals
          </p>
        </div>
        <Button 
          onClick={() => generateMutation.mutate()} 
          disabled={generateMutation.isPending}
          data-testid="button-generate-plan"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate New Plan
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meals && meals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <MealPlanCard 
              key={meal.id} 
              mealType={meal.mealType as "Breakfast" | "Lunch" | "Dinner" | "Snack"}
              name={meal.name}
              description={meal.description || ""}
              calories={meal.calories}
              protein={meal.protein}
              carbs={meal.carbs}
              fat={meal.fat}
              prepTime={meal.prepTime}
              tags={meal.tags || []}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No meal plans available. Click "Generate New Plan" to create AI-powered meal suggestions.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
