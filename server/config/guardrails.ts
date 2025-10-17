import fs from 'fs';
import path from 'path';

/**
 * HealthPilot Training Operating System - Guardrails Configuration
 * 
 * This module loads and provides access to the AI guardrails that ensure
 * training prescriptions align with:
 * - User biology (biomarkers, HealthKit data)
 * - Recognized standards (ACSM, NSCA, WHO)
 * - User goals (while prioritizing safety)
 */

export interface TrainingGuardrails {
  meta: {
    name: string;
    short_name: string;
    version: string;
    updated_utc: string;
    owner: string;
    license: string;
    notes: string[];
  };
  standards_alignment: {
    references: string[];
    principles: string[];
  };
  inputs_schema: {
    demographics: string[];
    healthkit: string[];
    biomarkers: string[];
    goals: string[];
    subjective: string[];
    context: string[];
  };
  program_structure: {
    macrocycle_weeks_range: [number, number];
    mesocycle_weeks_range: [number, number];
    microcycle_weeks: number;
    deload_frequency_weeks: [number, number];
    session_targets_per_week: { min: number; max: number };
    progression_limits: {
      weekly_volume_increase_pct_max: number;
      weekly_intensity_increase_pct_max: number;
    };
  };
  safety_rules: {
    intensity: {
      hrmax_cap_pct_general: number;
      beginner_hrmax_cap_pct: number;
    };
    rest_recovery: {
      min_rest_days_per_week: number;
      mandatory_deload_weeks: boolean;
    };
    vital_flags: {
      bp_pause_threshold: { systolic_mmHg: number; diastolic_mmHg: number };
      resting_hr_rise_pct_recovery_mode: number;
      hrv_drop_pct_recovery_mode: number;
    };
    illness_injury: {
      fever_or_infection: string;
      pain_flag_true: string;
    };
  };
  biomarker_adjustments: Array<{
    biomarker: string;
    condition: string;
    action: Record<string, any>;
  }>;
  auto_regulation: {
    triggers: Array<{
      metric: string;
      delta_pct_vs_baseline?: number;
      delta_pct_vs_baseline_gt?: number;
      threshold_lt?: number;
      action: string;
    }>;
  };
  progression_models: {
    beginner: string;
    intermediate: string;
    advanced: string;
  };
  goal_alignment: Record<string, {
    bias: string[];
    track: string[];
  }>;
  adaptation_feedback_loop: {
    steps: string[];
    example_rationale: string;
  };
  ethical_compliance: {
    medical_disclaimer: boolean;
    diagnosis_prohibited: boolean;
    data_encryption_required: boolean;
    anonymous_third_party_data_ok: boolean;
    log_rationale_required: boolean;
  };
  output_contract: {
    required_sections: string[];
    weekly_schedule_item_fields: string[];
  };
  hard_guards: {
    override_order: string[];
    forbidden: string[];
  };
  embedded_prompts: {
    system_prompt: string;
    developer_prompt_template: string;
  };
  output_example: {
    phase_overview: Record<string, any>;
    weekly_schedule: Array<Record<string, any>>;
    rationale_summary: string;
    monitoring_plan: string[];
  };
}

let cachedGuardrails: TrainingGuardrails | null = null;

/**
 * Load training guardrails configuration
 * Cached after first load for performance
 */
export function loadTrainingGuardrails(): TrainingGuardrails {
  if (cachedGuardrails) {
    return cachedGuardrails;
  }

  const guardrailsPath = path.join(__dirname, 'training-guardrails.json');
  const guardrailsData = fs.readFileSync(guardrailsPath, 'utf-8');
  cachedGuardrails = JSON.parse(guardrailsData);
  
  return cachedGuardrails;
}

/**
 * Build a comprehensive AI system prompt that includes guardrails
 */
