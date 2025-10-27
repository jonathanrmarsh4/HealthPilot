/**
 * Plan Generator - Create training/nutrition/supplement plans with milestones
 * Uses AI to generate adaptive, personalized plans based on goal type, metrics, and user profile
 */

import { getCanonicalGoalType } from './seed-data';
import type { InsertGoalMilestone, InsertGoalPlan, GoalMetric } from '@shared/schema';
import { standardsManager } from './standards-manager';
import { standardsDiscovery } from './standards-discovery';

export interface GeneratePlanInput {
  goal_id: string;
  user_id: string;
  canonical_goal_type: string;
  display_name: string;
  target_date?: Date;
  goal_entities: Record<string, any>;
  metrics: GoalMetric[];
  user_profile?: {
    age?: number;
    weight?: number;
    height?: number;
    fitness_level?: string;
    medical_conditions?: string[];
  };
}

export interface GeneratedPlan {
  milestones: InsertGoalMilestone[];
  training_plan?: InsertGoalPlan;
  nutrition_plan?: InsertGoalPlan;
  supplement_plan?: InsertGoalPlan;
  safety_warnings: string[];
  feasibility_assessment: {
    is_feasible: boolean;
    recommended_adjustments?: string[];
    risk_level: 'low' | 'moderate' | 'high';
  };
}

/**
 * Generate comprehensive plan with milestones, training, nutrition, and supplements
 */
export async function generateComprehensivePlan(
  input: GeneratePlanInput
): Promise<GeneratedPlan> {
  const canonicalType = getCanonicalGoalType(input.canonical_goal_type);
  if (!canonicalType) {
    throw new Error(`Invalid goal type: ${input.canonical_goal_type}`);
  }

  // Calculate timeline
  const weeksToGoal = input.target_date 
    ? Math.max(4, Math.ceil((input.target_date.getTime() - Date.now()) / (7 * 24 * 60 * 60 * 1000)))
    : 12; // Default to 12 weeks if no target date

  // Enrich metrics with target values from standards
  await enrichMetricsWithTargets(input, weeksToGoal);

  // Generate milestones using AI (now with enriched metrics)
  const milestones = await generateMilestones(input, weeksToGoal);

  // Generate plans based on goal type
  const plans: Partial<GeneratedPlan> = {};

  // Training plan (for endurance, strength goals)
  if (['endurance_event', 'strength', 'hybrid'].includes(input.canonical_goal_type)) {
    plans.training_plan = await generateTrainingPlan(input, weeksToGoal);
  }

  // Nutrition plan (for all goal types)
  plans.nutrition_plan = await generateNutritionPlan(input, weeksToGoal);

  // Supplement plan (for all goal types, based on goals and biomarkers)
  plans.supplement_plan = await generateSupplementPlan(input, weeksToGoal);

  // Assess feasibility and safety
  const feasibility = await assessFeasibility(input, weeksToGoal);
  let safetyWarnings: string[];
  try {
    safetyWarnings = await generateSafetyWarnings(input, feasibility);
  } catch (error) {
    console.error('Error generating safety warnings:', error);
    // Fallback to default warnings
    safetyWarnings = getDefaultSafetyWarnings(input.canonical_goal_type);
  }

  return {
    milestones,
    ...plans,
    safety_warnings: safetyWarnings,
    feasibility_assessment: feasibility,
  };
}

/**
 * Enrich metrics with target values using Standards Manager
 * Mutates the metrics array in place to add targetValue, confidence, and source
 */
