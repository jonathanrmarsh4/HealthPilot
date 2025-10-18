import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
let cachedSystemKnowledge: any = null;

/**
 * Load training guardrails configuration
 * Cached after first load for performance
 */
export function loadTrainingGuardrails(): TrainingGuardrails {
  if (cachedGuardrails) {
    return cachedGuardrails;
  }

  // Try multiple paths for development and production environments
  const possiblePaths = [
    path.join(__dirname, 'training-guardrails.json'),  // Development
    path.join(__dirname, 'config', 'training-guardrails.json'),  // Production (dist/)
    path.join(process.cwd(), 'server', 'config', 'training-guardrails.json'),  // Fallback to project root
  ];

  let guardrailsData: string | null = null;
  for (const guardrailsPath of possiblePaths) {
    if (fs.existsSync(guardrailsPath)) {
      guardrailsData = fs.readFileSync(guardrailsPath, 'utf-8');
      break;
    }
  }

  if (!guardrailsData) {
    throw new Error(`Could not find training-guardrails.json in any of the following paths: ${possiblePaths.join(', ')}`);
  }

  cachedGuardrails = JSON.parse(guardrailsData);
  
  return cachedGuardrails;
}

/**
 * Load HealthPilot system knowledge (privacy, architecture, features, data handling)
 * Cached after first load for performance
 */
export function loadSystemKnowledge(): any {
  if (cachedSystemKnowledge) {
    return cachedSystemKnowledge;
  }

  // Try multiple paths for development and production environments
  const possiblePaths = [
    path.join(__dirname, 'healthpilot-system-knowledge.json'),  // Development
    path.join(__dirname, 'config', 'healthpilot-system-knowledge.json'),  // Production (dist/)
    path.join(process.cwd(), 'server', 'config', 'healthpilot-system-knowledge.json'),  // Fallback to project root
  ];

  let knowledgeData: string | null = null;
  for (const knowledgePath of possiblePaths) {
    if (fs.existsSync(knowledgePath)) {
      knowledgeData = fs.readFileSync(knowledgePath, 'utf-8');
      break;
    }
  }

  if (!knowledgeData) {
    throw new Error(`Could not find healthpilot-system-knowledge.json in any of the following paths: ${possiblePaths.join(', ')}`);
  }

  cachedSystemKnowledge = JSON.parse(knowledgeData);
  
  return cachedSystemKnowledge;
}

/**
 * Build a comprehensive AI system prompt that includes guardrails and system knowledge
 */
