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
import { getCurrentRecoveryState } from "./fatigue";

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

  // Fetch muscle recovery state for recovery-aware exercise selection
  let muscleRecovery: Record<string, number> = {
    chest: 70,
    back: 70,
    legs: 70,
    shoulders: 70,
    arms: 70,
    core: 70,
  };

  try {
    const recoveryState = await getCurrentRecoveryState(userId);
    muscleRecovery = recoveryState.muscleGroups as Record<string, number>;
    console.log(`💪 Muscle recovery state for user ${userId}:`, muscleRecovery);
  } catch (error) {
    console.warn("Error fetching muscle recovery state, using defaults:", error);
    // Defaults already set above
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
    muscleBalanceSnapshot,
    muscleRecovery
  };
}

// ──────────────────────────────────────────────
// Recovery-aware scoring helper
// ──────────────────────────────────────────────
import type { Pattern } from "./structured-workouts-kit";

/**
 * Normalize muscle name for consistent matching
 * Converts underscores to spaces and lowercases
 */
function normalizeMuscle(muscle: string): string {
  return muscle.toLowerCase().replace(/_/g, ' ').trim();
}

/**
 * Calculate recovery penalty/boost for a given pattern based on muscle recovery scores
 * 
 * @param pattern - The exercise pattern (e.g., knee_dominant, horizontal_press)
 * @param muscleRecovery - Record mapping muscle groups (chest, back, legs, etc.) to recovery scores (0-100)
 * @returns Object with penalty factor and details for logging
 */
