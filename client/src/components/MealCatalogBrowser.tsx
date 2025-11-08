import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Coffee, Sun, Moon, Cookie } from "lucide-react";
import { RecipeDetailModal } from "./RecipeDetailModal";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const ITEMS_PER_PAGE = 24;

interface MealItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  dishTypes?: string[];
  cuisines?: string[];
  mealType: string;
  [key: string]: unknown;
}

interface MealCatalogResponse {
  items: MealItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const MEAL_TYPE_CONFIG = {
  breakfast: { label: "Breakfast", icon: Coffee },
  lunch: { label: "Lunch", icon: Sun },
  dinner: { label: "Dinner", icon: Moon },
  snack: { label: "Snacks", icon: Cookie },
};

export function MealCatalogBrowser() {
  const [selectedMealType, setSelectedMealType] = useState<MealType>("breakfast");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedMeal, setSelectedMeal] = useState<MealItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch meals for the selected category and page
  const { data, isLoading } = useQuery<MealCatalogResponse>({
    queryKey: ["/api/meals", selectedMealType, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        mealType: selectedMealType,
        page: String(currentPage),
        limit: String(ITEMS_PER_PAGE),
      });
      const response = await fetch(`/api/meals?${params.toString()}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch meals: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const handleTabChange = (newMealType: string) => {
    setSelectedMealType(newMealType as MealType);
    setCurrentPage(0); // Reset to first page when changing categories
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (data && currentPage < data.totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const meals = data?.items || [];
  const totalPages = data?.totalPages || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold tracking-tight mb-2">Browse Meals</h1>
        <p className="text-muted-foreground">
          Explore our curated meal catalog by category
        </p>
      </div>

      <Tabs value={selectedMealType} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-4" data-testid="tabs-meal-types">
          {Object.entries(MEAL_TYPE_CONFIG).map(([key, config]) => {
            const Icon = config.icon;
            return (
              <TabsTrigger 
                key={key} 
                value={key}
                data-testid={`tab-${key}`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {Object.keys(MEAL_TYPE_CONFIG).map((mealType) => (
          <TabsContent key={mealType} value={mealType} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-40 w-full mb-3" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-3 w-1/2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : meals.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {meals.map((meal, index) => (
                    <Card
                      key={meal.id || index}
                      className="cursor-pointer hover-elevate"
                      onClick={() => {
                        setSelectedMeal(meal);
                        setModalOpen(true);
                      }}
                      data-testid={`card-meal-${meal.id}`}
                    >
                      <CardHeader className="p-0">
                        {meal.imageUrl ? (
                          <img
                            src={meal.imageUrl}
                            alt={meal.title}
                            className="w-full h-40 object-cover rounded-t-lg"
                          />
                        ) : (
                          <div className="w-full h-40 bg-muted flex items-center justify-center rounded-t-lg">
                            <span className="text-muted-foreground">No image</span>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="p-4">
                        <CardTitle className="text-base mb-2 line-clamp-2">
                          {meal.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {meal.calories && (
                            <Badge variant="secondary" data-testid={`badge-calories-${meal.id}`}>
                              {meal.calories} cal
                            </Badge>
                          )}
                          {meal.readyInMinutes && (
                            <Badge variant="outline">
                              {meal.readyInMinutes} min
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 0}
                      data-testid="button-previous-page"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground" data-testid="text-page-info">
                      Page {currentPage + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  No meals found for this category.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Recipe Detail Modal */}
      <RecipeDetailModal
        meal={selectedMeal}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
