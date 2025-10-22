/**
 * HealthPilot – Daily Training Generator
 * Generates standards-aligned daily training sessions based on profile,
 * preferences, biometrics, and recent training history.
 */

import OpenAI from "openai";
import { z } from "zod";
import type { IStorage } from "../storage";
import { format, subDays } from "date-fns";

// ──────────────────────────────────────────────
// Validation schema (mirrors OUTPUT_SCHEMA)
// ──────────────────────────────────────────────
export const DailyWorkoutSchema = z.object({
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
      exercise: z.string(),
      goal: z.enum(["strength", "hypertrophy", "power"]),
      sets: z.number().min(1).max(6),
      reps: z.number().min(1).max(15),
      intensity: z.string(),
      rest_seconds: z.number().min(45).max(360),
      alternative_if_limited: z.string().optional()
    })
  ),
  accessories: z.array(
    z.object({
      exercise: z.string(),
      goal: z.string(),
      sets: z.number(),
      reps: z.number(),
      intensity: z.string(),
      rest_seconds: z.number(),
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
  })
});

export type DailyWorkout = z.infer<typeof DailyWorkoutSchema>;

// ──────────────────────────────────────────────
// Initialize OpenAI client
// ──────────────────────────────────────────────
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const duration = latestSleep.duration || 420; // in minutes
    const quality = latestSleep.quality || 0.7;
    sleepScore = Math.min(100, (duration / 480) * quality * 100);
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

  // Build preferences
  const preferences = {
    split_style: fitnessProfile?.preferredWorkoutTypes?.[0] || "push_pull_legs",
    available_equipment: availableEquipment,
    setting: fitnessProfile?.hasGymAccess ? "gym" : "home",
    liked_exercises: [], // TODO: get from exercise feedback
    disliked_exercises: [] // TODO: get from exercise feedback
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
    readiness_notes: latestReadiness?.notes || ""
  };

  return {
    date: targetDate,
    user_profile: userProfile,
    preferences,
    availability,
    environment,
    recent_training: recentTraining,
    biometrics
  };
}

// ──────────────────────────────────────────────
// Core function to generate one daily plan
// ──────────────────────────────────────────────
export async function generateDailySession(data: any): Promise<DailyWorkout> {
  const systemPrompt = `
You are HealthPilot Coach, an expert strength & conditioning planner.
Always follow ACSM, NSCA and WHO guardrails.
Never output text or commentary—JSON only.

Guardrails:
- Strength: 1–6 reps @75–90%1RM RPE7–9, rest 120-240s
- Hypertrophy: 6–12 reps @65–80%1RM RPE6–8, rest 60-120s
- Endurance: 12–20 reps @50–70%1RM RPE5–7, rest 45-90s
- Weekly volume: 8-20 sets per muscle group
- Session time caps: beginner 45min, intermediate 60min, advanced 75min
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
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          instruction: "Generate today's safe and standards-aligned workout session.",
          input: data
        })
      }
    ],
    temperature: 0.7
  });

  const content = response.choices[0].message?.content ?? "{}";
  const parsed = JSON.parse(content);

  // Validate output structure & guardrails
  const result = DailyWorkoutSchema.parse(parsed);

  // Basic safety layer checks
  const totalSets = Object.values(result.compliance_summary.volume_sets_estimate).reduce(
    (a: number, b: number) => a + b,
    0
  );
  if (totalSets > 25) {
    throw new Error(`Unsafe volume (${totalSets} sets). Regenerate session.`);
  }

  // Add server-side safety notes for injuries
  if (data.user_profile?.injuries_limitations?.length > 0) {
    result.safety.notes += ` | Server check: User has reported injuries: ${data.user_profile.injuries_limitations.join(", ")}. Exercises selected to avoid aggravation.`;
  }

  return result;
}

// ──────────────────────────────────────────────
// Exercise name fuzzy matching
// ──────────────────────────────────────────────
export async function matchExerciseToLibrary(
  storage: IStorage,
  exerciseName: string
): Promise<string | null> {
  // Get all exercises from library
  const exercises = await storage.getAllExercises();
  
  // Simple fuzzy matching - convert to lowercase and check for substring match
  const nameLower = exerciseName.toLowerCase();
  
  // Try exact match first
  const exactMatch = exercises.find(ex => ex.name.toLowerCase() === nameLower);
  if (exactMatch) {
    return exactMatch.id;
  }
  
  // Try partial match (e.g., "barbell bench press" matches "bench press")
  const partialMatch = exercises.find(ex => {
    const exNameLower = ex.name.toLowerCase();
    return exNameLower.includes(nameLower) || nameLower.includes(exNameLower);
  });
  
  if (partialMatch) {
    return partialMatch.id;
  }
  
  // No match found
  return null;
}
