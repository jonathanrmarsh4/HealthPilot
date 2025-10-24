/**
 * HealthPilot Training Generator v2.0 - Pattern-Based Architecture
 * 
 * MAJOR CHANGE: Eliminates ALL fuzzy exercise name matching
 * AI now generates semantic patterns (knee_dominant, horizontal_press, etc.)
 * System deterministically maps patterns → template_ids via RULES
 * 
 * Benefits:
 * - Zero ambiguity in exercise resolution
 * - Muscle balance tracking via pattern-to-muscle mapping
 * - Maintains all AI guardrails (time budget, progressive overload, volume caps)
 */

import OpenAI from "openai";
import type { IStorage } from "../storage";
import { format, subDays } from "date-fns";
import { StructuredWorkoutsKit, type WorkoutPlan, type LiftBlock, type AnyBlock, type Modality } from "./structured-workouts-kit";
import { RULES, PATTERN_TO_MUSCLES, getMusclesForPattern } from "./rules";
import { getOrCreateExerciseForTemplate, type TemplateData } from "./templateExerciseBridge";

// ──────────────────────────────────────────────
// Lazy OpenAI client initialization
// ──────────────────────────────────────────────
let clientInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }
    clientInstance = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return clientInstance;
}

// ──────────────────────────────────────────────
// Build user context from database
// ──────────────────────────────────────────────
export async function buildUserContext(storage: IStorage, userId: string, targetDate: string) {
  const user = await storage.getUser(userId);
  if (!user) throw new Error("User not found");

  const fitnessProfile = await storage.getFitnessProfile(userId);

  // Calculate age
  let age = 30;
  if (user.dateOfBirth) {
    const birthDate = new Date(user.dateOfBirth);
    age = new Date().getFullYear() - birthDate.getFullYear();
  }

  // Get recent training history (last 14 days)
  const startDate = subDays(new Date(targetDate), 14);
  const recentSessions = await storage.getWorkoutSessions(userId, startDate, new Date(targetDate));

  // Build recent training summary
  const recentTraining = await Promise.all(
    recentSessions.slice(0, 7).map(async (session) => {
      const sets = await storage.getSetsForSession(session.id, userId);
      
      // Group sets by exercise
      const exerciseMap = new Map();
      for (const set of sets) {
        if (!exerciseMap.has(set.exerciseId)) {
          const exercise = await storage.getExerciseById(set.exerciseId);
          exerciseMap.set(set.exerciseId, {
            name: exercise?.name || "Unknown",
            sets: [],
            muscles: exercise?.muscles || []
          });
        }
        exerciseMap.get(set.exerciseId).sets.push(set);
      }

      const exercises = Array.from(exerciseMap.values()).map(ex => ({
        name: ex.name,
        sets: ex.sets.length,
        reps: ex.sets[0]?.reps || 0,
        load: ex.sets[0]?.weight ? `${ex.sets[0].weight}kg` : "bodyweight"
      }));

      const muscleGroups = Array.from(
        new Set(Array.from(exerciseMap.values()).flatMap(ex => ex.muscles))
      );

      return {
        date: format(new Date(session.startTime), "yyyy-MM-dd"),
        muscle_groups: muscleGroups,
        exercises,
        session_rpe: session.perceivedEffort || 7
      };
    })
  );

  // Get recent biomarkers
  const latestSleep = await storage.getLatestSleepSession(userId);
  const latestReadiness = await storage.getLatestReadinessScore(userId);

  let sleepScore = 75;
  if (latestSleep) {
    sleepScore = latestSleep.sleepScore || 75;
  }

  let recoveryState = "green";
  if (latestReadiness) {
    if (latestReadiness.score >= 80) recoveryState = "green";
    else if (latestReadiness.score >= 60) recoveryState = "yellow";
    else recoveryState = "red";
  }

  // Build available equipment list
  const availableEquipment: Modality[] = [];
  if (fitnessProfile?.hasGymAccess) {
    availableEquipment.push("barbell", "dumbbell", "cable", "machine");
  }
  if (fitnessProfile?.homeEquipment && fitnessProfile.homeEquipment.length > 0) {
    const homeEq = fitnessProfile.homeEquipment as string[];
    
    // Map home equipment to modalities
    for (const eq of homeEq) {
      const normalized = eq.toLowerCase();
      if (normalized.includes("barbell")) availableEquipment.push("barbell");
      if (normalized.includes("dumbbell")) availableEquipment.push("dumbbell");
      if (normalized.includes("kettlebell")) availableEquipment.push("kettlebell");
      if (normalized.includes("band")) availableEquipment.push("band");
      if (normalized.includes("cable")) availableEquipment.push("cable");
    }
  }
  
  // Always include bodyweight as fallback
  if (!availableEquipment.includes("bodyweight")) {
    availableEquipment.push("bodyweight");
  }

  // Get unique available modalities
  const uniqueEquipment = Array.from(new Set(availableEquipment));

  // Fetch muscle group frequency for balance tracking
  let muscleGroupFrequency: Array<{ 
    muscleGroup: string; 
    lastTrained: Date | null; 
    timesTrainedInPeriod: number; 
    totalSets: number; 
    totalVolume: number;
  }> = [];
  
  try {
    muscleGroupFrequency = await storage.getMuscleGroupFrequency(userId, 14);
    console.log(`📊 Muscle group frequency for user ${userId}:`, muscleGroupFrequency.length, 'groups');
  } catch (error) {
    console.error("Error fetching muscle group frequency:", error);
  }

  // Build muscle balance snapshot (trailing 7-14 day sets per muscle)
  const muscleBalanceSnapshot: Record<string, number> = {};
  for (const mg of muscleGroupFrequency) {
    muscleBalanceSnapshot[mg.muscleGroup] = mg.totalSets;
  }

  // Generate muscle balance hint for AI
  const sortedMuscles = Object.entries(muscleBalanceSnapshot)
    .sort(([, a], [, b]) => a - b); // Sort by sets ascending
  
  const undertrained = sortedMuscles.slice(0, 3).map(([muscle]) => muscle);
  const overtrained = sortedMuscles.slice(-3).map(([muscle]) => muscle);
  
  const muscleBalanceHint = undertrained.length > 0
    ? `Prioritize: ${undertrained.join(", ")}. Moderate: ${overtrained.join(", ")}`
    : undefined;

  return {
    date: targetDate,
    userGoal: fitnessProfile?.primaryGoal || "strength",
    fitnessLevel: fitnessProfile?.fitnessLevel || "intermediate",
    availableTime: fitnessProfile?.preferredDuration || 60,
    equipment: uniqueEquipment,
    muscleBalanceHint,
    readinessScore: latestReadiness?.score,
    age,
    sex: user.gender || "male",
    recentTraining,
    sleepScore,
    recoveryState,
    muscleBalanceSnapshot
  };
}

