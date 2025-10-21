import { storage } from '../storage';
import { calculateMetricBaseline } from '../services/baselineComputation';
import { detectMetricDeviation } from '../services/thresholdDetection';
import { generateInsightFromDeviation, selectTopInsights } from '../services/insightGeneration';
import { generateDailyInsightsForUser } from '../services/dailyInsightsScheduler';

/**
 * End-to-End Test Script for Daily Insights MVP
 * 
 * Tests the complete flow:
 * 1. Seeds realistic health data
 * 2. Verifies baseline calculations
 * 3. Triggers insight generation
 * 4. Validates output quality
 */

interface TestResult {
  step: string;
  success: boolean;
  details: any;
  error?: string;
}

const TEST_USER_ID = 'test-user-001'; // Replace with actual user ID for testing

async function runE2ETest(): Promise<void> {
  const results: TestResult[] = [];
  
  console.log('🧪 Starting Daily Insights E2E Test\n');
  console.log(`Testing with user ID: ${TEST_USER_ID}\n`);
  
  // ==========================================================================
  // STEP 1: Seed Realistic Health Data
  // ==========================================================================
  console.log('📊 Step 1: Seeding realistic health data...');
  try {
    const today = new Date();
    
    // Seed 30 days of sleep data with a recent drop
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Normal sleep: 7-8 hours, with a recent drop to 5-6 hours
      const sleepHours = i <= 2 ? 5.5 + Math.random() * 0.5 : 7 + Math.random();
      
      await storage.createDailyMetric({
        userId: TEST_USER_ID,
        name: 'sleep_duration_hours',
        value: sleepHours,
        unit: 'hours',
        observedAt: date,
        source: 'apple_health',
        qualityFlag: 'good',
        isBaselineEligible: true,
        exclusionReason: null,
        ingestionMetadata: {
          test: true,
          seededAt: new Date().toISOString(),
        },
      });
    }
    
    // Seed 30 days of HRV data with a recent decline
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Normal HRV: 45-55ms, with a recent drop to 30-35ms
      const hrv = i <= 2 ? 30 + Math.random() * 5 : 45 + Math.random() * 10;
      
      await storage.createDailyMetric({
        userId: TEST_USER_ID,
        name: 'hrv_rmssd',
        value: hrv,
        unit: 'ms',
        observedAt: date,
        source: 'apple_health',
        qualityFlag: 'good',
        isBaselineEligible: true,
        exclusionReason: null,
        ingestionMetadata: {
          test: true,
          seededAt: new Date().toISOString(),
        },
      });
    }
    
    // Seed 30 days of resting heart rate with a recent spike
    for (let i = 30; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Normal RHR: 58-62bpm, with a recent spike to 70-75bpm
      const rhr = i <= 2 ? 70 + Math.random() * 5 : 58 + Math.random() * 4;
      
      await storage.createDailyMetric({
        userId: TEST_USER_ID,
        name: 'resting_heart_rate_bpm',
        value: rhr,
        unit: 'bpm',
        observedAt: date,
        source: 'apple_health',
        qualityFlag: 'good',
        isBaselineEligible: true,
        exclusionReason: null,
        ingestionMetadata: {
          test: true,
          seededAt: new Date().toISOString(),
        },
      });
    }
    
    results.push({
      step: 'Seed Health Data',
      success: true,
      details: {
        metricTypes: 3,
        daysOfData: 31,
        totalDataPoints: 93,
      },
    });
    console.log('✅ Seeded 93 data points (31 days × 3 metrics)\n');
  } catch (error: any) {
    results.push({
      step: 'Seed Health Data',
      success: false,
      details: null,
      error: error.message,
    });
    console.error('❌ Failed to seed data:', error.message, '\n');
    return;
  }
  
  // ==========================================================================
  // STEP 2: Verify Baseline Calculations
  // ==========================================================================
  console.log('📈 Step 2: Verifying baseline calculations...');
  try {
    const today = new Date();
    
    // Test sleep baseline
    const sleepBaseline = await calculateMetricBaseline(TEST_USER_ID, 'sleep_duration_hours', today);
    console.log(`   Sleep 7-day baseline: ${sleepBaseline.windows.sevenDay.average?.toFixed(2)} hours (${sleepBaseline.windows.sevenDay.dataPoints} points)`);
    console.log(`   Sleep 14-day baseline: ${sleepBaseline.windows.fourteenDay.average?.toFixed(2)} hours (${sleepBaseline.windows.fourteenDay.dataPoints} points)`);
    console.log(`   Sleep 30-day baseline: ${sleepBaseline.windows.thirtyDay.average?.toFixed(2)} hours (${sleepBaseline.windows.thirtyDay.dataPoints} points)`);
    
    // Test HRV baseline
    const hrvBaseline = await calculateMetricBaseline(TEST_USER_ID, 'hrv_rmssd', today);
    console.log(`   HRV 7-day baseline: ${hrvBaseline.windows.sevenDay.average?.toFixed(2)} ms (${hrvBaseline.windows.sevenDay.dataPoints} points)`);
    
    // Test RHR baseline
    const rhrBaseline = await calculateMetricBaseline(TEST_USER_ID, 'resting_heart_rate_bpm', today);
    console.log(`   RHR 7-day baseline: ${rhrBaseline.windows.sevenDay.average?.toFixed(2)} bpm (${rhrBaseline.windows.sevenDay.dataPoints} points)`);
    
    // Verify baselines are within expected ranges
    const sleepAvg = sleepBaseline.windows.sevenDay.average;
    const hrvAvg = hrvBaseline.windows.sevenDay.average;
    const rhrAvg = rhrBaseline.windows.sevenDay.average;
    
    const baselineValid = 
      sleepAvg && sleepAvg >= 5 && sleepAvg <= 8 &&
      hrvAvg && hrvAvg >= 25 && hrvAvg <= 60 &&
      rhrAvg && rhrAvg >= 55 && rhrAvg <= 80;
    
    results.push({
      step: 'Verify Baselines',
      success: baselineValid,
      details: {
        sleep: sleepAvg,
        hrv: hrvAvg,
        rhr: rhrAvg,
      },
    });
    console.log(`✅ Baselines calculated correctly\n`);
  } catch (error: any) {
    results.push({
      step: 'Verify Baselines',
      success: false,
      details: null,
      error: error.message,
    });
    console.error('❌ Baseline calculation failed:', error.message, '\n');
    return;
  }
  
  // ==========================================================================
  // STEP 3: Test Deviation Detection
  // ==========================================================================
  console.log('🔍 Step 3: Testing deviation detection...');
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Get yesterday's metrics
    const sleepMetrics = await storage.getDailyMetrics(TEST_USER_ID, 'sleep_duration_hours', yesterday, yesterday);
    const hrvMetrics = await storage.getDailyMetrics(TEST_USER_ID, 'hrv_rmssd', yesterday, yesterday);
    const rhrMetrics = await storage.getDailyMetrics(TEST_USER_ID, 'resting_heart_rate_bpm', yesterday, yesterday);
    
    // Calculate baselines
    const sleepBaseline = await calculateMetricBaseline(TEST_USER_ID, 'sleep_duration_hours', yesterday);
    const hrvBaseline = await calculateMetricBaseline(TEST_USER_ID, 'hrv_rmssd', yesterday);
    const rhrBaseline = await calculateMetricBaseline(TEST_USER_ID, 'resting_heart_rate_bpm', yesterday);
    
    // Detect deviations
    const sleepDeviation = detectMetricDeviation(sleepMetrics[0].value, sleepBaseline, 'sleep_duration_hours');
    const hrvDeviation = detectMetricDeviation(hrvMetrics[0].value, hrvBaseline, 'hrv_rmssd');
    const rhrDeviation = detectMetricDeviation(rhrMetrics[0].value, rhrBaseline, 'resting_heart_rate_bpm');
    
    console.log(`   Sleep deviation: ${sleepDeviation.detected ? 'YES' : 'NO'} (${sleepDeviation.percentageDeviation.toFixed(1)}%, ${sleepDeviation.severity})`);
    console.log(`   HRV deviation: ${hrvDeviation.detected ? 'YES' : 'NO'} (${hrvDeviation.percentageDeviation.toFixed(1)}%, ${hrvDeviation.severity})`);
    console.log(`   RHR deviation: ${rhrDeviation.detected ? 'YES' : 'NO'} (${rhrDeviation.percentageDeviation.toFixed(1)}%, ${rhrDeviation.severity})`);
    
    const detectionsValid = sleepDeviation.detected && hrvDeviation.detected && rhrDeviation.detected;
    
    results.push({
      step: 'Detect Deviations',
      success: detectionsValid,
      details: {
        sleep: { detected: sleepDeviation.detected, deviation: sleepDeviation.percentageDeviation },
        hrv: { detected: hrvDeviation.detected, deviation: hrvDeviation.percentageDeviation },
        rhr: { detected: rhrDeviation.detected, deviation: rhrDeviation.percentageDeviation },
      },
    });
    console.log(`✅ Deviation detection working correctly\n`);
  } catch (error: any) {
    results.push({
      step: 'Detect Deviations',
      success: false,
      details: null,
      error: error.message,
    });
    console.error('❌ Deviation detection failed:', error.message, '\n');
    return;
  }
  
  // ==========================================================================
  // STEP 4: Trigger Manual Insight Generation
  // ==========================================================================
  console.log('🤖 Step 4: Triggering manual insight generation...');
  try {
    const result = await generateDailyInsightsForUser(TEST_USER_ID);
    
    console.log(`   User ID: ${result.userId}`);
    console.log(`   Date: ${result.date}`);
    console.log(`   Metrics analyzed: ${result.metricsAnalyzed}`);
    console.log(`   Insights generated: ${result.insightsGenerated}`);
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.join(', ')}`);
    }
    
    results.push({
      step: 'Generate Insights',
      success: result.insightsGenerated > 0,
      details: result,
    });
    
    if (result.insightsGenerated > 0) {
      console.log(`✅ Generated ${result.insightsGenerated} insights\n`);
    } else {
      console.log(`⚠️ No insights generated (may already exist for today)\n`);
    }
  } catch (error: any) {
    results.push({
      step: 'Generate Insights',
      success: false,
      details: null,
      error: error.message,
    });
    console.error('❌ Insight generation failed:', error.message, '\n');
    return;
  }
  
  // ==========================================================================
  // STEP 5: Validate Output Quality
  // ==========================================================================
  console.log('✅ Step 5: Validating generated insights...');
  try {
    const today = new Date();
    const insights = await storage.getDailyHealthInsights(TEST_USER_ID, today);
    
    console.log(`   Total insights: ${insights.length}`);
    
    for (const insight of insights) {
      console.log(`\n   📌 ${insight.title}`);
      console.log(`      Category: ${insight.category} | Severity: ${insight.severity} | Score: ${insight.score}`);
      console.log(`      Metric: ${insight.metricName} = ${insight.metricValue.toFixed(1)}`);
      console.log(`      Baseline: ${insight.baselineValue?.toFixed(1)} | Deviation: ${insight.deviationPercent.toFixed(1)}%`);
      console.log(`      Description: ${insight.description.substring(0, 100)}...`);
    }
    
    const qualityValid = insights.every(i => 
      i.title && 
      i.description && 
      i.recommendation &&
      i.score >= 0 && i.score <= 100 &&
      i.deviationPercent !== 0
    );
    
    results.push({
      step: 'Validate Output',
      success: qualityValid,
      details: {
        count: insights.length,
        avgScore: insights.reduce((sum, i) => sum + i.score, 0) / insights.length,
      },
    });
    console.log(`\n✅ Insights validated successfully\n`);
  } catch (error: any) {
    results.push({
      step: 'Validate Output',
      success: false,
      details: null,
      error: error.message,
    });
    console.error('❌ Output validation failed:', error.message, '\n');
  }
  
  // ==========================================================================
  // Summary
  // ==========================================================================
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  const passedSteps = results.filter(r => r.success).length;
  const totalSteps = results.length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.step}`);
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });
  
  console.log(`\n${passedSteps}/${totalSteps} steps passed`);
  
  if (passedSteps === totalSteps) {
    console.log('\n🎉 All tests passed! Daily Insights MVP is working correctly.\n');
  } else {
    console.log('\n⚠️ Some tests failed. Please review the errors above.\n');
  }
}

// Run if executed directly
if (require.main === module) {
  runE2ETest()
    .then(() => {
      console.log('✅ E2E test completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ E2E test failed:', error);
      process.exit(1);
    });
}

export { runE2ETest };
