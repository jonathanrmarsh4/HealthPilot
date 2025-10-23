/**
 * HealthPilot – Deterministic Workout Planner
 * Rule-based system demonstrating how readiness, health profile, goals, 
 * and training rules affect workout generation.
 */

// ──────────────────────────────────────────────
// Type Definitions
// ──────────────────────────────────────────────

export interface UserProfile {
  experience: "beginner" | "intermediate" | "advanced";
  days_per_week: number;
  session_minutes_cap: number;
  available_equipment: string[];
  preferences: {
    likes?: string[];
    dislikes?: string[];
  };
  limitations: Record<string, string>; // e.g., { shoulder: "no_overhead_press" }
  goals: string[]; // e.g., ["hypertrophy"], ["strength"]
  signals: {
    biomarker_flags: string[]; // e.g., ["elevated_bp"]
    recovery_flags: string[]; // e.g., ["hrv_down_3d", "sleep_poor"]
  };
}

export interface Exercise {
  id: string;
  name: string;
  equipment: string[];
  modality: string; // "barbell", "db", "cable", "machine", "bodyweight", "bands"
  muscles: string[];
  category: "compound" | "isolation";
  contraindications: string[]; // e.g., ["no_overhead_press"]
  estimated_minutes: number;
}

export interface WorkoutSlot {
  name: string;
  pattern: string; // e.g., "squat_pattern", "horizontal_press"
  priority: number; // 1 = main, 2 = secondary, 3+ = accessory
  candidate_exercises: string[]; // exercise IDs
}

export interface Template {
  id: string;
  name: string;
  days: Record<string, WorkoutSlot[]>; // e.g., { dayA: [...], dayB: [...] }
}

export interface PlannedExercise {
  slot: string;
  exercise_id: string;
  exercise_name: string;
  sets: number;
  reps: string;
  rest_s: number;
  reasons: string[];
  estimated_minutes: number;
}

export interface DayPlan {
  exercises: PlannedExercise[];
  notes: string[];
  estimated_time_min: number;
}

export interface BuildDayPlanRequest {
  user_profile: UserProfile;
  template_id: string;
  day_key: string;
  signals: {
    biomarker_flags: string[];
    recovery_flags: string[];
  };
  time_cap_min: number;
}

export interface SwapRequest {
  user_profile: UserProfile;
  signals: {
    biomarker_flags: string[];
    recovery_flags: string[];
  };
}

export interface LoadDecisionInput {
  recovery_flags: string[];
  last_two_sessions: Array<{
    exercise: string;
    completed_reps: number;
    target_reps_max: number;
  }>;
}

// ──────────────────────────────────────────────
// Exercise Database
// ──────────────────────────────────────────────