async function enrichMetricsWithTargets(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<void> {
  if (!input.metrics || input.metrics.length === 0) {
    return;
  }

  // Initialize standards manager (seeds DB if needed)
  await standardsManager.initialize();

  // Build user profile from input
  const userProfile = {
    age: input.user_profile?.age || 30, // Default if not provided
    gender: (input.user_profile?.gender as 'male' | 'female') || 'male',
    bodyweight: input.user_profile?.weight,
    height: input.user_profile?.height,
  };

  // Infer desired level from goal description
  const desiredLevel = standardsManager.inferDesiredLevel(input.display_name);

  for (const metric of input.metrics) {
    try {
      // Get current value (prefer currentValue over baselineValue)
      const currentValue = metric.currentValue 
        ? parseFloat(metric.currentValue) 
        : metric.baselineValue 
          ? parseFloat(metric.baselineValue) 
          : null;

      // Calculate target using standards manager
      const result = await standardsManager.calculateTarget(
        metric.metricKey,
        currentValue,
        input.display_name,
        userProfile,
        desiredLevel
      );

      if (result) {
        // Success! Enrich metric with target data
        (metric as any).targetValue = result.targetValue.toString();
        (metric as any).confidence = result.confidence;
        (metric as any).targetSource = result.source;
        (metric as any).targetDescription = result.description;

        console.log(`✅ Calculated target for ${metric.metricKey}: ${result.targetValue} (from ${result.source})`);

        // Track usage
        await standardsManager.trackStandardUsage(result.standard.id);
      } else {
        // No standard found - trigger AI discovery (fire-and-forget)
        console.log(`⚠️ No standard found for ${metric.metricKey}, triggering discovery...`);
        
        // Fire-and-forget discovery - don't block plan generation
        standardsDiscovery.discoverAndStore(
          metric.metricKey,
          `${input.display_name} - ${metric.label}`
        ).catch(err => {
          console.error(`Error discovering standard for ${metric.metricKey}:`, err);
        });

        // Set default target (10% improvement from current if available)
        if (currentValue) {
          const direction = metric.direction || 'increase';
          const defaultTarget = direction === 'increase' 
            ? currentValue * 1.1 
            : currentValue * 0.9;
          
          (metric as any).targetValue = defaultTarget.toString();
          (metric as any).confidence = 0.5; // Low confidence for estimated targets
          (metric as any).targetSource = 'estimated';
          (metric as any).targetDescription = 'Estimated based on 10% improvement';
        }
      }
    } catch (error) {
      console.error(`Error enriching metric ${metric.metricKey}:`, error);
      // Continue with other metrics
    }
  }
}

/**
 * Build weekly progression from current to target value
 * Returns array of weekly checkpoints with linear or phase-based progression
 */
function buildMetricProgression(
  currentValue: number | null,
  targetValue: number,
  weeks: number,
  metricKey: string
): Array<{ week: number; value: number }> {
  // If no current value, start from 80% of target (conservative)
  const startValue = currentValue || (targetValue * 0.8);
  
  // For now, use simple linear progression
  // TODO: Add phase-aware progression (slow start, faster middle, taper at end)
  const progressionSteps: Array<{ week: number; value: number }> = [];
  const stepSize = (targetValue - startValue) / weeks;

  for (let week = 1; week <= weeks; week++) {
    const value = startValue + (stepSize * week);
    progressionSteps.push({ week, value: Math.round(value * 100) / 100 });
  }

  return progressionSteps;
}

/**
 * Generate milestones based on goal type and timeline
 */
async function generateMilestones(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<InsertGoalMilestone[]> {
  // Import OpenAI client lazily
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  const canonicalType = getCanonicalGoalType(input.canonical_goal_type);

  // Build metric progressions for AI context
  const metricProgressions: Record<string, any[]> = {};
  for (const metric of input.metrics) {
    if ((metric as any).targetValue) {
      const current = metric.currentValue ? parseFloat(metric.currentValue) : null;
      const target = parseFloat((metric as any).targetValue);
      const progression = buildMetricProgression(current, target, weeksToGoal, metric.metricKey);
      metricProgressions[metric.metricKey] = progression;
    }
  }

  const systemPrompt = `You are HealthPilot's goal planning AI. Generate realistic, measurable milestones for a ${input.canonical_goal_type} goal.

GOAL: ${input.display_name}
TIMELINE: ${weeksToGoal} weeks
TARGET DATE: ${input.target_date?.toISOString() || 'Not specified'}

TRACKED METRICS WITH TARGETS:
${input.metrics.map(m => {
  const target = (m as any).targetValue;
  const source = (m as any).targetSource;
  const current = m.currentValue || m.baselineValue || 'unknown';
  if (target) {
    return `- ${m.label}: ${current} → ${target} ${m.unit || ''} (Source: ${source})`;
  }
  return `- ${m.label}: Currently ${current} ${m.unit || ''}`;
}).join('\n')}

METRIC PROGRESSIONS (Weekly Checkpoints):
${Object.entries(metricProgressions).map(([key, prog]) => {
  const metric = input.metrics.find(m => m.metricKey === key);
  return `${metric?.label || key}: ${JSON.stringify(prog.slice(0, 3))}... (showing first 3 weeks)`;
}).join('\n')}

DEFAULT MILESTONES FOR THIS GOAL TYPE:
${JSON.stringify(canonicalType?.default_milestones || [], null, 2)}

TASK:
1. Create ${Math.min(6, Math.max(3, Math.floor(weeksToGoal / 4)))} progressive milestones
2. Space them evenly across the timeline (every ${Math.floor(weeksToGoal / Math.min(6, Math.max(3, Math.floor(weeksToGoal / 4))))} weeks)
3. Make each milestone specific and measurable using the metric progressions above
4. Use actual numeric thresholds from the progressions for completion rules
5. Start with foundation, build to peak, include taper if applicable
6. Include completion rules when possible (metric-based auto-checks)

OUTPUT FORMAT (JSON array):
[
  {
    "title": "Milestone title",
    "description": "Detailed description",
    "due_date": "2025-08-15", // ISO-8601
    "completion_rule": {
      "type": "metric_threshold",
      "metric_key": "weekly_distance_km",
      "operator": ">=",
      "value": 40
    }
  }
]`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate milestones for: ${input.display_name}. Entities: ${JSON.stringify(input.goal_entities)}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No milestones generated');
    }

    const result = JSON.parse(content);
    const milestonesArray = result.milestones || [];

    return milestonesArray.map((m: any) => ({
      goalId: input.goal_id,
      title: m.title,
      description: m.description || null,
      dueDate: new Date(m.due_date),
      completionRule: m.completion_rule || null,
      status: 'pending',
      progressPct: 0,
    }));
  } catch (error) {
    console.error('Error generating milestones:', error);
    // Fall back to default milestones
    return generateDefaultMilestones(input, weeksToGoal);
  }
}

