/**
 * Goal Conversation Intelligence
 * 
 * Implements the "5 whys" methodology for conversational goal creation.
 * Asks adaptive questions to understand:
 * - Current ability/fitness level
 * - Time availability
 * - Underlying motivation
 * - Constraints and preferences
 * - Goal type (beginner fitness vs competitive training)
 */

import type { GoalConversation } from "@shared/schema";

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ExtractedContext {
  currentAbility?: string; // "can run 500m", "never run before", "ran 5k last year"
  timeAvailability?: {
    sessionsPerWeek?: number;
    preferredDays?: string[]; // ["Tuesday", "Thursday", "Saturday"]
    sessionDuration?: number; // minutes
  };
  motivation?: string; // "have more energy", "impress friends", "health reasons"
  constraints?: string[]; // ["knee pain", "busy schedule", "no equipment"]
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  goalType?: 'beginner_fitness' | 'competitive_event' | 'health_marker' | 'strength' | 'habit';
  targetDetails?: {
    distance?: number; // km
    targetDate?: string; // ISO date
    eventName?: string;
    targetValue?: number;
    unit?: string;
  };
  underlyingNeed?: string; // The "real" reason after 5 whys
}

export interface NextQuestion {
  question: string;
  type: 'why' | 'ability' | 'availability' | 'specifics' | 'confirmation';
  rationale: string; // Why we're asking this
}

/**
 * Generate the next question based on conversation history
 */
