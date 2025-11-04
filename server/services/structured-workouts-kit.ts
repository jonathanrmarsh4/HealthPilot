// structured-workouts-kit.ts
// Deterministic pattern-based workout system - NO fuzzy matching
// AI generates semantic patterns, system maps to template_ids

export type Pattern =
  | "knee_dominant" | "hip_hinge" | "horizontal_press" | "horizontal_pull"
  | "vertical_press" | "vertical_pull" | "lunge_split" | "calf"
  | "biceps" | "triceps" | "shoulder_iso" | "core_anti_ext" | "core_anti_rot"
  | "carry" | "hamstrings_iso" | "glute_iso";

export type Modality =
  | "barbell" | "dumbbell" | "machine" | "cable" | "bodyweight"
  | "kettlebell" | "smith" | "landmine" | "band" | "plate";

export type Angle = "flat" | "incline" | "decline" | "neutral";

export type Flags = {
  unilateral?: boolean;
  assisted?: boolean;
  angle?: Angle;
};

export type LiftBlock = {
  type: "lift_block";
  pattern: Pattern;
  preferred_modality?: Modality;
  sets: number;
  reps: number | [number, number]; // single number or range [min, max]
  rest_s?: number;
  intensity?: {
    scheme?: "rir" | "rpe" | "percent1rm"; // RIR = Reps In Reserve
    target?: number;
  };
  flags?: Flags;
};

export type EnduranceBlock = {
  type: "endurance_block";
  modality: "run" | "bike" | "swim" | "row" | "elliptical" | "stairs";
  primary_metric: "distance_m" | "duration_s";
  target_value: number; // meters or seconds
  intensity_zone?: 1 | 2 | 3 | 4 | 5; // heart rate zones
};

export type RecoveryCycle = {
  type: "recovery_cycle";
  modality: "sauna" | "ice_bath" | "contrast";
  rounds: number;
  duration_per_round_s: number;
  rest_between_rounds_s?: number;
};

export type MobilityBlock = {
  type: "mobility_block";
  focus_areas: string[]; // ['hips', 'shoulders', 'thoracic']
  total_duration_s: number;
};

export type AnyBlock = LiftBlock | EnduranceBlock | RecoveryCycle | MobilityBlock;

export type WorkoutPlan = {
  blocks: AnyBlock[];
  total_time_estimate_min?: number;
  focus?: string; // "Upper Body Strength", "Lower Body Hypertrophy", etc.
};

// Pattern-to-template mapping rules
export type PatternRules = Record<Pattern, Partial<Record<Modality, string>>>;

/**
 * StructuredWorkoutsKit - One function to rule them all
 * Handles: prompt generation, validation, and template mapping
 */
