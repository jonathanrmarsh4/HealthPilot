/**
 * Populate Meal Library Script
 * Imports meals from Spoonacular API into the meal_library database
 * Run with: npx tsx scripts/populate-meal-library.ts
 */

async function populateMealLibrary() {
  const baseUrl = process.env.REPLIT_DEV_DOMAIN 
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : 'http://localhost:5000';

  console.log('🍽️ Starting meal library population...');
  console.log(`📍 Target: ${baseUrl}`);
  
  // Import 500 meals with diverse cuisines and meal types
  const importConfig = {
    count: 500,
    cuisines: [
      'italian', 'asian', 'mexican', 'american', 'mediterranean',
      'greek', 'indian', 'thai', 'french', 'spanish'
    ],
    mealTypes: ['breakfast', 'lunch', 'dinner'],
    diets: [], // Leave empty to get variety
    maxReadyTime: 90, // Maximum 90 minutes prep time
  };

  try {
    console.log('\n📥 Importing meals from Spoonacular...');
    console.log(`   Cuisines: ${importConfig.cuisines.join(', ')}`);
    console.log(`   Meal types: ${importConfig.mealTypes.join(', ')}`);
    console.log(`   Target count: ${importConfig.count}`);
    
    const response = await fetch(`${baseUrl}/api/admin/meal-library/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(importConfig),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Import failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    
    console.log('\n✅ Import complete!');
    console.log(`   ✓ Imported: ${result.imported} meals`);
    console.log(`   ✓ Requested: ${result.requested} meals`);
    
    if (result.errors && result.errors.length > 0) {
      console.log(`\n⚠️ Errors encountered: ${result.errors.length}`);
      result.errors.slice(0, 5).forEach((err: string) => {
        console.log(`   - ${err}`);
      });
      if (result.errors.length > 5) {
        console.log(`   ... and ${result.errors.length - 5} more`);
      }
    }

    console.log('\n🎉 Meal library is now populated!');
    console.log('   You can now generate meal plans from the Nutrition page.');
    
  } catch (error: any) {
    console.error('\n❌ Error populating meal library:', error.message);
    process.exit(1);
  }
}

populateMealLibrary();
