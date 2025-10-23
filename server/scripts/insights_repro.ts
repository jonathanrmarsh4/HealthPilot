#!/usr/bin/env tsx
/**
 * Daily Health Insights Reproduction Script
 * 
 * Usage:
 *   INSIGHTS_DEBUG=1 tsx server/scripts/insights_repro.ts --user <userId> --date 2025-10-23 [--tz Australia/Perth]
 * 
 * This script:
 * 1. Verifies raw input data exists for the given user/date
 * 2. Triggers the insight generation scheduler for that user
 * 3. Queries the generated insights
 * 4. Prints a detailed report
 */

import { storage } from '../storage';
import { generateDailyInsightsForUser } from '../services/dailyInsightsScheduler';
import { toUtcRangeForLocalDay, ilog } from '../lib/insightsDebug';

interface Args {
  user: string;
  date: string;
  tz: string;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const parsed: Partial<Args> = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    const value = args[i + 1];
    parsed[key as keyof Args] = value;
  }
  
  if (!parsed.user || !parsed.date) {
    console.error('Usage: tsx insights_repro.ts --user <userId> --date YYYY-MM-DD [--tz Australia/Perth]');
    process.exit(1);
  }
  
  return {
    user: parsed.user,
    date: parsed.date,
    tz: parsed.tz || 'Australia/Perth',
  };
}

async function main() {
  const { user, date, tz } = parseArgs();
  
  console.log('\n' + '='.repeat(60));
  console.log('DAILY HEALTH INSIGHTS REPRODUCTION SCRIPT');
  console.log('='.repeat(60));
  console.log(`User ID: ${user}`);
  console.log(`Date: ${date} (${tz})`);
  console.log('='.repeat(60) + '\n');
  
  // Step 1: Verify raw inputs exist
  console.log('📥 STEP 1: Checking raw input data...\n');
  
  const utcRange = toUtcRangeForLocalDay(date, tz);
  console.log(`UTC Range: ${utcRange.startUtcIso} to ${utcRange.endUtcIso}\n`);
  
  try {
    // Check sleep data
    const sleepSessions = await storage.getSleepSessions(user, utcRange.startUtc, utcRange.endUtc);
    console.log(`✓ Sleep sessions: ${sleepSessions.length}`);
    if (sleepSessions.length > 0) {
      const latest = sleepSessions[0];
      console.log(`  Latest: ${latest.totalHours?.toFixed(1)}h, score: ${latest.sleepScore || 'N/A'}`);
    }
    
    // Check workouts
    const workouts = await storage.getWorkouts(user);
    const workoutsInRange = workouts.filter(w => {
      const wDate = new Date(w.startedAt);
      return wDate >= utcRange.startUtc && wDate <= utcRange.endUtc;
    });
    console.log(`✓ Workouts: ${workoutsInRange.length}`);
    if (workoutsInRange.length > 0) {
      console.log(`  Latest: ${workoutsInRange[0].workoutType}, ${workoutsInRange[0].duration}min`);
    }
    
    // Check biomarkers
    const biomarkers = await storage.getBiomarkers(user);
    const biomarkersInRange = biomarkers.filter(b => {
      const bDate = new Date(b.observedAt);
      return bDate >= utcRange.startUtc && bDate <= utcRange.endUtc;
    });
    console.log(`✓ Biomarkers: ${biomarkersInRange.length}`);
    
    // Check daily metrics (HRV, etc.)
    const yesterday = new Date(utcRange.startUtc);
    yesterday.setDate(yesterday.getDate() - 1);
    const metrics = ['hrv', 'resting_heart_rate', 'steps', 'active_calories'];
    for (const metricName of metrics) {
      const metricData = await storage.getDailyMetrics(user, metricName, yesterday, utcRange.endUtc);
      if (metricData.length > 0) {
        console.log(`✓ ${metricName}: ${metricData.length} records, latest value: ${metricData[0].value}`);
      }
    }
    
    // Check symptoms
    const symptoms = await storage.getSymptomEvents(user, 10);
    const symptomsInRange = symptoms.filter(s => {
      const sDate = new Date(s.recordedAt);
      return sDate >= utcRange.startUtc && sDate <= utcRange.endUtc;
    });
    console.log(`✓ Symptoms: ${symptomsInRange.length}`);
    
  } catch (error: any) {
    console.error(`❌ Error checking input data: ${error.message}`);
  }
  
  // Step 2: Trigger insights generation
  console.log('\n⚙️  STEP 2: Generating insights...\n');
  
  try {
    const result = await generateDailyInsightsForUser(user);
    
    console.log(`✓ Insights generation complete:`);
    console.log(`  - Metrics analyzed: ${result.metricsAnalyzed}`);
    console.log(`  - Insights generated: ${result.insightsGenerated}`);
    console.log(`  - Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log(`\n  Error details:`);
      result.errors.forEach((err, i) => {
        console.log(`    ${i + 1}. ${err}`);
      });
    }
    
  } catch (error: any) {
    console.error(`❌ Error generating insights: ${error.message}`);
    console.error(error.stack);
  }
  
  // Step 3: Query generated insights
  console.log('\n📊 STEP 3: Querying generated insights...\n');
  
  try {
    const today = new Date(date);
    const insights = await storage.getDailyHealthInsights(user, today);
    
    console.log(`✓ Found ${insights.length} insights for ${date}\n`);
    
    if (insights.length > 0) {
      console.log('Insights Table:');
      console.log('-'.repeat(100));
      console.log(
        'Category'.padEnd(15) +
        'Title'.padEnd(30) +
        'Score'.padEnd(8) +
        'Severity'.padEnd(12) +
        'Status'
      );
      console.log('-'.repeat(100));
      
      for (const insight of insights) {
        console.log(
          (insight.category || 'N/A').padEnd(15) +
          (insight.title || '').substring(0, 28).padEnd(30) +
          (insight.score?.toString() || 'N/A').padEnd(8) +
          (insight.severity || 'N/A').padEnd(12) +
          (insight.status || 'N/A')
        );
      }
      console.log('-'.repeat(100));
      
      // Print first insight details
      console.log('\n📝 First Insight Detail:');
      console.log(JSON.stringify(insights[0], null, 2));
    } else {
      console.log('⚠️  No insights found. Possible reasons:');
      console.log('   - No significant deviations detected from baseline');
      console.log('   - Insufficient historical data for baseline computation');
      console.log('   - All metric values within normal range');
      console.log('   - Feature flags or environment variables disabled');
    }
    
  } catch (error: any) {
    console.error(`❌ Error querying insights: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('REPRODUCTION COMPLETE');
  console.log('='.repeat(60) + '\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
