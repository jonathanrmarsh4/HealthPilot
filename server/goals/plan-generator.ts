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
    gender?: 'male' | 'female';
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
  _weeksToGoal: number
): Promise<void> {
  if (!input.metrics || input.metrics.length === 0) {
    return;
  }

  // Initialize standards manager (seeds DB if needed)
  await standardsManager.initialize();

  // Build user profile from input
  // Note: Gender is required for accurate standards lookup - if not provided, we cannot calculate targets
  if (!input.user_profile?.gender) {
    console.warn('⚠️ Gender not provided in user profile - cannot calculate accurate standards-based targets');
    return; // Skip enrichment if gender is missing - better to have no target than wrong target
  }

  const userProfile = {
    age: input.user_profile?.age || 30, // Default age to 30 if not provided
    gender: input.user_profile.gender,
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

        // Set default target based on current value or mark as pending discovery
        if (currentValue) {
          // Have current value - estimate 10% improvement
          const direction = metric.direction || 'increase';
          const defaultTarget = direction === 'increase' 
            ? currentValue * 1.1 
            : currentValue * 0.9;
          
          (metric as any).targetValue = defaultTarget.toString();
          (metric as any).confidence = 0.5; // Low confidence for estimated targets
          (metric as any).targetSource = 'estimated';
          (metric as any).targetDescription = 'Estimated based on 10% improvement';
        } else {
          // No current value - mark metric for discovery but still provide target
          (metric as any).targetValue = null; // Will skip progression generation
          (metric as any).confidence = 0.0;
          (metric as any).targetSource = 'pending_discovery';
          (metric as any).targetDescription = 'Target pending data collection and standards discovery';
          console.log(`ℹ️ Metric ${metric.metricKey} needs baseline value before target can be calculated`);
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
  _metricKey: string
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
  // Import dependencies
  const { default: OpenAI } = await import('openai');
  const { validateGoalPlanContent } = await import('@shared/types/goal-plans');
  
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const targetDate = input.target_date ? input.target_date.toISOString().split('T')[0] : undefined;
  const userContext = buildUserContextString(input);

  const systemPrompt = `You are HealthPilot's training plan AI. Create a comprehensive, progressive training plan following ACSM/NSCA/WHO guidelines.

GOAL: ${input.display_name}
TYPE: ${input.canonical_goal_type}
TIMELINE: ${weeksToGoal} weeks
TARGET DATE: ${targetDate || 'Not specified'}
${userContext}

PRINCIPLES:
1. Progressive overload: Gradual volume/intensity increase
2. Periodization: Base building → Specific training → Peak → Taper
3. Recovery: Include rest days, deload weeks, and recovery guidance
4. Safety: Start conservative, respect recovery needs
5. Specificity: Tailor sessions to the goal type

REQUIRED OUTPUT STRUCTURE (v2.0):
{
  "planVersion": "2.0",
  "generatedAt": "${new Date().toISOString()}",
  "goalSummary": {
    "goalText": "${input.display_name}",
    "targetDate": "${targetDate || ''}",
    "goalType": "${input.canonical_goal_type}",
    "userAge": ${input.user_profile?.age || null},
    "userFitnessLevel": "${input.user_profile?.fitness_level || 'intermediate'}"
  },
  "planOverview": {
    "totalDurationWeeks": ${weeksToGoal},
    "phasesCount": 3,
    "primaryFocus": "Build aerobic base, specific strength, and goal-specific conditioning",
    "adaptations": ["Personalized based on age and fitness level"]
  },
  "phases": [
    {
      "phaseName": "Base Conditioning",
      "phaseNumber": 1,
      "durationWeeks": 4,
      "objective": "Build aerobic foundation and general strength",
      "focus": ["Low-intensity endurance", "Functional strength", "Mobility"],
      "weeks": [
        {
          "weekNumber": 1,
          "weekLabel": "Week 1",
          "focus": "Establishing base volume",
          "sessions": [
            {
              "sessionTemplateId": "phase1-week1-session1",
              "sessionType": "run",
              "title": "Easy Run",
              "objective": "Build aerobic base at conversational pace",
              "durationMinutes": 30,
              "intensity": "light",
              "heartRateZone": 2,
              "structure": "5 min warmup, 20 min easy pace, 5 min cooldown",
              "notes": "Keep pace conversational - you should be able to talk",
              "recoveryEmphasis": false
            }
          ]
        }
      ]
    }
  ],
  "equipmentGuidance": [
    {
      "equipmentType": "proper running shoes",
      "startPhase": 1,
      "progressionNotes": "Get properly fitted shoes before starting training"
    }
  ],
  "strengthFocus": [
    {
      "movement": "Squats",
      "targetSetsReps": "3x10-12",
      "purpose": "Build leg strength for endurance"
    }
  ],
  "recoveryGuidance": {
    "recoveryStrategies": ["Track sleep quality", "Monitor resting heart rate"],
    "mindsetTips": ["Focus on consistency over intensity"],
    "nutritionGuidance": "Maintain adequate protein (1.6-2g/kg/day) and hydration",
    "healthMonitoring": ["Check with physician before starting"]
  },
  "additionalNotes": "Adjust training based on how you feel. Rest is progress."
}

CRITICAL REQUIREMENTS:
- Use exact schema structure shown above
- Include 3-4 phases with complete weekly breakdowns
- Each week must have 3-6 sessions with detailed structure
- Include sessionTemplateId for each session (format: "phaseX-weekY-sessionZ")
- Specify session types: run, hike, bike, swim, strength, intervals, tempo, long_endurance, hill_repeats, recovery, rest
- Include equipment guidance, strength focus, and recovery guidance
- All duration/distance/intensity fields must be appropriate for goal type`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create a comprehensive v2.0 training plan for: ${input.display_name}. Timeline: ${weeksToGoal} weeks. Include ALL required fields: phases with weeks and sessions, equipment guidance, strength focus, and recovery guidance.` },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
      max_tokens: 4096,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No training plan generated');
    }

    const planContent = JSON.parse(content);
    
    // Validate against v2.0 schema
    const validation = validateGoalPlanContent(planContent);
    if (!validation.success) {
      console.error('❌ AI generated invalid v2.0 plan structure:', validation.error);
      throw new Error('Invalid plan structure - falling back to default');
    }

    console.log('✅ Generated valid v2.0 training plan with', validation.data!.phases.length, 'phases');

    return {
      goalId: input.goal_id,
      planType: 'training',
      period: 'weekly',
      contentJson: validation.data,
      version: 2, // v2.0 schema
      sourcePromptHash: null,
      isActive: 1,
    };
  } catch (error) {
    console.error('Error generating AI training plan:', error);
    // Fallback to deterministic v2.0 plan
    return generateFallbackTrainingPlan(input, weeksToGoal);
  }
}

/**
 * Build user context string for AI prompt
 */
function buildUserContextString(input: GeneratePlanInput): string {
  const parts: string[] = [];
  
  if (input.user_profile?.age) {
    parts.push(`AGE: ${input.user_profile.age} years`);
  }
  if (input.user_profile?.gender) {
    parts.push(`GENDER: ${input.user_profile.gender}`);
  }
  if (input.user_profile?.fitness_level) {
    parts.push(`FITNESS LEVEL: ${input.user_profile.fitness_level}`);
  }
  if (input.user_profile?.weight) {
    parts.push(`WEIGHT: ${input.user_profile.weight}kg`);
  }
  if (input.user_profile?.medical_conditions && input.user_profile.medical_conditions.length > 0) {
    parts.push(`MEDICAL CONDITIONS: ${input.user_profile.medical_conditions.join(', ')}`);
  }
  
  return parts.length > 0 ? '\n' + parts.join('\n') : '';
}

/**
 * Generate nutrition plan based on goal and biomarkers
 */
async function generateNutritionPlan(
  input: GeneratePlanInput,
  _weeksToGoal: number
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
  _weeksToGoal: number
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
  const targetDate = input.target_date ? input.target_date.toISOString().split('T')[0] : '';
  
  // Generate v2.0 compliant fallback plan with basic structure
  const phase1Weeks = Math.max(2, Math.floor(weeksToGoal * 0.4));
  const phase2Weeks = Math.max(2, Math.floor(weeksToGoal * 0.4));
  const phase3Weeks = Math.max(1, weeksToGoal - phase1Weeks - phase2Weeks);

  const content = {
    planVersion: '2.0',
    generatedAt: new Date().toISOString(),
    goalSummary: {
      goalText: input.display_name,
      targetDate,
      goalType: input.canonical_goal_type,
      userAge: input.user_profile?.age || null,
      userFitnessLevel: input.user_profile?.fitness_level || 'intermediate',
    },
    planOverview: {
      totalDurationWeeks: weeksToGoal,
      phasesCount: 3,
      primaryFocus: 'Progressive training toward goal achievement',
      adaptations: ['Standard progression plan - customize based on your needs'],
    },
    phases: [
      {
        phaseName: 'Foundation Phase',
        phaseNumber: 1,
        durationWeeks: phase1Weeks,
        objective: 'Build base fitness and establish training routine',
        focus: ['Aerobic conditioning', 'Movement patterns', 'Consistency'],
        weeks: generateGenericWeeks(1, phase1Weeks, 'foundation'),
      },
      {
        phaseName: 'Progressive Overload',
        phaseNumber: 2,
        durationWeeks: phase2Weeks,
        objective: 'Gradual increase in training volume and intensity',
        focus: ['Progressive loading', 'Skill development', 'Volume increase'],
        weeks: generateGenericWeeks(2, phase2Weeks, 'build'),
      },
      {
        phaseName: 'Taper & Peak',
        phaseNumber: 3,
        durationWeeks: phase3Weeks,
        objective: 'Reduce fatigue while maintaining fitness',
        focus: ['Recovery', 'Freshness', 'Goal preparation'],
        weeks: generateGenericWeeks(3, phase3Weeks, 'taper'),
      },
    ],
    equipmentGuidance: [
      {
        equipmentType: 'appropriate training gear',
        startPhase: 1,
        progressionNotes: 'Ensure proper equipment before starting training',
      },
    ],
    strengthFocus: [
      {
        movement: 'Compound movements',
        targetSetsReps: '3x8-12',
        purpose: 'Build foundational strength',
      },
    ],
    recoveryGuidance: {
      recoveryStrategies: ['Adequate sleep (7-9 hours)', 'Active recovery days', 'Monitor fatigue levels'],
      mindsetTips: ['Focus on consistency over intensity', 'Progress is not always linear'],
      nutritionGuidance: 'Balanced diet with adequate protein and hydration',
      healthMonitoring: ['Consult healthcare provider before starting', 'Listen to your body'],
    },
    additionalNotes: 'This is a template plan. Adjust based on your individual response and recovery.',
  };

  return {
    goalId: input.goal_id,
    planType: 'training',
    period: 'weekly',
    contentJson: content,
    version: 2, // v2.0 schema
    sourcePromptHash: null,
    isActive: 1,
  };
}

/**
 * Generate generic weeks for fallback plan
 */
function generateGenericWeeks(
  phaseNumber: number,
  weekCount: number,
  phaseType: 'foundation' | 'build' | 'taper'
): Array<any> {
  const weeks = [];
  
  for (let weekNum = 1; weekNum <= weekCount; weekNum++) {
    const sessionsPerWeek = phaseType === 'taper' ? 3 : 4;
    const sessions = [];
    
    for (let sessionNum = 1; sessionNum <= sessionsPerWeek; sessionNum++) {
      sessions.push({
        sessionTemplateId: `phase${phaseNumber}-week${weekNum}-session${sessionNum}`,
        sessionType: sessionNum === sessionsPerWeek ? 'rest' : 'run',
        title: sessionNum === sessionsPerWeek ? 'Rest Day' : `Training Session ${sessionNum}`,
        objective: sessionNum === sessionsPerWeek ? 'Recovery' : 'Build fitness',
        durationMinutes: sessionNum === sessionsPerWeek ? 0 : 30 + (weekNum * 5),
        intensity: phaseType === 'taper' ? 'light' : (phaseType === 'foundation' ? 'light' : 'moderate'),
        structure: sessionNum === sessionsPerWeek ? 'Complete rest or light stretching' : 'Warmup, main work, cooldown',
        notes: 'Adjust based on how you feel',
        recoveryEmphasis: sessionNum === sessionsPerWeek,
      });
    }
    
    weeks.push({
      weekNumber: weekNum,
      weekLabel: `Week ${weekNum}`,
      focus: `${phaseType} training`,
      sessions,
    });
  }
  
  return weeks;
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
