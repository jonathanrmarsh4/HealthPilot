import cron from 'node-cron';
import { storage } from '../storage';
import { calculateMetricBaseline, calculateLabBaseline } from './baselineComputation';
import { detectMetricDeviation, getSupportedMetrics, detectLabDeviation, getSupportedLabMarkers } from './thresholdDetection';
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
import { eventBus } from '../lib/eventBus';

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
 * @param forceRegenerate - If true, deletes existing insights and regenerates them
 */
export async function generateDailyInsightsForUser(userId: string, forceRegenerate: boolean = false): Promise<InsightGenerationResult> {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  ilog(`Starting insights generation for user ${userId} on ${todayStr} (force=${forceRegenerate})`);
  console.log(`[DailyInsights] Generating insights for user ${userId} on ${todayStr} (force=${forceRegenerate})`);

  const result: InsightGenerationResult = {
    userId,
    date: todayStr,
    insightsGenerated: 0,
    metricsAnalyzed: 0,
    errors: [],
  };

  // Check if insights already exist for today
  const existingInsights = await storage.getDailyHealthInsights(userId, today);
  if (existingInsights.length > 0 && !forceRegenerate) {
    console.log(`[DailyInsights] User ${userId} already has ${existingInsights.length} insights for today. Skipping.`);
    return result;
  }
  
  // If force regenerate, delete existing insights first
  if (forceRegenerate && existingInsights.length > 0) {
    console.log(`[DailyInsights] Force regenerate - deleting ${existingInsights.length} existing insights`);
    for (const insight of existingInsights) {
      try {
        await storage.updateDailyHealthInsightStatus(insight.id, userId, 'dismissed');
      } catch (error) {
        console.error(`[DailyInsights] Error dismissing insight ${insight.id}:`, error);
      }
    }
  }

  // Get yesterday's date (we analyze yesterday's completed data)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  //============================================================================
  // DYNAMIC INSIGHTS ENGINE (NEW) - Analyzes ALL metrics
  //============================================================================
  
  const generatedInsights: GeneratedInsight[] = [];
  
  try {
    console.log(`[DailyInsights] Running Dynamic Insights Engine for user ${userId}...`);
    
    // Import and run the new dynamic engine
    const { computeDailyInsights } = await import('../insights/engine');
    
    // Get user timezone
    const user = await storage.getUser(userId);
    const timezone = user?.timezone || 'Australia/Perth';
    
    // Compute insights for yesterday (completed data)
    const dynamicInsights = await computeDailyInsights(userId, yesterdayStr, timezone);
    
    console.log(`[DailyInsights] Dynamic engine generated ${dynamicInsights.length} insights`);
    result.metricsAnalyzed += dynamicInsights.length; // Approximate - each insight represents metrics analyzed
    
    // Convert dynamic insights to GeneratedInsight format
    for (const insight of dynamicInsights) {
      generatedInsights.push({
        category: mapFamilyToCategory(insight.family),
        title: insight.title,
        description: insight.body,
        recommendation: getSuggestionFromInsight(insight),
        score: insight.score * 100, // Convert 0-1 to 0-100
        severity: mapScoreToSeverity(insight.score),
        metricName: insight.metric,
        currentValue: 0, // Not always available in new system
        baselineValue: null,
        deviation: 0,
      });
    }
  } catch (error: any) {
    console.error(`[DailyInsights] Dynamic engine error:`, error);
    result.errors.push(`Dynamic engine: ${error.message}`);
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
      
      // HOLISTIC APPROACH: Collect ALL symptom data first
      const allSymptomData: SymptomInsightData[] = [];
      
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
          
          // Collect insight data for holistic analysis
          allSymptomData.push({
            symptom,
            features,
            rulesHit,
            priority,
            signals: healthSignals,
          });
        } catch (error: any) {
          console.error(`[DailyInsights] Error analyzing symptom ${symptom.name}:`, error);
          result.errors.push(`Symptom ${symptom.name}: ${error.message}`);
        }
      }
      
      // Generate HOLISTIC assessment combining ALL symptoms
      if (allSymptomData.length > 0) {
        console.log(`[DailyInsights] Generating HOLISTIC assessment for ${allSymptomData.length} symptoms...`);
        const { generateHolisticSymptomAssessment } = await import('./symptomInsightGeneration');
        const holisticInsights = await generateHolisticSymptomAssessment(allSymptomData, healthSignals);
        
        symptomInsights.push(...holisticInsights);
        console.log(`[DailyInsights] Generated ${holisticInsights.length} holistic symptom insights for user ${userId}`);
      }
      
      console.log(`[DailyInsights] Total symptom insights: ${symptomInsights.length}`);
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
    ...symptomInsights.map((si, idx) => ({
      category: si.category,
      title: si.title,
      description: si.description,
      recommendation: si.recommendations.join('\n'),
      score: si.score,
      severity: si.severity,
      metricName: `symptoms_${idx}`, // Unique metric name for each symptom insight
      currentValue: 0, // Not applicable
      baselineValue: null,
      deviation: 0,
      // Preserve diagnostic assessment fields for symptom insights
      ...(si.possibleCauses && {
        triageReason: si.triageReason,
        vitalsCollected: si.vitalsCollected,
        biomarkersCollected: si.biomarkersCollected,
        possibleCauses: si.possibleCauses,
      }),
    } as any)),
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
      
      // Check if this is a symptom insight (starts with "symptoms_")
      const isSymptomInsight = insight.metricName.startsWith('symptoms_');

      // For notable+ severity deviations, create an actionable recommendation
      // BUT: Symptom insights should ONLY appear in Daily tab (for diagnosis/triage), NOT in AI Coach
      if (['notable', 'significant', 'critical'].includes(insight.severity) && !isSymptomInsight) {
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

      // Build evidence object - includes diagnostic assessment for symptom insights
      const evidence: any = {
        currentValue: insight.currentValue,
        baselineValue: insight.baselineValue,
        deviation: insight.deviation,
        recommendation: insight.recommendation,
      };
      
      // For symptom insights, include comprehensive diagnostic assessment
      if (isSymptomInsight && (insight as any).possibleCauses) {
        evidence.triageReason = (insight as any).triageReason;
        evidence.vitalsCollected = (insight as any).vitalsCollected;
        evidence.biomarkersCollected = (insight as any).biomarkersCollected;
        evidence.possibleCauses = (insight as any).possibleCauses;
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
        evidence,
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
  
  // Emit notification event for top insight (if any were generated)
  // Only send notifications for notable+ severity to avoid low-value alerts
  if (topInsights.length > 0 && result.insightsGenerated > 0) {
    const topInsight = topInsights[0]; // Send notification for the highest priority insight
    const isSymptomInsight = topInsight.metricName.startsWith('symptoms_');
    
    // Filter out "normal" severity insights to reduce notification noise
    if (topInsight.severity !== 'normal') {
      try {
        eventBus.emit('insight:generated', {
          userId,
          title: topInsight.title,
          summary: topInsight.description,
          category: topInsight.category,
          severity: topInsight.severity,
          deepLink: `healthpilot://insights/${todayStr}`,
          priority: topInsight.severity === 'critical' ? 'critical' : topInsight.severity === 'significant' ? 'high' : 'medium',
          date: todayStr,
          insightType: isSymptomInsight ? 'symptom' : 'metric',
        });
        console.log(`[DailyInsights] 📧 Emitted notification event for insight: "${topInsight.title}" (severity: ${topInsight.severity})`);
      } catch (error: any) {
        console.error(`[DailyInsights] Error emitting notification event:`, error);
        result.errors.push(`Notification: ${error.message}`);
      }
    } else {
      console.log(`[DailyInsights] Skipping notification for "normal" severity insight to reduce noise`);
    }
  }
  
  return result;
}

/**
 * Get all active users (simplified - in production would paginate)
 */
async function getAllActiveUsers(): Promise<Array<{ id: string; timezone: string | null }>> {
  const users = await storage.getAllUsersForScheduler();
  return users.map(user => ({
    id: user.id,
    timezone: user.timezone,
  }));
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

/**
 * Map insight family to category
 */
function mapFamilyToCategory(family: string): "sleep" | "recovery" | "performance" | "health" {
  switch (family) {
    case "sleep":
      return "sleep";
    case "cardio":
    case "activity":
      return "performance";
    case "bp":
    case "biomarker":
    case "glucose":
    case "resp":
      return "health";
    case "body_comp":
      return "recovery";
    default:
      return "health";
  }
}

/**
 * Map score (0-1) to severity
 */
function mapScoreToSeverity(score: number): "normal" | "notable" | "significant" | "critical" {
  if (score >= 0.8) return "critical";
  if (score >= 0.6) return "significant";
  if (score >= 0.4) return "notable";
  return "normal";
}

/**
 * Extract suggestion/recommendation from insight body
 */
function getSuggestionFromInsight(insight: any): string {
  // For now, use the body as the recommendation
  // Could be enhanced with specific recommendation extraction
  return insight.body || insight.title;
}
