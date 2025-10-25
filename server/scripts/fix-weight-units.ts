/**
 * One-time script to fix incorrectly stored weight and lean body mass data
 * 
 * Problem: Native iOS HealthKit sync was storing kg values with "lbs" unit
 * This script:
 * 1. Finds all weight/lean-body-mass records with source="ios-healthkit"
 * 2. Checks if the value is likely in kg (< 200 lbs, as most weights are > 200 when actually in lbs)
 * 3. Converts kg values to lbs and updates the database
 */

import { db } from '../db';
import { biomarkers } from '@shared/schema';
import { eq, and, lt } from 'drizzle-orm';

async function fixWeightUnits() {
  console.log('🔧 Starting weight unit correction...\n');

  try {
    // Find all weight records from ios-healthkit with suspiciously low values (likely kg stored as lbs)
    const suspectWeights = await db.query.biomarkers.findMany({
      where: and(
        eq(biomarkers.type, 'weight'),
        eq(biomarkers.source, 'ios-healthkit'),
        eq(biomarkers.unit, 'lbs'),
        lt(biomarkers.value, 200) // Values under 200 are likely kg stored incorrectly
      ),
    });

    console.log(`📊 Found ${suspectWeights.length} weight records that may need correction`);

    let correctedCount = 0;
    
    for (const record of suspectWeights) {
      // Convert from kg to lbs
      const correctedValue = record.value * 2.20462;
      
      console.log(`  ⚖️  Correcting weight: ${record.value} lbs → ${correctedValue.toFixed(1)} lbs (userId: ${record.userId.substring(0, 8)}...)`);
      
      await db
        .update(biomarkers)
        .set({ value: correctedValue })
        .where(eq(biomarkers.id, record.id));
      
      correctedCount++;
    }

    // Find all lean body mass records with the same issue
    const suspectLeanMass = await db.query.biomarkers.findMany({
      where: and(
        eq(biomarkers.type, 'lean-body-mass'),
        eq(biomarkers.source, 'ios-healthkit'),
        eq(biomarkers.unit, 'lbs'),
        lt(biomarkers.value, 200)
      ),
    });

    console.log(`\n📊 Found ${suspectLeanMass.length} lean body mass records that may need correction`);

    for (const record of suspectLeanMass) {
      const correctedValue = record.value * 2.20462;
      
      console.log(`  💪 Correcting lean mass: ${record.value} lbs → ${correctedValue.toFixed(1)} lbs (userId: ${record.userId.substring(0, 8)}...)`);
      
      await db
        .update(biomarkers)
        .set({ value: correctedValue })
        .where(eq(biomarkers.id, record.id));
      
      correctedCount++;
    }

    console.log(`\n✅ Correction complete!`);
    console.log(`   Total records corrected: ${correctedCount}`);
    console.log(`   Weight records: ${suspectWeights.length}`);
    console.log(`   Lean mass records: ${suspectLeanMass.length}`);
    
  } catch (error) {
    console.error('❌ Error fixing weight units:', error);
    throw error;
  }
}

// Run the fix
fixWeightUnits()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
