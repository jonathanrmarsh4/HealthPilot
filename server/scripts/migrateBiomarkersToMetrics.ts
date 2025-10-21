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
// This mapping handles both exact matches and pattern-based matching
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

/**
 * Get metric name for a biomarker, handling unmapped biomarkers
 * For lab results, we create lab entries instead of metrics
 */
function getMetricNameForBiomarker(biomarkerName: string): string | null {
  // Check exact match first
  if (BIOMARKER_TO_METRIC_MAP[biomarkerName]) {
    return BIOMARKER_TO_METRIC_MAP[biomarkerName];
  }
  
  // For unmapped biomarkers, return null to skip
  // These will be handled by the labs table instead
  return null;
}

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

    let migratedMetrics = 0;
    let migratedLabs = 0;
    let errors = 0;

    for (const biomarker of allBiomarkers) {
      try {
        // Check if this biomarker type is mapped to a daily metric
        const metricName = getMetricNameForBiomarker(biomarker.name);
        
        // Determine baseline eligibility
        const isBaselineEligible = biomarker.value !== null && biomarker.value !== undefined;
        const exclusionReason = !isBaselineEligible ? 'Missing value' : null;

        if (metricName) {
          // Migrate to daily_metrics table
          await storage.createDailyMetric({
            userId: biomarker.userId,
            name: metricName,
            value: biomarker.value,
            unit: biomarker.unit || 'unit',
            observedAt: biomarker.recordedAt,
            source: 'migration',
            qualityFlag: 'good',
            isBaselineEligible,
            exclusionReason,
            ingestionMetadata: {
              migratedFrom: 'biomarkers',
              originalBiomarkerId: biomarker.id,
              migratedAt: new Date().toISOString(),
            },
          });

          migratedMetrics++;
        } else {
          // Migrate to labs table (lipids, glucose, hormones, etc.)
          await storage.createLab({
            userId: biomarker.userId,
            panel: 'migrated_biomarkers', // Generic panel for migrated data
            marker: biomarker.name,
            value: biomarker.value,
            unit: biomarker.unit || 'unit',
            refLow: null, // Biomarkers table doesn't have reference ranges
            refHigh: null,
            observedAt: biomarker.recordedAt,
            source: 'migration',
            qualityFlag: 'good',
            isBaselineEligible,
            exclusionReason,
            ingestionMetadata: {
              migratedFrom: 'biomarkers',
              originalBiomarkerId: biomarker.id,
              migratedAt: new Date().toISOString(),
            },
          });

          migratedLabs++;
        }

        // Log progress every 100 items
        const total = migratedMetrics + migratedLabs;
        if (total % 100 === 0) {
          console.log(`✓ Migrated ${total} biomarkers...`);
        }
      } catch (error: any) {
        console.error(`❌ Error migrating biomarker ${biomarker.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Migration complete!`);
    console.log(`   Daily Metrics: ${migratedMetrics} (sleep, HRV, steps, etc.)`);
    console.log(`   Labs: ${migratedLabs} (lipids, glucose, hormones, etc.)`);
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
