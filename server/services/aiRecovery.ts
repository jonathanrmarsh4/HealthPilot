import Anthropic from "@anthropic-ai/sdk";
import type { IStorage } from "../storage";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface RecoveryContext {
  fitnessProfile: {
    recoveryEquipment: string[];
    activityLevel: string;
    trainingGoals: string[];
    experienceLevel: string;
  };
  readiness: {
    currentScore: number;
    factors: {
      sleep: { score: number; weight: number };
      hrv: { score: number; weight: number };
      restingHR: { score: number; weight: number };
      workloadRecovery: { score: number; weight: number };
    };
    lowFactors: string[];
    trend: string; // 'improving', 'stable', 'declining'
  };
  trainingLoad: {
    recentSessions: Array<{
      type: string;
      intensity: string;
      duration: number;
      date: string;
    }>;
    totalDuration: number;
    averageIntensity: string;
    upcomingWorkouts: Array<{
      type: string;
      day: string;
      intensity: string;
    }>;
  };
  protocolHistory: {
    completedProtocols: string[];
    upvotedCategories: string[];
    downvotedProtocols: string[];
  };
  goals: Array<{
    title: string;
    category: string;
    status: string;
  }>;
}

interface AIRecoveryRecommendation {
  protocolId: string;
  protocolName: string;
  category: string;
  reasoning: string;
  suggestedTiming: string;
  confidence: number;
  priority: number;
}

interface AIRecommendationsResponse {
  recommendations: AIRecoveryRecommendation[];
  overallStrategy: string;
  keyInsights: string[];
}

/**
 * Collects comprehensive context for AI recovery recommendations
 */
export async function collectRecoveryContext(
  userId: string,
  storage: IStorage
): Promise<RecoveryContext> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Fetch all data in parallel
  const [
    fitnessProfile,
    readinessScores,
    workoutSessions,
    trainingSchedule,
    protocolPreferences,
    completions,
    goals,
  ] = await Promise.all([
    storage.getFitnessProfile(userId),
    storage.getReadinessScores(userId, sevenDaysAgo, today),
    storage.getWorkoutSessions(userId, sevenDaysAgo, today),
    storage.getTrainingSchedules(userId),
    storage.getUserProtocolPreferences(userId),
    storage.getProtocolCompletions(userId), // Gets all completions, we'll filter in processing
    storage.getGoals(userId),
  ]);

  // Calculate readiness trend
  const readinessTrend = calculateReadinessTrend(readinessScores);
  const currentReadiness = readinessScores.length > 0 
    ? readinessScores[readinessScores.length - 1] 
    : null;

  // Identify low factors
  const lowFactors: string[] = [];
  if (currentReadiness) {
    if (currentReadiness.sleepScore < 60) lowFactors.push('sleep');
    if (currentReadiness.hrvScore < 60) lowFactors.push('hrv');
    if (currentReadiness.restingHRScore < 60) lowFactors.push('resting_hr');
    if (currentReadiness.workloadScore < 60) lowFactors.push('workload');
  }

  // Process training load
  const recentSessions = workoutSessions.map(session => ({
    type: session.workoutType,
    intensity: session.perceivedEffort ? 
      (session.perceivedEffort >= 8 ? 'high' : session.perceivedEffort >= 5 ? 'moderate' : 'low') : 
      'unknown',
    duration: session.duration,
    date: session.startTime.toISOString().split('T')[0],
  }));

  const totalDuration = recentSessions.reduce((sum, s) => sum + s.duration, 0);
  const avgIntensity = calculateAverageIntensity(recentSessions);

  // Get upcoming workouts
  const upcomingWorkouts = trainingSchedule
    .filter(s => !s.completed && s.day)
    .map(s => ({
      type: s.workoutType,
      day: s.day,
      intensity: s.intensity,
    }))
    .slice(0, 3);

  // Process protocol history (filter last 7 days)
  const recentCompletions = completions.filter(c => {
    const completedDate = new Date(c.date);
    return completedDate >= sevenDaysAgo;
  });
  const completedProtocols = recentCompletions.map(c => c.protocolId);
  const upvotedCategories = Array.from(
    new Set(
      protocolPreferences
        .filter(p => p.preference === 'upvote')
        .map(p => p.protocolId)
    )
  );
  const downvotedProtocols = protocolPreferences
    .filter(p => p.preference === 'downvote')
    .map(p => p.protocolId);

  return {
    fitnessProfile: {
      recoveryEquipment: fitnessProfile?.recoveryEquipment || [],
      activityLevel: fitnessProfile?.activityLevel || 'moderate',
      trainingGoals: fitnessProfile?.trainingGoals || [],
      experienceLevel: fitnessProfile?.experienceLevel || 'intermediate',
    },
    readiness: {
      currentScore: currentReadiness?.score || 50,
      factors: {
        sleep: { 
          score: currentReadiness?.sleepScore || 50, 
          weight: 0.4 
        },
        hrv: { 
          score: currentReadiness?.hrvScore || 50, 
          weight: 0.3 
        },
        restingHR: { 
          score: currentReadiness?.restingHRScore || 50, 
          weight: 0.15 
        },
        workloadRecovery: { 
          score: currentReadiness?.workloadScore || 50, 
          weight: 0.15 
        },
      },
      lowFactors,
      trend: readinessTrend,
    },
    trainingLoad: {
      recentSessions,
      totalDuration,
      averageIntensity: avgIntensity,
      upcomingWorkouts,
    },
    protocolHistory: {
      completedProtocols,
      upvotedCategories,
      downvotedProtocols,
    },
    goals: goals.map(g => ({
      title: g.title,
      category: g.category,
      status: g.status,
    })),
  };
}

