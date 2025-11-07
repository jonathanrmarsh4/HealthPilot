/**
 * NLP Goal Parser - Extract canonical goal types and entities from natural language
 * Uses OpenAI to parse free-text goals like "Run NYC Marathon under 4 hours"
 * into structured format with canonical_goal_type and extracted entities.
 */

import { getCanonicalGoalType, CANONICAL_GOAL_TYPES } from './seed-data';

export interface ParsedGoal {
  canonical_goal_type: string;
  display_name: string;
  entities: Record<string, any>;
  target_date?: string; // ISO-8601
  confidence: number; // 0-1
  reasoning: string;
}

export interface ParseGoalOptions {
  user_id?: string;
  user_profile?: {
    current_weight?: number;
    height?: number;
    age?: number;
    fitness_level?: string;
  };
}

/**
 * Parse a natural language goal into structured format
 */
export async function parseGoal(
  inputText: string,
  _options?: ParseGoalOptions
): Promise<ParsedGoal> {
  // Import OpenAI client lazily to avoid issues with instrumentation setup
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const goalTypes = CANONICAL_GOAL_TYPES.map(t => ({
    type: t.type,
    display_name: t.display_name,
    description: t.description,
  }));

  const systemPrompt = `You are HealthPilot's goal parsing AI. Your job is to convert free-text health and fitness goals into structured, measurable formats.

CANONICAL GOAL TYPES:
${JSON.stringify(goalTypes, null, 2)}

TASK:
1. Analyze the user's input goal
2. Map it to the most appropriate canonical_goal_type
3. Extract key entities (event_name, distance_km, target_time, target_weight, target_date, etc.)
4. Normalize all units to SI/ISO standards
5. Infer reasonable target dates if not specified
6. Provide a confidence score (0-1)

RULES:
- Always choose ONE canonical type that best fits
- Extract ALL relevant entities from the text
- Normalize distances to km, weight to kg, dates to ISO-8601
- For "hybrid" goals with multiple domains, choose 'hybrid' type
- Be conservative with target dates - prefer realistic timelines
- If no date specified, infer based on goal type and difficulty

IMPORTANT CLASSIFICATION GUIDELINES:
- Use "endurance_event" ONLY when training for a specific race/event (marathon, triathlon, etc.)
- Use "health_marker" for standalone cardiovascular metrics (resting heart rate, HRV, blood pressure) WITHOUT an event context
- If someone wants to "reduce resting heart rate to 70", that's a health_marker goal, NOT endurance_event
- If someone wants to "run a marathon under 4 hours", that's endurance_event
- Use "strength" for lifting/resistance training goals
- Use "body_comp" for weight loss/gain or body composition goals
- Use "habit" for consistency/streak-based goals

OUTPUT FORMAT (JSON):
{
  "canonical_goal_type": "endurance_event|body_comp|strength|habit|health_marker|hybrid",
  "display_name": "Clear, user-friendly goal name",
  "entities": {
    // Type-specific entities:
    // endurance_event: event_name, distance_km, target_time_hms, location
    // body_comp: target_weight_kg, current_weight_kg, target_body_fat_pct, timeframe_weeks
    // strength: exercise_name, target_weight_kg, target_reps, lift_type
    // habit: habit_name, frequency_per_week, duration_minutes
    // health_marker: marker_name, target_value, unit, timeframe_weeks
  },
  "target_date": "2025-11-02", // ISO-8601, inferred if not specified
  "confidence": 0.95, // How confident you are in this parsing
  "reasoning": "Brief explanation of your parsing decisions"
}`;

  const userMessage = `Parse this goal: "${inputText}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent parsing
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content) as ParsedGoal;

    // Validate canonical_goal_type
    if (!parsed.canonical_goal_type || !getCanonicalGoalType(parsed.canonical_goal_type)) {
      throw new Error(`Invalid canonical_goal_type: ${parsed.canonical_goal_type}`);
    }

    // Ensure required fields
    if (!parsed.display_name) {
      parsed.display_name = inputText; // Fall back to original input
    }
    if (!parsed.entities) {
      parsed.entities = {};
    }
    if (parsed.confidence === undefined || parsed.confidence === null) {
      parsed.confidence = 0.8; // Default confidence
    }

    return parsed;
  } catch (error) {
    console.error('Error parsing goal:', error);
    
    // Fall back to simple heuristic parsing
    return fallbackGoalParsing(inputText);
  }
}

/**
 * Fallback goal parsing using simple heuristics if AI fails
 */
function fallbackGoalParsing(inputText: string): ParsedGoal {
  const lower = inputText.toLowerCase();
  
  // Endurance event keywords
  if (lower.includes('marathon') || lower.includes('run') || lower.includes('triathlon') || 
      lower.includes('cycling') || lower.includes('swim')) {
    return {
      canonical_goal_type: 'endurance_event',
      display_name: inputText,
      entities: {
        event_name: inputText,
      },
      confidence: 0.6,
      reasoning: 'Fallback: Detected endurance-related keywords',
    };
  }
  
  // Body comp keywords
  if (lower.includes('weight') || lower.includes('lose') || lower.includes('gain') || 
      lower.includes('fat') || lower.includes('kg') || lower.includes('lbs')) {
    return {
      canonical_goal_type: 'body_comp',
      display_name: inputText,
      entities: {},
      confidence: 0.6,
      reasoning: 'Fallback: Detected weight/body composition keywords',
    };
  }
  
  // Strength keywords
  if (lower.includes('lift') || lower.includes('squat') || lower.includes('bench') || 
      lower.includes('deadlift') || lower.includes('strength')) {
    return {
      canonical_goal_type: 'strength',
      display_name: inputText,
      entities: {},
      confidence: 0.6,
      reasoning: 'Fallback: Detected strength training keywords',
    };
  }
  
  // Habit keywords
  if (lower.includes('daily') || lower.includes('habit') || lower.includes('streak') || 
      lower.includes('meditate') || lower.includes('hydrate')) {
    return {
      canonical_goal_type: 'habit',
      display_name: inputText,
      entities: {},
      confidence: 0.6,
      reasoning: 'Fallback: Detected habit-related keywords',
    };
  }
  
  // Health marker keywords
  if (lower.includes('cholesterol') || lower.includes('blood pressure') || 
      lower.includes('glucose') || lower.includes('biomarker') ||
      lower.includes('heart rate') || lower.includes('resting hr') ||
      lower.includes('hrv') || lower.includes('heart rate variability')) {
    return {
      canonical_goal_type: 'health_marker',
      display_name: inputText,
      entities: {},
      confidence: 0.6,
      reasoning: 'Fallback: Detected health marker keywords',
    };
  }
  
  // Default to hybrid
  return {
    canonical_goal_type: 'hybrid',
    display_name: inputText,
    entities: {},
    confidence: 0.5,
    reasoning: 'Fallback: Could not determine specific goal type',
  };
}

/**
 * Validate and sanitize target date
 */
export function validateTargetDate(dateString?: string): Date | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    
    // Must be in the future
    if (date <= now) {
      return null;
    }
    
    // Must be within 5 years
    const fiveYearsFromNow = new Date();
    fiveYearsFromNow.setFullYear(fiveYearsFromNow.getFullYear() + 5);
    if (date > fiveYearsFromNow) {
      return null;
    }
    
    return date;
  } catch {
    return null;
  }
}