function getRecoveryPenalty(
  pattern: Pattern, 
  muscleRecovery: Record<string, number>
): { penalty: number; avgRecovery: number; affectedMuscles: string[] } {
  // Map our 6 muscle groups to pattern muscle names
  const muscleGroupMapping: Record<string, string[]> = {
    chest: ['chest', 'pectorals', 'front delts', 'pecs'],
    back: ['back', 'lats', 'traps', 'rear delts', 'rhomboids', 'lower back'],
    legs: ['legs', 'quads', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'hip flexors'],
    shoulders: ['shoulders', 'delts', 'deltoids', 'front delts', 'side delts', 'rear delts'],
    arms: ['arms', 'biceps', 'triceps', 'forearms'],
    core: ['core', 'abs', 'abdominals', 'obliques']
  };

  // Get muscles targeted by this pattern
  const patternMuscles = PATTERN_TO_MUSCLES[pattern] || [];
  if (patternMuscles.length === 0) {
    return { penalty: 0, avgRecovery: 70, affectedMuscles: [] };
  }

  // Find recovery scores for affected muscle groups
  const recoveryScores: number[] = [];
  const affectedMuscles: string[] = [];
  
  for (const [muscleGroup, score] of Object.entries(muscleRecovery)) {
    const muscleAliases = muscleGroupMapping[muscleGroup] || [muscleGroup];
    
    // Check if any pattern muscle matches this muscle group
    for (const patternMuscle of patternMuscles) {
      const normalized = normalizeMuscle(patternMuscle);
      
      // Check if normalized pattern muscle matches any alias
      if (muscleAliases.some(alias => {
        const normalizedAlias = normalizeMuscle(alias);
        return normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized);
      })) {
        recoveryScores.push(score);
        affectedMuscles.push(muscleGroup);
        break;
      }
    }
  }

  // If no matches found, return neutral
  if (recoveryScores.length === 0) {
    return { penalty: 0, avgRecovery: 70, affectedMuscles: [] };
  }

  // Calculate average recovery score
  const avgRecovery = recoveryScores.reduce((sum, score) => sum + score, 0) / recoveryScores.length;

  // Apply thresholds
  let penalty: number;
  if (avgRecovery < 40) penalty = -0.5;  // Strongly discourage
  else if (avgRecovery < 60) penalty = -0.2;  // Slightly discourage
  else if (avgRecovery < 80) penalty = 0;     // Neutral
  else penalty = 0.3;                          // Encourage (>= 80%)

  return { penalty, avgRecovery, affectedMuscles };
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

  // Identify fatigued muscle groups for recovery-aware programming
  const muscleRecovery = context.muscleRecovery || {};
  const fatiguedGroups: string[] = [];
  const recoveringGroups: string[] = [];
  const freshGroups: string[] = [];

  for (const [group, score] of Object.entries(muscleRecovery)) {
    if (score < 40) fatiguedGroups.push(group);
    else if (score < 60) recoveringGroups.push(group);
    else if (score >= 80) freshGroups.push(group);
  }

  // Build excluded and preferred patterns based on recovery penalties
  const excludedPatterns: Pattern[] = [];
  const preferredPatterns: Pattern[] = [];
  
  console.log(`\n🧠 ═══ PRE-GENERATION RECOVERY ANALYSIS ═══`);
  console.log(`💪 Muscle recovery scores:`, muscleRecovery);
  
  for (const [pattern, rules] of Object.entries(RULES)) {
    const { penalty, avgRecovery, affectedMuscles } = getRecoveryPenalty(pattern as Pattern, muscleRecovery);
    
    if (penalty <= -0.5) {
      excludedPatterns.push(pattern as Pattern);
      console.log(`🚫 EXCLUDING pattern: ${pattern.padEnd(20)} (${avgRecovery.toFixed(0)}% recovery, muscles: ${affectedMuscles.join(", ")})`);
    } else if (penalty >= 0.3) {
      preferredPatterns.push(pattern as Pattern);
      console.log(`🎯 PREFERRING pattern: ${pattern.padEnd(20)} (${avgRecovery.toFixed(0)}% recovery, muscles: ${affectedMuscles.join(", ")})`);
    }
  }
  
  console.log(`\n📊 Pattern Selection Summary:`);
  console.log(`   - Excluded patterns (< 40% recovery): ${excludedPatterns.length}`);
  console.log(`   - Preferred patterns (>= 80% recovery): ${preferredPatterns.length}`);
  console.log(`═══════════════════════════════════════\n`);

  // Enhance prompt with recovery context and regeneration instructions
  let enhancedPrompt = basePrompt;
  
  if (context.recoveryState === "red") {
    enhancedPrompt += `\n\nRECOVERY ALERT: User is in RED recovery state (readiness: ${context.readinessScore}/100). Reduce volume by 30%, prefer machine variations, lower intensity.`;
  } else if (context.recoveryState === "yellow") {
    enhancedPrompt += `\n\nRECOVERY CAUTION: User is in YELLOW recovery state (readiness: ${context.readinessScore}/100). Reduce volume by 15%, prefer stable variations.`;
  }

  // Add MANDATORY recovery-based pattern constraints
  if (excludedPatterns.length > 0) {
    enhancedPrompt += `\n\n🚫 CRITICAL RECOVERY CONSTRAINTS - MANDATORY EXCLUSIONS:
DO NOT include these patterns (severely fatigued muscles < 40% recovery): ${excludedPatterns.join(", ")}
These patterns are FORBIDDEN due to muscle fatigue. Violation will result in workout rejection.`;
  }
  
  if (preferredPatterns.length > 0) {
    enhancedPrompt += `\n\n🎯 RECOVERY OPTIMIZATION - MANDATORY PREFERENCES:
PRIORITIZE these patterns (well-recovered muscles >= 80% recovery): ${preferredPatterns.join(", ")}
These patterns are STRONGLY ENCOURAGED for optimal training stimulus.`;
  }
  
  // Add muscle-specific recovery guidance for additional context
  if (fatiguedGroups.length > 0) {
    enhancedPrompt += `\n\nMUSCLE RECOVERY ALERT: Fatigued muscle groups (< 40% recovery): ${fatiguedGroups.join(", ")}. Prioritize patterns for well-recovered muscles: ${freshGroups.length > 0 ? freshGroups.join(", ") : "upper body or core"}.`;
  } else if (freshGroups.length > 0) {
    enhancedPrompt += `\n\nMUSCLE RECOVERY: Well-recovered muscle groups (> 80%): ${freshGroups.join(", ")}. Prioritize these for optimal training stimulus.`;
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

  // Step 3.5: Filter out severely penalized patterns
  const initialBlockCount = mapped.mappedBlocks.length;
  const filteredBlocks: typeof mapped.mappedBlocks = [];
  const removedBlocks: Array<{ pattern: Pattern; displayName: string; reason: string }> = [];
  
  console.log(`\n🏋️ ═══ POST-GENERATION RECOVERY FILTERING ═══`);
  console.log(`💪 Current muscle recovery scores:`, muscleRecovery);
  
  for (const block of mapped.mappedBlocks) {
    if (block.type === "lift_block") {
      const liftBlock = block as LiftBlock;
      const recoveryInfo = getRecoveryPenalty(liftBlock.pattern, muscleRecovery);
      
      if (recoveryInfo.penalty <= -0.5) {
        // REMOVE severely penalized patterns
        const displayName = block.display_name || liftBlock.pattern;
        const muscleList = recoveryInfo.affectedMuscles.join(", ");
        const reason = `Muscles ${muscleList} at ${recoveryInfo.avgRecovery.toFixed(0)}% recovery (< 40% threshold)`;
        
        removedBlocks.push({
          pattern: liftBlock.pattern,
          displayName,
          reason
        });
        
        console.log(`🚫 REMOVED severely fatigued pattern: ${displayName} (${liftBlock.pattern}) - ${reason}`);
        continue; // Skip this block
      }
    }
    
    // Keep this block
    filteredBlocks.push(block);
  }
  
  const removedCount = initialBlockCount - filteredBlocks.length;
  const removalPercentage = initialBlockCount > 0 ? (removedCount / initialBlockCount) * 100 : 0;
  
  console.log(`\n📊 Filtering Summary:`);
  console.log(`   - Initial blocks: ${initialBlockCount}`);
  console.log(`   - Removed blocks: ${removedCount} (${removalPercentage.toFixed(1)}%)`);
  console.log(`   - Remaining blocks: ${filteredBlocks.length}`);
  
  if (removedCount > 0) {
    console.log(`\n🚫 Removed Exercises:`);
    removedBlocks.forEach(({ displayName, reason }) => {
      console.log(`   - ${displayName}: ${reason}`);
    });
  }
  
  // Check if too many patterns were removed
  if (removalPercentage > 50) {
    console.warn(`⚠️ WARNING: Removed ${removalPercentage.toFixed(1)}% of workout due to fatigue!`);
    console.warn(`   This may indicate the user needs a rest day or deload week.`);
    console.warn(`   Consider regenerating with more conservative volume targets.`);
  }
  
  // Update mapped blocks with filtered list
  mapped.mappedBlocks = filteredBlocks;
  
  console.log(`═══════════════════════════════════════\n`);

  // Step 3.6: Log detailed recovery analysis for remaining patterns
  console.log(`\n🏋️ ═══ RECOVERY PENALTY ANALYSIS (Remaining Patterns) ═══`);
  console.log(`💪 Current muscle recovery scores:`, muscleRecovery);
  
  const patternRecoveryAnalysis: Array<{
    pattern: Pattern;
    blockIndex: number;
    displayName: string;
    penalty: number;
    avgRecovery: number;
    affectedMuscles: string[];
    recommendation: string;
  }> = [];

  const severelyPenalizedBlocks: number[] = [];
  
  for (let i = 0; i < mapped.mappedBlocks.length; i++) {
    const block = mapped.mappedBlocks[i];
    
    if (block.type === "lift_block") {
      const liftBlock = block as LiftBlock;
      const recoveryInfo = getRecoveryPenalty(liftBlock.pattern, muscleRecovery);
      
      // Determine recommendation based on penalty
      let recommendation = "✅ Good to go";
      if (recoveryInfo.penalty <= -0.5) {
        recommendation = "🚫 STRONGLY DISCOURAGED - muscles severely fatigued";
        severelyPenalizedBlocks.push(i);
      } else if (recoveryInfo.penalty <= -0.2) {
        recommendation = "⚠️ CAUTION - muscles partially fatigued";
      } else if (recoveryInfo.penalty >= 0.3) {
        recommendation = "🎯 ENCOURAGED - muscles well-recovered";
      }
      
      patternRecoveryAnalysis.push({
        pattern: liftBlock.pattern,
        blockIndex: i,
        displayName: block.display_name || liftBlock.pattern,
        penalty: recoveryInfo.penalty,
        avgRecovery: recoveryInfo.avgRecovery,
        affectedMuscles: recoveryInfo.affectedMuscles,
        recommendation
      });
      
      // Log each pattern's recovery status
      const muscleList = recoveryInfo.affectedMuscles.length > 0 
        ? recoveryInfo.affectedMuscles.join(", ")
        : "none detected";
      
      console.log(`🏋️ Pattern: ${liftBlock.pattern.padEnd(20)} | Recovery: ${recoveryInfo.avgRecovery.toFixed(0)}% | Penalty: ${recoveryInfo.penalty.toFixed(2)} | Muscles: ${muscleList} | ${recommendation}`);
    }
  }
  
  // Log summary of recovery-aware decisions
  const discouraged = patternRecoveryAnalysis.filter(p => p.penalty < 0);
  const encouraged = patternRecoveryAnalysis.filter(p => p.penalty > 0);
  
  console.log(`\n📊 Recovery Analysis Summary:`);
  console.log(`   - Total patterns analyzed: ${patternRecoveryAnalysis.length}`);
  console.log(`   - Encouraged patterns (>80% recovery): ${encouraged.length}`);
  console.log(`   - Discouraged patterns (<60% recovery): ${discouraged.length}`);
  console.log(`   - Severely penalized (<40% recovery): ${severelyPenalizedBlocks.length}`);
  
  if (severelyPenalizedBlocks.length > 0) {
    console.warn(`⚠️ WARNING: ${severelyPenalizedBlocks.length} patterns target severely fatigued muscle groups!`);
    console.warn(`   Consider regenerating workout or reducing volume for these exercises.`);
    const severePatterns = severelyPenalizedBlocks.map(idx => 
      patternRecoveryAnalysis.find(p => p.blockIndex === idx)?.displayName
    ).filter(Boolean);
    console.warn(`   Affected exercises: ${severePatterns.join(", ")}`);
  }
  
  console.log(`═══════════════════════════════════════\n`);

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

  // Step 6: Generate recovery-based reasoning
  let recoveryReasoning = "";
  if (fatiguedGroups.length > 0) {
    const prioritizedGroups = freshGroups.length > 0 ? freshGroups.join(", ") : "upper body";
    recoveryReasoning = `Prioritized ${prioritizedGroups} exercises due to ${fatiguedGroups.join(", ")} muscle fatigue (< 40% recovery).`;
  } else if (freshGroups.length > 0) {
    recoveryReasoning = `Focused on well-recovered muscle groups (${freshGroups.join(", ")}) for optimal training stimulus.`;
  } else if (recoveringGroups.length > 0) {
    recoveryReasoning = `Modified intensity for recovering muscle groups: ${recoveringGroups.join(", ")}.`;
  }

  // Step 7: Return structured workout
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
      },
      recovery: {
        muscleRecovery: context.muscleRecovery || {},
        fatiguedGroups,
        recoveringGroups,
        freshGroups,
        reasoning: recoveryReasoning,
        patternAnalysis: patternRecoveryAnalysis,
        severelyPenalizedCount: severelyPenalizedBlocks.length,
        encouragedCount: encouraged.length,
        discouragedCount: discouraged.length,
        // New filtering information
        preGenerationExclusions: {
          excludedPatterns,
          preferredPatterns
        },
        postGenerationFiltering: {
          initialBlockCount,
          removedCount,
          removedBlocks,
          removalPercentage,
          remainingBlocks: filteredBlocks.length,
          needsRegeneration: removalPercentage > 50
        }
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
// Enrich workout blocks with exercise IDs
// ──────────────────────────────────────────────
export async function enrichWorkoutBlocks(
  storage: IStorage,
  blocks: any[]
): Promise<{ 
  enrichedBlocks: any[];
  templateToExerciseMapping: Record<string, string>;
}> {
  // Step 1: Get template data for all blocks with template_ids
  const blocksWithTemplates = blocks.filter((b: any) => b.template_id);
  
  console.log(`💾 Enriching ${blocks.length} total blocks (${blocksWithTemplates.length} with template_ids)`);
  
  // Step 2: Fetch template details from database
  const templateDataMap = new Map<string, any>();
  for (const block of blocksWithTemplates) {
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
  const templateIdToExerciseName = new Map<string, string>();
  
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
    
    // Fetch the canonical exercise name from the database
    const exercise = await storage.getExerciseById(exerciseId);
    if (exercise) {
      templateIdToExerciseName.set(templateId, exercise.name);
      console.log(`💾 Mapped template ${templateId} → exercise ${exerciseId} (${exercise.name})`);
    } else {
      console.log(`💾 Mapped template ${templateId} → exercise ${exerciseId} (${template.displayName})`);
    }
  }

  console.log(`💾 Template-to-Exercise mapping complete: ${templateIdToExerciseId.size} mappings`);

  // Step 4: Enrich blocks with exercise_ids AND override display_name with canonical exercise name
  const enrichedBlocks = blocks
    .map((block: any) => {
      if (block.template_id) {
        const exercise_id = templateIdToExerciseId.get(block.template_id);
        const canonical_name = templateIdToExerciseName.get(block.template_id);
        
        console.log(`💾 Enriching block: ${block.display_name} → ${canonical_name || block.display_name} (template: ${block.template_id} → exercise: ${exercise_id})`);
        
        return {
          ...block,
          exercise_id,
          display_name: canonical_name || block.display_name // Override with canonical name
        };
      }
      return block;
    })
    // CRITICAL: Filter out blocks without exercise_id to prevent "unknown" exercises
    .filter((block: any) => {
      if (!block.exercise_id) {
        console.warn(`⚠️ POST-ENRICHMENT FILTER: Removing block without exercise_id: ${JSON.stringify(block)}`);
        return false;
      }
      return true;
    });

  console.log(`💾 Enriched ${enrichedBlocks.length} blocks with exercise_ids (filtered ${blocks.length - enrichedBlocks.length} invalid blocks)`);

  return {
    enrichedBlocks,
    templateToExerciseMapping: Object.fromEntries(templateIdToExerciseId)
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

  // Enrich blocks with exercise_ids
  const { enrichedBlocks, templateToExerciseMapping } = await enrichWorkoutBlocks(storage, blocks);

  console.log(`💾 Sample enriched block:`, JSON.stringify(enrichedBlocks[0], null, 2));

  // Store in generatedWorkouts table
  await storage.createGeneratedWorkout({
    userId,
    date: plan.date || format(new Date(), "yyyy-MM-dd"),
    workoutData: {
      plan,
      blocks: enrichedBlocks,
      validation,
      template_to_exercise_mapping: templateToExerciseMapping,
      generated_at: new Date().toISOString(),
      system_version: "v2.0-pattern-based"
    },
    status: "pending"
  });

  console.log(`💾 Workout saved for user ${userId} with ${enrichedBlocks.length} blocks, ${Object.keys(templateToExerciseMapping).length} template mappings`);
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
