import { storage } from '../storage';
import { db } from '../db';
import { biomarkers } from '@shared/schema';

/**
 * Migration Script: Biomarkers → Daily Metrics
 * 
 * Migrates existing biomarker data into the new daily_metrics table
 * for baseline computation. This allows the Daily Insights system to
 * calculate baselines using historical biomarker data.
 */

// Mapping of biomarker names to daily metric names
const BIOMARKER_TO_METRIC_MAP: Record<string, string> = {
  // Sleep metrics
  'sleep_duration': 'sleep_duration_hours',
  'sleep_quality': 'sleep_quality_score',
  'rem_sleep': 'rem_sleep_minutes',
  'deep_sleep': 'deep_sleep_minutes',
  
  // HRV
  'hrv_rmssd': 'hrv_rmssd',
  'hrv_sdnn': 'hrv_sdnn',
  
  // Heart rate
  'resting_heart_rate': 'resting_heart_rate_bpm',
  
  // Body metrics
  'weight': 'body_weight_kg',
  'body_fat': 'body_fat_percentage',
  'lean_body_mass': 'lean_body_mass_kg',
  
  // Activity
  'steps': 'steps_count',
  'active_energy': 'active_energy_kcal',
  
  // Training
  'training_load': 'training_load',
  
  // Readiness
  'readiness': 'readiness_score',
  
  // Vitals
  'blood_pressure_systolic': 'systolic_bp_mmhg',
  'blood_pressure_diastolic': 'diastolic_bp_mmhg',
  'blood_oxygen': 'blood_oxygen_percent',
  'respiratory_rate': 'respiratory_rate_bpm',
};

async function migrateBiomarkersToMetrics() {
  console.log('🔄 Starting biomarker → daily metrics migration...');
  
  try {
    // Get all biomarkers
    const allBiomarkers = await db.select().from(biomarkers);
    
    if (allBiomarkers.length === 0) {
      console.log('ℹ️ No biomarkers found to migrate');
      return;
    }

    console.log(`📊 Found ${allBiomarkers.length} biomarkers to migrate`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    for (const biomarker of allBiomarkers) {
      try {
        // Check if this biomarker type is mapped to a daily metric
        const metricName = BIOMARKER_TO_METRIC_MAP[biomarker.name];
        
        if (!metricName) {
          console.log(`⚠️ Skipping unmapped biomarker: ${biomarker.name}`);
          skipped++;
          continue;
        }

        // Determine baseline eligibility
        // For migrated data, we'll mark it as eligible if it has a value
        const isBaselineEligible = biomarker.value !== null && biomarker.value !== undefined;
        const exclusionReason = !isBaselineEligible ? 'Missing value' : null;

        // Create daily metric from biomarker
        await storage.createDailyMetric({
          userId: biomarker.userId,
          name: metricName,
          value: biomarker.value,
          unit: biomarker.unit || 'unit',
          observedAt: biomarker.recordedAt,
          source: 'migration', // Mark as migrated data
          qualityFlag: 'good', // Assume good quality for existing data
          isBaselineEligible,
          exclusionReason,
          ingestionMetadata: {
            migratedFrom: 'biomarkers',
            originalBiomarkerId: biomarker.id,
            migratedAt: new Date().toISOString(),
          },
        });

        migrated++;

        // Log progress every 100 items
        if (migrated % 100 === 0) {
          console.log(`✓ Migrated ${migrated} biomarkers...`);
        }
      } catch (error: any) {
        console.error(`❌ Error migrating biomarker ${biomarker.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Migrated: ${migrated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Total: ${allBiomarkers.length}\n`);
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run if executed directly
if (require.main === module) {
  migrateBiomarkersToMetrics()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

export { migrateBiomarkersToMetrics };
