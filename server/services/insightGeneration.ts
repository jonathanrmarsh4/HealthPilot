import OpenAI from 'openai';
import { DeviationResult } from './thresholdDetection';
import { storage } from '../storage';

/**
 * Insight Generation Service
 * 
 * Uses GPT-4o to generate human-readable, actionable health insights from detected deviations.
 * Implements strict quality control with scoring, ranking, and max-3 constraint.
 */

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedInsight {
  category: string; // e.g., "sleep", "recovery", "performance", "health"
  title: string; // Short, attention-grabbing headline
  description: string; // 2-3 sentences explaining the deviation with specific numbers
  recommendation: string; // Specific, actionable advice
  score: number; // 0-100, higher = more important/actionable
  severity: 'normal' | 'notable' | 'significant' | 'critical';
  metricName: string;
  currentValue: number;
  baselineValue: number | null;
  deviation: number; // Percentage deviation
}

/**
 * Generate AI insight from a deviation
 */
export async function generateInsightFromDeviation(
  userId: string,
  deviation: DeviationResult,
  observedAt: Date
): Promise<GeneratedInsight | null> {
  if (!deviation.detected) {
    return null; // No deviation, no insight
  }

  // Get user context for personalization
  const user = await storage.getUser(userId);
  const fitnessProfile = await storage.getFitnessProfile(userId);
  
  const userContext = {
    firstName: user?.firstName || 'User',
    activityLevel: user?.activityLevel || 'moderate',
    goals: fitnessProfile?.goals || [],
  };

  // Build prompt for GPT-4o
  const prompt = buildInsightPrompt(deviation, userContext, observedAt);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      return null;
    }

    const parsed = JSON.parse(content);

    // Validate and return
    return {
      category: parsed.category,
      title: parsed.title,
      description: parsed.description,
      recommendation: parsed.recommendation,
      score: parsed.score,
      severity: deviation.severity,
      metricName: deviation.threshold.metricName,
      currentValue: deviation.currentValue,
      baselineValue: deviation.baselineValue,
      deviation: deviation.percentageDeviation,
    };
  } catch (error) {
    console.error('[InsightGeneration] Error generating insight:', error);
    return null;
  }
}

/**
 * Rank and select top 3 insights from a list
 */
export function selectTopInsights(insights: GeneratedInsight[], maxInsights: number = 3): GeneratedInsight[] {
  // Sort by score (descending), then by severity
  const severityOrder = { critical: 4, significant: 3, notable: 2, normal: 1 };
  
  const sorted = insights.sort((a, b) => {
    // First by score
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Then by severity
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  return sorted.slice(0, maxInsights);
}

/**
 * System prompt for insight generation
 */
const SYSTEM_PROMPT = `You are HealthPilot's AI health insights engine. Your role is to analyze health metric deviations and generate actionable, evidence-based insights for users.

GUIDELINES:
1. Be specific: Always include concrete numbers (e.g., "Your HRV dropped 18% from your 14-day average of 45ms to 37ms")
2. Be actionable: Provide clear, specific recommendations (e.g., "Consider reducing training intensity by 20% over the next 2-3 days")
3. Be concise: Title = max 8 words, Description = 2-3 sentences, Recommendation = 1-2 sentences
4. Be evidence-based: Ground insights in clinical/performance research when relevant
5. Maintain a supportive, non-alarmist tone

SCORING CRITERIA (0-100):
- 80-100: Critical deviations requiring immediate attention
- 60-79: Significant deviations with clear action items
- 40-59: Notable deviations worth monitoring
- 0-39: Minor deviations, informational only

OUTPUT FORMAT (JSON):
{
  "category": "sleep|recovery|performance|health",
  "title": "Short, attention-grabbing headline",
  "description": "2-3 sentences with specific numbers explaining the deviation",
  "recommendation": "Specific, actionable advice",
  "score": 75
}`;

/**
 * Build prompt for a specific deviation
 */
function buildInsightPrompt(
  deviation: DeviationResult,
  userContext: { firstName: string; activityLevel: string; goals: string[] },
  observedAt: Date
): string {
  const { threshold, currentValue, baselineValue, percentageDeviation, absoluteDeviation, direction, baselineWindow, severity } = deviation;

  const dateStr = observedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return `Generate a health insight for ${userContext.firstName} (${userContext.activityLevel} activity level).

METRIC: ${threshold.description} (${threshold.metricName})
DATE: ${dateStr}
CURRENT VALUE: ${currentValue.toFixed(1)} ${threshold.unit}
BASELINE (${baselineWindow}-day): ${baselineValue?.toFixed(1)} ${threshold.unit}
DEVIATION: ${direction} by ${Math.abs(percentageDeviation).toFixed(1)}% (${absoluteDeviation > 0 ? '+' : ''}${absoluteDeviation.toFixed(1)} ${threshold.unit})
SEVERITY: ${severity}
GOALS: ${userContext.goals.join(', ') || 'General health and fitness'}

Generate an insight that:
1. Explains this deviation in simple language with specific numbers
2. Provides context about what this might mean for their health/performance
3. Recommends a specific, actionable next step

Return as JSON following the specified format.`;
}

/**
 * Determine category from metric name
 */
export function getCategoryFromMetric(metricName: string): string {
  if (metricName.includes('sleep')) return 'sleep';
  if (metricName.includes('hrv') || metricName.includes('heart_rate') || metricName === 'readiness_score') return 'recovery';
  if (metricName.includes('training') || metricName.includes('steps') || metricName.includes('active_energy')) return 'performance';
  return 'health';
}
