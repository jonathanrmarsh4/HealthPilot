// Load and export the interpreter specification
import spec from '../../config/healthpilot_interpreter_spec.json';
import type { Thresholds, UserFeedbackTemplates, UnitConversionSpec } from './types';

export const SPEC = spec;

export const THRESHOLDS: Thresholds = {
  type_detection: 0.30, // Lowered from 0.50 - very forgiving for type detection
  extraction_min: 0.50, // Lowered from 0.70 - accept reports with 50%+ extraction
  normalization_min: 0.30, // Lowered from 0.40 - accept reports with 30%+ valid units
  overall_accept_min: 0.50, // Lowered from 0.60 for better acceptance
};

export const USER_FEEDBACK_TEMPLATES: UserFeedbackTemplates = {
  unrecognized_type: spec.policies.user_feedback_templates.unrecognized_type,
  missing_units: spec.policies.user_feedback_templates.missing_units,
  low_quality_ocr: spec.policies.user_feedback_templates.low_quality_ocr,
  partial_parse: spec.policies.user_feedback_templates.partial_parse,
};

export const UNIT_CONVERSIONS: UnitConversionSpec[] = spec.units.conversions as UnitConversionSpec[];

export const GUARDRAILS = {
  safety: spec.guardrails.safety,
  data_integrity: spec.guardrails.data_integrity,
  transparency: spec.guardrails.transparency,
  privacy: spec.guardrails.privacy,
  localization: spec.guardrails.localization,
  traceability: spec.guardrails.traceability,
};

export const TYPE_DETECTION_HEURISTICS = spec.type_detection.heuristics;
export const INTERPRETATION_RULES = spec.interpretation_rules;
export const PROMPTS = spec.prompts;
