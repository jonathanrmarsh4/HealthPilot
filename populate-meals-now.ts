/**
 * One-Time Meal Library Population
 * Run this once to populate your meal library with 100 diverse meals
 */

import { db } from './server/db';
import { bulkImportToMealLibrary } from './server/spoonacular';
import { mealLibrary } from './shared/schema';

async function populateMealLibrary() {
  console.log('🍽️ Starting meal library population...\n');
  
  try {
    // Check current count
    const existingMeals = await db.select().from(mealLibrary);
    console.log(`📊 Current meals in library: ${existingMeals.length}`);
    
    if (existingMeals.length > 0) {
      console.log('⚠️  Library already has meals. Skipping import.');
      console.log('   Delete existing meals first if you want to re-import.');
      process.exit(0);
    }
    
    // Import 100 diverse meals
    console.log('\n📥 Importing 100 meals from Spoonacular...');
    console.log('   Cuisines: Italian, Asian, Mexican, American, Mediterranean');
    console.log('   Meal types: Breakfast, Lunch, Dinner\n');
    
    const importResult = await bulkImportToMealLibrary({
      count: 100,
      cuisines: ['italian', 'asian', 'mexican', 'american', 'mediterranean'],
      mealTypes: ['breakfast', 'lunch', 'dinner'],
      maxReadyTime: 90,
    });
    
    console.log(`\n✅ Downloaded ${importResult.recipes.length} recipes from Spoonacular`);
    
    // Save to database
    let savedCount = 0;
    for (const recipe of importResult.recipes) {
      const roundNutrient = (nutrientName: string): number | null => {
        const value = recipe.nutrition?.nutrients?.find(n => n.name === nutrientName)?.amount;
        return value !== undefined ? Math.round(value) : null;
      };

      const mealData = {
        spoonacularRecipeId: recipe.id,
        title: recipe.title,
        description: recipe.summary?.replace(/<[^>]*>/g, ''),
        imageUrl: recipe.image,
        sourceUrl: recipe.sourceUrl,
        readyInMinutes: recipe.readyInMinutes,
        servings: recipe.servings,
        calories: roundNutrient('Calories'),
        protein: roundNutrient('Protein'),
        carbs: roundNutrient('Carbohydrates'),
        fat: roundNutrient('Fat'),
        ingredients: recipe.extendedIngredients,
        instructions: recipe.analyzedInstructions?.[0]?.steps?.map(s => s.step).join(' ') || '',
        extendedIngredients: recipe.extendedIngredients,
        cuisines: recipe.cuisines || [],
        dishTypes: recipe.dishTypes || [],
        diets: recipe.diets || [],
        mealTypes: recipe.dishTypes?.filter(t => ['breakfast', 'lunch', 'dinner', 'snack'].includes(t.toLowerCase())) || [],
        difficulty: (recipe.readyInMinutes < 30 ? 'easy' : recipe.readyInMinutes < 60 ? 'medium' : 'hard') as 'easy' | 'medium' | 'hard',
      };

      try {
        await db.insert(mealLibrary).values(mealData);
        savedCount++;
        if (savedCount % 10 === 0) {
          console.log(`   Saved ${savedCount}/${importResult.recipes.length} meals...`);
        }
      } catch (error: any) {
        console.error(`   ❌ Failed to save "${recipe.title}":`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully imported ${savedCount} meals!`);
    console.log('   You can now generate meal plans from the Nutrition page.\n');
    
    if (importResult.errors && importResult.errors.length > 0) {
      console.log(`⚠️  Encountered ${importResult.errors.length} errors during import.`);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

populateMealLibrary();