export async function generateNextQuestion(
  conversation: GoalConversation,
  _userProfile?: { age?: number; gender?: string }
): Promise<NextQuestion> {
  // Import OpenAI client lazily
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const history = (conversation.conversationHistory as ConversationMessage[]) || [];
  const extractedContext = (conversation.extractedContext as ExtractedContext) || {};
  const questionCount = conversation.questionCount;

  // Build context summary for AI
  const systemPrompt = `You are a fitness coach using the "5 Whys" methodology to understand a user's goal deeply.

INITIAL GOAL: "${conversation.initialInput}"

CONVERSATION SO FAR: ${questionCount} questions asked

EXTRACTED CONTEXT:
${JSON.stringify(extractedContext, null, 2)}

YOUR TASK:
Ask ONE targeted question to extract missing information. Follow this priority:

1. **First Question (if questionCount === 0)**: Start with "why" - understand their underlying motivation
   - "That's a great goal! **Why** do you want to ${conversation.initialInput}? What's driving this for you?"
   
2. **Second Question**: Ask about current ability/fitness level
   - For running: "How far can you currently run without stopping?"
   - For strength: "Have you lifted weights before? What's your experience?"
   - For health marker: "What's your current [metric] value if you know it?"
   
3. **Third Question**: Ask about time availability
   - "How many days per week can you realistically commit to training?"
   - "What days work best for you?"
   
4. **Fourth Question**: Dig deeper into motivation (second "why")
   - Based on their first answer, ask: "Why is [their reason] important to you right now?"
   
5. **Fifth Question**: Ask about constraints
   - "Do you have any injuries, limitations, or scheduling constraints I should know about?"
   
6. **Sixth Question**: Confirm details
   - "When would you like to achieve this by?"
   - OR: Get specific numbers if missing

CRITICAL RULES:
- Detect fitness level from their responses:
  * "never run before", "just starting" → beginner_fitness
  * "ran 5k before", "moderate experience" → intermediate  
  * "marathon", "competitive" → competitive_event
  
- If they say "run 5km without stopping" → beginner_fitness goal (NOT marathon training!)
- If they say "run marathon under 4 hours" → competitive_event goal

- Only ask about what's MISSING from extractedContext
- Keep questions conversational and supportive
- Respond to what they just said before asking next question

OUTPUT FORMAT (JSON):
{
  "question": "Your next question here",
  "type": "why|ability|availability|specifics|confirmation",
  "rationale": "Brief explanation of why you're asking this"
}`;

  const userMessage = history.length > 0 
    ? `Last user response: "${history[history.length - 1].content}"\n\nWhat should I ask next?`
    : `This is the first question. Start with asking WHY.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    return JSON.parse(content) as NextQuestion;
  } catch (error) {
    console.error('Error generating next question:', error);
    
    // Fallback to simple question based on count
    return getFallbackQuestion(questionCount, extractedContext, conversation.initialInput);
  }
}

/**
 * Fallback questions if AI fails
 */
function getFallbackQuestion(
  questionCount: number,
  context: ExtractedContext,
  initialInput: string
): NextQuestion {
  if (questionCount === 0) {
    return {
      question: `That's a great goal! Why do you want to ${initialInput}? What's motivating you?`,
      type: 'why',
      rationale: 'Understanding their underlying motivation',
    };
  }

  if (questionCount === 1 && !context.currentAbility) {
    return {
      question: 'What is your current fitness level for this activity? For example, how far can you run/lift/etc. right now?',
      type: 'ability',
      rationale: 'Need to know starting point to set appropriate targets',
    };
  }

  if (questionCount === 2 && !context.timeAvailability) {
    return {
      question: 'How many days per week can you realistically commit to training? And which days work best for you?',
      type: 'availability',
      rationale: 'Need to create a realistic schedule',
    };
  }

  if (questionCount === 3 && !context.motivation) {
    return {
      question: 'Why is this goal important to you right now?',
      type: 'why',
      rationale: 'Digging deeper into motivation',
    };
  }

  if (questionCount === 4 && !context.constraints) {
    return {
      question: 'Do you have any injuries, limitations, or time constraints I should be aware of?',
      type: 'specifics',
      rationale: 'Ensuring plan is safe and realistic',
    };
  }

  // Final confirmation
  return {
    question: 'When would you like to achieve this goal by?',
    type: 'confirmation',
    rationale: 'Setting target date',
  };
}

/**
 * Extract context from user's response using AI
 */
export async function extractContextFromResponse(
  userResponse: string,
  currentContext: ExtractedContext,
  questionType: string
): Promise<Partial<ExtractedContext>> {
  // Import OpenAI client lazily
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const systemPrompt = `Extract structured information from the user's response.

USER RESPONSE: "${userResponse}"
QUESTION TYPE: ${questionType}

Extract ANY of these fields that are mentioned:
- currentAbility: Their current fitness level (e.g., "can run 500m", "never lifted before")
- timeAvailability: {sessionsPerWeek, preferredDays, sessionDuration}
- motivation: Why they want this goal
- constraints: Any limitations, injuries, or issues
- fitnessLevel: beginner | intermediate | advanced (infer from their ability description)
- goalType: beginner_fitness | competitive_event | health_marker | strength | habit
- targetDetails: {distance, targetDate, eventName, targetValue, unit}
- underlyingNeed: The deeper reason (for "why" questions)

CRITICAL FITNESS LEVEL DETECTION:
- "never done before", "just starting", "complete beginner" → beginner
- "some experience", "used to do", "moderate" → intermediate
- "competitive", "advanced", "marathon runner" → advanced

CRITICAL GOAL TYPE DETECTION:
- "run without stopping", "build up to", "first time" → beginner_fitness
- "marathon", "race", "competition", "PR" → competitive_event
- "heart rate", "cholesterol", "blood pressure" → health_marker

OUTPUT FORMAT (JSON):
Return ONLY the fields that were mentioned in the response.
{}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract info from: "${userResponse}"` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return {};
    }

    return JSON.parse(content) as Partial<ExtractedContext>;
  } catch (error) {
    console.error('Error extracting context:', error);
    return {};
  }
}

/**
 * Determine if we have enough context to synthesize a goal
 */
export function hasEnoughContext(context: ExtractedContext): boolean {
  // Minimum requirements:
  // 1. Some sense of current ability
  // 2. Time availability
  // 3. At least one "why" (motivation or underlying need)
  
  const hasAbility = !!context.currentAbility || !!context.fitnessLevel;
  const hasAvailability = !!context.timeAvailability;
  const hasMotivation = !!context.motivation || !!context.underlyingNeed;
  
  return hasAbility && hasAvailability && hasMotivation;
}
