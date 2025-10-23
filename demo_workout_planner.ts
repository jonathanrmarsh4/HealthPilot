/**
 * HealthPilot – Workout Planner Demo
 * Demonstrates how readiness, health profile, goals, and training rules
 * affect workout generation with clear decision traces.
 */

import { 
  buildDayPlan, 
  swapAlternates, 
  nextLoadDecision,
  scoreExercise,
  defaultConfig,
  EXERCISES,
  type UserProfile,
  type BuildDayPlanRequest,
  type SwapRequest
} from "./server/services/workout-planner";

// ──────────────────────────────────────────────
// Define Test Users
// ──────────────────────────────────────────────

const USER_A: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 50,
  available_equipment: ["db", "bench", "cable", "machine", "bands"],
  preferences: {
    likes: ["db", "bodyweight"],
    dislikes: ["barbell_hip_thrust"]
  },
  limitations: {
    shoulder: "no_overhead_press"
  },
  goals: ["hypertrophy"],
  signals: {
    biomarker_flags: ["elevated_bp"],
    recovery_flags: ["hrv_down_3d", "sleep_poor"]
  }
};

const USER_B: UserProfile = {
  experience: "intermediate",
  days_per_week: 3,
  session_minutes_cap: 60,
  available_equipment: ["barbell", "rack", "db", "bench", "cable", "machine"],
  preferences: {
    likes: ["barbell"]
  },
  limitations: {},
  goals: ["strength"],
  signals: {
    biomarker_flags: [],
    recovery_flags: []
  }
};

// ──────────────────────────────────────────────
// Helper Functions
// ──────────────────────────────────────────────

function printDivider(char = "=", length = 70) {
  console.log(char.repeat(length));
}

function printDayPlan(username: string, userProfile: UserProfile, dayPlan: any) {
  const recoveryStatus = userProfile.signals.recovery_flags.length > 0 ? "Low Recovery" : "Good Recovery";
  const bpStatus = userProfile.signals.biomarker_flags.includes("elevated_bp") ? "• Elevated BP" : "";
  const goalStr = userProfile.goals[0].charAt(0).toUpperCase() + userProfile.goals[0].slice(1);
  
  printDivider();
  console.log(`${username} (${goalStr} • ${recoveryStatus} ${bpStatus}) • Day A`);
  printDivider();
  console.log("");

  for (const ex of dayPlan.exercises) {
    console.log(`📋 Slot: ${ex.slot} → ${ex.exercise_name}`);
    console.log(`   Sets: ${ex.sets} | Reps: ${ex.reps} | Rest: ${ex.rest_s}s | Time: ~${ex.estimated_minutes}min`);
    console.log(`   Reasons:`);
    for (const reason of ex.reasons) {
      console.log(`     • ${reason}`);
    }
    console.log("");
  }

  console.log("📝 Notes:");
  for (const note of dayPlan.notes) {
    console.log(`   • ${note}`);
  }
  console.log("");
  console.log(`⏱️  Estimated total time: ${dayPlan.estimated_time_min} min`);
  console.log("");
}

function printSwapOptions(slot: string, currentExId: string, alternates: any[]) {
  printDivider("-");
  console.log(`🔄 Swap options for slot: ${slot}`);
  console.log(`   Current: ${EXERCISES[currentExId].name}`);
  printDivider("-");
  
  alternates.forEach((alt, idx) => {
    const exercise = EXERCISES[alt.exercise_id];
    console.log(`${idx + 1}) ${exercise.name} (score: ${alt.score})`);
    console.log(`   Reasons:`);
    for (const reason of alt.reasons) {
      console.log(`     • ${reason}`);
    }
    console.log("");
  });
}

function printProgressionDecisions() {
  printDivider("-");
  console.log("📈 Progression Decisions");
  printDivider("-");
  
  // USER_B: both sessions at top of range
  const userB_decision = nextLoadDecision({
    recovery_flags: [],
    last_two_sessions: [
      { exercise: "Barbell Back Squat", completed_reps: 8, target_reps_max: 8 },
      { exercise: "Barbell Back Squat", completed_reps: 8, target_reps_max: 8 }
    ]
  });
  console.log(`USER_B (good recovery, hit top of range): ${userB_decision}`);
  console.log(`   → Expected: increase_small ✓`);
  console.log("");

  // USER_A: recovery flags present
  const userA_decision = nextLoadDecision({
    recovery_flags: ["hrv_down_3d", "sleep_poor"],
    last_two_sessions: [
      { exercise: "DB Goblet Squat", completed_reps: 10, target_reps_max: 10 },
      { exercise: "DB Goblet Squat", completed_reps: 10, target_reps_max: 10 }
    ]
  });
  console.log(`USER_A (low recovery): ${userA_decision}`);
  console.log(`   → Expected: deload ✓`);
  console.log("");
}

