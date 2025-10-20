// TypeScript types for HealthPilot Universal Medical Data Interpreter
// Auto-generated from healthpilot_interpreter_spec.json schema

// Report Type Enum
export type ReportType =
  | 'Observation_Labs'
  | 'Cardiac_ECG'
  | 'Cardiac_Echo'
  | 'DiagnosticReport_Imaging'
  | 'Genomic'
  | 'Wearable'
  | 'VitalsAnthro'
  | 'MedicationStatement'
  | 'Procedure'
  | 'Immunization'
  | 'ClinicalNote'
  | 'Other';

// Source Format Enum
export type SourceFormat =
  | 'PDF'
  | 'PDF_OCR'
  | 'Image_OCR'
  | 'FHIR_JSON'
  | 'HL7'
  | 'CSV'
  | 'JSON'
  | 'XML'
  | 'DICOM'
  | 'TXT';

// Interpretation Category Enum
export type InterpretationCategory = 'Normal' | 'Borderline' | 'Abnormal' | 'Indeterminate';

// Status Enum
export type InterpretationStatus = 'accepted' | 'discarded';

// Sex at Birth Enum
export type SexAtBirth = 'M' | 'F' | 'Intersex' | 'Unknown';

// Patient Information
export interface PatientInfo {
  pseudo_id: string;
  dob: string | null;
  sex_at_birth: SexAtBirth | null;
}

// Unit Conversion Record
export interface UnitConversion {
  field: string;
  from: string;
  to: string;
  factor: number;
}

// Type Classifier Result
export interface TypeClassifier {
  label: string;
  confidence: number;
}

// Audit Trail
export interface AuditTrail {
  type_classifier: TypeClassifier;
  extraction_confidence: number;
  normalization_confidence: number;
  overall_confidence: number;
  rules_triggered: string[];
  unit_conversions: UnitConversion[];
  validation_findings: string[];
}

// Interpretation Result
export interface Interpretation {
  category: InterpretationCategory | null;
  insights: string[];
  caveats: string[];
  next_best_actions: string[];
}

// Type-specific data schemas

// Observation Labs
export interface LabObservation {
  code: string;
  display: string;
  value: number | string;
  unit: string;
  reference_range: {
    low: number | null;
    high: number | null;
    unit: string | null;
  };
  collected_at: string | null;
  flags: string[];
}

export interface ObservationLabsData {
  panel_name: string | null;
  observations: LabObservation[];
}

// Cardiac ECG
export interface CardiacECGData {
  heart_rate_bpm: number | null;
  pr_interval_ms: number | null;
  qrs_duration_ms: number | null;
  qt_ms: number | null;
  qtc_ms: number | null;
  rhythm_summary: string | null;
  interpretive_text: string | null;
}

// Cardiac Echo
export interface CardiacEchoData {
  lvef_percent: number | null;
  lv_mass_index: number | null;
  valvular_findings: string[];
  chamber_sizes: string[];
  summary: string | null;
}

// Diagnostic Report Imaging
export type ImagingModality = 'CT' | 'MRI' | 'XR' | 'US' | 'NM' | 'Other';

export interface DiagnosticReportImagingData {
  modality: ImagingModality;
  body_region: string | null;
  findings: string[];
  impression: string | null;
  accession_number: string | null;
}

// Genomic
export type Zygosity = 'Homozygous' | 'Heterozygous' | 'Unknown';
export type ClinicalSignificance =
  | 'Pathogenic'
  | 'Likely_pathogenic'
  | 'Uncertain'
  | 'Likely_benign'
  | 'Benign'
  | 'Unknown';

export interface GenomicVariant {
  gene: string;
  rsid: string | null;
  zygosity: Zygosity;
  consequence: string | null;
  clinical_significance: ClinicalSignificance;
}

export interface GenomicData {
  variants: GenomicVariant[];
  panel: string | null;
}

// Wearable
export type WearableMetric =
  | 'steps'
  | 'hr_rest'
  | 'hrv_ms'
  | 'vo2max_ml_kg_min'
  | 'sleep_efficiency_percent'
  | 'calories_kcal'
  | 'spo2_percent';

export interface WearableDataPoint {
  ts: string;
  value: number;
}

export interface WearableSeries {
  metric: WearableMetric;
  values: WearableDataPoint[];
}

export interface WearableData {
  provider: string;
  series: WearableSeries[];
}

// Vitals & Anthropometrics
export interface VitalsAnthroData {
  bp_systolic_mmhg: number | null;
  bp_diastolic_mmhg: number | null;
  hr_rest_bpm: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  waist_cm: number | null;
  hip_cm: number | null;
}

// Medication Statement
export interface Medication {
  name: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  start_date: string | null;
  end_date: string | null;
}

export interface MedicationStatementData {
  medications: Medication[];
}

// Procedure
export interface ProcedureRecord {
  name: string;
  date: string | null;
  laterality: string | null;
  notes: string | null;
}

export interface ProcedureData {
  procedures: ProcedureRecord[];
}

// Immunization
export interface ImmunizationRecord {
  vaccine: string;
  date: string;
  lot: string | null;
  site: string | null;
}

export interface ImmunizationData {
  immunizations: ImmunizationRecord[];
}

// Clinical Note
export interface ClinicalNoteSection {
  title: string;
  text: string;
}

export interface ClinicalNoteData {
  note_type: string | null;
  sections: ClinicalNoteSection[];
}

// Union type for all possible data types
export type InterpretedData =
  | ObservationLabsData
  | CardiacECGData
  | CardiacEchoData
  | DiagnosticReportImagingData
  | GenomicData
  | WearableData
  | VitalsAnthroData
  | MedicationStatementData
  | ProcedureData
  | ImmunizationData
  | ClinicalNoteData;

// Root Interpretation Result Schema
export interface InterpretationResult {
  report_id: string;
  report_type: ReportType;
  source_format: SourceFormat;
  ingested_at: string;
  patient: PatientInfo;
  data: InterpretedData;
  interpretation: Interpretation;
  audit: AuditTrail;
  references: string[];
  status: InterpretationStatus;
  user_feedback?: string; // Present when status is 'discarded'
}

// Pipeline Input
export interface PipelineInput {
  source_bytes_or_uri: string;
  source_format_hint?: string;
  user_region?: string;
  preserve_high_res?: boolean;
}

// OCR/Parse Output
export interface OCROutput {
  text: string;
  quality_score: number;
  confidence: number;
}

// Type Detection Result
export interface TypeDetectionResult {
  label: ReportType;
  confidence: number;
  rationale: string;
}

// Validation Outcome
export type ValidationOutcome = 'pass' | 'warn' | 'fail';

export interface ValidationResult {
  outcome: ValidationOutcome;
  message?: string;
  field?: string;
}

// Unit Conversion Spec
export interface UnitConversionSpec {
  from: string;
  to: string;
  analyte: string;
  factor: number;
}

// Interpretation Rule
export interface InterpretationRule {
  name: string;
  if: string;
  logic: string;
  outputs: string[];
}

// Spec Thresholds
export interface Thresholds {
  type_detection: number;
  extraction_min: number;
  normalization_min: number;
  overall_accept_min: number;
}

// User Feedback Templates
export interface UserFeedbackTemplates {
  unrecognized_type: string;
  missing_units: string;
  low_quality_ocr: string;
  partial_parse: string;
}
