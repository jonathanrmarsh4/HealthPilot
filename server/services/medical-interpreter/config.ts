// Load and export the interpreter specification
import spec from '../../config/healthpilot_interpreter_spec.json';
import type { 
  Thresholds, 
  UserFeedbackTemplates, 
  UnitConversionSpec,
  AggregationConfig,
  GreyZoneConfig 
} from './types';

export const SPEC = spec;

export const THRESHOLDS: Thresholds = {
  type_detection: 0.20, // Lowered from 0.30 to support imaging reports with diverse pattern vocabularies
  extraction_min: 0.40, // PHASE 1: Lowered from 0.50 - accept reports with 40%+ extraction (grey zone)
  normalization_min: 0.30, // Lowered from 0.40 - accept reports with 30%+ valid units
  overall_accept_min: 0.50, // Lowered from 0.60 for better acceptance
};

// PHASE 1: Weighted average aggregation (replaces harsh MIN())
export const AGGREGATION: AggregationConfig = {
  use_weighted_average: true,
  weights: {
    type: 0.3,        // Classification confidence (30% weight)
    extraction: 0.5,  // Extraction quality (50% weight - most important)
    normalization: 0.2, // Unit normalization (20% weight)
  },
  epsilon: 1e-6, // Floating-point tolerance for threshold comparisons
};

// PHASE 1: Grey zone handling (0.40-0.50 extraction -> partial instead of discard)
export const GREY_ZONE: GreyZoneConfig = {
  extraction_lower: 0.40,
  extraction_upper: 0.50,
  emit_partial_instead_of_discard: true,
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
