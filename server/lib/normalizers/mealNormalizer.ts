/**
 * Meal Data Normalizer
 * 
 * Normalizes meal data from database to ensure consistent format for frontend.
 * Handles various ingredient formats from JSONB storage.
 */

type IngredientInput = 
  | string 
  | { name: string; amount?: string; original?: string }
  | null 
  | undefined;

/**
 * Normalize ingredients to string array format
 * Handles both string[] and object[] formats from JSONB
 */
export function normalizeIngredients(ingredients: unknown): string[] {
  if (!ingredients) {
    return [];
  }

  // Already an array
  if (Array.isArray(ingredients)) {
    return ingredients.map(ing => {
      // String format: return as-is
      if (typeof ing === 'string') {
        return ing;
      }
      
      // Object format: construct string from parts
      if (typeof ing === 'object' && ing !== null) {
        const obj = ing as any;
        
        // Try 'original' field first (Spoonacular format)
        if (obj.original && typeof obj.original === 'string') {
          return obj.original;
        }
        
        // Construct from name + amount
        if (obj.name) {
          if (obj.amount) {
            return `${obj.amount} ${obj.name}`;
          }
          return obj.name;
        }
      }
      
      // Fallback: stringify
      return String(ing);
    }).filter(Boolean);
  }

  // String blob (newline or comma separated)
  if (typeof ingredients === 'string') {
    return ingredients
      .split(/\r?\n|,/g)
      .map(s => s.trim())
      .filter(Boolean);
  }

  // Single object
  if (typeof ingredients === 'object') {
    const obj = ingredients as any;
    if (obj.original) return [obj.original];
    if (obj.name) {
      return obj.amount ? [`${obj.amount} ${obj.name}`] : [obj.name];
    }
  }

  // Unknown format: return empty array
  console.warn('[MealNormalizer] Unknown ingredients format:', typeof ingredients);
  return [];
}

/**
 * Normalize a single meal object
 */
export function normalizeMeal(rawMeal: any): any {
  if (!rawMeal) return rawMeal;

  return {
    ...rawMeal,
    // Normalize ingredients to string array
    ingredients: normalizeIngredients(rawMeal.ingredients),
    // Ensure imageUrl is present (might be named 'image' in some records)
    imageUrl: rawMeal.imageUrl || rawMeal.image || null,
  };
}

/**
 * Normalize an array of meals
 */
export function normalizeMeals(rawMeals: any[]): any[] {
  return rawMeals.map(normalizeMeal);
}
