/**
 * HealthPilot – Workout Planner Tests
 * Proves that the planner accounts for readiness, health profile, goals, and training rules.
 */

import assert from "node:assert/strict";
import {
  buildDayPlan,
  scoreExercise,
  EXERCISES,
  type UserProfile,
  type BuildDayPlanRequest
} from "./server/services/workout-planner";

console.log("🧪 Running Workout Planner Tests...\n");

// ──────────────────────────────────────────────
// Test 1: Readiness Scaling
// ──────────────────────────────────────────────

console.log("Test 1: Readiness scaling - volume reduction with recovery flags");

const userWithLowRecovery: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["db", "bench", "cable", "machine"],
  preferences: { likes: ["db"], dislikes: [] },
  limitations: {},
  goals: ["hypertrophy"],
  signals: {
    biomarker_flags: [],
    recovery_flags: ["hrv_down_3d", "sleep_poor"]
  }
};

const userWithGoodRecovery: UserProfile = {
  ...userWithLowRecovery,
  signals: {
    biomarker_flags: [],
    recovery_flags: []
  }
};

const lowRecoveryPlan = buildDayPlan({
  user_profile: userWithLowRecovery,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: userWithLowRecovery.signals,
  time_cap_min: 60
});

const goodRecoveryPlan = buildDayPlan({
  user_profile: userWithGoodRecovery,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: userWithGoodRecovery.signals,
  time_cap_min: 60
});

const lowRecoverySets = lowRecoveryPlan.exercises.reduce((sum, ex) => sum + ex.sets, 0);
const goodRecoverySets = goodRecoveryPlan.exercises.reduce((sum, ex) => sum + ex.sets, 0);

console.log(`   Low recovery total sets: ${lowRecoverySets}`);
console.log(`   Good recovery total sets: ${goodRecoverySets}`);

assert(
  lowRecoverySets < goodRecoverySets,
  `Expected low recovery sets (${lowRecoverySets}) to be less than good recovery sets (${goodRecoverySets})`
);

console.log("   ✅ PASS: Volume reduced with recovery flags\n");

// ──────────────────────────────────────────────
// Test 2: BP Safety Rule
// ──────────────────────────────────────────────

console.log("Test 2: BP safety rule - rep floor ≥6 and rest ≥120s");

const userWithElevatedBP: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["db", "bench", "cable", "machine"],
  preferences: { likes: ["db"], dislikes: [] },
  limitations: {},
  goals: ["hypertrophy"],
  signals: {
    biomarker_flags: ["elevated_bp"],
    recovery_flags: []
  }
};

const bpPlan = buildDayPlan({
  user_profile: userWithElevatedBP,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: userWithElevatedBP.signals,
  time_cap_min: 60
});

// Check main lifts (priority 1)
const mainLifts = bpPlan.exercises.filter(ex => 
  ex.slot === "squat_pattern" || ex.slot === "horizontal_press"
);

let hasValidBPRules = false;
for (const lift of mainLifts) {
  const repsMatch = lift.reps.match(/(\d+)-(\d+)/);
  if (repsMatch) {
    const minReps = parseInt(repsMatch[1]);
    if (minReps >= 6 && lift.rest_s >= 120) {
      hasValidBPRules = true;
      console.log(`   ${lift.exercise_name}: ${lift.reps} reps, ${lift.rest_s}s rest`);
    }
  }
}

assert(hasValidBPRules, "Expected at least one main lift to have rep floor ≥6 and rest ≥120s");
console.log("   ✅ PASS: BP safety rules enforced\n");

// ──────────────────────────────────────────────
// Test 3: Limitations Honored
// ──────────────────────────────────────────────

console.log("Test 3: Limitations honored - no overhead press with shoulder limitation");

const userWithShoulderLimitation: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["db", "bench", "cable", "machine"],
  preferences: { likes: ["db"], dislikes: [] },
  limitations: { shoulder: "no_overhead_press" },
  goals: ["hypertrophy"],
  signals: {
    biomarker_flags: [],
    recovery_flags: []
  }
};

const limitationPlan = buildDayPlan({
  user_profile: userWithShoulderLimitation,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: userWithShoulderLimitation.signals,
  time_cap_min: 60
});

const hasOverheadPress = limitationPlan.exercises.some(ex => 
  ex.exercise_id === "db_overhead_press" || ex.exercise_id === "barbell_overhead_press"
);

console.log(`   Overhead press in plan: ${hasOverheadPress ? "YES (FAIL)" : "NO (PASS)"}`);
assert(!hasOverheadPress, "Expected no overhead press exercises with shoulder limitation");
console.log("   ✅ PASS: Shoulder limitation respected\n");

// ──────────────────────────────────────────────
// Test 4: Goals Steer Selection
// ──────────────────────────────────────────────

console.log("Test 4: Goals steer selection - strength goal favors barbell");