/**
 * Generate training plan for endurance/strength goals
 */
async function generateTrainingPlan(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<InsertGoalPlan> {
  // Import OpenAI client lazily
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const systemPrompt = `You are HealthPilot's training plan AI. Create a progressive, periodized training plan following ACSM/NSCA/WHO guidelines.

GOAL: ${input.display_name}
TYPE: ${input.canonical_goal_type}
TIMELINE: ${weeksToGoal} weeks

PRINCIPLES:
1. Progressive overload: Gradual increase in volume/intensity
2. Periodization: Base building → Specific training → Peak → Taper
3. Recovery: Include rest days and deload weeks
4. Safety: Start conservative, respect recovery needs
5. Individuality: Consider user's current fitness level

OUTPUT FORMAT (JSON):
{
  "program_name": "Plan name",
  "phases": [
    {
      "name": "Base Building",
      "weeks": 4,
      "focus": "Aerobic base, technique",
      "weekly_structure": {
        "days_per_week": 4,
        "sessions": [
          {"type": "easy_run", "duration": "30-45min", "intensity": "Zone 2"},
          {"type": "tempo_run", "duration": "20min", "intensity": "Zone 3"}
        ]
      }
    }
  ],
  "safety_notes": ["Monitor HRV", "Respect recovery"],
  "progression_rules": "Increase weekly volume by max 10%"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create training plan for: ${input.display_name}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No training plan generated');
    }

    const planContent = JSON.parse(content);

    return {
      goalId: input.goal_id,
      planType: 'training',
      period: 'weekly',
      contentJson: planContent,
      version: 1,
      sourcePromptHash: null,
      isActive: 1,
    };
  } catch (error) {
    console.error('Error generating training plan:', error);
    // Fallback to deterministic plan
    return generateFallbackTrainingPlan(input, weeksToGoal);
  }
}

/**
 * Generate nutrition plan based on goal and biomarkers
 */
async function generateNutritionPlan(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<InsertGoalPlan> {
  // Import OpenAI client lazily
  const { default: OpenAI } = await import('openai');
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const systemPrompt = `You are HealthPilot's nutrition AI. Create evidence-based nutrition guidance.

GOAL: ${input.display_name}
TYPE: ${input.canonical_goal_type}

TASK:
1. Provide macro targets (protein, carbs, fats) g/day
2. Suggest nutrient timing strategies
3. Recommend foods to include/avoid
4. Note any special considerations

DISCLAIMER: Not medical advice. Informational purposes only.

OUTPUT FORMAT (JSON):
{
  "macro_targets": {"protein_g": 150, "carbs_g": 250, "fats_g": 70},
  "calorie_target": 2400,
  "timing_strategy": "Pre-workout carbs, post-workout protein",
  "foods_to_include": ["lean protein", "complex carbs"],
  "foods_to_moderate": ["added sugars", "processed foods"],
  "hydration_target_L": 3,
  "notes": "Adjust based on training load"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create nutrition plan for: ${input.display_name}` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No nutrition plan generated');
    }

    const planContent = JSON.parse(content);

    return {
      goalId: input.goal_id,
      planType: 'nutrition',
      period: 'weekly',
      contentJson: planContent,
      version: 1,
      sourcePromptHash: null,
      isActive: 1,
    };
  } catch (error) {
    console.error('Error generating nutrition plan:', error);
    // Fallback to deterministic plan
    return generateFallbackNutritionPlan(input);
  }
}

/**
 * Generate supplement recommendations
 */
async function generateSupplementPlan(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<InsertGoalPlan> {
  return {
    goalId: input.goal_id,
    planType: 'supplements',
    period: 'weekly',
    contentJson: {
      disclaimer: 'Supplement recommendations are for informational purposes only. Consult a healthcare professional before starting any supplement regimen.',
      recommendations: [],
    },
    version: 1,
    sourcePromptHash: null,
    isActive: 1,
  };
}

/**
 * Assess feasibility and identify risks
 */
async function assessFeasibility(
  input: GeneratePlanInput,
  weeksToGoal: number
): Promise<GeneratedPlan['feasibility_assessment']> {
  // Conservative timeline checks
  if (input.canonical_goal_type === 'endurance_event' && weeksToGoal < 12) {
    return {
      is_feasible: false,
      recommended_adjustments: ['Extend timeline to at least 12 weeks for safe endurance training'],
      risk_level: 'high',
    };
  }

  if (input.canonical_goal_type === 'body_comp' && input.goal_entities.target_weight_change_kg) {
    const weightChange = Math.abs(input.goal_entities.target_weight_change_kg);
    const safeWeeklyChange = 0.5; // 0.5kg per week is safe
    const requiredWeeks = Math.ceil(weightChange / safeWeeklyChange);
    
    if (weeksToGoal < requiredWeeks) {
      return {
        is_feasible: false,
        recommended_adjustments: [`Extend timeline to ${requiredWeeks} weeks for safe weight change (0.5kg/week max)`],
        risk_level: 'high',
      };
    }
  }

  return {
    is_feasible: true,
    risk_level: 'low',
  };
}

/**
 * Generate safety warnings based on goal and user profile
 */
async function generateSafetyWarnings(
  input: GeneratePlanInput,
  feasibility: GeneratedPlan['feasibility_assessment']
): Promise<string[]> {
  const warnings: string[] = [
    'This plan is for informational purposes only and does not constitute medical advice.',
    'Consult a healthcare professional before starting any new exercise or nutrition program.',
  ];

  if (!feasibility.is_feasible) {
    warnings.push('⚠️ TIMELINE CONCERN: The current timeline may be too aggressive. Consider the recommended adjustments.');
  }

  if (input.canonical_goal_type === 'endurance_event') {
    warnings.push('Monitor for signs of overtraining: persistent fatigue, elevated resting HR, decreased HRV.');
  }

  if (input.canonical_goal_type === 'health_marker') {
    warnings.push('⚠️ MEDICAL: Work with your healthcare provider to monitor biomarker changes.');
  }

  return warnings;
}

/**
 * Generate default milestones if AI generation fails
 */
function generateDefaultMilestones(
  input: GeneratePlanInput,
  weeksToGoal: number
): InsertGoalMilestone[] {
  const canonicalType = getCanonicalGoalType(input.canonical_goal_type);
  const defaultMilestones = canonicalType?.default_milestones || [
    'Foundation phase complete',
    'Progressive improvement phase complete',
    'Final preparation complete',
  ];
  
  const numMilestones = Math.min(defaultMilestones.length, Math.max(3, Math.floor(weeksToGoal / 4)));
  const weekInterval = Math.floor(weeksToGoal / numMilestones);

  return defaultMilestones.slice(0, numMilestones).map((title, index) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (index + 1) * weekInterval * 7);

    return {
      goalId: input.goal_id,
      title,
      description: null,
      dueDate,
      completionRule: null,
      status: 'pending',
      progressPct: 0,
    };
  });
}

/**
 * Generate fallback training plan if AI fails
 */
function generateFallbackTrainingPlan(
  input: GeneratePlanInput,
  weeksToGoal: number
): InsertGoalPlan {
  const content = {
    program_name: `${input.display_name} - Progressive Training Plan`,
    phases: [
      {
        name: 'Foundation',
        weeks: Math.floor(weeksToGoal * 0.4),
        focus: 'Base building and technique',
        weekly_structure: {
          days_per_week: 3-4,
          note: 'Start conservative, build consistency',
        },
      },
      {
        name: 'Progressive Overload',
        weeks: Math.floor(weeksToGoal * 0.4),
        focus: 'Gradual increase in volume and intensity',
        weekly_structure: {
          days_per_week: 4-5,
          note: 'Increase by max 10% per week',
        },
      },
      {
        name: 'Taper / Peak',
        weeks: Math.floor(weeksToGoal * 0.2),
        focus: 'Reduce volume, maintain intensity',
        weekly_structure: {
          days_per_week: 3,
          note: 'Recovery and preparation',
        },
      },
    ],
    safety_notes: [
      'Monitor for signs of overtraining',
      'Respect recovery needs',
      'Listen to your body',
    ],
    progression_rules: 'Increase weekly volume by max 10%',
  };

  return {
    goalId: input.goal_id,
    planType: 'training',
    period: 'weekly',
    contentJson: content,
    version: 1,
    sourcePromptHash: null,
    isActive: 1,
  };
}

/**
 * Generate fallback nutrition plan if AI fails
 */
function generateFallbackNutritionPlan(input: GeneratePlanInput): InsertGoalPlan {
  const content = {
    note: 'General nutrition guidance - customize based on your needs',
    hydration_target_L: 2.5-3,
    foods_to_include: ['whole foods', 'lean protein', 'vegetables', 'fruits', 'whole grains'],
    foods_to_moderate: ['processed foods', 'added sugars', 'excessive sodium'],
    timing_strategy: 'Eat balanced meals throughout the day',
  };

  return {
    goalId: input.goal_id,
    planType: 'nutrition',
    period: 'weekly',
    contentJson: content,
    version: 1,
    sourcePromptHash: null,
    isActive: 1,
  };
}

/**
 * Generate default safety warnings
 */
function getDefaultSafetyWarnings(goalType: string): string[] {
  const warnings = [
    'This plan is for informational purposes only and does not constitute medical advice.',
    'Consult a healthcare professional before starting any new exercise or nutrition program.',
  ];

  if (goalType === 'endurance_event') {
    warnings.push('Monitor for signs of overtraining: persistent fatigue, elevated resting HR, decreased HRV.');
  } else if (goalType === 'strength') {
    warnings.push('Use proper form to avoid injury. Consider working with a qualified trainer.');
  } else if (goalType === 'health_marker') {
    warnings.push('⚠️ MEDICAL: Work with your healthcare provider to monitor biomarker changes.');
  } else if (goalType === 'body_comp') {
    warnings.push('Aim for gradual, sustainable changes (0.5-1kg per week for weight loss).');
  }

  return warnings;
}
