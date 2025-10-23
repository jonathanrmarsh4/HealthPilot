import cron from 'node-cron';
import { storage } from '../storage';
import { calculateMetricBaseline } from './baselineComputation';
import { detectMetricDeviation, getSupportedMetrics } from './thresholdDetection';
import { generateInsightFromDeviation, selectTopInsights, GeneratedInsight } from './insightGeneration';
import { 
  buildEpisodeViews, 
  fetchHealthSignals, 
  calculateFeatures, 
  evaluateCorrelationRules, 
  calculatePriority,
  SymptomInsightData
} from './symptomCorrelation';
import { generateSymptomInsight, GeneratedSymptomInsight } from './symptomInsightGeneration';
import { ilog, logInsightsGenerationSummary } from '../lib/insightsDebug';

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
  
  ilog(`Starting insights generation for user ${userId} on ${todayStr}`);
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

  //============================================================================
  // SYMPTOM CORRELATION ANALYSIS
  //============================================================================
  
  const includeSymptomsInInsights = process.env.INCLUDE_SYMPTOMS_IN_INSIGHTS !== 'false'; // Default: true
  const symptomInsights: GeneratedSymptomInsight[] = [];
  
  if (includeSymptomsInInsights) {
    try {
      console.log(`[DailyInsights] Analyzing symptoms for user ${userId}...`);
      
      // Get user timezone
      const user = await storage.getUser(userId);
      const timezone = user?.timezone || 'Australia/Perth';
      
      // Fetch symptom episodes and health signals
      const oneDayAgo = new Date(today);
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const [symptomEpisodes, healthSignals] = await Promise.all([
        buildEpisodeViews(userId, oneDayAgo, today),
        fetchHealthSignals(userId, timezone),
      ]);
      
      console.log(`[DailyInsights] Found ${symptomEpisodes.length} active symptom episodes`);
      
      // Analyze each symptom episode
      for (const symptom of symptomEpisodes) {
        try {
          // Get previous severity (from sparkline or null if first report)
          const previousSeverity = symptom.sparkline.length > 1 ? symptom.sparkline[symptom.sparkline.length - 2] : null;
          
          // Calculate features
          const features = calculateFeatures(symptom, previousSeverity, healthSignals);
          
          // Evaluate correlation rules
          const rulesHit = evaluateCorrelationRules(symptom, features);
          
          // Calculate priority
          const priority = calculatePriority(symptom, features, rulesHit);
          
          // Build insight data
          const insightData: SymptomInsightData = {
            symptom,
            features,
            rulesHit,
            priority,
            signals: healthSignals,
          };
          
          // Generate insight if priority is high enough
          const insight = await generateSymptomInsight(insightData);
          if (insight) {
            symptomInsights.push(insight);
            console.log(`[DailyInsights] Generated symptom insight: ${insight.title} (score: ${insight.score})`);
          }
        } catch (error: any) {
          console.error(`[DailyInsights] Error analyzing symptom ${symptom.name}:`, error);
          result.errors.push(`Symptom ${symptom.name}: ${error.message}`);
        }
      }
      
      console.log(`[DailyInsights] Generated ${symptomInsights.length} symptom insights for user ${userId}`);
    } catch (error: any) {
      console.error(`[DailyInsights] Error in symptom correlation:`, error);
      result.errors.push(`Symptom correlation: ${error.message}`);
    }
  }

  //============================================================================
  // SELECT TOP INSIGHTS (Combine metrics + symptoms)
  //============================================================================
  
  // Convert symptom insights to GeneratedInsight format for combined selection
  const allInsights: GeneratedInsight[] = [
    ...generatedInsights,
    ...symptomInsights.map(si => ({
      category: si.category,
      title: si.title,
      description: si.description,
      recommendation: si.recommendations.join('\n'),
      score: si.score,
      severity: si.severity,
      metricName: 'symptoms', // Special metric name for symptom-based insights
      currentValue: 0, // Not applicable
      baselineValue: null,
      deviation: 0,
    })),
  ];

  if (allInsights.length === 0) {
    console.log(`[DailyInsights] No insights generated (AI returned null for all deviations and symptoms)`);
    return result;
  }

  // Select top 3 insights from combined pool
  const topInsights = selectTopInsights(allInsights, 3);

  // Store insights in database
  for (const insight of topInsights) {
    try {
      let recommendationId: string | null = null;

      // For notable+ severity deviations, create an actionable recommendation
      if (['notable', 'significant', 'critical'].includes(insight.severity)) {
        const recommendation = await storage.createRecommendation({
          userId,
          title: insight.title,
          description: insight.recommendation, // Use the actionable recommendation text
          category: insight.category,
          priority: insight.severity === 'critical' ? 'high' : insight.severity === 'significant' ? 'medium' : 'low',
          details: `${insight.description}\n\nCurrent: ${insight.currentValue.toFixed(1)}, Baseline: ${insight.baselineValue?.toFixed(1) || 'N/A'} (${insight.deviation > 0 ? '+' : ''}${insight.deviation.toFixed(1)}%)`,
          actionLabel: 'View Details',
        });
        recommendationId = recommendation.id;
      }

      // Store the daily health insight (linked to recommendation if created)
      await storage.createDailyHealthInsight({
        userId,
        date: todayStr,
        generatedFor: yesterday.toISOString().split('T')[0],
        title: insight.title,
        message: insight.description,
        metric: insight.metricName,
        severity: insight.severity,
        confidence: 0.85, // High confidence from AI generation
        evidence: {
          currentValue: insight.currentValue,
          baselineValue: insight.baselineValue,
          deviation: insight.deviation,
          recommendation: insight.recommendation,
        },
        score: insight.score,
        recommendationId, // Link to recommendation if created
      });
      result.insightsGenerated++;
    } catch (error: any) {
      console.error(`[DailyInsights] Error storing insight:`, error);
      result.errors.push(`Storage: ${error.message}`);
    }
  }

  console.log(`[DailyInsights] ✅ Generated ${result.insightsGenerated} insights for user ${userId}`);
  
  // Log comprehensive summary
  logInsightsGenerationSummary(userId, todayStr, result);
  
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
