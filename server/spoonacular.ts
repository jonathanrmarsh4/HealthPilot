/**
 * Spoonacular API Service
 * Handles all interactions with the Spoonacular recipe API
 */

const SPOONACULAR_API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com';

interface SpoonacularRecipeSearchParams {
  query?: string;
  diet?: string; // vegetarian, vegan, ketogenic, etc.
  intolerances?: string; // comma-separated: dairy, gluten, etc.
  cuisine?: string; // italian, asian, mexican, etc.
  type?: string; // breakfast, lunch, dinner, snack, dessert
  maxReadyTime?: number;
  minProtein?: number;
  maxCalories?: number;
  minCalories?: number;
  number?: number; // results to return
  offset?: number;
  sort?: string; // popularity, healthiness, price, time, random
}

interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  healthScore: number;
  spoonacularScore: number;
  pricePerServing: number;
  cheap: boolean;
  creditsText: string;
  cuisines: string[];
  diets: string[];
  dishTypes: string[];
  gaps: string;
  occasions: string[];
  sustainable: boolean;
  vegan: boolean;
  vegetarian: boolean;
  veryHealthy: boolean;
  veryPopular: boolean;
  summary: string;
  extendedIngredients: Array<{
    id: number;
    aisle: string;
    image: string;
    name: string;
    amount: number;
    unit: string;
    originalString: string;
    metaInformation: string[];
  }>;
  analyzedInstructions: Array<{
    name: string;
    steps: Array<{
      number: number;
      step: string;
      ingredients: Array<{ id: number; name: string; image: string }>;
      equipment: Array<{ id: number; name: string; image: string }>;
      length?: { number: number; unit: string };
    }>;
  }>;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds: number;
    }>;
    caloricBreakdown: {
      percentProtein: number;
      percentFat: number;
      percentCarbs: number;
    };
  };
}

interface RecipeSearchResult {
  results: Array<{
    id: number;
    title: string;
    image: string;
    imageType: string;
  }>;
  offset: number;
  number: number;
  totalResults: number;
}

class SpoonacularService {
  private apiKey: string;

  constructor() {
    if (!SPOONACULAR_API_KEY) {
      throw new Error('SPOONACULAR_API_KEY environment variable is not set');
    }
    this.apiKey = SPOONACULAR_API_KEY;
  }