export function buildGuardrailsSystemPrompt(): string {
  const guardrails = loadTrainingGuardrails();
  const sk = loadSystemKnowledge();
  const contract = guardrails.output_contract as any;
  
  // Build privacy & compliance section
  const privacySection = `## PRIVACY & COMPLIANCE FRAMEWORK

${sk.privacy_and_compliance.overview}

### Data Security:
- Encryption: ${sk.privacy_and_compliance.data_security.encryption.at_rest} at rest, ${sk.privacy_and_compliance.data_security.encryption.in_transit} in transit
- AI Processing: ${sk.privacy_and_compliance.data_security.ai_processing.compliance} with ${sk.privacy_and_compliance.data_security.ai_processing.encryption}
- Access Controls: ${sk.privacy_and_compliance.data_security.access_controls.authentication}
- Database: ${sk.privacy_and_compliance.data_security.encryption.database}

### Consent Management (4 types):
${Object.entries(sk.privacy_and_compliance.consent_management.consent_types).map(([key, val]: [string, any]) => 
  `- **${key}** (${val.required ? 'REQUIRED' : 'OPTIONAL'}): ${val.description}`
).join('\n')}

### User Rights (accessible via /privacy-dashboard):
- **Data Export**: ${sk.privacy_and_compliance.user_rights.data_export.description} (${sk.privacy_and_compliance.user_rights.data_export.legal_basis})
- **Account Deletion**: ${sk.privacy_and_compliance.user_rights.account_deletion.grace_period} grace period (${sk.privacy_and_compliance.user_rights.account_deletion.legal_basis})
- **Audit Log**: ${sk.privacy_and_compliance.user_rights.audit_log_access.retention} retention (${sk.privacy_and_compliance.user_rights.audit_log_access.legal_basis})
- **Consent Management**: ${sk.privacy_and_compliance.consent_management.overview}`;

  // Build subscription model section
  const subscriptionSection = `## SUBSCRIPTION MODEL & FEATURE ACCESS

${Object.entries(sk.system_architecture.subscription_model.tiers).map(([tier, details]: [string, any]) => {
    const tierName = tier.toUpperCase().replace('_', ' ');
    return `### ${tierName} TIER${details.price ? ` (${details.price})` : ''}:
${details.ai_messages ? `- AI Messages: ${details.ai_messages}` : ''}
${details.biomarkers ? `- Biomarkers: ${details.biomarkers}` : ''}
${details.historical_data ? `- Historical Data: ${details.historical_data}` : ''}
${details.features ? `- Features: ${details.features.slice(0, 3).join(', ')}${details.features.length > 3 ? ', ...' : ''}` : ''}
${details.limitations ? `- LIMITATIONS: ${details.limitations.slice(0, 3).join(', ')}` : ''}`;
  }).join('\n\n')}`;

  // Build core features section
  const featuresSection = `## CORE FEATURES & CAPABILITIES

### Readiness Score:
${sk.core_features.readiness_score.description}
- Scale: ${sk.core_features.readiness_score.scale}
- Factors: Sleep (${sk.core_features.readiness_score.factors.sleep_quality.weight * 100}%), HRV (${sk.core_features.readiness_score.factors.hrv.weight * 100}%), RHR (${sk.core_features.readiness_score.factors.resting_heart_rate.weight * 100}%), Load (${sk.core_features.readiness_score.factors.workout_load.weight * 100}%)

### Biological Age (PhenoAge):
- ${sk.core_features.biological_age.description}
- Requires: ${sk.core_features.biological_age.requirement}
- Output: ${sk.core_features.biological_age.output}

### AI Chat Capabilities:
- Data Visibility: ${sk.core_features.ai_chat.capabilities.data_visibility}
- Write Access: ${sk.core_features.ai_chat.capabilities.write_access}
- Guardrails: ${sk.core_features.ai_chat.guardrails.join(', ')}
- Free tier: ${sk.core_features.ai_chat.limitations.free_tier} | Premium: ${sk.core_features.ai_chat.limitations.premium_tier}

### Other Key Features:
- Apple Health: ${sk.system_architecture.apple_health_integration.web_version.method} (Premium required)
- Progressive Overload: ${sk.core_features.progressive_overload_training.description}
- Meal Planning: ${sk.core_features.meal_planning.description} (Premium only)
- Universal Tiles: ${sk.core_features.universal_tile_management.description}`;

  // Build data handling section
  const dataHandlingSection = `## DATA HANDLING POLICIES

### What We Collect:
- Required: ${sk.data_handling_policies.data_collection.what_we_collect.required_for_service.slice(0, 4).join(', ')}
- Optional: ${sk.data_handling_policies.data_collection.what_we_collect.optional_data.slice(0, 3).join(', ')}

### Who We Share With:
${Object.entries(sk.data_handling_policies.data_sharing.who_we_share_with).map(([party, details]: [string, any]) =>
  `- **${party}**: ${details.purpose} (${details.safeguards || details.consent})`
).join('\n')}
- NEVER: ${sk.data_handling_policies.data_sharing.who_we_never_share_with.join(', ')}

### User Control:
${Object.entries(sk.data_handling_policies.user_control).map(([key, val]) => `- ${key}: ${val}`).join('\n')}`;

  // Build AI behavior guidelines
  const behaviorSection = `## AI BEHAVIOR GUIDELINES

${Object.entries(sk.ai_behavior_guidelines).filter(([key]) => key.startsWith('when_')).map(([key, guidelines]: [string, any]) => {
    const title = key.replace('when_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    return `### When ${title}:\n${guidelines.map((g: string) => `- ${g}`).join('\n')}`;
  }).join('\n\n')}

