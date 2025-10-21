/**
 * Backfill Script: Fix meal types for existing meals
 * 
 * This script updates all existing meals in the database to use
 * the new intelligent meal type derivation logic.
 */

import { db } from '../db';
import { mealLibrary } from '@shared/schema';
import { deriveAllPossibleMealTypes } from '../utils/mealTypeDerivation';
import { eq } from 'drizzle-orm';

async function backfillMealTypes() {
  console.log('🚀 Starting meal type backfill...\n');

  try {
    // Fetch all meals
    const meals = await db.select().from(mealLibrary);
    console.log(`📊 Found ${meals.length} meals to process\n`);

    let updated = 0;
    let unchanged = 0;
    let errors = 0;

    const stats = {
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snack: 0,
      before: {
        breakfast: 0,
        lunch: 0,
        dinner: 0,
        snack: 0,
        dessert: 0,
        beverage: 0,
        other: 0
      }
    };

    for (const meal of meals) {
      try {
        // Count before stats
        if (meal.mealTypes) {
          for (const type of meal.mealTypes) {
            const typeLower = type.toLowerCase();
            if (typeLower === 'breakfast') stats.before.breakfast++;
            else if (typeLower === 'lunch') stats.before.lunch++;
            else if (typeLower === 'dinner') stats.before.dinner++;
            else if (typeLower === 'snack') stats.before.snack++;
            else if (typeLower === 'dessert') stats.before.dessert++;
            else if (typeLower === 'beverage') stats.before.beverage++;
            else stats.before.other++;
          }
        }

        // Derive new meal types
        const newMealTypes = deriveAllPossibleMealTypes({
          title: meal.title,
          dishTypes: meal.dishTypes || [],
          mealTypes: meal.mealTypes || [],
          cuisines: meal.cuisines || []
        });

        // Check if types changed
        const oldTypesStr = (meal.mealTypes || []).sort().join(',');
        const newTypesStr = newMealTypes.sort().join(',');

        if (oldTypesStr !== newTypesStr) {
          // Update the meal
          await db
            .update(mealLibrary)
            .set({ mealTypes: newMealTypes })
            .where(eq(mealLibrary.id, meal.id));

          console.log(`✅ Updated "${meal.title}"`);
          console.log(`   Before: [${oldTypesStr || 'none'}]`);
          console.log(`   After:  [${newTypesStr}]\n`);
          
          updated++;
        } else {
          unchanged++;
        }

        // Count after stats
        for (const type of newMealTypes) {
          if (type === 'breakfast') stats.breakfast++;
          else if (type === 'lunch') stats.lunch++;
          else if (type === 'dinner') stats.dinner++;
          else if (type === 'snack') stats.snack++;
        }

      } catch (error: any) {
        console.error(`❌ Error processing meal ${meal.id} (${meal.title}):`, error.message);
        errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total meals processed: ${meals.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Unchanged: ${unchanged}`);
    console.log(`Errors: ${errors}`);
    console.log('');
    console.log('BEFORE distribution:');
    console.log(`  Breakfast: ${stats.before.breakfast}`);
    console.log(`  Lunch: ${stats.before.lunch}`);
    console.log(`  Dinner: ${stats.before.dinner}`);
    console.log(`  Snack: ${stats.before.snack}`);
    console.log(`  Dessert: ${stats.before.dessert} (invalid)`);
    console.log(`  Beverage: ${stats.before.beverage} (invalid)`);
    console.log(`  Other: ${stats.before.other} (invalid)`);
    console.log('');
    console.log('AFTER distribution:');
    console.log(`  Breakfast: ${stats.breakfast}`);
    console.log(`  Lunch: ${stats.lunch}`);
    console.log(`  Dinner: ${stats.dinner}`);
    console.log(`  Snack: ${stats.snack}`);
    console.log('='.repeat(60));
    console.log('\n✅ Backfill complete!');

  } catch (error: any) {
    console.error('💥 Fatal error during backfill:', error);
    process.exit(1);
  }
}

// Run the backfill
backfillMealTypes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