// ──────────────────────────────────────────────
// Generate daily workout using StructuredWorkoutsKit
// ──────────────────────────────────────────────
export async function generateDailySession(context: any, regenerationCount: number = 0) {
  const kit = StructuredWorkoutsKit();

  console.log(`🏋️ Generating workout (attempt ${regenerationCount + 1}):`, {
    time: context.availableTime,
    goal: context.userGoal,
    equipment: context.equipment,
    muscleHint: context.muscleBalanceHint
  });

  // Step 1: Build AI prompt using StructuredWorkoutsKit
  const basePrompt = kit.buildPrompt({
    userGoal: context.userGoal,
    fitnessLevel: context.fitnessLevel,
    availableTime: context.availableTime,
    equipment: context.equipment,
    muscleBalanceHint: context.muscleBalanceHint,
    readinessScore: context.readinessScore
  });

  // Enhance prompt with recovery context and regeneration instructions
  let enhancedPrompt = basePrompt;
  
  if (context.recoveryState === "red") {
    enhancedPrompt += `\n\nRECOVERY ALERT: User is in RED recovery state (readiness: ${context.readinessScore}/100). Reduce volume by 30%, prefer machine variations, lower intensity.`;
  } else if (context.recoveryState === "yellow") {
    enhancedPrompt += `\n\nRECOVERY CAUTION: User is in YELLOW recovery state (readiness: ${context.readinessScore}/100). Reduce volume by 15%, prefer stable variations.`;
  }

  if (regenerationCount > 0) {
    enhancedPrompt += `\n\nREGENERATION REQUEST #${regenerationCount + 1}: User rejected previous workout. Generate COMPLETELY DIFFERENT patterns and modalities. Use higher temperature for creativity.`;
  }

  // Step 2: Call OpenAI
  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: enhancedPrompt },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Generate workout using ONLY the semantic patterns defined in the schema. NO exercise names.",
          context: {
            date: context.date,
            recent_training: context.recentTraining?.slice(0, 3) // Last 3 sessions for context
          }
        })
      }
    ],
    temperature: regenerationCount > 0 ? 0.9 : 0.7
  });

  const content = response.choices[0].message?.content ?? "{}";

  // Step 3: Parse and map AI response to template_ids
  const mapped = kit.parseAndMap(content, context.equipment, RULES);

  if (!mapped.success || !mapped.mappedBlocks) {
    console.error("❌ Workout generation failed:", mapped.errors);
    throw new Error(`Workout generation failed: ${mapped.errors?.join(", ")}`);
  }

  console.log(`✅ Workout generated successfully: ${mapped.mappedBlocks.length} blocks mapped`);

  // Step 4: Validate time budget
  const plan = mapped.plan!;
  const timeBudget = plan.total_time_estimate_min || context.availableTime;
  const timeDelta = Math.abs(timeBudget - context.availableTime);

  if (timeDelta > 10) {
    console.warn(`⚠️ Time budget mismatch: ${timeBudget}min vs ${context.availableTime}min target`);
  }

  // Step 5: Validate muscle balance and volume caps
  const volumeCheck = validateVolume(mapped.mappedBlocks, context.muscleBalanceSnapshot);
  
  if (volumeCheck.weeklyOverage.length > 0) {
    console.warn(`⚠️ Weekly volume warnings for: ${volumeCheck.weeklyOverage.join(", ")}`);
  }

  // Step 6: Return structured workout
  return {
    success: true,
    plan,
    blocks: mapped.mappedBlocks,
    validation: {
      timeBudget: {
        target: context.availableTime,
        estimated: timeBudget,
        delta: timeDelta,
        acceptable: timeDelta <= 10
      },
      volume: volumeCheck,
      muscleBalance: {
        snapshot: context.muscleBalanceSnapshot,
        todayCoverage: volumeCheck.todayByMuscle
      }
    }
  };
}

