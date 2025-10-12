import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Clock, Flame, Beef, Wheat, Droplet } from "lucide-react";
import type { MealPlan } from "@shared/schema";

interface RecipeDetailModalProps {
  meal: MealPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailModal({ meal, open, onOpenChange }: RecipeDetailModalProps) {
  if (!meal) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="max-h-[90vh] overflow-y-auto"
        data-testid="drawer-recipe-detail"
      >
        <div className="mx-auto w-full max-w-2xl">
          <DrawerHeader>
            <DrawerTitle className="text-2xl" data-testid="text-meal-name">
              {meal.name}
            </DrawerTitle>
            <DrawerDescription data-testid="text-meal-description">
              {meal.description}
            </DrawerDescription>
          </DrawerHeader>

          <div className="p-6 space-y-6">
            {/* Macros Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Flame className="w-5 h-5 text-orange-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-calories">{meal.calories}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Beef className="w-5 h-5 text-red-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-protein">{meal.protein}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Wheat className="w-5 h-5 text-amber-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-carbs">{meal.carbs}g</p>
                  <p className="text-xs text-muted-foreground">Carbs</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Droplet className="w-5 h-5 text-yellow-500" />
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="text-fat">{meal.fat}g</p>
                  <p className="text-xs text-muted-foreground">Fat</p>
                </div>
              </div>
            </div>

            {/* Prep Time & Servings */}
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-prep-time">
                  {meal.prepTime} minutes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Servings:</span>
                <span className="text-sm font-medium" data-testid="text-servings">
                  {meal.servings}
                </span>
              </div>
            </div>

            {/* Tags */}
            {meal.tags && meal.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {meal.tags.map((tag, index) => (
                    <Badge 
                      key={index} 
                      variant="secondary"
                      data-testid={`badge-tag-${index}`}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Instructions */}
            {meal.recipe && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Recipe</h3>
                <div 
                  className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg"
                  data-testid="text-recipe"
                >
                  {meal.recipe}
                </div>
              </div>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
