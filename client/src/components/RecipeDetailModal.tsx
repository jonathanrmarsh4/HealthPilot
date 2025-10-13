import { useState, useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Flame, Beef, Wheat, Droplet, ChefHat, List, Minus, Plus, Users } from "lucide-react";
import type { MealPlan } from "@shared/schema";

interface RecipeDetailModalProps {
  meal: MealPlan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailModal({ meal, open, onOpenChange }: RecipeDetailModalProps) {
  const [servings, setServings] = useState(1);

  // Reset servings when meal changes
  useEffect(() => {
    if (meal) {
      setServings(meal.servings || 1);
    }
  }, [meal]);

  if (!meal) return null;

  // Calculate scaling factor for ingredients
  const originalServings = meal.servings || 1;
  const scaleFactor = servings / originalServings;

  // Function to scale ingredient quantities
  const scaleIngredient = (ingredient: string): string => {
    // Skip scaling for range quantities like "1-2 cloves" or "2-3 pieces"
    if (/^\d+\s*-\s*\d+/.test(ingredient)) {
      return ingredient;
    }
    
    // Match patterns including:
    // - "1 cup oats", "200g chicken" (with/without space before unit)
    // - "1/2 tsp salt", "0.5 tbsp oil" (fractions and decimals)
    // - "1 1/2 cups flour" (mixed fractions)
    
    // Try mixed fraction pattern first: "1 1/2 cups flour"
    const mixedPattern = /^(\d+)\s+(\d+)\/(\d+)\s*([a-zA-Z]+)?\s*(.+)$/;
    const mixedMatch = ingredient.match(mixedPattern);
    
    if (mixedMatch) {
      const [, whole, numerator, denominator, unit, rest] = mixedMatch;
      const numericValue = parseInt(whole) + (parseInt(numerator) / parseInt(denominator));
      const scaledValue = numericValue * scaleFactor;
      const formattedValue = formatScaledValue(scaledValue);
      
      if (unit) {
        return `${formattedValue} ${unit} ${rest}`;
      } else {
        return `${formattedValue} ${rest}`;
      }
    }
    
    // Standard pattern: number (fraction or decimal) + optional space + optional unit + rest
    const quantityPattern = /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*([a-zA-Z]+)?\s*(.+)$/;
    const match = ingredient.match(quantityPattern);
    
    if (match) {
      const [, quantity, unit, rest] = match;
      
      // Handle fractions (e.g., "1/2")
      let numericValue: number;
      if (quantity.includes('/')) {
        const [numerator, denominator] = quantity.split('/').map(Number);
        numericValue = numerator / denominator;
      } else {
        numericValue = parseFloat(quantity);
      }
      
      const scaledValue = numericValue * scaleFactor;
      const formattedValue = formatScaledValue(scaledValue);
      
      // Reconstruct the ingredient with scaled quantity
      if (unit) {
        return `${formattedValue}${unit.match(/^[a-zA-Z]+$/) ? ' ' + unit : unit} ${rest}`;
      } else {
        return `${formattedValue} ${rest}`;
      }
    }
    
    // If no quantity match, return original
    return ingredient;
  };
  
  // Format scaled values with better precision
  const formatScaledValue = (value: number): string => {
    // Whole numbers - no decimal
    if (value % 1 === 0) {
      return value.toString();
    }
    
    // Values less than 1 - try to represent as fraction
    if (value < 1) {
      // Common fractions
      const fractions: [number, string][] = [
        [1/4, '1/4'], [1/3, '1/3'], [1/2, '1/2'], 
        [2/3, '2/3'], [3/4, '3/4']
      ];
      
      for (const [frac, str] of fractions) {
        if (Math.abs(value - frac) < 0.01) {
          return str;
        }
      }
      
      // Otherwise use 2 decimal precision
      return value.toFixed(2);
    }
    
    // Values >= 1 - use 2 decimal precision to preserve accuracy
    return value.toFixed(2);
  };

  const handleServingsDecrease = () => {
    if (servings > 1) {
      setServings(servings - 1);
    }
  };

  const handleServingsIncrease = () => {
    if (servings < 20) { // Max 20 servings
      setServings(servings + 1);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent 
        className="max-h-[90vh] overflow-y-auto"
        data-testid="drawer-recipe-detail"
      >
        <div className="mx-auto w-full max-w-2xl">
          {/* Meal Photo */}
          {meal.imageUrl && (
            <div className="w-full h-48 sm:h-64 overflow-hidden rounded-t-lg">
              <img 
                src={meal.imageUrl} 
                alt={meal.name}
                className="w-full h-full object-cover"
                data-testid="img-meal-photo"
              />
            </div>
          )}

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
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm" data-testid="text-prep-time">
                  {meal.prepTime} minutes
                </span>
              </div>
              
              {/* Servings Selector */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Servings:</span>
                </div>
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleServingsDecrease}
                    disabled={servings <= 1}
                    data-testid="button-decrease-servings"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="text-sm font-medium min-w-[2rem] text-center" data-testid="text-current-servings">
                    {servings}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleServingsIncrease}
                    disabled={servings >= 20}
                    data-testid="button-increase-servings"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
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

            {/* Ingredients List */}
            {meal.ingredients && meal.ingredients.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <List className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Ingredients</h3>
                  {servings !== originalServings && (
                    <Badge variant="secondary" className="text-xs">
                      Scaled for {servings} {servings === 1 ? 'serving' : 'servings'}
                    </Badge>
                  )}
                </div>
                <ul className="space-y-2 bg-muted/30 p-4 rounded-lg" data-testid="list-ingredients">
                  {meal.ingredients.map((ingredient, index) => (
                    <li 
                      key={index} 
                      className="text-sm flex items-start gap-2"
                      data-testid={`text-ingredient-${index}`}
                    >
                      <span className="text-primary mt-1">•</span>
                      <span>{scaleIngredient(ingredient)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Detailed Recipe Instructions */}
            {meal.detailedRecipe && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ChefHat className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-semibold">Instructions</h3>
                </div>
                <div 
                  className="text-sm leading-relaxed bg-muted/30 p-4 rounded-lg whitespace-pre-line"
                  data-testid="text-detailed-recipe"
                >
                  {meal.detailedRecipe}
                </div>
              </div>
            )}

            {/* Fallback to simple recipe if no detailed recipe */}
            {!meal.detailedRecipe && meal.recipe && (
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