export const EXERCISES: Record<string, Exercise> = {
  // SQUAT PATTERNS
  barbell_back_squat: {
    id: "barbell_back_squat",
    name: "Barbell Back Squat",
    equipment: ["barbell", "rack"],
    modality: "barbell",
    muscles: ["quads", "glutes", "hamstrings"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 8
  },
  db_goblet_squat: {
    id: "db_goblet_squat",
    name: "Dumbbell Goblet Squat",
    equipment: ["db"],
    modality: "db",
    muscles: ["quads", "glutes"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  hack_squat: {
    id: "hack_squat",
    name: "Hack Squat",
    equipment: ["machine"],
    modality: "machine",
    muscles: ["quads", "glutes"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  leg_press: {
    id: "leg_press",
    name: "Leg Press",
    equipment: ["machine"],
    modality: "machine",
    muscles: ["quads", "glutes", "hamstrings"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  db_front_squat: {
    id: "db_front_squat",
    name: "Dumbbell Front Squat",
    equipment: ["db"],
    modality: "db",
    muscles: ["quads", "glutes"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },

  // HORIZONTAL PRESS
  barbell_bench_press: {
    id: "barbell_bench_press",
    name: "Barbell Bench Press",
    equipment: ["barbell", "bench"],
    modality: "barbell",
    muscles: ["chest", "triceps", "shoulders"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 8
  },
  flat_db_press: {
    id: "flat_db_press",
    name: "Flat Dumbbell Press",
    equipment: ["db", "bench"],
    modality: "db",
    muscles: ["chest", "triceps", "shoulders"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  machine_chest_press: {
    id: "machine_chest_press",
    name: "Machine Chest Press",
    equipment: ["machine"],
    modality: "machine",
    muscles: ["chest", "triceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 5
  },
  pushup: {
    id: "pushup",
    name: "Push-up",
    equipment: [],
    modality: "bodyweight",
    muscles: ["chest", "triceps", "shoulders"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 4
  },

  // VERTICAL PULL
  pullup: {
    id: "pullup",
    name: "Pull-up",
    equipment: [],
    modality: "bodyweight",
    muscles: ["lats", "biceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  lat_pulldown: {
    id: "lat_pulldown",
    name: "Lat Pulldown",
    equipment: ["cable", "machine"],
    modality: "cable",
    muscles: ["lats", "biceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },

  // HORIZONTAL PULL
  barbell_row: {
    id: "barbell_row",
    name: "Barbell Row",
    equipment: ["barbell"],
    modality: "barbell",
    muscles: ["back", "lats", "biceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 7
  },
  db_row: {
    id: "db_row",
    name: "Dumbbell Row",
    equipment: ["db", "bench"],
    modality: "db",
    muscles: ["back", "lats", "biceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },
  cable_row: {
    id: "cable_row",
    name: "Cable Row",
    equipment: ["cable"],
    modality: "cable",
    muscles: ["back", "lats", "biceps"],
    category: "compound",
    contraindications: [],
    estimated_minutes: 6
  },

  // OVERHEAD PRESS
  db_overhead_press: {
    id: "db_overhead_press",
    name: "Dumbbell Overhead Press",
    equipment: ["db"],
    modality: "db",
    muscles: ["shoulders", "triceps"],
    category: "compound",
    contraindications: ["no_overhead_press"],
    estimated_minutes: 6
  },
  barbell_overhead_press: {
    id: "barbell_overhead_press",
    name: "Barbell Overhead Press",
    equipment: ["barbell"],
    modality: "barbell",
    muscles: ["shoulders", "triceps"],
    category: "compound",
    contraindications: ["no_overhead_press"],
    estimated_minutes: 7
  },

  // ACCESSORIES
  db_curl: {
    id: "db_curl",
    name: "Dumbbell Curl",
    equipment: ["db"],
    modality: "db",
    muscles: ["biceps"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  },
  cable_tricep_extension: {
    id: "cable_tricep_extension",
    name: "Cable Tricep Extension",
    equipment: ["cable"],
    modality: "cable",
    muscles: ["triceps"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  },
  cable_face_pull: {
    id: "cable_face_pull",
    name: "Cable Face Pull",
    equipment: ["cable"],
    modality: "cable",
    muscles: ["rear_delts", "traps"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  },
  leg_curl: {
    id: "leg_curl",
    name: "Leg Curl",
    equipment: ["machine"],
    modality: "machine",
    muscles: ["hamstrings"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  },
  calf_raise: {
    id: "calf_raise",
    name: "Calf Raise",
    equipment: ["machine"],
    modality: "machine",
    muscles: ["calves"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  },
  lateral_raise: {
    id: "lateral_raise",
    name: "Lateral Raise",
    equipment: ["db", "cable"],
    modality: "db",
    muscles: ["shoulders"],
    category: "isolation",
    contraindications: [],
    estimated_minutes: 4
  }
};

// ──────────────────────────────────────────────
// Template Definitions
// ──────────────────────────────────────────────

export const TEMPLATES: Record<string, Template> = {
  template_fullbody_x3: {
    id: "template_fullbody_x3",
    name: "Full Body 3x/week",
    days: {
      dayA: [
        {
          name: "squat_pattern",
          pattern: "squat_pattern",
          priority: 1,
          candidate_exercises: ["barbell_back_squat", "db_goblet_squat", "hack_squat", "leg_press", "db_front_squat"]
        },
        {
          name: "horizontal_press",
          pattern: "horizontal_press",
          priority: 1,
          candidate_exercises: ["barbell_bench_press", "flat_db_press", "machine_chest_press", "pushup"]
        },
        {
          name: "vertical_pull",
          pattern: "vertical_pull",
          priority: 2,
          candidate_exercises: ["pullup", "lat_pulldown"]
        },
        {
          name: "accessory_biceps",
          pattern: "biceps",
          priority: 3,
          candidate_exercises: ["db_curl"]
        },
        {
          name: "accessory_triceps",
          pattern: "triceps",
          priority: 3,
          candidate_exercises: ["cable_tricep_extension"]
        }
      ],
      dayB: [
        {
          name: "horizontal_pull",
          pattern: "horizontal_pull",
          priority: 1,
          candidate_exercises: ["barbell_row", "db_row", "cable_row"]
        },
        {
          name: "overhead_press",
          pattern: "overhead_press",
          priority: 2,
          candidate_exercises: ["db_overhead_press", "barbell_overhead_press", "lateral_raise"]
        },
        {
          name: "accessory_rear_delt",
          pattern: "rear_delt",
          priority: 3,
          candidate_exercises: ["cable_face_pull"]
        },
        {
          name: "accessory_hamstrings",
          pattern: "hamstrings",
          priority: 3,
          candidate_exercises: ["leg_curl"]
        },
        {
          name: "accessory_calves",
          pattern: "calves",
          priority: 3,
          candidate_exercises: ["calf_raise"]
        }
      ]
    }
  }
};

// ──────────────────────────────────────────────
// Exercise Scoring Logic
// ──────────────────────────────────────────────

export interface ExerciseScore {
  exercise_id: string;
  score: number;
  reasons: string[];
}

export function scoreExercise(
  exercise: Exercise,
  userProfile: UserProfile,
  signals: { biomarker_flags: string[]; recovery_flags: string[] }
): ExerciseScore {
  let score = 50; // baseline
  const reasons: string[] = [];

  // Equipment availability (+20 or -1000)
  const hasEquipment = exercise.equipment.length === 0 || 
    exercise.equipment.every(eq => userProfile.available_equipment.includes(eq));
  
  if (hasEquipment) {
    score += 20;
    reasons.push("equipment available");
  } else {
    score -= 1000;
    reasons.push("equipment unavailable");
  }

  // Modality preferences (+15)
  if (userProfile.preferences.likes?.includes(exercise.modality)) {
    score += 15;
    reasons.push(`preferred modality: ${exercise.modality}`);
  }

  // Dislikes (-30)
  if (userProfile.preferences.dislikes?.includes(exercise.id)) {
    score -= 30;
    reasons.push("disliked exercise");
  }

  // Limitations/Contraindications (-1000)
  const limitationKeys = Object.keys(userProfile.limitations);
  for (const key of limitationKeys) {
    const limitation = userProfile.limitations[key];
    if (exercise.contraindications.includes(limitation)) {
      score -= 1000;
      reasons.push(`contraindication: ${limitation}`);
    }
  }

  // Goals: strength favors barbell (+10), hypertrophy favors variety
  if (userProfile.goals.includes("strength") && exercise.modality === "barbell") {
    score += 10;
    reasons.push("strength goal favors barbell");
  }

  // Recovery flags: prefer machines for safety (+5)
  if (signals.recovery_flags.length > 0 && exercise.modality === "machine") {
    score += 5;
    reasons.push("low recovery favors machines");
  }

  // BP flags: prefer machines (+5)
  if (signals.biomarker_flags.includes("elevated_bp") && exercise.modality === "machine") {
    score += 5;
    reasons.push("elevated BP favors machines");
  }

  return { exercise_id: exercise.id, score, reasons };
}

// ──────────────────────────────────────────────
// Volume & Rest Calculation
// ──────────────────────────────────────────────

function calculateSetsAndReps(
  exercise: Exercise,
  userProfile: UserProfile,
  signals: { biomarker_flags: string[]; recovery_flags: string[] },
  priority: number
): { sets: number; reps: string; rest_s: number; reasons: string[] } {
  const reasons: string[] = [];
  
  // Base values by goal
  let sets = 4;
  let reps = "6-10";
  let rest_s = 90;

  if (userProfile.goals.includes("strength")) {
    sets = 4;
    reps = "5-8";
    rest_s = 180;
    reasons.push("strength goal: lower reps, longer rest");
  } else if (userProfile.goals.includes("hypertrophy")) {
    sets = 3;
    reps = "6-10";
    rest_s = 90;
    reasons.push("hypertrophy goal: moderate reps, moderate rest");
  }

  // Recovery scaling
  if (signals.recovery_flags.length > 0) {
    sets = Math.max(2, sets - 1);
    rest_s = Math.max(rest_s, 120);
    reasons.push("low recovery: reduced volume, increased rest");
  }

  // BP safety
  if (signals.biomarker_flags.includes("elevated_bp")) {
    // Enforce rep floor of 6
    const repsMatch = reps.match(/(\d+)-(\d+)/);
    if (repsMatch) {
      const min = Math.max(6, parseInt(repsMatch[1]));
      const max = Math.max(min, parseInt(repsMatch[2]));
      reps = `${min}-${max}`;
    }
    rest_s = Math.max(rest_s, 120);
    reasons.push("elevated BP: rep floor ≥6, rest ≥120s");
  }

  // Priority-based scaling for accessories
  if (priority >= 3) {
    sets = Math.max(2, sets - 1);
    reasons.push("accessory: reduced volume");
  }

  return { sets, reps, rest_s, reasons };
}

// ──────────────────────────────────────────────
// Build Day Plan
// ──────────────────────────────────────────────

export function buildDayPlan(req: BuildDayPlanRequest): DayPlan {
  const template = TEMPLATES[req.template_id];
  if (!template) {
    throw new Error(`Template ${req.template_id} not found`);
  }

  const daySlots = template.days[req.day_key];
  if (!daySlots) {
    throw new Error(`Day ${req.day_key} not found in template ${req.template_id}`);
  }

  const planned: PlannedExercise[] = [];
  const notes: string[] = [];
  let totalTime = 0;

  // Recovery notes
  if (req.signals.recovery_flags.length > 0) {
    notes.push(`Volume scaled due to low recovery (${req.signals.recovery_flags.join(", ")})`);
  }

  // BP notes
  if (req.signals.biomarker_flags.includes("elevated_bp")) {
    notes.push("BP-safe cues: rep floor ≥6, rest ≥120s on compounds");
  }

  // Select exercises for each slot
  for (const slot of daySlots) {
    // Score all candidates
    const scores = slot.candidate_exercises
      .map(exId => {
        const exercise = EXERCISES[exId];
        return scoreExercise(exercise, req.user_profile, req.signals);
      })
      .sort((a, b) => b.score - a.score);

    // Pick the highest scoring valid exercise
    const winner = scores.find(s => s.score > 0);
    if (!winner) {
      notes.push(`⚠️ Could not find valid exercise for slot: ${slot.name}`);
      continue;
    }

    const exercise = EXERCISES[winner.exercise_id];
    const { sets, reps, rest_s, reasons: volReasons } = calculateSetsAndReps(
      exercise,
      req.user_profile,
      req.signals,
      slot.priority
    );

    const allReasons = [...winner.reasons, ...volReasons];
    const estimatedMinutes = exercise.estimated_minutes;
    totalTime += estimatedMinutes;

    planned.push({
      slot: slot.name,
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets,
      reps,
      rest_s,
      reasons: allReasons,
      estimated_minutes: estimatedMinutes
    });
  }

  // Time budget trimming
  if (totalTime > req.time_cap_min) {
    notes.push(`⏱️ Time budget exceeded (${totalTime}min > ${req.time_cap_min}min), trimming accessories`);
    
    // Remove lowest priority exercises until under budget
    const sortedByPriority = [...planned].sort((a, b) => {
      const slotA = daySlots.find(s => s.name === a.slot);
      const slotB = daySlots.find(s => s.name === b.slot);
      return (slotB?.priority || 0) - (slotA?.priority || 0);
    });

    let currentTime = totalTime;
    const trimmed: string[] = [];

    for (const ex of sortedByPriority) {
      if (currentTime <= req.time_cap_min) break;
      
      const slotInfo = daySlots.find(s => s.name === ex.slot);
      if (slotInfo && slotInfo.priority >= 3) {
        currentTime -= ex.estimated_minutes;
        trimmed.push(ex.exercise_name);
        const index = planned.findIndex(p => p.exercise_id === ex.exercise_id);
        if (index !== -1) planned.splice(index, 1);
      }
    }

    if (trimmed.length > 0) {
      notes.push(`Trimmed accessories: ${trimmed.join(", ")}`);
      totalTime = currentTime;
    }
  }

  return {
    exercises: planned,
    notes,
    estimated_time_min: totalTime
  };
}

// ──────────────────────────────────────────────
// Swap Alternates
// ──────────────────────────────────────────────

export function swapAlternates(
  slot: string,
  currentId: string,
  req: SwapRequest
): ExerciseScore[] {
  // Find the template and slot
  const template = TEMPLATES["template_fullbody_x3"]; // default for demo
  let candidates: string[] = [];

  for (const dayKey of Object.keys(template.days)) {
    const daySlots = template.days[dayKey];
    const slotInfo = daySlots.find(s => s.name === slot);
    if (slotInfo) {
      candidates = slotInfo.candidate_exercises;
      break;
    }
  }

  if (candidates.length === 0) {
    return [];
  }

  // Score all candidates except current
  const alternates = candidates
    .filter(exId => exId !== currentId)
    .map(exId => {
      const exercise = EXERCISES[exId];
      return scoreExercise(exercise, req.user_profile, req.signals);
    })
    .filter(score => score.score > 0)
    .sort((a, b) => b.score - a.score);

  return alternates.slice(0, 3); // top 3
}

// ──────────────────────────────────────────────
// Load Progression Decision
// ──────────────────────────────────────────────

export function nextLoadDecision(input: LoadDecisionInput): string {
  // Deload if recovery flags present
  if (input.recovery_flags.length > 0) {
    return "deload";
  }

  // Check if last two sessions hit top of range
  const allAtTop = input.last_two_sessions.every(
    session => session.completed_reps >= session.target_reps_max
  );

  if (allAtTop) {
    return "increase_small";
  }

  return "maintain";
}

// ──────────────────────────────────────────────
// Default Config Export
// ──────────────────────────────────────────────

export const defaultConfig = {
  templates: TEMPLATES,
  exercises: EXERCISES
};