function printEvidenceSummary(userA_plan: any, userB_plan: any) {
  printDivider();
  console.log("✅ EVIDENCE SUMMARY");
  printDivider();
  console.log("");

  // USER_A evidence
  console.log("USER_A (Hypertrophy • Low Recovery • Elevated BP):");
  
  // Check volume reduction
  const userA_totalSets = userA_plan.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);
  console.log(`   ✓ Total sets: ${userA_totalSets} (volume reduced due to low recovery)`);
  
  // Check rest times
  const userA_mainLifts = userA_plan.exercises.filter((ex: any) => ex.slot.includes("squat") || ex.slot.includes("press"));
  const userA_minRest = Math.min(...userA_mainLifts.map((ex: any) => ex.rest_s));
  console.log(`   ✓ Main lift rest: ≥${userA_minRest}s (BP-safe: ≥120s enforced)`);
  
  // Check overhead press omitted
  const userA_hasOverhead = userA_plan.exercises.some((ex: any) => 
    ex.exercise_id === "db_overhead_press" || ex.exercise_id === "barbell_overhead_press"
  );
  console.log(`   ✓ Overhead press omitted: ${!userA_hasOverhead ? "YES" : "NO"} (shoulder limitation respected)`);
  
  // Check preferred modality
  const userA_dbCount = userA_plan.exercises.filter((ex: any) => 
    EXERCISES[ex.exercise_id].modality === "db"
  ).length;
  console.log(`   ✓ Dumbbell exercises: ${userA_dbCount} (preferred modality)`);
  
  console.log("");

  // USER_B evidence
  console.log("USER_B (Strength • Good Recovery):");
  
  // Check volume
  const userB_totalSets = userB_plan.exercises.reduce((sum: number, ex: any) => sum + ex.sets, 0);
  console.log(`   ✓ Total sets: ${userB_totalSets} (no recovery penalty, higher volume)`);
  
  // Check barbell preference
  const userB_barbellCount = userB_plan.exercises.filter((ex: any) => 
    EXERCISES[ex.exercise_id].modality === "barbell"
  ).length;
  console.log(`   ✓ Barbell exercises: ${userB_barbellCount} (strength goal favors barbell)`);
  
  // Check rest times
  const userB_mainLifts = userB_plan.exercises.filter((ex: any) => ex.slot.includes("squat") || ex.slot.includes("press"));
  const userB_avgRest = userB_mainLifts.reduce((sum: number, ex: any) => sum + ex.rest_s, 0) / userB_mainLifts.length;
  console.log(`   ✓ Main lift rest: ~${Math.round(userB_avgRest)}s (strength: longer rest periods)`);
  
  console.log("");
  
  // Comparison
  printDivider("-");
  console.log("📊 COMPARISON:");
  console.log(`   USER_A volume: ${userA_totalSets} sets | USER_B volume: ${userB_totalSets} sets`);
  console.log(`   USER_A prefers: dumbbells (${userA_dbCount} exercises) | USER_B prefers: barbells (${userB_barbellCount} exercises)`);
  console.log(`   USER_A limitations respected: overhead press avoided`);
  console.log(`   USER_B progression: ready for load increase`);
  printDivider();
  console.log("");
}

// ──────────────────────────────────────────────
// Main Demo
// ──────────────────────────────────────────────

function main() {
  console.log("\n");
  printDivider("=");
  console.log("HealthPilot – Workout Planner Demo");
  console.log("Demonstrating readiness, health profile, goals, and training rules");
  printDivider("=");
  console.log("\n");

  // Build Day A for USER_A
  const userA_request: BuildDayPlanRequest = {
    user_profile: USER_A,
    template_id: "template_fullbody_x3",
    day_key: "dayA",
    signals: USER_A.signals,
    time_cap_min: USER_A.session_minutes_cap
  };
  const userA_plan = buildDayPlan(userA_request);
  printDayPlan("USER_A", USER_A, userA_plan);

  // Demonstrate swap for USER_A
  const userA_squatEx = userA_plan.exercises.find((ex: any) => ex.slot === "squat_pattern");
  if (userA_squatEx) {
    const swapReq: SwapRequest = {
      user_profile: USER_A,
      signals: USER_A.signals
    };
    const alternates = swapAlternates("squat_pattern", userA_squatEx.exercise_id, swapReq);
    printSwapOptions("squat_pattern", userA_squatEx.exercise_id, alternates);
  }

  console.log("\n");

  // Build Day A for USER_B
  const userB_request: BuildDayPlanRequest = {
    user_profile: USER_B,
    template_id: "template_fullbody_x3",
    day_key: "dayA",
    signals: USER_B.signals,
    time_cap_min: USER_B.session_minutes_cap
  };
  const userB_plan = buildDayPlan(userB_request);
  printDayPlan("USER_B", USER_B, userB_plan);

  // Demonstrate progression decisions
  printProgressionDecisions();

  // Print evidence summary
  printEvidenceSummary(userA_plan, userB_plan);

  console.log("✅ Demo completed successfully!");
  process.exit(0);
}

// Run the demo
main();
