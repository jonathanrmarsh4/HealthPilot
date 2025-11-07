import { WeeklyMealCalendar } from "@/components/WeeklyMealCalendar";
import { RecipeDetailModal } from "@/components/RecipeDetailModal";
import { MealSwipeView } from "@/components/MealSwipeView";
import { MealCatalogBrowser } from "@/components/MealCatalogBrowser";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Lock, LayoutGrid, Flame } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import type { MealPlan } from "@shared/schema";
import { useState } from "react";
import { format, min, max, parseISO } from "date-fns";
import { isBaselineMode } from "@shared/config/flags";

type ViewMode = "calendar" | "swipe";

export default function MealPlans() {
  // All hooks must be called before any conditional returns
  const { toast } = useToast();
  const [selectedMeal, setSelectedMeal] = useState<MealPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradePromptOpen, setUpgradePromptOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  
  const { data: meals, isLoading } = useQuery<MealPlan[]>({
    queryKey: ["/api/meal-plans"],
  });

  const { data: user } = useQuery<{ subscriptionTier: string; role?: string }>({
    queryKey: ["/api/auth/user"],
  });

  // Check if baseline mode is enabled (after all hooks)
  const baselineEnabled = isBaselineMode();
  
  // In baseline mode, show catalog browser instead of AI meal plans
  if (baselineEnabled) {
    return <MealCatalogBrowser />;
  }

  // Calculate date range for scheduled meals
  const scheduledMeals = meals?.filter(m => m.scheduledDate) || [];
  const dateRange = scheduledMeals.length > 0 ? (() => {
    const dates = scheduledMeals.map(m => 
      typeof m.scheduledDate === 'string' ? parseISO(m.scheduledDate) : new Date(m.scheduledDate!)
    );
    const minDate = min(dates);
    const maxDate = max(dates);
    return `${format(minDate, 'MMM d')} - ${format(maxDate, 'MMM d, yyyy')}`;
  })() : null;

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meal-plans/generate");
      if (!res.ok) {
        const errorData = await res.json();
        // Include status code in error for upgrade prompt handling
        const error: any = new Error(errorData.message || errorData.error || "Failed to generate meal plan");
        error.status = res.status;
        throw error;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({
        title: "Success",
        description: "New meal plan generated successfully!",
      });
    },
    onError: (error: any) => {
      // If premium tier required, show upgrade prompt
      if (error.status === 402 || error.status === 403) {
        setUpgradePromptOpen(true);
        return;
      }
      
      // Otherwise show error toast
      toast({
        title: "Error",
        description: error.message || "Failed to generate meal plan. Please ensure the meal library has nutrition data.",
        variant: "destructive",
      });
    },
  });

  const isPremium = user?.subscriptionTier === "premium" || user?.subscriptionTier === "enterprise" || user?.role === "admin";

  const handleGenerateClick = () => {
    // Always try the mutation - let backend handle premium check
    generateMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold tracking-tight">Meal Plans</h1>
            {!isPremium && (
              <Badge variant="outline" data-testid="badge-premium-feature">
                <Lock className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            {dateRange 
              ? `Your weekly meal plan: ${dateRange}`
              : "AI-generated meal suggestions tailored to your health goals"
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {meals && meals.length > 0 && (
            <div className="flex items-center gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                data-testid="button-view-calendar"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button
                variant={viewMode === "swipe" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("swipe")}
                data-testid="button-view-swipe"
              >
                <Flame className="h-4 w-4 mr-2" />
                Swipe
              </Button>
            </div>
          )}
          <Button 
            onClick={handleGenerateClick} 
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
                Generate
              </>
            )}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : meals && meals.length > 0 ? (
        viewMode === "calendar" ? (
          <WeeklyMealCalendar 
            meals={meals} 
            onMealClick={(meal) => {
              setSelectedMeal(meal);
              setModalOpen(true);
            }}
          />
        ) : (
          <MealSwipeView
            meals={meals}
            onMealTap={(meal) => {
              setSelectedMeal(meal);
              setModalOpen(true);
            }}
            onBackToCalendar={() => setViewMode("calendar")}
          />
        )
      ) : (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            No meal plans available. Click "Generate" to create AI-powered meal suggestions.
          </CardContent>
        </Card>
      )}

      {/* Recipe Detail Modal */}
      <RecipeDetailModal 
        meal={selectedMeal}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />

      {/* Upgrade Prompt */}
      <UpgradePrompt 
        open={upgradePromptOpen}
        onOpenChange={setUpgradePromptOpen}
        feature="mealPlans"
      />
    </div>
  );
}