  /**
   * Search for recipes with various filters
   */
  async searchRecipes(params: SpoonacularRecipeSearchParams): Promise<RecipeSearchResult> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      addRecipeInformation: 'true',
      fillIngredients: 'true',
      number: (params.number || 10).toString(),
      offset: (params.offset || 0).toString(),
    });

    if (params.query) queryParams.append('query', params.query);
    if (params.diet) queryParams.append('diet', params.diet);
    if (params.intolerances) queryParams.append('intolerances', params.intolerances);
    if (params.cuisine) queryParams.append('cuisine', params.cuisine);
    if (params.type) queryParams.append('type', params.type);
    if (params.maxReadyTime) queryParams.append('maxReadyTime', params.maxReadyTime.toString());
    if (params.minProtein) queryParams.append('minProtein', params.minProtein.toString());
    if (params.maxCalories) queryParams.append('maxCalories', params.maxCalories.toString());
    if (params.minCalories) queryParams.append('minCalories', params.minCalories.toString());
    if (params.sort) queryParams.append('sort', params.sort);

    const response = await fetch(`${BASE_URL}/recipes/complexSearch?${queryParams}`);
    
    if (!response.ok) {
      // Handle payment required error
      if (response.status === 402) {
        throw new Error('SPOONACULAR_PAYMENT_REQUIRED');
      }
      // Handle quota exceeded
      if (response.status === 429) {
        throw new Error('SPOONACULAR_QUOTA_EXCEEDED');
      }
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get detailed information about a specific recipe by ID
   */
  async getRecipeDetails(recipeId: number, includeNutrition = true): Promise<SpoonacularRecipe> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      includeNutrition: includeNutrition.toString(),
    });

    const response = await fetch(`${BASE_URL}/recipes/${recipeId}/information?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get information for multiple recipes in a single API call
   */
  async getBulkRecipeInfo(recipeIds: number[], includeNutrition = true): Promise<SpoonacularRecipe[]> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      ids: recipeIds.join(','),
      includeNutrition: includeNutrition.toString(),
    });

    const response = await fetch(`${BASE_URL}/recipes/informationBulk?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get random recipes based on filters
   */
  async getRandomRecipes(params: {
    limitLicense?: boolean;
    tags?: string; // comma-separated
    number?: number;
  }): Promise<{ recipes: SpoonacularRecipe[] }> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      number: (params.number || 1).toString(),
    });

    if (params.limitLicense !== undefined) {
      queryParams.append('limitLicense', params.limitLicense.toString());
    }
    if (params.tags) {
      queryParams.append('tags', params.tags);
    }

    const response = await fetch(`${BASE_URL}/recipes/random?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get similar recipes to a given recipe
   */
  async getSimilarRecipes(recipeId: number, number = 5): Promise<Array<{
    id: number;
    title: string;
    imageType: string;
    readyInMinutes: number;
    servings: number;
    sourceUrl: string;
  }>> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      number: number.toString(),
    });

    const response = await fetch(`${BASE_URL}/recipes/${recipeId}/similar?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Get autocomplete recipe suggestions
   */
  async autocompleteRecipeSearch(query: string, number = 10): Promise<Array<{
    id: number;
    title: string;
    imageType: string;
  }>> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      query,
      number: number.toString(),
    });

    const response = await fetch(`${BASE_URL}/recipes/autocomplete?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Generate a meal plan for a specific day or week
   */
  async generateMealPlan(params: {
    timeFrame: 'day' | 'week';
    targetCalories?: number;
    diet?: string;
    exclude?: string;
  }): Promise<any> {
    const queryParams = new URLSearchParams({
      apiKey: this.apiKey,
      timeFrame: params.timeFrame,
    });

    if (params.targetCalories) queryParams.append('targetCalories', params.targetCalories.toString());
    if (params.diet) queryParams.append('diet', params.diet);
    if (params.exclude) queryParams.append('exclude', params.exclude);

    const response = await fetch(`${BASE_URL}/mealplanner/generate?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Spoonacular API error: ${response.statusText}`);
    }

    return response.json();
  }
}

/**
 * Import recipes into meal library with diversity filters
 */
export async function bulkImportToMealLibrary(params: {
  count: number;
  cuisines?: string[]; // e.g., ['italian', 'asian', 'mexican']
  diets?: string[]; // e.g., ['vegetarian', 'vegan', 'ketogenic']
  mealTypes?: string[]; // e.g., ['breakfast', 'lunch', 'dinner']
  maxReadyTime?: number;
}) {
  const service = new SpoonacularService();
  const importedRecipes: any[] = [];
  const errors: string[] = [];

  // Calculate recipes per category for diversity
  const totalCategories = (params.cuisines?.length || 1) * (params.mealTypes?.length || 1);
  const recipesPerCategory = Math.ceil(params.count / totalCategories);

  // If we have specific filters, use them to ensure diversity
  if (params.cuisines && params.cuisines.length > 0) {
    for (const cuisine of params.cuisines) {
      if (params.mealTypes && params.mealTypes.length > 0) {
        for (const mealType of params.mealTypes) {
          try {
            const searchParams: SpoonacularRecipeSearchParams = {
              cuisine,
              type: mealType,
              number: recipesPerCategory,
              sort: 'random',
              diet: params.diets?.[0], // Use first diet if provided
              maxReadyTime: params.maxReadyTime,
            };

            const results = await service.searchRecipes(searchParams);
            
            // Get full details for each recipe
            for (const recipe of results.results) {
              try {
                const details = await service.getRecipeDetails(recipe.id, true);
                importedRecipes.push(details);
                
                // Stop if we've reached the target count
                if (importedRecipes.length >= params.count) {
                  break;
                }
              } catch (error) {
                errors.push(`Failed to get details for recipe ${recipe.id}: ${error}`);
              }
            }

            if (importedRecipes.length >= params.count) {
              break;
            }
          } catch (error) {
            errors.push(`Failed to search ${cuisine} ${mealType}: ${error}`);
          }
        }
        if (importedRecipes.length >= params.count) {
          break;
        }
      } else {
        // No meal types, just cuisines
        try {
          const searchParams: SpoonacularRecipeSearchParams = {
            cuisine,
            number: recipesPerCategory,
            sort: 'random',
            diet: params.diets?.[0],
            maxReadyTime: params.maxReadyTime,
          };

          const results = await service.searchRecipes(searchParams);
          
          for (const recipe of results.results) {
            try {
              const details = await service.getRecipeDetails(recipe.id, true);
              importedRecipes.push(details);
              
              if (importedRecipes.length >= params.count) {
                break;
              }
            } catch (error) {
              errors.push(`Failed to get details for recipe ${recipe.id}: ${error}`);
            }
          }

          if (importedRecipes.length >= params.count) {
            break;
          }
        } catch (error) {
          errors.push(`Failed to search ${cuisine}: ${error}`);
        }
      }
    }
  } else {
    // No specific filters, get random diverse recipes
    try {
      const tags = params.diets?.join(',') || '';
      const result = await service.getRandomRecipes({
        number: params.count,
        tags,
      });
      importedRecipes.push(...result.recipes);
    } catch (error) {
      errors.push(`Failed to get random recipes: ${error}`);
    }
  }

  return {
    recipes: importedRecipes.slice(0, params.count), // Ensure we don't exceed count
    errors,
    imported: importedRecipes.length,
    requested: params.count,
  };
}

export const spoonacularService = new SpoonacularService();
export type { SpoonacularRecipe, SpoonacularRecipeSearchParams, RecipeSearchResult };
