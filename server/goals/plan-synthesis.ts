/**
 * Plan Synthesis - Convert conversational context into structured goals
 * 
 * Takes the extracted context from a goal conversation and synthesizes:
 * - Appropriate goal type and metrics
 * - AI-generated progressive training plans
 * - Milestones tailored to ability level
 * 
 * Key principles:
 * - Beginner goals → session-based metrics (3x/week sessions)
 * - Advanced goals → volume-based metrics (weekly distance/volume)
 * - AI-powered plan generation for comprehensive, phased training
 */

import type { ExtractedContext } from './conversation-intelligence';
import type { InsertGoal, InsertGoalMetric, InsertGoalMilestone, InsertGoalPlan, InsertGoalPlanSession } from '@shared/schema';
import { addWeeks, addMonths, format, differenceInWeeks } from 'date-fns';
import OpenAI from 'openai';
import { validateGoalPlanContent, flattenPlanToSessions, type GoalPlanContent } from '@shared/types/goal-plans';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Initialize OpenAI client (uses AI Integrations if available, falls back to OPENAI_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SynthesizedGoal {
  goal: Omit<InsertGoal, 'id' | 'userId'>;
  metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[];
  milestones: Omit<InsertGoalMilestone, 'id' | 'goalId'>[];
  plans: Omit<InsertGoalPlan, 'id' | 'goalId'>[];
  flattenedSessions?: Omit<InsertGoalPlanSession, 'id' | 'createdAt' | 'updatedAt'>[]; // For Stage 2 scheduling
}

/**
 * Main synthesis function - converts extracted context into structured goal
 */
export async function synthesizeGoal(
  context: ExtractedContext,
  initialInput: string,
  userId: string
): Promise<SynthesizedGoal> {
  const isBeginner = context.fitnessLevel === 'beginner' || context.goalType === 'beginner_fitness';
  const isRunningGoal = initialInput.toLowerCase().includes('run');
  const isStrengthGoal = initialInput.toLowerCase().includes('lift') || initialInput.toLowerCase().includes('strength');

  // Determine goal parameters
  const targetDate = context.targetDetails?.targetDate 
    ? new Date(context.targetDetails.targetDate)
    : addMonths(new Date(), isBeginner ? 3 : 2); // Beginners get more time

  const displayName = generateDisplayName(initialInput, context);

  // Build goal object
  const goal: Omit<InsertGoal, 'id' | 'userId'> = {
    inputText: initialInput,
    name: displayName,
    metricType: null,
    targetValue: 1,
    currentValue: 0,
    startValue: null,
    targetValueData: null,
    currentValueData: null,
    startValueData: null,
    unit: 'completion',
    canonicalGoalType: null,
    goalEntitiesJson: null,
    targetDate,
    deadline: targetDate,
    status: 'active',
    notes: `${context.motivation || 'Personal goal'} - ${context.underlyingNeed || 'Building fitness'}`,
    createdByAI: 1,
  };

  // Build metrics based on fitness level
  const metrics = isBeginner 
    ? buildBeginnerMetrics(context, isRunningGoal)
    : buildAdvancedMetrics(context, isRunningGoal);

  // Build AI-powered training plan
  const { plans, flattenedSessions } = await buildAITrainingPlan(context, initialInput, userId, targetDate);

  // Build AI-powered milestones aligned with training phases
  const milestones = await buildAIMilestones(context, initialInput, targetDate, plans[0]?.contentJson as GoalPlanContent);

  return {
    goal,
    metrics,
    milestones,
    plans,
    flattenedSessions,
  };
}

/**
 * Generate a friendly display name for the goal
 */
function generateDisplayName(initialInput: string, context: ExtractedContext): string {
  // Clean up the initial input
  let name = initialInput.trim();
  
  // Remove common prefixes
  name = name.replace(/^(i want to|i'd like to|i would like to|my goal is to)\s+/i, '');
  
  // Capitalize first letter
  name = name.charAt(0).toUpperCase() + name.slice(1);
  
  return name;
}

/**
 * Build metrics for beginner users
 * Focus on SESSION COUNT, not volume/distance
 */
function buildBeginnerMetrics(context: ExtractedContext, isRunning: boolean): Omit<InsertGoalMetric, 'id' | 'goalId'>[] {
  const sessionsPerWeek = context.timeAvailability?.sessionsPerWeek || 3;
  
  const metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[] = [
    {
      metricKey: 'weekly_sessions',
      label: 'Training Sessions per Week',
      targetValue: String(sessionsPerWeek),
      unit: 'sessions',
      source: 'manual',
      direction: 'achieve',
      baselineValue: '0',
      currentValue: '0',
      confidence: 1.0,
      priority: 1,
    },
    {
      metricKey: 'consistency_streak',
      label: 'Consistency Streak',
      targetValue: '4',
      unit: 'weeks',
      source: 'manual',
      direction: 'increase',
      baselineValue: '0',
      currentValue: '0',
      confidence: 1.0,
      priority: 2,
    },
  ];

  // Add goal-specific metric
  if (isRunning) {
    metrics.push({
      metricKey: 'longest_continuous_run',
      label: 'Longest Continuous Run',
      targetValue: String(context.targetDetails?.distance || 5),
      unit: 'km',
      source: 'manual',
      direction: 'increase',
      baselineValue: '0',
      currentValue: '0',
      confidence: 1.0,
      priority: 3,
    });
  }

  return metrics;
}

/**
 * Build metrics for advanced users
 * Can use volume/distance based tracking
 */
function buildAdvancedMetrics(context: ExtractedContext, isRunning: boolean): Omit<InsertGoalMetric, 'id' | 'goalId'>[] {
  const metrics: Omit<InsertGoalMetric, 'id' | 'goalId'>[] = [];

  if (isRunning) {
    metrics.push({
      metricKey: 'weekly_running_distance',
      label: 'Weekly Running Distance',
      targetValue: '40',
      unit: 'km',
      source: 'healthkit',
      direction: 'increase',
      baselineValue: '0',
      currentValue: '0',
      confidence: 1.0,
      priority: 1,
    });

    metrics.push({
      metricKey: 'long_run_distance',
      label: 'Long Run Distance',
      targetValue: String(context.targetDetails?.distance || 21),
      unit: 'km',
      source: 'healthkit',
      direction: 'increase',
      baselineValue: '0',
      currentValue: '0',
      confidence: 1.0,
      priority: 2,
    });
  }

  return metrics;
}

/**
 * Build AI-powered training plan
 * Uses GPT-4o to generate comprehensive, phased training plans
 */
async function buildAITrainingPlan(
  context: ExtractedContext,
  initialInput: string,
  userId: string,
  targetDate: Date
): Promise<{ 
  plans: Omit<InsertGoalPlan, 'id' | 'goalId'>[], 
  flattenedSessions?: Omit<InsertGoalPlanSession, 'id' | 'createdAt' | 'updatedAt'>[]
}> {
  try {
    // Fetch user health profile
    const userProfile = await fetchUserHealthProfile(userId);
    
    // Calculate timeline
    const weeksUntilTarget = differenceInWeeks(targetDate, new Date());
    const monthsUntilTarget = Math.ceil(weeksUntilTarget / 4);

    // Build comprehensive prompt
    const prompt = buildTrainingPlanPrompt(
      initialInput,
      context,
      userProfile,
      weeksUntilTarget,
      monthsUntilTarget,
      targetDate
    );

    console.log('🤖 Generating AI training plan for:', initialInput);
    
    // Call OpenAI with structured output request
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 16000, // Large token budget for comprehensive plans
      temperature: 0.7, // Some creativity but still focused
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'You are an elite exercise physiologist and strength coach with 20+ years of experience designing evidence-based training programs. You create comprehensive, phased training plans following ACSM, NSCA, and WHO guidelines. CRITICAL: You MUST respond with valid JSON that EXACTLY matches the schema provided. Do NOT add extra fields, do NOT use different field names, do NOT deviate from the specified structure in any way. The JSON will be validated against a strict schema - any deviation will cause failure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse and validate response
    const parsedContent = JSON.parse(content);
    
    // Debug logging (only in development to avoid leaking user data in production)
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment) {
      console.log('🔍 AI generated plan structure:', {
        hasPlanVersion: !!parsedContent.planVersion,
        planVersion: parsedContent.planVersion,
        hasPhases: !!parsedContent.phases,
        phaseCount: parsedContent.phases?.length,
        firstPhaseKeys: parsedContent.phases?.[0] ? Object.keys(parsedContent.phases[0]) : [],
        topLevelKeys: Object.keys(parsedContent),
      });
    }
    
    const validation = validateGoalPlanContent(parsedContent);

    if (!validation.success) {
      console.error('❌ AI plan validation failed:', validation.error?.format());
      if (isDevelopment) {
        console.error('❌ Failing plan structure:', JSON.stringify(parsedContent, null, 2).substring(0, 1000));
      }
      // Fallback to simple plan
      return { plans: [buildFallbackPlan(context, initialInput, targetDate)] };
    }

    const planContent = validation.data!;
    
    console.log(`✅ Generated ${planContent.phases.length}-phase training plan with ${planContent.phases.reduce((sum, p) => sum + p.weeks.length, 0)} weeks`);

    // Store full plan in goal_plans.contentJson
    const plan: Omit<InsertGoalPlan, 'id' | 'goalId'> = {
      planType: 'training',
      period: 'block',
      contentJson: planContent as any,
      version: 1,
      sourcePromptHash: null,
      isActive: 1,
    };

    return {
      plans: [plan],
      // Note: flattenedSessions will be populated when goal is saved in routes.ts
    };

  } catch (error) {
    console.error('❌ Error generating AI training plan:', error);
    // Return fallback plan on error
    return { plans: [buildFallbackPlan(context, initialInput, targetDate)] };
  }
}

/**
 * Fetch user's health profile for personalized plan generation
 */
async function fetchUserHealthProfile(userId: string): Promise<{
  age?: number;
  gender?: string;
  height?: number;
  activityLevel?: string;
  constraints?: string[];
}> {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    
    if (!user) {
      return {};
    }

    // Calculate age from date of birth
    let age: number | undefined;
    if (user.dateOfBirth) {
      const birthDate = new Date(user.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    return {
      age,
      gender: user.gender || undefined,
      height: user.height || undefined,
      activityLevel: user.activityLevel || undefined,
    };
  } catch (error) {
    console.error('Error fetching user health profile:', error);
    return {};
  }
}

/**
 * Build comprehensive AI prompt for training plan generation
 */
function buildTrainingPlanPrompt(
  initialInput: string,
  context: ExtractedContext,
  userProfile: { age?: number; gender?: string; height?: number; activityLevel?: string },
  weeksUntilTarget: number,
  monthsUntilTarget: number,
  targetDate: Date
): string {
  const userContextSection = `
## User Profile:
- Age: ${userProfile.age || 'Not specified'}
- Gender: ${userProfile.gender || 'Not specified'}
- Current Fitness Level: ${context.fitnessLevel || 'intermediate'}
- Activity Level: ${userProfile.activityLevel || context.currentAbility || 'moderate'}
- Current Ability: ${context.currentAbility || 'Building baseline fitness'}

## Goal Information:
- User's Goal: "${initialInput}"
- Target Date: ${format(targetDate, 'MMMM yyyy')} (${monthsUntilTarget} months, ${weeksUntilTarget} weeks from now)
- Motivation: ${context.motivation || 'Personal improvement'}
- Underlying Need: ${context.underlyingNeed || 'Health and fitness'}
${context.targetDetails?.distance ? `- Target Distance: ${context.targetDetails.distance} km` : ''}
${context.targetDetails?.event ? `- Event: ${context.targetDetails.event}` : ''}

## Time Availability:
- Sessions per Week: ${context.timeAvailability?.sessionsPerWeek || 3-4}
- Preferred Days: ${context.timeAvailability?.preferredDays?.join(', ') || 'Flexible'}
- Session Duration: ${context.timeAvailability?.sessionLength || '45-60 minutes'}

## Constraints & Considerations:
${context.constraints && context.constraints.length > 0 ? context.constraints.map(c => `- ${c}`).join('\n') : '- None specified'}
${context.injuries && context.injuries.length > 0 ? `\n## Previous Injuries:\n${context.injuries.map(i => `- ${i}`).join('\n')}` : ''}
`;

  return `${userContextSection}

## Your Task:
Create a COMPREHENSIVE, PHASED training plan that matches or exceeds the quality of professional coaching programs. This plan should leverage the user's actual health data to provide truly personalized guidance.

**CRITICAL REQUIREMENTS:**

1. **Phased Progression Structure:**
   - Divide the ${weeksUntilTarget}-week timeline into 4-6 distinct training phases
   - Each phase should have a clear objective and focus
   - Common phase structure: Base Building → Build → Specific Preparation → Peak → Taper
   - Adapt phase names and focus to the specific goal type

2. **Weekly Detail:**
   - For each week within each phase, provide:
     * Week number and label
     * Weekly focus/objective
     * Complete list of training sessions (typically 3-7 sessions/week)
   - Each session must include:
     * Unique sessionTemplateId (format: "phase{N}-week{N}-session{N}")
     * Session type, title, and objective
     * Duration, distance (if applicable), elevation (for hiking/climbing)
     * Pack weight progression (for hiking/rucking goals)
     * Intensity level and detailed structure
     * Equipment needed
     * Specific notes and coaching cues

3. **Evidence-Based Programming:**
   - Follow ACSM, NSCA, or WHO guidelines appropriate to the goal
   - Progressive overload with appropriate deload weeks
   - Include strength training, conditioning, skill work, and recovery sessions
   - Age-appropriate training volume and intensity
   - Injury prevention and recovery strategies

4. **Goal-Specific Customization:**
   - For endurance events (running, hiking, cycling): Include long sessions, tempo work, intervals, and recovery
   - For strength goals: Include progressive resistance training with specific exercises
   - For hiking/mountaineering: Include pack weight progression, elevation training, equipment adaptation
   - For sports: Include skill development, conditioning, and game-specific work

5. **Additional Guidance:**
   - Equipment adaptation plan (e.g., when to introduce hiking boots, pack weight progression)
   - Strength focus exercises with sets/reps and purpose
   - Recovery and mindset guidance
   - Nutrition recommendations
   - Health monitoring suggestions

**OUTPUT FORMAT - CRITICAL:**
⚠️ **YOU MUST FOLLOW THIS EXACT SCHEMA** ⚠️
STRICT SCHEMA VALIDATION - Any deviation will cause the plan to be rejected.

**PROHIBITED FIELDS** (do NOT include these):
- "program_name", "safety_notes", "progression_rules", "name", "weekly_structure", "type", "duration"

**REQUIRED FIELD NAMES** (use exactly as shown):
- Use "phaseName" NOT "name" for phases
- Use "weeks" array NOT "weekly_structure" 
- Use "durationMinutes" (number) NOT "duration" (string) when specifying duration
- Use "sessionType" from allowed enum only
- Use "intensity" from enum: "very_light", "light", "moderate", "hard", "very_hard" (if provided)

Return ONLY valid JSON with EXACTLY these fields in EXACTLY this structure:

{
  "planVersion": "2.0",
  "generatedAt": "${new Date().toISOString()}",
  "goalSummary": {
    "goalText": "${initialInput}",
    "targetDate": "${format(targetDate, 'yyyy-MM-dd')}",
    "goalType": "endurance_event" | "strength" | "body_composition" | "skill_development" | "health_improvement",
    "userAge": ${userProfile.age || null},
    "userFitnessLevel": "${context.fitnessLevel || 'intermediate'}"
  },
  "planOverview": {
    "totalDurationWeeks": ${weeksUntilTarget},
    "phasesCount": <number of phases>,
    "primaryFocus": "<brief description of the plan's main focus>",
    "adaptations": ["<personalized adaptations based on age/fitness/constraints>"]
  },
  "phases": [
    {
      "phaseName": "<e.g., Base Conditioning>",
      "phaseNumber": 1,
      "durationWeeks": <number>,
      "objective": "<what this phase accomplishes>",
      "focus": ["<key training focuses>"],
      "weeks": [
        {
          "weekNumber": 1,
          "weekLabel": "Week 1" | "Base Week 1",
          "focus": "<this week's focus>",
          "totalVolume": { "value": <number>, "unit": "km" | "hours" | "sessions" },
          "sessions": [
            {
              "sessionTemplateId": "phase1-week1-session1",
              "sessionType": "run" | "hike" | "bike" | "swim" | "strength" | "cross_training" | "recovery" | "flexibility" | "intervals" | "tempo" | "long_endurance" | "hill_repeats" | "stairs" | "equipment_adaptation" | "rest",
              "title": "<session name>",
              "objective": "<what this session accomplishes>",
              "durationMinutes": <number> (optional but recommended),
              "distance": { "value": <number>, "unit": "km" | "mi" | "meters" | "feet" } (optional),
              "elevation": { "value": <number>, "unit": "m" | "ft" } (optional),
              "packWeight": { "value": <number>, "unit": "kg" | "lbs" } (optional),
              "intensity": "very_light" | "light" | "moderate" | "hard" | "very_hard" (optional),
              "perceivedExertionTarget": <1-10> (optional),
              "structure": "<detailed workout structure>",
              "equipment": ["<required equipment>"] (optional),
              "notes": "<coaching cues and tips>" (optional)
            }
          ]
        }
      ]
    }
  ],
  "equipmentGuidance": [
    {
      "equipmentType": "<e.g., hiking boots>",
      "startPhase": <phase number>,
      "progressionNotes": "<how to progress with this equipment>"
    }
  ],
  "strengthFocus": [
    {
      "movement": "<exercise name>",
      "targetSetsReps": "<e.g., 3x12>",
      "purpose": "<why this exercise>"
    }
  ],
  "recoveryGuidance": {
    "recoveryStrategies": ["<recovery recommendations>"],
    "mindsetTips": ["<mental preparation tips>"],
    "nutritionGuidance": "<nutrition recommendations>",
    "healthMonitoring": ["<health checks to schedule>"]
  },
  "additionalNotes": "<any other important context or recommendations>"
}

**QUALITY STANDARDS:**
- Your plan should be as detailed and comprehensive as the best professional coaching programs
- Each session should have clear purpose and progression
- Include specific numbers (distance, duration, sets, reps, pack weight, etc.)
- Provide actionable coaching cues and tips
- Make it progressive but achievable for the user's fitness level
- Personalize based on the user's age, constraints, and specific goal

Generate the complete training plan now:`;
}

/**
 * Build AI-powered milestones aligned with training phases
 */
async function buildAIMilestones(
  context: ExtractedContext,
  initialInput: string,
  targetDate: Date,
  planContent?: GoalPlanContent
): Promise<Omit<InsertGoalMilestone, 'id' | 'goalId'>[]> {
  // If we have a structured plan, extract milestones from phases
  if (planContent && planContent.phases) {
    const milestones: Omit<InsertGoalMilestone, 'id' | 'goalId'>[] = [];
    let accumulatedWeeks = 0;

    planContent.phases.forEach((phase, phaseIndex) => {
      // Add milestone at end of each phase
      accumulatedWeeks += phase.durationWeeks;
      const phaseEndDate = addWeeks(new Date(), accumulatedWeeks);

      milestones.push({
        title: `Complete ${phase.phaseName}`,
        description: phase.objective,
        dueDate: phaseEndDate,
        completionRule: null,
        status: 'pending',
        progressPct: 0,
      });
    });

    // Add final goal achievement milestone
    milestones.push({
      title: 'Goal Achieved!',
      description: `Successfully complete: ${initialInput}`,
      dueDate: targetDate,
      completionRule: null,
      status: 'pending',
      progressPct: 0,
    });

    return milestones;
  }

  // Fallback: Generate simple time-based milestones
  const weeks = Math.floor((targetDate.getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000));
  return [
    {
      title: 'First month complete',
      description: 'Build consistent training habit',
      dueDate: addWeeks(new Date(), 4),
      completionRule: null,
      status: 'pending',
      progressPct: 0,
    },
    {
      title: 'Halfway checkpoint',
      description: 'Significant progress toward goal',
      dueDate: addWeeks(new Date(), Math.floor(weeks / 2)),
      completionRule: null,
      status: 'pending',
      progressPct: 0,
    },
    {
      title: 'Goal achieved!',
      description: context.motivation || initialInput,
      dueDate: targetDate,
      completionRule: null,
      status: 'pending',
      progressPct: 0,
    },
  ];
}

/**
 * Fallback plan when AI generation fails
 */
function buildFallbackPlan(
  context: ExtractedContext,
  initialInput: string,
  targetDate: Date
): Omit<InsertGoalPlan, 'id' | 'goalId'> {
  return {
    planType: 'training',
    period: 'weekly',
    contentJson: {
      name: 'Basic Training Plan',
      description: `Progressive training plan for: ${initialInput}`,
      sessionsPerWeek: context.timeAvailability?.sessionsPerWeek || 3,
      constraints: context.constraints || [],
      notes: 'AI plan generation temporarily unavailable. This is a basic framework - consult with a qualified coach for personalized guidance.',
    } as any,
    version: 1,
    sourcePromptHash: null,
    isActive: 1,
  };
}