/**
 * Calculates readiness trend over the last 7 days
 */
function calculateReadinessTrend(scores: any[]): string {
  if (scores.length < 2) return 'stable';
  
  const recent = scores.slice(-3);
  const older = scores.slice(0, scores.length - 3);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, s) => sum + s.score, 0) / recent.length;
  const olderAvg = older.reduce((sum, s) => sum + s.score, 0) / older.length;
  
  const diff = recentAvg - olderAvg;
  
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

/**
 * Calculates average intensity from recent sessions
 */
function calculateAverageIntensity(sessions: any[]): string {
  if (sessions.length === 0) return 'low';
  
  const intensityMap: Record<string, number> = {
    'high': 3,
    'moderate': 2,
    'low': 1,
    'unknown': 2,
  };
  
  const avg = sessions.reduce((sum, s) => sum + (intensityMap[s.intensity] || 2), 0) / sessions.length;
  
  if (avg >= 2.5) return 'high';
  if (avg >= 1.5) return 'moderate';
  return 'low';
}

/**
 * Generates AI-powered recovery recommendations using Claude
 */
export async function generateAIRecoveryRecommendations(
  context: RecoveryContext,
  availableProtocols: any[]
): Promise<AIRecommendationsResponse> {
  // Build protocol catalog for AI to reference
  const protocolCatalog = availableProtocols.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description,
    duration: p.duration,
    difficulty: p.difficulty,
    benefits: p.benefits,
    targetFactors: p.targetFactors,
  }));

  const systemPrompt = `You are an expert recovery coach and sports scientist specializing in personalized recovery protocols. Your goal is to recommend the most effective recovery strategies based on the user's current state, training load, and available resources.

Guidelines:
- Prioritize protocols that target the user's lowest readiness factors
- Consider the user's available recovery equipment
- Account for recent and upcoming training load
- Respect user preferences (avoid downvoted protocols, favor upvoted categories)
- Provide evidence-based reasoning for each recommendation
- Suggest optimal timing for each protocol
- Consider the user's experience level and goals

Response format: JSON with the following structure:
{
  "recommendations": [
    {
      "protocolId": "protocol-id-from-catalog",
      "protocolName": "Protocol Name",
      "category": "category",
      "reasoning": "Clear explanation of why this protocol is recommended",
      "suggestedTiming": "When to do this (e.g., 'after workouts', 'before bed', 'on rest days')",
      "confidence": 0-100,
      "priority": 1-3 (1=highest)
    }
  ],
  "overallStrategy": "Brief summary of the overall recovery approach",
  "keyInsights": ["insight 1", "insight 2", "insight 3"]
}`;

  const userPrompt = `Based on the following user context and available protocols, recommend the top 3 recovery protocols:

USER CONTEXT:
- Available Equipment: ${context.fitnessProfile.recoveryEquipment.join(', ') || 'None specified'}
- Activity Level: ${context.fitnessProfile.activityLevel}
- Experience Level: ${context.fitnessProfile.experienceLevel}
- Training Goals: ${context.fitnessProfile.trainingGoals.join(', ') || 'General fitness'}

READINESS STATUS:
- Current Score: ${context.readiness.currentScore}/100
- Trend: ${context.readiness.trend}
- Low Factors: ${context.readiness.lowFactors.join(', ') || 'None'}
- Sleep Score: ${context.readiness.factors.sleep.score}/100
- HRV Score: ${context.readiness.factors.hrv.score}/100
- Resting HR Score: ${context.readiness.factors.restingHR.score}/100
- Workload Recovery Score: ${context.readiness.factors.workloadRecovery.score}/100

TRAINING LOAD (Last 7 days):
- Total Training: ${context.trainingLoad.totalDuration} minutes
- Average Intensity: ${context.trainingLoad.averageIntensity}
- Recent Sessions: ${context.trainingLoad.recentSessions.length}
${context.trainingLoad.upcomingWorkouts.length > 0 ? `- Upcoming Workouts: ${context.trainingLoad.upcomingWorkouts.map(w => `${w.type} (${w.intensity})`).join(', ')}` : ''}

PROTOCOL HISTORY:
- Recently Completed: ${context.protocolHistory.completedProtocols.length} protocols
- Downvoted Protocols: ${context.protocolHistory.downvotedProtocols.join(', ') || 'None'}

ACTIVE GOALS:
${context.goals.filter(g => g.status === 'active').map(g => `- ${g.title} (${g.category})`).join('\n') || 'No active goals'}

AVAILABLE PROTOCOLS:
${JSON.stringify(protocolCatalog, null, 2)}

Provide exactly 3 protocol recommendations, ranked by priority. Focus on protocols that:
1. Target the user's low readiness factors
2. Match their available equipment
3. Are not in their downvoted list
4. Consider their training load and recovery needs`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    // Parse AI response
    const aiResponse = JSON.parse(content.text);
    
    return {
      recommendations: aiResponse.recommendations,
      overallStrategy: aiResponse.overallStrategy,
      keyInsights: aiResponse.keyInsights || [],
    };
  } catch (error) {
    console.error("Error generating AI recovery recommendations:", error);
    throw error;
  }
}