export function StructuredWorkoutsKit() {
  const MODALITY_PREFERENCE_ORDER: Modality[] = [
    "machine",
    "barbell",
    "dumbbell",
    "cable",
    "bodyweight",
    "kettlebell",
    "smith",
    "landmine",
    "band",
    "plate"
  ];

  /**
   * Build LLM prompt that enforces strict JSON schema
   * The AI speaks in patterns, not exercise names
   */
  function buildPrompt(context: {
    userGoal?: string;
    fitnessLevel?: string;
    availableTime?: number; // minutes
    equipment?: Modality[];
    muscleBalanceHint?: string; // "Prioritize: chest, back. Avoid: legs"
    readinessScore?: number; // 0-100
  }): string {
    const { 
      userGoal = "strength",
      fitnessLevel = "intermediate",
      availableTime = 60,
      equipment = ["machine", "barbell", "dumbbell"],
      muscleBalanceHint,
      readinessScore
    } = context;

    return `You are an expert strength coach. Generate a ${availableTime}-minute workout in STRICT JSON format.

USER PROFILE:
- Goal: ${userGoal}
- Fitness Level: ${fitnessLevel}
- Available Equipment: ${equipment.join(", ")}
${readinessScore !== undefined ? `- Readiness Score: ${readinessScore}/100` : ""}
${muscleBalanceHint ? `- Muscle Balance: ${muscleBalanceHint}` : ""}

INSTRUCTIONS:
1. Use ONLY the semantic patterns below - NO exercise names
2. Select appropriate modality based on available equipment
3. Fill the ${availableTime}-minute time budget efficiently
4. Return ONLY valid JSON matching the schema - NO prose, explanations, or markdown
5. CRITICAL: ALL blocks MUST have type="lift_block" - NO other block types are allowed

AVAILABLE PATTERNS:
Legs: knee_dominant, hip_hinge, lunge_split, calf
Push: horizontal_press, vertical_press
Pull: horizontal_pull, vertical_pull
Arms: biceps, triceps, shoulder_iso
Core: core_anti_ext, core_anti_rot

SCHEMA (ALL blocks use type="lift_block"):
{
  "blocks": [
    {
      "type": "lift_block",
      "pattern": "knee_dominant",
      "preferred_modality": "barbell",
      "sets": 4,
      "reps": 8,
      "rest_s": 120,
      "intensity": { "scheme": "rir", "target": 2 }
    },
    {
      "type": "lift_block",
      "pattern": "core_anti_ext",
      "preferred_modality": "bodyweight",
      "sets": 3,
      "reps": 12,
      "rest_s": 60,
      "intensity": { "scheme": "rir", "target": 3 }
    }
  ],
  "total_time_estimate_min": ${availableTime},
  "focus": "Upper Body Strength"
}

Generate the workout now (JSON only):`;
  }

  /**
   * Parse and map AI response to concrete template_ids
   */
  function parseAndMap(
    llmJson: string,
    userEquipment: Modality[],
    rules: PatternRules
  ): {
    success: boolean;
    plan?: WorkoutPlan;
    mappedBlocks?: Array<AnyBlock & { template_id?: string; display_name?: string }>;
    errors?: string[];
  } {
    try {
      const parsed = JSON.parse(llmJson);
      
      if (!parsed.blocks || !Array.isArray(parsed.blocks)) {
        return { success: false, errors: ["Missing or invalid 'blocks' array"] };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      const mappedBlocks: Array<AnyBlock & { template_id?: string; display_name?: string }> = [];

      for (const block of parsed.blocks) {
        if (block.type === "lift_block") {
          const liftBlock = block as LiftBlock;
          
          // Validate pattern
          if (!liftBlock.pattern) {
            errors.push("Missing 'pattern' in lift_block");
            continue;
          }

          // Map pattern + modality -> template_id
          const pick = pickTemplateId(liftBlock, userEquipment, rules);
          
          if (!pick.template_id) {
            // Defensive: Log warning but allow workout generation to continue
            // This prevents total failure when AI selects valid patterns without coverage
            warnings.push(`⚠️ No template for ${liftBlock.pattern}: ${pick.reason} - skipping block`);
            console.warn(`[StructuredWorkoutsKit] Skipping unmapped pattern: ${liftBlock.pattern} (${pick.reason})`);
            continue; // Skip this block instead of failing the entire workout
          }

          // Generate display label
          const chosenModality = pick.template_id 
            ? findModalityForTemplate(liftBlock, userEquipment, rules)
            : liftBlock.preferred_modality || "bodyweight";
          
          const displayName = labelFromTuple(
            liftBlock.pattern,
            chosenModality,
            liftBlock.flags
          );

          mappedBlocks.push({
            ...liftBlock,
            template_id: pick.template_id,
            display_name: displayName
          });
        } else {
          // CRITICAL: Only lift_block is supported. Filter out invalid block types.
          // This prevents "unknown" exercises from appearing when AI generates invalid types
          warnings.push(`⚠️ Skipping invalid block type "${block.type}" - only lift_block is allowed`);
          console.warn(`[StructuredWorkoutsKit] Skipping invalid block type: ${block.type}. Only lift_block is supported.`);
          continue;
        }
      }

      // Check if all lift blocks were skipped
      if (mappedBlocks.length === 0 && warnings.length > 0) {
        errors.push("All lift blocks were skipped due to missing template coverage. Workout cannot be generated.");
      }

      // Return success if we have at least ONE mapped block, even with warnings
      // This allows partial workouts to succeed instead of total failure
      return {
        success: errors.length === 0 && mappedBlocks.length > 0,
        plan: parsed,
        mappedBlocks,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (err) {
      return {
        success: false,
        errors: [`JSON parse error: ${err instanceof Error ? err.message : String(err)}`]
      };
    }
  }

  /**
   * Pick template_id based on pattern, preferred modality, and available equipment
   */
  function pickTemplateId(
    block: LiftBlock,
    available: Modality[],
    rules: PatternRules
  ): { template_id?: string; reason: string } {
    // Build preference order: preferred_modality first, then fallback order
    const ordered = [block.preferred_modality, ...MODALITY_PREFERENCE_ORDER]
      .filter(Boolean) as Modality[];
    
    // Find first available modality that has a rule
    const choice = ordered.find(m => available.includes(m));
    
    if (!choice) {
      return { reason: `no available modality for ${block.pattern}` };
    }

    const template_id = rules[block.pattern]?.[choice];
    
    return template_id
      ? { template_id, reason: `pattern=${block.pattern} via ${choice}` }
      : { reason: `no rule for ${block.pattern} × ${choice}` };
  }

  /**
   * Helper to find which modality was chosen for a template
   */
  function findModalityForTemplate(
    block: LiftBlock,
    available: Modality[],
    rules: PatternRules
  ): Modality {
    const ordered = [block.preferred_modality, ...MODALITY_PREFERENCE_ORDER]
      .filter(Boolean) as Modality[];
    
    const choice = ordered.find(m => available.includes(m));
    return choice || "bodyweight";
  }

  /**
   * Generate display label from pattern + modality + flags
   * Example: labelFromTuple("horizontal_press", "barbell", { angle: "incline" }) 
   *   → "Barbell Incline Bench Press"
   */
  function labelFromTuple(pattern: Pattern, modality: Modality, flags: Flags = {}): string {
    const angle = flags.angle && flags.angle !== "neutral" ? ` ${capitalizeFirst(flags.angle)}` : "";
    const unilateral = flags.unilateral ? " (Single-Arm)" : "";
    const assisted = flags.assisted ? " (Assisted)" : "";

    const baseNames: Record<Pattern, string> = {
      horizontal_press: "Bench Press",
      horizontal_pull: "Row",
      vertical_press: "Overhead Press",
      vertical_pull: "Pull-Down",
      knee_dominant: "Squat",
      hip_hinge: "Deadlift",
      lunge_split: "Split Squat",
      calf: "Calf Raise",
      biceps: "Curl",
      triceps: "Triceps Extension",
      shoulder_iso: "Lateral Raise",
      core_anti_ext: "Plank",
      core_anti_rot: "Anti-Rotation Press",
      carry: "Farmer's Carry",
      hamstrings_iso: "Leg Curl",
      glute_iso: "Hip Thrust",
    };

    const modalityPrefixes: Record<Modality, string> = {
      barbell: "Barbell",
      dumbbell: "Dumbbell",
      machine: "Machine",
      cable: "Cable",
      bodyweight: "Bodyweight",
      kettlebell: "Kettlebell",
      smith: "Smith Machine",
      landmine: "Landmine",
      band: "Band",
      plate: "Plate"
    };

    const name = baseNames[pattern] ?? "Exercise";
    const prefix = modalityPrefixes[modality] ?? "";

    return `${prefix}${angle} ${name}`.replace(/\s+/g, " ").trim() + unilateral + assisted;
  }

  function capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  return {
    buildPrompt,
    parseAndMap,
    pickTemplateId,
    labelFromTuple,
  };
}
