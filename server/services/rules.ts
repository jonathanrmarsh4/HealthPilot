// rules.ts
// Deterministic mapping: pattern × modality → template_id
// Expand this as you add more templates to exercise_templates table

import type { Pattern, Modality } from "./structured-workouts-kit";

export type PatternRules = Record<Pattern, Partial<Record<Modality, string>>>;

/**
 * RULES - The single source of truth for exercise resolution
 * NO fuzzy matching, NO normalization, NO ambiguity
 * 
 * Format: pattern × modality → template_id
 * Example: horizontal_press + barbell → "tpl_bb_flat_bench"
 */
export const RULES: PatternRules = {
  // Horizontal Press
  horizontal_press: {
    barbell: "tpl_bb_flat_bench",
    dumbbell: "tpl_db_flat_press",
    machine: "tpl_machine_chest_press",
    bodyweight: "tpl_bw_pushup",
  },

  // Vertical Pull
  vertical_pull: {
    cable: "tpl_lat_pulldown",
    bodyweight: "tpl_pullup",
    machine: "tpl_assisted_pullup",
  },

  // Knee Dominant (Squats)
  knee_dominant: {
    machine: "tpl_leg_press",
    barbell: "tpl_bb_back_squat",
    dumbbell: "tpl_goblet_squat",
    bodyweight: "tpl_bw_squat",
  },

  // Hip Hinge (Deadlifts, RDLs)
  hip_hinge: {
    barbell: "tpl_bb_rdl",
    dumbbell: "tpl_db_rdl",
    machine: "tpl_machine_hinge",
  },

  // Vertical Press
  vertical_press: {
    barbell: "tpl_bb_ohp",
    dumbbell: "tpl_db_ohp",
    machine: "tpl_machine_shoulder_press",
  },

  // Horizontal Pull
  horizontal_pull: {
    barbell: "tpl_bb_row",
    dumbbell: "tpl_db_row",
    cable: "tpl_cable_row",
    machine: "tpl_machine_row",
  },

  // Lunge/Split
  lunge_split: {
    barbell: "tpl_bb_split_squat",
    dumbbell: "tpl_db_lunge",
    bodyweight: "tpl_bw_lunge",
  },

  // Calf
  calf: {
    machine: "tpl_machine_calf_raise",
    bodyweight: "tpl_bw_calf_raise",
  },

  // Biceps
  biceps: {
    barbell: "tpl_bb_curl",
    dumbbell: "tpl_db_curl",
    cable: "tpl_cable_curl",
  },

  // Triceps
  triceps: {
    cable: "tpl_cable_pushdown",
    dumbbell: "tpl_db_extension",
  },

  // Shoulder Isolation
  shoulder_iso: {
    dumbbell: "tpl_db_lateral_raise",
    cable: "tpl_cable_lateral_raise",
  },

  // Core Anti-Extension
  core_anti_ext: {
    bodyweight: "tpl_ab_wheel",
    // alt: "tpl_plank"
  },

  // Core Anti-Rotation
  core_anti_rot: {
    cable: "tpl_pallof_press",
    landmine: "tpl_landmine_rotation",
  },

  // Carry
  carry: {
    dumbbell: "tpl_db_farmers_carry",
    kettlebell: "tpl_kb_farmers_carry",
  },

  // Hamstring Isolation
  hamstrings_iso: {
    machine: "tpl_machine_leg_curl",
    bodyweight: "tpl_bw_nordic_curl",
  },

  // Glute Isolation
  glute_iso: {
    barbell: "tpl_bb_hip_thrust",
    machine: "tpl_machine_glute_kickback",
    cable: "tpl_cable_glute_kickback",
  },
};

/**
 * PATTERN_TO_MUSCLES - Maps patterns to muscle groups for volume tracking
 * This preserves the muscle balance system
 */
export const PATTERN_TO_MUSCLES: Record<Pattern, string[]> = {
  knee_dominant: ["quads", "glutes"],
  hip_hinge: ["hamstrings", "glutes", "lower_back"],
  horizontal_press: ["chest", "front_delts", "triceps"],
  horizontal_pull: ["lats", "traps", "rear_delts", "biceps"],
  vertical_press: ["front_delts", "triceps", "core"],
  vertical_pull: ["lats", "rear_delts", "biceps"],
  lunge_split: ["quads", "glutes"],
  calf: ["calves"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  shoulder_iso: ["side_delts"],
  core_anti_ext: ["core", "abs"],
  core_anti_rot: ["core", "obliques"],
  carry: ["core", "traps", "forearms"],
  hamstrings_iso: ["hamstrings"],
  glute_iso: ["glutes"],
};

/**
 * Get muscles trained by a given pattern
 */
export function getMusclesForPattern(pattern: Pattern): string[] {
  return PATTERN_TO_MUSCLES[pattern] || [];
}

/**
 * Check if user has equipment for a given pattern
 * Returns available modalities in preference order
 */
export function getAvailableModalities(
  pattern: Pattern,
  userEquipment: Modality[]
): Modality[] {
  const patternRules = RULES[pattern];
  if (!patternRules) return [];

  return userEquipment.filter(eq => eq in patternRules);
}