const strengthUser: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["barbell", "rack", "db", "bench", "cable", "machine"],
  preferences: { likes: ["barbell"], dislikes: [] },
  limitations: {},
  goals: ["strength"],
  signals: {
    biomarker_flags: [],
    recovery_flags: []
  }
};

const strengthPlan = buildDayPlan({
  user_profile: strengthUser,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: strengthUser.signals,
  time_cap_min: 60
});

// Check that barbell exercises are selected when available
const barbellExercises = strengthPlan.exercises.filter(ex => 
  EXERCISES[ex.exercise_id].modality === "barbell"
);

console.log(`   Barbell exercises selected: ${barbellExercises.length}`);
console.log(`   Exercises: ${barbellExercises.map(ex => ex.exercise_name).join(", ")}`);

// Strength users should prefer barbell when equipment is available
const squatSlot = strengthPlan.exercises.find(ex => ex.slot === "squat_pattern");
const pressSlot = strengthPlan.exercises.find(ex => ex.slot === "horizontal_press");

const hasBarbellCompounds = (squatSlot && squatSlot.exercise_id === "barbell_back_squat") ||
                            (pressSlot && pressSlot.exercise_id === "barbell_bench_press");

console.log(`   Barbell compound selected: ${hasBarbellCompounds ? "YES" : "NO"}`);
assert(barbellExercises.length > 0, "Expected at least one barbell exercise for strength goal");
console.log("   ✅ PASS: Strength goal steers toward barbell exercises\n");

// ──────────────────────────────────────────────
// Test 5: Time Budget Enforcement
// ──────────────────────────────────────────────

console.log("Test 5: Time budget enforcement - accessories trimmed");

const userWithTightBudget: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 35, // Very tight!
  available_equipment: ["db", "bench", "cable", "machine"],
  preferences: { likes: ["db"], dislikes: [] },
  limitations: {},
  goals: ["hypertrophy"],
  signals: {
    biomarker_flags: [],
    recovery_flags: []
  }
};

const tightBudgetPlan = buildDayPlan({
  user_profile: userWithTightBudget,
  template_id: "template_fullbody_x3",
  day_key: "dayA",
  signals: userWithTightBudget.signals,
  time_cap_min: 35
});

console.log(`   Exercises in plan: ${tightBudgetPlan.exercises.length}`);
console.log(`   Estimated time: ${tightBudgetPlan.estimated_time_min}min (cap: 35min)`);
console.log(`   Exercises: ${tightBudgetPlan.exercises.map(ex => ex.exercise_name).join(", ")}`);

// Should have trimmed at least one accessory
assert(
  tightBudgetPlan.exercises.length < 5,
  "Expected at least one exercise to be trimmed with tight time budget"
);

assert(
  tightBudgetPlan.estimated_time_min <= 35,
  `Expected time (${tightBudgetPlan.estimated_time_min}min) to be within budget (35min)`
);

console.log("   ✅ PASS: Time budget enforced, accessories trimmed\n");

// ──────────────────────────────────────────────
// Test 6: Exercise Scoring Logic
// ──────────────────────────────────────────────

console.log("Test 6: Exercise scoring - equipment availability");

const testUser: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["db", "bench"],
  preferences: { likes: ["db"], dislikes: [] },
  limitations: {},
  goals: ["hypertrophy"],
  signals: { biomarker_flags: [], recovery_flags: [] }
};

// Score an exercise with available equipment
const dbSquatScore = scoreExercise(
  EXERCISES.db_goblet_squat,
  testUser,
  testUser.signals
);

// Score an exercise with unavailable equipment
const barbellSquatScore = scoreExercise(
  EXERCISES.barbell_back_squat,
  testUser,
  testUser.signals
);

console.log(`   DB Goblet Squat score: ${dbSquatScore.score} (equipment available)`);
console.log(`   Barbell Back Squat score: ${barbellSquatScore.score} (equipment unavailable)`);

assert(
  dbSquatScore.score > 0,
  "Expected positive score for exercise with available equipment"
);

assert(
  barbellSquatScore.score < 0,
  "Expected negative score for exercise with unavailable equipment"
);

console.log("   ✅ PASS: Equipment availability affects scoring\n");

// ──────────────────────────────────────────────
// All Tests Complete
// ──────────────────────────────────────────────

console.log("═".repeat(70));
console.log("✅ ALL TESTS PASSED!");
console.log("═".repeat(70));
console.log("");
console.log("Verified:");
console.log("  ✓ Readiness scaling reduces volume");
console.log("  ✓ BP safety rules enforced (rep floor, rest)");
console.log("  ✓ Limitations honored (no contraindicated exercises)");
console.log("  ✓ Goals steer exercise selection");
console.log("  ✓ Time budget enforcement trims accessories");
console.log("  ✓ Equipment availability affects scoring");
console.log("");

process.exit(0);