export function buildGuardrailsSystemPrompt(): string {
  const guardrails = loadTrainingGuardrails();
  
  return `${guardrails.embedded_prompts.system_prompt}

CRITICAL GUARDRAILS - YOU MUST FOLLOW THESE RULES:

## Override Priority (highest to lowest):
${guardrails.hard_guards.override_order.map((level, i) => `${i + 1}. ${level}`).join('\n')}

## Safety Rules:
- General HR max cap: ${guardrails.safety_rules.intensity.hrmax_cap_pct_general}%
- Beginner HR max cap: ${guardrails.safety_rules.intensity.beginner_hrmax_cap_pct}%
- Minimum rest days per week: ${guardrails.safety_rules.rest_recovery.min_rest_days_per_week}
- Mandatory deload weeks: ${guardrails.safety_rules.rest_recovery.mandatory_deload_weeks ? 'YES' : 'NO'}

## Vital Sign Triggers:
- BP pause threshold: ${guardrails.safety_rules.vital_flags.bp_pause_threshold.systolic_mmHg}/${guardrails.safety_rules.vital_flags.bp_pause_threshold.diastolic_mmHg} mmHg
- Resting HR rise for recovery mode: ${guardrails.safety_rules.vital_flags.resting_hr_rise_pct_recovery_mode}%
- HRV drop for recovery mode: ${guardrails.safety_rules.vital_flags.hrv_drop_pct_recovery_mode}%

## Progression Limits:
- Max weekly volume increase: ${guardrails.program_structure.progression_limits.weekly_volume_increase_pct_max}%
- Max weekly intensity increase: ${guardrails.program_structure.progression_limits.weekly_intensity_increase_pct_max}%

## Auto-Regulation Triggers:
${guardrails.auto_regulation.triggers.map(t => {
    const condition = t.delta_pct_vs_baseline ? 
      `drops ${Math.abs(t.delta_pct_vs_baseline)}%` : 
      t.delta_pct_vs_baseline_gt ?
      `rises ${t.delta_pct_vs_baseline_gt}%` :
      `< ${t.threshold_lt}`;
    return `- When ${t.metric} ${condition} → ${t.action}`;
  }).join('\n')}

## Biomarker Adjustments:
${guardrails.biomarker_adjustments.map(adj => 
  `- ${adj.biomarker} ${adj.condition} → ${JSON.stringify(adj.action)}`
).join('\n')}

## Forbidden Actions:
${guardrails.hard_guards.forbidden.map(f => `- ${f}`).join('\n')}

## Required Output Sections:
${guardrails.output_contract.required_sections.map(s => `- ${s}`).join('\n')}

${guardrails.embedded_prompts.developer_prompt_template}`;
}

/**
 * Get goal-specific programming guidance
 */
export function getGoalGuidance(goal: string): { bias: string[]; track: string[] } | null {
  const guardrails = loadTrainingGuardrails();
  const normalizedGoal = goal.toLowerCase().replace(/[_\s-]/g, '_');
  
  return guardrails.goal_alignment[normalizedGoal] || null;
}

/**
 * Check if a progression is safe based on guardrails
 */
export function validateProgression(
  volumeIncreasePct: number,
  intensityIncreasePct: number
): { valid: boolean; violations: string[] } {
  const guardrails = loadTrainingGuardrails();
  const violations: string[] = [];
  
  if (volumeIncreasePct > guardrails.program_structure.progression_limits.weekly_volume_increase_pct_max) {
    violations.push(`Volume increase ${volumeIncreasePct}% exceeds limit of ${guardrails.program_structure.progression_limits.weekly_volume_increase_pct_max}%`);
  }
  
  if (intensityIncreasePct > guardrails.program_structure.progression_limits.weekly_intensity_increase_pct_max) {
    violations.push(`Intensity increase ${intensityIncreasePct}% exceeds limit of ${guardrails.program_structure.progression_limits.weekly_intensity_increase_pct_max}%`);
  }
  
  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Check auto-regulation triggers and get recommended actions
 */
export function checkAutoRegulation(metrics: {
  hrv_rmssd?: { current: number; baseline: number };
  sleep_hours?: number;
  performance_vs_prior_week_pct?: number;
  resting_hr?: { current: number; baseline: number };
}): string[] {
  const guardrails = loadTrainingGuardrails();
  const actions: string[] = [];
  
  for (const trigger of guardrails.auto_regulation.triggers) {
    if (trigger.metric === 'hrv_rmssd' && metrics.hrv_rmssd) {
      const pctChange = ((metrics.hrv_rmssd.current - metrics.hrv_rmssd.baseline) / metrics.hrv_rmssd.baseline) * 100;
      if (trigger.delta_pct_vs_baseline && pctChange <= trigger.delta_pct_vs_baseline) {
        actions.push(trigger.action);
      }
    }
    
    if (trigger.metric === 'sleep_hours' && metrics.sleep_hours !== undefined) {
      if (trigger.threshold_lt && metrics.sleep_hours < trigger.threshold_lt) {
        actions.push(trigger.action);
      }
    }
    
    if (trigger.metric === 'performance_vs_prior_week_pct' && metrics.performance_vs_prior_week_pct !== undefined) {
      if (trigger.threshold_lt && metrics.performance_vs_prior_week_pct < trigger.threshold_lt) {
        actions.push(trigger.action);
      }
    }
    
    if (trigger.metric === 'resting_hr' && metrics.resting_hr) {
      const pctChange = ((metrics.resting_hr.current - metrics.resting_hr.baseline) / metrics.resting_hr.baseline) * 100;
      if (trigger.delta_pct_vs_baseline_gt && pctChange >= trigger.delta_pct_vs_baseline_gt) {
        actions.push(trigger.action);
      }
    }
  }
  
  return actions;
}

export default {
  loadTrainingGuardrails,
  buildGuardrailsSystemPrompt,
  getGoalGuidance,
  validateProgression,
  checkAutoRegulation
};
