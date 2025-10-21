import cron from 'node-cron';
import { storage } from '../storage';
import { calculateMetricBaseline } from './baselineComputation';
import { detectMetricDeviation, getSupportedMetrics } from './thresholdDetection';
import { generateInsightFromDeviation, selectTopInsights, GeneratedInsight } from './insightGeneration';

/**
 * Daily Insights Scheduler
 * 
 * Runs at 02:00 in each user's timezone to analyze health data and generate personalized insights.
 * Uses a safety-first approach with baseline windows, deviation detection, and AI generation.
 */

interface InsightGenerationResult {
  userId: string;
  date: string;
  insightsGenerated: number;
  metricsAnalyzed: number;
  errors: string[];
}

/**
 * Start the daily insights cron job
 * Runs every hour and processes users whose local time is 02:00
 */
export function startDailyInsightsScheduler() {
  console.log('🔮 Starting Daily Insights Scheduler...');
  
  // Run every hour at :00 minutes
  cron.schedule('0 * * * *', async () => {
    const currentUtcHour = new Date().getUTCHours();
    console.log(`[DailyInsights] Hourly check at UTC ${currentUtcHour}:00`);
    
    try {
      await processUsersAtLocalTime(2); // Target local time: 02:00
    } catch (error) {
      console.error('[DailyInsights] Scheduler error:', error);
    }
  });

  console.log('✅ Daily Insights Scheduler started (runs hourly)');
}

/**
 * Process all users whose local time matches the target hour
 */
async function processUsersAtLocalTime(targetLocalHour: number): Promise<void> {
  // Get all users (in production, would paginate)
  const allUsers = await getAllActiveUsers();
  
  const usersToProcess = allUsers.filter(user => {
    if (!user.timezone) return false; // Skip users without timezone
    
    const userLocalTime = getCurrentLocalTime(user.timezone);
    return userLocalTime.getHours() === targetLocalHour;
  });

  if (usersToProcess.length === 0) {
    return; // No users to process this hour
  }

  console.log(`[DailyInsights] Processing ${usersToProcess.length} users at local time ${targetLocalHour}:00`);

  const results: InsightGenerationResult[] = [];
  for (const user of usersToProcess) {
    try {
      const result = await generateDailyInsightsForUser(user.id);
      results.push(result);
    } catch (error: any) {
      console.error(`[DailyInsights] Error processing user ${user.id}:`, error);
      results.push({
        userId: user.id,
        date: new Date().toISOString().split('T')[0],
        insightsGenerated: 0,
        metricsAnalyzed: 0,
        errors: [error.message],
      });
    }
  }

  // Log summary
  const totalInsights = results.reduce((sum, r) => sum + r.insightsGenerated, 0);
  const totalMetrics = results.reduce((sum, r) => sum + r.metricsAnalyzed, 0);
  console.log(`[DailyInsights] Batch complete: ${results.length} users, ${totalInsights} insights from ${totalMetrics} metrics`);
}

/**
 * Generate daily insights for a single user
 */
export async function generateDailyInsightsForUser(userId: string): Promise<InsightGenerationResult> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  console.log(`[DailyInsights] Generating insights for user ${userId} on ${todayStr}`);

  const result: InsightGenerationResult = {
    userId,
    date: todayStr,
    insightsGenerated: 0,
    metricsAnalyzed: 0,
    errors: [],
  };

  // Check if insights already exist for today
  const existingInsights = await storage.getDailyHealthInsights(userId, today);
  if (existingInsights.length > 0) {
    console.log(`[DailyInsights] User ${userId} already has ${existingInsights.length} insights for today. Skipping.`);
    return result;
  }

  // Get yesterday's date (we analyze yesterday's completed data)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Analyze all supported metrics
  const supportedMetrics = getSupportedMetrics();
  const allDeviations: Array<{ metric: string; deviation: any }> = [];

  for (const metricName of supportedMetrics) {
    try {
      result.metricsAnalyzed++;
      
      // Get yesterday's metrics
      const yesterdayMetrics = await storage.getDailyMetrics(
        userId,
        metricName,
        yesterday,
        yesterday
      );

      if (yesterdayMetrics.length === 0) {
        continue; // No data for this metric yesterday
      }

      // Use the most recent metric from yesterday
      const latestMetric = yesterdayMetrics[0];

      // Calculate baseline
      const baseline = await calculateMetricBaseline(userId, metricName, yesterday);

      // Detect deviation
      const deviation = detectMetricDeviation(latestMetric.value, baseline, metricName);

      if (deviation.detected) {
        allDeviations.push({
          metric: metricName,
          deviation,
        });
      }
    } catch (error: any) {
      console.error(`[DailyInsights] Error analyzing metric ${metricName}:`, error);
      result.errors.push(`${metricName}: ${error.message}`);
    }
  }

  if (allDeviations.length === 0) {
    console.log(`[DailyInsights] No significant deviations detected for user ${userId}`);
    return result;
  }

  console.log(`[DailyInsights] Found ${allDeviations.length} deviations for user ${userId}`);

  // Generate AI insights for each deviation
  const generatedInsights: GeneratedInsight[] = [];
  for (const { metric, deviation } of allDeviations) {
    try {
      const insight = await generateInsightFromDeviation(userId, deviation, yesterday);
      if (insight) {
        generatedInsights.push(insight);
      }
    } catch (error: any) {
      console.error(`[DailyInsights] Error generating insight for ${metric}:`, error);
      result.errors.push(`${metric} insight: ${error.message}`);
    }
  }

  if (generatedInsights.length === 0) {
    console.log(`[DailyInsights] No insights generated (AI returned null for all deviations)`);
    return result;
  }

  // Select top 3 insights
  const topInsights = selectTopInsights(generatedInsights, 3);

  // Store insights in database
  for (const insight of topInsights) {
    try {
      await storage.createDailyHealthInsight({
        userId,
        date: todayStr,
        category: insight.category,
        title: insight.title,
        description: insight.description,
        recommendation: insight.recommendation,
        score: insight.score,
        status: 'pending',
        metricName: insight.metricName,
        metricValue: insight.currentValue,
        baselineValue: insight.baselineValue,
        deviationPercent: insight.deviation,
        severity: insight.severity,
      });
      result.insightsGenerated++;
    } catch (error: any) {
      console.error(`[DailyInsights] Error storing insight:`, error);
      result.errors.push(`Storage: ${error.message}`);
    }
  }

  console.log(`[DailyInsights] ✅ Generated ${result.insightsGenerated} insights for user ${userId}`);
  return result;
}

/**
 * Get all active users (simplified - in production would paginate)
 */
async function getAllActiveUsers(): Promise<Array<{ id: string; timezone: string | null }>> {
  // This is a simplified implementation
  // In production, you'd want to:
  // 1. Paginate through users
  // 2. Filter for active/subscribed users only
  // 3. Use a more efficient query
  
  // For MVP, we'll get users via a direct DB query
  // This would need to be added to storage interface in production
  return [];
}

/**
 * Get current local time for a timezone
 */
function getCurrentLocalTime(timezone: string): Date {
  try {
    const utcDate = new Date();
    const localString = utcDate.toLocaleString('en-US', { timeZone: timezone });
    return new Date(localString);
  } catch (error) {
    console.error(`Invalid timezone: ${timezone}`);
    return new Date(); // Fallback to UTC
  }
}
