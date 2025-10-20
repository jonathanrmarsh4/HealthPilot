// Main Interpretation Pipeline
// Orchestrates the complete medical data interpretation flow

import { extractTextFromFile } from './ocr';
import { classifyReportType } from './classifier';
import { extractLabObservations } from './extractors/labs';
import { normalizeLabData } from './normalizer';
import { validateLabData } from './validator';
import { interpretLabData } from './interpreter';
import type {
  InterpretationResult,
  PipelineInput,
  ReportType,
  ObservationLabsData,
  InterpretedData,
} from './types';
import { THRESHOLDS, USER_FEEDBACK_TEMPLATES } from './config';

/**
 * Run the complete interpretation pipeline
 * @param input - Pipeline input with file path and options
 * @param userId - User ID for pseudo_id
 * @returns Complete interpretation result
 */
export async function runInterpretationPipeline(
  input: PipelineInput,
  userId: string
): Promise<InterpretationResult> {
  const ingestedAt = new Date();
  const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Step 1: OCR or Parse
    console.log('Step 1: OCR/Parse - Extracting text from file');
    const ocrOutput = await extractTextFromFile(input.source_bytes_or_uri);
    
    if (ocrOutput.quality_score < 0.15) {
      console.log(`❌ DISCARD: Low quality OCR (quality_score: ${ocrOutput.quality_score.toFixed(2)} < 0.15)`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'low_quality_ocr',
        {
          type_classifier: { label: 'Other', confidence: 0 },
          extraction_confidence: 0,
          normalization_confidence: 0,
          overall_confidence: 0,
          rules_triggered: [],
          unit_conversions: [],
          validation_findings: [`OCR quality too low: ${ocrOutput.quality_score.toFixed(2)} < threshold 0.15`],
        }
      );
    }

    // Step 2: Type Detection
    console.log('Step 2: Classifying report type');
    const typeDetection = await classifyReportType(ocrOutput);

    if (typeDetection.confidence < THRESHOLDS.type_detection) {
      console.log(`❌ DISCARD: Unrecognized type (confidence: ${typeDetection.confidence.toFixed(2)} < ${THRESHOLDS.type_detection}, label: ${typeDetection.label})`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'unrecognized_type',
        {
          type_classifier: typeDetection,
          extraction_confidence: 0,
          normalization_confidence: 0,
          overall_confidence: typeDetection.confidence,
          rules_triggered: [],
          unit_conversions: [],
          validation_findings: [`Type detection confidence ${typeDetection.confidence.toFixed(2)} < threshold ${THRESHOLDS.type_detection}`],
        }
      );
    }

    // Step 3: Type-Specific Extraction
    console.log(`Step 3: Extracting data for type: ${typeDetection.label}`);
    
    // Currently only supporting lab reports - will expand to other types
    if (typeDetection.label !== 'Observation_Labs') {
      console.log(`❌ DISCARD: Unsupported report type (${typeDetection.label} - only Observation_Labs currently supported)`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'unrecognized_type',
        {
          type_classifier: typeDetection,
          extraction_confidence: 0,
          normalization_confidence: 0,
          overall_confidence: 0,
          rules_triggered: [],
          unit_conversions: [],
          validation_findings: [`Report type ${typeDetection.label} is not yet supported. Currently only lab reports are supported.`],
        }
      );
    }

    const extraction = await extractLabObservations(ocrOutput);
    
    if (extraction.confidence < THRESHOLDS.extraction_min) {
      console.log(`❌ DISCARD: Low extraction confidence (${extraction.confidence.toFixed(2)} < ${THRESHOLDS.extraction_min})`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'partial_parse',
        {
          type_classifier: typeDetection,
          extraction_confidence: extraction.confidence,
          normalization_confidence: 0,
          overall_confidence: extraction.confidence,
          rules_triggered: [],
          unit_conversions: [],
          validation_findings: [`Extraction confidence ${extraction.confidence.toFixed(2)} < threshold ${THRESHOLDS.extraction_min}`],
        }
      );
    }

    // Step 4: Normalization
    console.log('Step 4: Normalizing units to SI');
    const normalization = normalizeLabData(extraction.data as ObservationLabsData);

    if (normalization.confidence < THRESHOLDS.normalization_min) {
      console.log(`❌ DISCARD: Low normalization confidence (${normalization.confidence.toFixed(2)} < ${THRESHOLDS.normalization_min}) - missing or invalid units`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'missing_units',
        {
          type_classifier: typeDetection,
          extraction_confidence: extraction.confidence,
          normalization_confidence: normalization.confidence,
          overall_confidence: normalization.confidence,
          rules_triggered: [],
          unit_conversions: normalization.conversions,
          validation_findings: [`Normalization confidence ${normalization.confidence.toFixed(2)} < threshold ${THRESHOLDS.normalization_min} - some observations missing valid units`],
        }
      );
    }

    // Step 5: Validation
    console.log('Step 5: Validating data');
    const validationResults = validateLabData(normalization.normalizedData, ingestedAt);
    const hasFailures = validationResults.some(v => v.outcome === 'fail');

    if (hasFailures) {
      const failures = validationResults.filter(v => v.outcome === 'fail');
      console.log(`❌ DISCARD: Validation failures (${failures.length} failed checks)`);
      failures.forEach(f => console.log(`  - ${f.message}`));
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'partial_parse',
        {
          type_classifier: typeDetection,
          extraction_confidence: extraction.confidence,
          normalization_confidence: normalization.confidence,
          overall_confidence: 0,
          rules_triggered: [],
          unit_conversions: normalization.conversions,
          validation_findings: failures.map(v => v.message || 'Validation failed'),
        }
      );
    }

    // Step 6: Interpretation
    console.log('Step 6: Interpreting results');
    const interpretation = interpretLabData(normalization.normalizedData, null);

    // Step 7: Finalizer - Calculate overall confidence and accept/discard
    const overallConfidence = Math.min(
      typeDetection.confidence,
      extraction.confidence,
      normalization.confidence
    );

    if (overallConfidence < THRESHOLDS.overall_accept_min) {
      console.log(`❌ DISCARD: Overall confidence too low (${overallConfidence.toFixed(2)} < ${THRESHOLDS.overall_accept_min})`);
      console.log(`  Type: ${typeDetection.confidence.toFixed(2)}, Extraction: ${extraction.confidence.toFixed(2)}, Normalization: ${normalization.confidence.toFixed(2)}`);
      return createDiscardedResult(
        reportId,
        ingestedAt,
        userId,
        'partial_parse',
        {
          type_classifier: typeDetection,
          extraction_confidence: extraction.confidence,
          normalization_confidence: normalization.confidence,
          overall_confidence: overallConfidence,
          rules_triggered: interpretation.rulesTriggered,
          unit_conversions: normalization.conversions,
          validation_findings: validationResults.map(v => v.message || ''),
        }
      );
    }

    // SUCCESS - Return accepted result
    console.log('Pipeline complete - data accepted');
    return {
      report_id: reportId,
      report_type: typeDetection.label,
      source_format: (input.source_format_hint as any) || 'PDF_OCR',
      ingested_at: ingestedAt.toISOString(),
      patient: {
        pseudo_id: userId,
        dob: null,
        sex_at_birth: null,
      },
      data: normalization.normalizedData as InterpretedData,
      interpretation: interpretation.interpretation,
      audit: {
        type_classifier: typeDetection,
        extraction_confidence: extraction.confidence,
        normalization_confidence: normalization.confidence,
        overall_confidence: overallConfidence,
        rules_triggered: interpretation.rulesTriggered,
        unit_conversions: normalization.conversions,
        validation_findings: validationResults.map(v => v.message || ''),
      },
      references: [
        'Evidence-based clinical interpretation guidelines',
        'ACSM clinical standards for lipid management',
        'ADA guidelines for glycemic control',
      ],
      status: 'accepted',
    };
  } catch (error) {
    console.error('❌ PIPELINE ERROR:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
    
    return createDiscardedResult(
      reportId,
      ingestedAt,
      userId,
      'partial_parse',
      {
        type_classifier: { label: 'Other', confidence: 0 },
        extraction_confidence: 0,
        normalization_confidence: 0,
        overall_confidence: 0,
        rules_triggered: [],
        unit_conversions: [],
        validation_findings: [`System error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    );
  }
}

/**
 * Create a discarded result with appropriate user feedback
 */
function createDiscardedResult(
  reportId: string,
  ingestedAt: Date,
  userId: string,
  feedbackType: keyof typeof USER_FEEDBACK_TEMPLATES,
  audit: InterpretationResult['audit']
): InterpretationResult {
  return {
    report_id: reportId,
    report_type: 'Other',
    source_format: 'PDF_OCR',
    ingested_at: ingestedAt.toISOString(),
    patient: {
      pseudo_id: userId,
      dob: null,
      sex_at_birth: null,
    },
    data: { panel_name: null, observations: [] } as InterpretedData,
    interpretation: {
      category: null,
      insights: [],
      caveats: [],
      next_best_actions: [],
    },
    audit,
    references: [],
    status: 'discarded',
    user_feedback: USER_FEEDBACK_TEMPLATES[feedbackType],
  };
}
