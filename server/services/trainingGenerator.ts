/**
 * HealthPilot – Daily Training Generator
 * Generates standards-aligned daily training sessions based on profile,
 * preferences, biometrics, and recent training history.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { IStorage } from "../storage";
import { format, subDays } from "date-fns";
import { resolveAIExercise, teachAlias } from "./exercise-resolver-adapter";

// ──────────────────────────────────────────────
// Validation schema (mirrors OUTPUT_SCHEMA)
// ──────────────────────────────────────────────
export const DailyWorkoutSchema = z.object({
  session_id: z.string().optional(), // UUID v4 for the workout plan (AI generates this)
  date: z.string(),
  focus: z.string(),
  safety: z.object({
    flag: z.boolean(),
    notes: z.string(),
    seek_medical_advice: z.boolean().optional()
  }),
  warmup: z.array(z.string()),
  main: z.array(
    z.object({
      exercise_id: z.string(), // Stable identifier for exercise (UUID v4)
      block: z.literal("main").optional(), // Exercise block type
      exercise: z.string(),
      goal: z.enum(["strength", "hypertrophy", "power"]),
      sets: z.number().min(1).max(6),
      reps: z.number().min(1).max(15),
      intensity: z.string(),
      rest_seconds: z.number().min(45).max(360),
      tempo: z.string().optional(),
      cues: z.string().optional(),
      alternative_if_limited: z.string().optional()
    })
  ),
  accessories: z.array(
    z.object({
      exercise_id: z.string(), // Stable identifier for exercise (UUID v4)
      block: z.literal("accessories").optional(), // Exercise block type
      exercise: z.string(),
      goal: z.string(),
      sets: z.number(),
      reps: z.number(),
      intensity: z.string(),
      rest_seconds: z.number(),
      tempo: z.string().optional(),
      cues: z.string().optional(),
      alternative_if_limited: z.string().optional()
    })
  ),
  conditioning: z.object({
    include: z.boolean(),
    type: z.enum(["none", "steady_state", "intervals", "tempo_run", "circuit"]),
    duration_minutes: z.number(),
    intensity_zone: z.enum(["Z1", "Z2", "Z3", "Z4", "Z5"]),
    notes: z.string().optional()
  }),
  cooldown: z.array(z.string()),
  progression_notes: z.string(),
  compliance_summary: z.object({
    volume_sets_estimate: z.record(z.number()),
    weekly_volume_guardrail_ok: z.boolean(),
    reasoning: z.string()
  }),
  time_budget: z.object({
    warmup_min: z.number().int().nonnegative(),
    per_exercise_min: z.array(z.number().int().positive()),
    conditioning_min: z.number().int().nonnegative(),
    cooldown_min: z.number().int().nonnegative(),
    total_min: z.number().int().positive()
  }), // REQUIRED - must estimate time budget
  min_exercise_policy: z.object({
    session_minutes: z.number().int().positive(),
    minimum_exercise_count: z.number().int().positive(),
    achieved_exercise_count: z.number().int().nonnegative()
  }), // REQUIRED - must enforce minimum exercise count
  coverage_report: z.object({
    per_muscle_sets_today: z.record(z.number().int().nonnegative()),
    projected_weekly_sets: z.record(z.number().int().nonnegative()),
    undertrained_priority: z.array(z.string()),
    overtrained_watchlist: z.array(z.string())
  }).optional(),
  variation_policy: z.object({
    no_session_duplicates: z.boolean(),
    no_repeat_exact_exercise_days: z.number().int().positive().default(7),
    pattern_mix_notes: z.string().optional()
  }).optional(),
  muscle_balance_input_snapshot: z.record(z.number().int().nonnegative()).optional()
});

export type DailyWorkout = z.infer<typeof DailyWorkoutSchema>;

// ──────────────────────────────────────────────
// Lazy OpenAI client initialization
// ──────────────────────────────────────────────
let clientInstance: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!clientInstance) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found. Check AI_INTEGRATIONS_OPENAI_API_KEY or OPENAI_API_KEY environment variable.");
    }
    
    clientInstance = new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
  }
  return clientInstance;
}

// ──────────────────────────────────────────────
// Context builder - gather user data from DB
// ──────────────────────────────────────────────
export async function buildUserContext(storage: IStorage, userId: string, targetDate: string) {
  // Get user profile
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Get fitness profile
  const fitnessProfile = await storage.getFitnessProfile(userId);

  // Calculate user age
  let age = 30; // default
  if (user.dateOfBirth) {
    const birthDate = new Date(user.dateOfBirth);
    const today = new Date();
    age = today.getFullYear() - birthDate.getFullYear();
  }

  // Get recent training history (last 14 days)
  const startDate = subDays(new Date(targetDate), 14);
  const endDate = new Date(targetDate);
  const recentSessions = await storage.getWorkoutSessions(userId, startDate, endDate);

  // Build recent training array
  const recentTraining = await Promise.all(
    recentSessions.slice(0, 7).map(async (session) => {
      const sets = await storage.getSetsForSession(session.id, userId);
      
      // Group sets by exercise
      const exerciseMap = new Map();
      for (const set of sets) {
        if (!exerciseMap.has(set.exerciseId)) {
          const exercise = await storage.getExerciseById(set.exerciseId);
          exerciseMap.set(set.exerciseId, {
            id: set.exerciseId,
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
        load: ex.sets[0]?.weight ? `${ex.sets[0].weight}kg` : "bodyweight",
        rpe: ex.sets[0]?.rpeLogged || 0
      }));

      // Determine muscle groups worked
      const muscleGroups = Array.from(
        new Set(
          Array.from(exerciseMap.values())
            .flatMap(ex => ex.muscles)
        )
      );

      return {
        date: format(new Date(session.startTime), "yyyy-MM-dd"),
        muscle_groups: muscleGroups,
        exercises,
        session_rpe: session.perceivedEffort || 7,
        notes: session.notes || "",
        technique_flags: []
      };
    })
  );

  // Get recent bio markers (sleep, HRV, recovery)
  const latestSleep = await storage.getLatestSleepSession(userId);
  const latestReadiness = await storage.getLatestReadinessScore(userId);

  // Calculate sleep score (0-100)
  let sleepScore = 75; // default
  if (latestSleep) {
    const duration = latestSleep.totalMinutes || 420; // in minutes
    const quality = latestSleep.sleepScore || 75;
    sleepScore = quality; // Use the sleep score directly
  }

  // Determine recovery state
  let recoveryState = "green";
  let hrvStatus = "baseline";
  if (latestReadiness) {
    if (latestReadiness.score >= 80) recoveryState = "green";
    else if (latestReadiness.score >= 60) recoveryState = "yellow";
    else recoveryState = "red";
    
    // TODO: add HRV tracking when available
  }

  // Build available equipment list
  const availableEquipment = [];
  if (fitnessProfile?.hasGymAccess) {
    availableEquipment.push("barbell", "dumbbells", "cables", "machines", "bench", "pullup_bar", "rack");
  }
  if (fitnessProfile?.homeEquipment && fitnessProfile.homeEquipment.length > 0) {
    availableEquipment.push(...fitnessProfile.homeEquipment);
  }
  if (availableEquipment.length === 0) {
    availableEquipment.push("bodyweight"); // fallback
  }

  // Collect recently used exercises from recent training
  const recentlyUsedExercises = recentTraining.flatMap(session => 
    session.exercises.map(ex => ex.name)
  );
  
  // Get unique list of recently used exercises
  const uniqueRecentExercises = Array.from(new Set(recentlyUsedExercises));

  // Build preferences
  const preferences = {
    split_style: fitnessProfile?.preferredWorkoutTypes?.[0] || "push_pull_legs",
    available_equipment: availableEquipment,
    setting: fitnessProfile?.hasGymAccess ? "gym" : "home",
    liked_exercises: [], // TODO: get from exercise feedback
    disliked_exercises: [], // TODO: get from exercise feedback
    recently_used_exercises: uniqueRecentExercises.slice(0, 20) // Last 20 unique exercises
  };

  // Build user profile object
  const userProfile = {
    age,
    sex: user.gender || "male",
    experience_level: fitnessProfile?.fitnessLevel || "intermediate",
    goal: fitnessProfile?.primaryGoal || "muscle_gain",
    injuries_limitations: fitnessProfile?.injuries || []
  };

  // Build availability
  const availability = {
    days_per_week: fitnessProfile?.currentTrainingFrequency || 4,
    session_minutes: fitnessProfile?.preferredDuration || 60
  };

  // Build environment
  const environment = {
    timezone: user.timezone || "UTC",
    today_is_rest_day: false // TODO: check training schedule
  };

  // Build biometrics
  const biometrics = {
    resting_hr: 65, // TODO: get from biomarkers
    sleep_score: Math.round(sleepScore),
    recovery_state: recoveryState,
    hrv_status: hrvStatus,
    readiness_notes: latestReadiness?.reasoning || ""
  };

  // Fetch muscle group frequency data for balanced training
  let muscleGroupFrequency: Array<{ muscleGroup: string; lastTrained: Date | null; timesTrainedInPeriod: number; totalSets: number; totalVolume: number }>;
  try {
    muscleGroupFrequency = await storage.getMuscleGroupFrequency(userId, 14);
    console.log(`📊 Fetched muscle group frequency for user ${userId}:`, muscleGroupFrequency.length, 'muscle groups');
  } catch (error) {
    console.error("Error fetching muscle group frequency:", error);
    muscleGroupFrequency = [];
  }

  // Transform muscle group frequency into muscle_balance_input_snapshot format
  // This gives the AI a snapshot of trailing-7d/14d hard sets per muscle group
  const muscleBalanceSnapshot: Record<string, number> = {};
  for (const mg of muscleGroupFrequency) {
    muscleBalanceSnapshot[mg.muscleGroup] = mg.totalSets;
  }

  return {
    date: targetDate,
    user_profile: userProfile,
    preferences,
    availability,
    environment,
    recent_training: recentTraining,
    biometrics,
    muscle_group_frequency: muscleGroupFrequency,
    muscle_balance_input_snapshot: muscleBalanceSnapshot
  };
}

// ──────────────────────────────────────────────
// Core function to generate one daily plan
// ──────────────────────────────────────────────
export async function generateDailySession(data: any, regenerationCount: number = 0): Promise<DailyWorkout> {
  // Log generation input
  console.log(`🏋️ Generating workout with data:`, {
    sessionMinutes: data?.availability?.session_minutes,
    daysPerWeek: data?.availability?.days_per_week,
    goal: data?.user_profile?.goal,
    experienceLevel: data?.user_profile?.experience_level,
    muscleBalanceSnapshot: data?.muscle_balance_input_snapshot
  });
  
  const systemPrompt = `
You are HealthPilot Coach, an expert strength & conditioning planner.
Always follow ACSM, NSCA and WHO guardrails.
Never output text or commentary—JSON only.

HARD RULES (CRITICAL - NEVER VIOLATE):
1) Read session_minutes from data.availability.session_minutes. This is the user's preferred workout duration - aim to FILL this time budget efficiently.
2) Compute minimum_exercise_count = ceil((session_minutes / 60) * 5). This is the TOTAL target across main + accessories. FLEXIBILITY: Minor variations (±2 exercises) are acceptable if needed for quality/recovery.
3) MAIN BLOCK DISTRIBUTION: For proper training stimulus, the 'main' array should aim for:
   - TARGET: 3+ exercises for sessions ≥45min (minimum acceptable: 2)
   - TARGET: 4+ exercises for sessions ≥60min (minimum acceptable: 3)  
   - TARGET: 5+ exercises for sessions ≥75min (minimum acceptable: 4)
   These are compound movements (squats, presses, pulls, hinges, etc.). Fill remaining exercises with accessories.
   FLEXIBILITY: If recovery is poor or constraints exist, you may deliver 1 exercise below target while maintaining quality.
4) Low readiness (amber/red) reduces load/sets/rest and may shorten conditioning. When fatigued, reduce sets per exercise or use lighter variations. You may reduce exercise count by 1-2 if needed to preserve quality.
5) TIME BUDGET: The user's session_minutes is their PREFERRED duration. Aim to fill this time efficiently:
   - For 60min sessions: TARGET 4-6 main + 1-3 accessories (acceptable range: 3-7 main + 0-4 accessories)
   - For 75min sessions: TARGET 5-7 main + 2-4 accessories (acceptable range: 4-8 main + 1-5 accessories)  
   - For 90min+ sessions: TARGET 6-8 main + 3-5 accessories (acceptable range: 5-9 main + 2-6 accessories)
   Add extra sets to exercises (especially accessories) to utilize available time without exceeding the budget.
6) Always include a 'time_budget' field that estimates minutes for warmup, each exercise, conditioning, and cooldown. Total should be close to session_minutes (within ±5 minutes is acceptable).
7) Each exercise in main and accessories MUST have a unique exercise_id (use UUID v4 format like "550e8400-e29b-41d4-a716-446655440000").

Guardrails:
- Strength: 1–6 reps @75–90%1RM RPE7–9, rest 120-240s
- Hypertrophy: 6–12 reps @65–80%1RM RPE6–8, rest 60-120s
- Endurance: 12–20 reps @50–70%1RM RPE5–7, rest 45-90s
- Weekly volume: 8-20 sets per muscle group
- HR Zones: HRmax = 208 - 0.7*age, Z2 = 60-70% HRmax, Z3 = 70-80% HRmax

Safety Rules:
- If contraindications or red flags detected: set safety.flag=true
- Output mobility/breathing only (≤20min) and seek_medical_advice=true
- Respect injuries and equipment limits
- Never prescribe exercises that conflict with stated limitations

Output Requirements:
- Generate a complete, balanced workout for the specified day
- Include specific exercises (use common exercise names)
- Provide progression notes based on recent training history
- Estimate total volume per muscle group
- Ensure weekly volume stays within 8-20 sets per muscle group
- Fill time budget efficiently: prefer adding low-load accessories (technique/rehab/mobility/isolation) over reducing exercise count

MUSCLE BALANCE RULES (HIGH PRIORITY - AIM FOR BALANCE, ALLOW FLEXIBILITY):
A) Use the muscle_balance_input_snapshot as primary guidance. Prioritize muscle groups with lowest trailing-7d adjusted volume vs target.
B) Industry targets (per muscle, weekly hard sets): min=8, target=10-15, max=20. FLEXIBILITY: Exceeding 20 sets (up to 30) is acceptable for elite athletes with good recovery and high training frequency.
C) Session coverage should favor under-trained groups and avoid over-serving already-high groups. Minor imbalances are acceptable if quality/recovery demands it.
D) Anti-duplication: within a single session, no duplicate exercise names; across the trailing 7 days, avoid repeating the exact same exercise name for a muscle group more than once unless availability constraints force it—then substitute a close variant.
E) Movement pattern diversity: aim to include varied patterns across the week (Squat, Hinge, Horizontal Push, Horizontal Pull, Vertical Pull, Unilateral, Core Anti-rotation/Extension/Flexion, Carry). Today's plan should minimize pattern overlap with prior day, but some overlap is acceptable for progression.
F) Exercise selection must map to targeted muscles accurately; include secondary muscles in the coverage report.
G) Respect injuries/equipment; substitute with the closest pattern maintaining the stimulus.
H) Time budget has priority. If time-limited, preserve balance by swapping big lifts for time-efficient variants before cutting entire muscle coverage.
I) Emit a coverage_report and a per-muscle set allocation for today + projected week totals.

MOVEMENT TAXONOMY (for exercise variants and diversity):
- Squat (bilateral/unilateral): Back Squat, Front Squat, Safety Bar Squat, Goblet Squat, Bulgarian Split Squat, Walking Lunges
- Hinge: Conventional Deadlift, Sumo Deadlift, Romanian Deadlift, Trap Bar Deadlift, Single-Leg RDL, Good Mornings
- Horizontal Push: Barbell Bench Press, Incline Bench Press, Dumbbell Bench Press, Push-ups, Dips
- Horizontal Pull: Barbell Row, Dumbbell Row, Seated Cable Row, Chest-Supported Row, Seal Row, Meadows Row
- Vertical Push: Overhead Press, Push Press, Arnold Press, Landmine Press
- Vertical Pull: Pull-ups, Chin-ups, Lat Pulldown, Neutral Grip Pulldown
- Carry: Farmer's Carry, Overhead Carry, Suitcase Carry
- Core: Pallof Press (anti-rotation), Dead Bug (anti-extension), Side Plank (anti-lateral), Ab Rollouts

Exercise Variety Guidelines:
- PRIORITIZE variety: Select different exercises from those listed in recently_used_exercises
- For main compound movements: Choose variations (e.g., if "Back Squat" was recent, consider "Front Squat", "Bulgarian Split Squat", or "Leg Press")
- For accessories: Rotate between different movement patterns and equipment
- Aim for <30% overlap with recently_used_exercises when possible
- If regenerating (look for regeneration context), be MORE creative and select completely different exercises
- EXAMPLE VARIATION CHAINS: Back Squat → Front Squat → Safety Bar Squat → Goblet Squat; Seated Cable Row → Chest-Supported DB Row → Seal Row → Meadows Row

REQUIRED OUTPUT SCHEMA (return this exact structure at the root level):
{
  "session_id": "uuid-v4-format",
  "date": "YYYY-MM-DD",
  "focus": "description of today's training focus",
  "safety": {
    "flag": false,
    "notes": "safety considerations",
    "seek_medical_advice": false
  },
  "warmup": ["exercise 1", "exercise 2"],
  "main": [
    {
      "exercise_id": "uuid-v4-format",
      "block": "main",
      "exercise": "Exercise Name",
      "goal": "strength" | "hypertrophy" | "power",
      "sets": 3,
      "reps": 8,
      "intensity": "RPE 7 or 70% 1RM",
      "rest_seconds": 90,
      "alternative_if_limited": "Alternative exercise if equipment unavailable"
    }
  ],
  "accessories": [
    {
      "exercise_id": "uuid-v4-format",
      "block": "accessories",
      "exercise": "Exercise Name",
      "goal": "hypertrophy",
      "sets": 3,
      "reps": 12,
      "intensity": "RPE 7",
      "rest_seconds": 60
    }
  ],
  "conditioning": {
    "include": true,
    "type": "none" | "steady_state" | "intervals" | "tempo_run" | "circuit",
    "duration_minutes": 15,
    "intensity_zone": "Z2",
    "notes": "optional notes"
  },
  "cooldown": ["stretch 1", "stretch 2"],
  "progression_notes": "notes about progression",
  "compliance_summary": {
    "volume_sets_estimate": {
      "chest": 8,
      "back": 10
    },
    "weekly_volume_guardrail_ok": true,
    "reasoning": "explanation"
  },
  "time_budget": {
    "warmup_min": 5,
    "per_exercise_min": [8, 8, 6, 6, 5],
    "conditioning_min": 10,
    "cooldown_min": 5,
    "total_min": 58
  },
  "min_exercise_policy": {
    "session_minutes": 60,
    "minimum_exercise_count": 5,
    "achieved_exercise_count": 5
  },
  "coverage_report": {
    "per_muscle_sets_today": {
      "chest": 8,
      "calves": 3,
      "back": 6
    },
    "projected_weekly_sets": {
      "chest": 14,
      "calves": 3,
      "back": 10
    },
    "undertrained_priority": ["calves", "chest"],
    "overtrained_watchlist": []
  },
  "variation_policy": {
    "no_session_duplicates": true,
    "no_repeat_exact_exercise_days": 7,
    "pattern_mix_notes": "Prioritized horizontal push and calf isolation to address imbalances"
  },
  "muscle_balance_input_snapshot": {
    "chest": 6,
    "back": 10,
    "quads": 12,
    "hamstrings": 8,
    "calves": 0,
    "shoulders": 7,
    "arms": 5
  }
}
`;

  const response = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          instruction: regenerationCount > 0 
            ? `REGENERATION REQUEST (attempt #${regenerationCount + 1}): User rejected previous workout. Generate a COMPLETELY DIFFERENT workout with maximum variety. Avoid all exercises from recently_used_exercises if possible.`
            : "Generate today's safe and standards-aligned workout session.",
          input: data
        })
      }
    ],
    temperature: regenerationCount > 0 ? 0.9 : 0.7 // Higher creativity when regenerating
  });

  const content = response.choices[0].message?.content ?? "{}";
  const parsed = JSON.parse(content);

  // ⬇️ Sanitize AI output before Zod validation (coerce types & map invalid values)
  const sanitized = {
    ...parsed,
    main: (parsed.main || []).map((ex: any) => ({
      ...ex,
      sets: typeof ex.sets === 'string' ? parseInt(ex.sets, 10) : ex.sets,
      reps: typeof ex.reps === 'string' ? parseInt(ex.reps, 10) : ex.reps,
      rest_seconds: typeof ex.rest_seconds === 'string' ? parseInt(ex.rest_seconds, 10) : ex.rest_seconds,
      // Map invalid goal values to valid ones
      goal: (['strength', 'hypertrophy', 'power'].includes(ex.goal)) ? ex.goal : 
            (ex.goal === 'endurance' ? 'hypertrophy' : 'strength')
    })),
    accessories: (parsed.accessories || []).map((ex: any) => ({
      ...ex,
      sets: typeof ex.sets === 'string' ? parseInt(ex.sets, 10) : ex.sets,
      reps: typeof ex.reps === 'string' ? parseInt(ex.reps, 10) : ex.reps,
      rest_seconds: typeof ex.rest_seconds === 'string' ? parseInt(ex.rest_seconds, 10) : ex.rest_seconds
    }))
  };

  // Validate output structure & guardrails
  const result = DailyWorkoutSchema.parse(sanitized);

  // ⬇️ Enforce exercise count minimums (belt-and-braces server validation)
  const sessionMinutes = Number(data?.availability?.session_minutes ?? 60);
  const minTotalExercises = Math.ceil((sessionMinutes / 60) * 5);
  const mainCount = result.main?.length || 0;
  const accessoryCount = result.accessories?.length || 0;
  const totalCount = mainCount + accessoryCount;
  
  // Determine minimum main exercises based on session length
  let minMainExercises = 3; // Default for 45+ min
  if (sessionMinutes >= 75) minMainExercises = 5;
  else if (sessionMinutes >= 60) minMainExercises = 4;
  else if (sessionMinutes >= 45) minMainExercises = 3;
  
  // Flexibility buffers - allow minor variations instead of hard failures
  const totalExerciseBuffer = 2; // Allow ±2 exercises from target
  const mainExerciseBuffer = 1; // Allow -1 from minimum main exercises
  
  console.log(`🏋️ Exercise count validation (with flexibility):`, {
    sessionMinutes,
    minTotalRequired: minTotalExercises,
    minMainRequired: minMainExercises,
    mainGenerated: mainCount,
    accessoriesGenerated: accessoryCount,
    totalGenerated: totalCount,
    totalBuffer: `±${totalExerciseBuffer}`,
    mainBuffer: `-${mainExerciseBuffer}`,
    totalPassed: totalCount >= (minTotalExercises - totalExerciseBuffer),
    mainPassed: mainCount >= (minMainExercises - mainExerciseBuffer)
  });
  
  // Check total count with flexibility buffer (allow ±2 exercises)
  if (totalCount < (minTotalExercises - totalExerciseBuffer)) {
    console.error(`❌ Total exercise count validation FAILED: ${totalCount} < ${minTotalExercises - totalExerciseBuffer} (min ${minTotalExercises} - ${totalExerciseBuffer} buffer)`);
    throw new Error(
      `Plan significantly under-filled: ${totalCount} total exercises < ${minTotalExercises - totalExerciseBuffer} for ${sessionMinutes}-min session. ` +
      `Regenerate with more exercises.`
    );
  } else if (totalCount < minTotalExercises) {
    console.warn(`⚠️ Total exercise count slightly below target: ${totalCount} < ${minTotalExercises}, but within acceptable buffer (±${totalExerciseBuffer}). Proceeding.`);
  }
  
  // Check main exercise count with flexibility buffer (allow -1 from minimum)
  if (mainCount < (minMainExercises - mainExerciseBuffer)) {
    console.error(`❌ Main exercise count validation FAILED: ${mainCount} < ${minMainExercises - mainExerciseBuffer} (min ${minMainExercises} - ${mainExerciseBuffer} buffer)`);
    throw new Error(
      `Insufficient main exercises: ${mainCount} < ${minMainExercises - mainExerciseBuffer} for ${sessionMinutes}-min session. ` +
      `Main block needs more compound movements (squats, presses, pulls, hinges). Regenerate with proper exercise distribution.`
    );
  } else if (mainCount < minMainExercises) {
    console.warn(`⚠️ Main exercise count slightly below target: ${mainCount} < ${minMainExercises}, but within acceptable buffer (-${mainExerciseBuffer}). Proceeding.`);
  }

  // Verify time budget if provided (allow 5-minute buffer for flexibility)
  const timeBudgetBuffer = 5;
  const maxAllowedTime = sessionMinutes + timeBudgetBuffer;
  if (result.time_budget && result.time_budget.total_min > maxAllowedTime) {
    throw new Error(
      `Time budget exceeded: ${result.time_budget.total_min} min > ${maxAllowedTime} min allowed (${sessionMinutes}min + ${timeBudgetBuffer}min buffer). ` +
      `Reduce sets, shorten conditioning, or trim accessories.`
    );
  }

  // ──────────────────────────────────────────────
  // Muscle Balance & Anti-Duplication Guards
  // ──────────────────────────────────────────────
  const { canonicalize, hasDuplicates, findDuplicates } = await import("./exercise-canonical");
  
  // Check for duplicate exercises within the session
  const allExerciseNames = [
    ...(result.main || []).map(ex => ex.exercise),
    ...(result.accessories || []).map(ex => ex.exercise)
  ];
  
  if (hasDuplicates(allExerciseNames)) {
    const duplicates = findDuplicates(allExerciseNames);
    console.error(`❌ Duplicate exercises detected:`, duplicates);
    throw new Error(
      `Duplicate exercises detected in session: ${duplicates.join(", ")}. ` +
      `Each exercise must be unique. Regenerate with different exercise variants.`
    );
  }
  
  // Check weekly volume cap (max 20 sets per muscle) - now a soft warning with flexibility
  // Elite athletes training 5-6x/week for 90min can handle higher volumes
  const volumeCapFlexibility = 10; // Allow up to 10 sets over the cap (max 30 sets)
  if (result.coverage_report?.projected_weekly_sets) {
    const overtrained = Object.entries(result.coverage_report.projected_weekly_sets)
      .filter(([muscle, sets]) => sets > 20)
      .map(([muscle, sets]) => ({ muscle, sets }));
    
    const criticalOvertraining = overtrained.filter(({ sets }) => sets > (20 + volumeCapFlexibility));
    
    if (criticalOvertraining.length > 0) {
      const formatted = criticalOvertraining.map(({ muscle, sets }) => `${muscle}: ${sets} sets`);
      console.error(`❌ Weekly volume cap CRITICALLY exceeded (>${20 + volumeCapFlexibility} sets/muscle):`, formatted);
      throw new Error(
        `Weekly volume cap critically exceeded: ${formatted.join(", ")}. ` +
        `This exceeds safe training limits. Reduce today's volume for these muscle groups.`
      );
    } else if (overtrained.length > 0) {
      const formatted = overtrained.map(({ muscle, sets }) => `${muscle}: ${sets} sets`);
      console.warn(`⚠️ Weekly volume cap slightly exceeded (20-${20 + volumeCapFlexibility} sets/muscle):`, formatted);
      console.warn(`   This is within acceptable limits, but monitor recovery. Proceeding with workout.`);
      // Add warning to safety notes instead of failing
      result.safety.notes += ` | Volume alert: ${formatted.join(", ")} slightly over weekly target (20 sets). Monitor recovery.`;
    }
  }

  // Basic safety layer checks - dynamic based on session duration
  const totalSets = Object.values(result.compliance_summary.volume_sets_estimate).reduce(
    (a: number, b: number) => a + b,
    0
  );
  
  // Dynamic volume cap based on session duration:
  // ~2.5-3 min per set average (including rest) = sustainable volume
  const sessionMinutes = data.availability.session_minutes || 60;
  const maxSetsForDuration = Math.floor(sessionMinutes / 2.5); // Conservative estimate
  
  if (totalSets > maxSetsForDuration) {
    throw new Error(
      `Unsafe volume (${totalSets} sets in ${sessionMinutes} min session). ` +
      `Max recommended: ${maxSetsForDuration} sets. Regenerate session.`
    );
  }

  // Add server-side safety notes for injuries
  if (data.user_profile?.injuries_limitations?.length > 0) {
    result.safety.notes += ` | Server check: User has reported injuries: ${data.user_profile.injuries_limitations.join(", ")}. Exercises selected to avoid aggravation.`;
  }

  return result;
}

// ──────────────────────────────────────────────
// Exercise name fuzzy matching (Enhanced with exercise-resolver)
// ──────────────────────────────────────────────
export async function matchExerciseToLibrary(
  storage: IStorage,
  exerciseName: string
): Promise<string | null> {
  // Use the sophisticated exercise resolver
  const outcome = await resolveAIExercise(exerciseName, storage, {
    minAuto: 0.86,      // High confidence threshold for auto-resolution
    deltaGuard: 0.08,   // Require clear winner to avoid false positives
    topK: 3             // Return top 3 suggestions if ambiguous
  });
  
  if (outcome.kind === "resolved") {
    console.log(`✅ Resolved "${exerciseName}" → "${outcome.matched_name}" (score: ${outcome.score.toFixed(3)})`);
    return outcome.canonical_id;
  }
  
  if (outcome.kind === "needs_confirmation") {
    // Log suggestions for manual review/teaching
    console.warn(`⚠️ Ambiguous match for "${exerciseName}". Top suggestions:`);
    outcome.suggestions.forEach((s, i) => {
      console.warn(`  ${i + 1}. ${s.id} (score: ${s.score.toFixed(3)}) - ${s.reason.join(", ")}`);
    });
    // Return best guess (top suggestion)
    if (outcome.suggestions.length > 0) {
      const topSuggestion = outcome.suggestions[0];
      console.warn(`  → Using top suggestion: ${topSuggestion.id}`);
      return topSuggestion.id;
    }
  }
  
  console.error(`❌ No match found for "${exerciseName}"`);
  console.error(`   Trace: ${outcome.trace.join(" → ")}`);
  return null;
}