// ──────────────────────────────────────────────
// Volume validation helper
// ──────────────────────────────────────────────
function validateVolume(
  blocks: Array<AnyBlock & { template_id?: string; display_name?: string }>,
  currentWeeklySnapshot: Record<string, number>
) {
  const todayByMuscle: Record<string, number> = {};
  
  // Calculate today's volume per muscle
  for (const block of blocks) {
    if (block.type === "lift_block") {
      const liftBlock = block as LiftBlock;
      const muscles = getMusclesForPattern(liftBlock.pattern);
      
      for (const muscle of muscles) {
        todayByMuscle[muscle] = (todayByMuscle[muscle] || 0) + liftBlock.sets;
      }
    }
  }

  // Project weekly totals
  const projectedWeekly: Record<string, number> = { ...currentWeeklySnapshot };
  for (const [muscle, sets] of Object.entries(todayByMuscle)) {
    projectedWeekly[muscle] = (projectedWeekly[muscle] || 0) + sets;
  }

  // Check for volume cap violations (>30 sets/week is red flag for most people)
  // But allow flexibility for elite athletes
  const weeklyOverage: string[] = [];
  for (const [muscle, sets] of Object.entries(projectedWeekly)) {
    if (sets > 35) { // Hard cap at 35 sets/week
      weeklyOverage.push(`${muscle} (${sets} sets/week)`);
    }
  }

  return {
    todayByMuscle,
    projectedWeekly,
    weeklyOverage,
    acceptable: weeklyOverage.length === 0
  };
}

// ──────────────────────────────────────────────
// Save workout to database
// ──────────────────────────────────────────────
export async function saveWorkout(
  storage: IStorage,
  userId: string,
  result: any
) {
  const { plan, blocks, validation } = result;

  // Step 1: Get template data for all lift blocks
  const liftBlocks = blocks.filter((b: any) => b.type === "lift_block" && b.template_id);
  
  // Step 2: Fetch template details from database
  const templateDataMap = new Map<string, any>();
  for (const block of liftBlocks) {
    if (!templateDataMap.has(block.template_id)) {
      try {
        const template = await storage.getExerciseTemplateById(block.template_id);
        if (template) {
          templateDataMap.set(block.template_id, template);
        }
      } catch (error) {
        console.warn(`⚠️ Template ${block.template_id} not found in database`);
      }
    }
  }

  // Step 3: Map templates to exercises (create if needed)
  const templateIdToExerciseId = new Map<string, string>();
  for (const [templateId, template] of templateDataMap.entries()) {
    const templateData: TemplateData = {
      id: template.id,
      pattern: template.pattern,
      modality: template.modality,
      displayName: template.displayName,
      muscles: template.muscles || []
    };
    
    const exerciseId = await getOrCreateExerciseForTemplate(storage, templateData);
    templateIdToExerciseId.set(templateId, exerciseId);
  }

  // Step 4: Enrich blocks with exercise_ids
  const enrichedBlocks = blocks.map((block: any) => {
    if (block.type === "lift_block" && block.template_id) {
      return {
        ...block,
        exercise_id: templateIdToExerciseId.get(block.template_id)
      };
    }
    return block;
  });

  // Step 5: Store in generatedWorkouts table
  await storage.createGeneratedWorkout({
    userId,
    date: plan.date || format(new Date(), "yyyy-MM-dd"),
    workoutData: {
      plan,
      blocks: enrichedBlocks,
      validation,
      template_to_exercise_mapping: Object.fromEntries(templateIdToExerciseId),
      generated_at: new Date().toISOString(),
      system_version: "v2.0-pattern-based"
    },
    status: "pending"
  });

  console.log(`💾 Workout saved for user ${userId} with ${enrichedBlocks.length} blocks`);
}

// ──────────────────────────────────────────────
// Main entry point for daily workout scheduler
// ──────────────────────────────────────────────
export async function generateAndSaveWorkout(
  storage: IStorage,
  userId: string,
  targetDate: string,
  regenerationCount: number = 0
) {
  try {
    // Build context
    const context = await buildUserContext(storage, userId, targetDate);

    // Generate workout
    const result = await generateDailySession(context, regenerationCount);

    // Save to database
    await saveWorkout(storage, userId, result);

    return result;
  } catch (error) {
    console.error(`❌ Failed to generate workout for user ${userId}:`, error);
    throw error;
  }
}
