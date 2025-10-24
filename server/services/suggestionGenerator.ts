import OpenAI from "openai";
import { MetricDeficit } from "./metricMonitor";
import { db } from "../db";
import { users, fitnessProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({ 
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return openaiInstance;
}

interface ActivitySuggestion {
  suggestedActivity: string;
  activityType: string;
  duration: number;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
}

export class SuggestionGeneratorService {
  /**
   * Generate a contextual activity suggestion based on metric deficit
   */
  async generateSuggestion(
    userId: string,
    deficit: MetricDeficit
  ): Promise<ActivitySuggestion> {
    // Get user context
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    const fitnessProfile = await db.select().from(fitnessProfiles).where(eq(fitnessProfiles.userId, userId)).limit(1);

    const currentHour = new Date().getHours();
    const timeOfDay = this.getTimeOfDay(currentHour);
    const weather = await this.getWeatherContext(); // Could enhance with real weather API

    // Build context for AI
    const userContext = {
      timeOfDay,
      currentHour,
      weather,
      activityLevel: user[0]?.activityLevel || 'moderate',
      fitnessLevel: fitnessProfile[0]?.fitnessLevel || 'intermediate',
      hasGymAccess: fitnessProfile[0]?.hasGymAccess === 1,
      homeEquipment: fitnessProfile[0]?.homeEquipment || [],
      preferredWorkoutTypes: fitnessProfile[0]?.preferredWorkoutTypes || []
    };

    // Generate suggestion based on metric type
    switch (deficit.metricType) {
      case 'steps':
        return await this.generateStepsSuggestion(deficit, userContext);
      case 'active_minutes':
        return await this.generateActiveMinutesSuggestion(deficit, userContext);
      case 'sleep':
        return await this.generateSleepRecoverySuggestion(deficit, userContext);
      case 'supplements':
        return await this.generateSupplementReminder(deficit, userContext);
      case 'workouts':
        return await this.generateWorkoutSuggestion(deficit, userContext);
      default:
        throw new Error(`Unknown metric type: ${deficit.metricType}`);
    }
  }

  /**
   * Generate steps suggestion
   */
  private async generateStepsSuggestion(
    deficit: MetricDeficit,
    context: any
  ): Promise<ActivitySuggestion> {
    // Calculate duration needed (rough estimate: 100 steps per minute at moderate pace)
    const stepsNeeded = deficit.deficit;
    const estimatedMinutes = Math.ceil(stepsNeeded / 100);
    const duration = Math.min(Math.max(estimatedMinutes, 15), 60); // Between 15-60 min

    const prompt = `You are a health coach. A user is ${stepsNeeded} steps behind their daily goal. It's ${context.timeOfDay} (${context.currentHour}:00). 
    
Context:
- Activity level: ${context.activityLevel}
- Weather: ${context.weather}
- Preferred activities: ${context.preferredWorkoutTypes.join(', ') || 'general fitness'}

Generate a brief, motivating activity suggestion (max 10 words) that will help them get ~${stepsNeeded} steps. Be specific and contextual to the time of day and weather.

Examples:
- "30-minute walk around your neighborhood"
- "Quick evening stroll to the park"
- "15-minute power walk before dinner"

Return ONLY the activity suggestion, no explanation.`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 50
    });

    const suggestedActivity = response.choices[0].message.content?.trim() || `${duration}-minute walk`;

    return {
      suggestedActivity,
      activityType: 'walk',
      duration,
      reasoning: `You're ${stepsNeeded} steps behind your goal. A ${duration}-minute ${context.timeOfDay} walk would help you get back on track and maintain your daily streak.`,
      priority: deficit.priority
    };
  }

  /**
   * Generate active minutes suggestion
   */
  private async generateActiveMinutesSuggestion(
    deficit: MetricDeficit,
    context: any
  ): Promise<ActivitySuggestion> {
    const minutesNeeded = deficit.deficit;
    const duration = Math.min(Math.max(minutesNeeded, 15), 45);

    const prompt = `You are a fitness coach. A user needs ${minutesNeeded} more active minutes today. It's ${context.timeOfDay} (${context.currentHour}:00).

Context:
- Fitness level: ${context.fitnessLevel}
- Has gym access: ${context.hasGymAccess ? 'yes' : 'no'}
- Available equipment: ${context.homeEquipment.join(', ') || 'none'}
- Preferred workouts: ${context.preferredWorkoutTypes.join(', ') || 'general fitness'}

Generate a brief, specific workout suggestion (max 12 words) that fits the time of day and available resources.

Examples:
- "20-minute HIIT session with bodyweight exercises"
- "Quick evening yoga flow for recovery"
- "15-minute kettlebell circuit"

Return ONLY the activity suggestion, no explanation.`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 50
    });

    const suggestedActivity = response.choices[0].message.content?.trim() || `${duration}-minute workout`;
    const activityType = this.inferActivityType(suggestedActivity);

    return {
      suggestedActivity,
      activityType,
      duration,
      reasoning: `You need ${minutesNeeded} more active minutes to hit your daily goal. This ${duration}-minute ${context.timeOfDay} session will get you there while matching your fitness level.`,
      priority: deficit.priority
    };
  }

  /**
   * Generate sleep recovery suggestion
   */
  private async generateSleepRecoverySuggestion(
    deficit: MetricDeficit,
    context: any
  ): Promise<ActivitySuggestion> {
    const hoursLost = deficit.deficit;

    return {
      suggestedActivity: "Early bedtime for recovery sleep",
      activityType: 'recovery',
      duration: 30, // 30 min earlier bedtime
      reasoning: `You got ${hoursLost.toFixed(1)} hours less sleep than your goal last night. Going to bed 30 minutes earlier tonight will help you recover and maintain your sleep consistency.`,
      priority: 'low'
    };
  }

  /**
   * Generate supplement reminder
   */
  private async generateSupplementReminder(
    deficit: MetricDeficit,
    context: any
  ): Promise<ActivitySuggestion> {
    return {
      suggestedActivity: "Take your daily supplements",
      activityType: 'supplements',
      duration: 5,
      reasoning: `You haven't logged your supplements today. Taking them now ensures you stay consistent with your health routine.`,
      priority: 'low'
    };
  }

  /**
   * Generate workout suggestion
   */
  private async generateWorkoutSuggestion(
    deficit: MetricDeficit,
    context: any
  ): Promise<ActivitySuggestion> {
    const prompt = `You are a fitness coach. A user hasn't worked out today. It's ${context.timeOfDay} (${context.currentHour}:00).

Context:
- Fitness level: ${context.fitnessLevel}
- Has gym access: ${context.hasGymAccess ? 'yes' : 'no'}
- Available equipment: ${context.homeEquipment.join(', ') || 'none'}
- Preferred workouts: ${context.preferredWorkoutTypes.join(', ') || 'general fitness'}

Generate a brief, motivating workout suggestion (max 12 words) that fits the time and resources.

Examples:
- "Evening strength session with dumbbells"
- "Quick bodyweight circuit before dinner"
- "Relaxing yoga flow to wind down"

Return ONLY the activity suggestion, no explanation.`;

    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 50
    });

    const suggestedActivity = response.choices[0].message.content?.trim() || "30-minute workout session";
    const activityType = this.inferActivityType(suggestedActivity);

    return {
      suggestedActivity,
      activityType,
      duration: 30,
      reasoning: `You haven't trained today yet. This ${context.timeOfDay} session will keep you on track with your fitness goals and maintain your workout consistency.`,
      priority: 'medium'
    };
  }

  /**
   * Infer activity type from suggestion text
   */
  private inferActivityType(suggestion: string): string {
    const lower = suggestion.toLowerCase();
    
    if (lower.includes('walk')) return 'walk';
    if (lower.includes('run') || lower.includes('jog')) return 'run';
    if (lower.includes('hiit') || lower.includes('circuit')) return 'hiit';
    if (lower.includes('strength') || lower.includes('weights') || lower.includes('lifting')) return 'strength';
    if (lower.includes('yoga')) return 'yoga';
    if (lower.includes('cardio') || lower.includes('bike') || lower.includes('cycling')) return 'cardio';
    if (lower.includes('stretch')) return 'stretching';
    
    return 'workout';
  }

  /**
   * Get weather context (simplified - could integrate real weather API)
   */
  private async getWeatherContext(): Promise<string> {
    // For now, return generic - could integrate OpenWeather API
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 18) {
      return 'clear daytime';
    }
    return 'evening';
  }

  /**
   * Get time of day
   */
  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
}

export const suggestionGenerator = new SuggestionGeneratorService();