### General Principles:
${sk.ai_behavior_guidelines.general_principles.map((p: string) => `- ${p}`).join('\n')}`;

  return `${guardrails.embedded_prompts.system_prompt}

CRITICAL GUARDRAILS - YOU MUST FOLLOW THESE RULES:

## Override Priority (highest to lowest):
${guardrails.hard_guards.override_order.map((level, i) => `${i + 1}. ${level}`).join('\n')}

## Safety Rules:
- General HR max cap: ${guardrails.safety_rules.intensity.hrmax_cap_pct_general}% (ACSM)
- Beginner HR max cap: ${guardrails.safety_rules.intensity.beginner_hrmax_cap_pct}% (ACSM)
- Minimum rest days per week: ${guardrails.safety_rules.rest_recovery.min_rest_days_per_week} (WHO)
- Mandatory deload weeks: ${guardrails.safety_rules.rest_recovery.mandatory_deload_weeks ? 'YES' : 'NO'} (NSCA)

## Vital Sign Triggers:
- BP pause threshold: ${guardrails.safety_rules.vital_flags.bp_pause_threshold.systolic_mmHg}/${guardrails.safety_rules.vital_flags.bp_pause_threshold.diastolic_mmHg} mmHg (ACSM)
- Resting HR rise for recovery mode: ${guardrails.safety_rules.vital_flags.resting_hr_rise_pct_recovery_mode}% (ACSM)
- HRV drop for recovery mode: ${guardrails.safety_rules.vital_flags.hrv_drop_pct_recovery_mode}% (ACSM)

## Progression Limits:
- Max weekly volume increase: ${guardrails.program_structure.progression_limits.weekly_volume_increase_pct_max}% (NSCA)
- Max weekly intensity increase: ${guardrails.program_structure.progression_limits.weekly_intensity_increase_pct_max}% (NSCA)

## Auto-Regulation Triggers:
${guardrails.auto_regulation.triggers.map(t => {
    const condition = t.delta_pct_vs_baseline ? 
      `drops ${Math.abs(t.delta_pct_vs_baseline)}%` : 
      t.delta_pct_vs_baseline_gt ?
      `rises ${t.delta_pct_vs_baseline_gt}%` :
      `< ${t.threshold_lt}`;
    return `- When ${t.metric} ${condition} → ${t.action} (ACSM)`;
  }).join('\n')}

## Biomarker Adjustments:
${guardrails.biomarker_adjustments.map(adj => 
  `- ${adj.biomarker} ${adj.condition} → ${JSON.stringify(adj.action)}`
).join('\n')}

## Forbidden Actions:
${guardrails.hard_guards.forbidden.map(f => `- ${f}`).join('\n')}

## Evidence Citation Requirements:
CRITICAL: Every recommendation MUST include brief, confidence-building citations.
${contract.citation_requirements ? `
Format: ${contract.citation_requirements.format}

Examples of good citations:
${contract.citation_requirements.examples.map((ex: string) => `- "${ex}"`).join('\n')}

Available standards:
${Object.entries(contract.citation_requirements.standards_reference).map(([key, desc]) => `- ${key}: ${desc}`).join('\n')}

IMPORTANT: Include 1-2 relevant citations in your rationale/reasoning. Keep them brief and user-friendly.
` : ''}

## Required Output Sections:
${guardrails.output_contract.required_sections.map(s => `- ${s}`).join('\n')}

${guardrails.embedded_prompts.developer_prompt_template}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
HEALTHPILOT SYSTEM KNOWLEDGE - CRITICAL CONTEXT YOU MUST UNDERSTAND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${privacySection}

${subscriptionSection}

${featuresSection}

${dataHandlingSection}

${behaviorSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
END OF HEALTHPILOT SYSTEM KNOWLEDGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
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
  loadSystemKnowledge,
  buildGuardrailsSystemPrompt,
  getGoalGuidance,
  validateProgression,
  checkAutoRegulation
};
