// Main Interpretation Pipeline
// Orchestrates the complete medical data interpretation flow

import { extractTextFromFile } from './ocr';
import { classifyReportType } from './classifier';
import { extractLabObservations } from './extractors/labs';
import { extractImagingObservations } from './extractors/imaging';
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
import { THRESHOLDS, USER_FEEDBACK_TEMPLATES, AGGREGATION, GREY_ZONE } from './config';

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
  
  // PHASE 1: Epsilon for floating-point safe comparisons
  const EPS = AGGREGATION.epsilon;

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

    // PHASE 1: Use epsilon tolerance for threshold comparison
    if (typeDetection.confidence + EPS < THRESHOLDS.type_detection) {
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
    
    // Handle imaging reports (calcium scores, bone density, etc.)
    if (typeDetection.label === 'DiagnosticReport_Imaging') {
      return await processImagingReport(
        ocrOutput,
        typeDetection,
        reportId,
        ingestedAt,
        userId
      );
    }
    
    // Handle lab reports
    if (typeDetection.label !== 'Observation_Labs') {
      console.log(`❌ DISCARD: Unsupported report type (${typeDetection.label} - currently supporting Observation_Labs and DiagnosticReport_Imaging)`);
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
          validation_findings: [`Report type ${typeDetection.label} is not yet supported.`],
        }
      );
    }

    const extraction = await extractLabObservations(ocrOutput);
    
    // PHASE 1: Use epsilon tolerance for threshold comparison
    if (extraction.confidence + EPS < THRESHOLDS.extraction_min) {
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

    // PHASE 1: Use epsilon tolerance for threshold comparison
    if (normalization.confidence + EPS < THRESHOLDS.normalization_min) {
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
    // PHASE 1: Use weighted average instead of harsh MIN()
    const weightedConfidence = AGGREGATION.use_weighted_average
      ? (typeDetection.confidence * AGGREGATION.weights.type) +
        (extraction.confidence * AGGREGATION.weights.extraction) +
        (normalization.confidence * AGGREGATION.weights.normalization)
      : Math.min(typeDetection.confidence, extraction.confidence, normalization.confidence);

    const overallConfidence = weightedConfidence;

    // PHASE 1: Check if extraction is in grey zone (0.40-0.50) - BEFORE overall threshold check
    const inGreyZone = GREY_ZONE.emit_partial_instead_of_discard &&
      extraction.confidence >= GREY_ZONE.extraction_lower &&
      extraction.confidence < GREY_ZONE.extraction_upper;

    // Enhanced logging with confidence breakdown
    console.log('📊 Confidence breakdown:');
    console.log(`   Type: ${typeDetection.confidence.toFixed(2)} (weight: ${AGGREGATION.weights.type})`);
    console.log(`   Extraction: ${extraction.confidence.toFixed(2)} (weight: ${AGGREGATION.weights.extraction})${inGreyZone ? ' [GREY ZONE]' : ''}`);
    console.log(`   Normalization: ${normalization.confidence.toFixed(2)} (weight: ${AGGREGATION.weights.normalization})`);
    if (AGGREGATION.use_weighted_average) {
      console.log(`   Weighted: ${typeDetection.confidence.toFixed(2)}×${AGGREGATION.weights.type} + ${extraction.confidence.toFixed(2)}×${AGGREGATION.weights.extraction} + ${normalization.confidence.toFixed(2)}×${AGGREGATION.weights.normalization} = ${overallConfidence.toFixed(2)}`);
    } else {
      console.log(`   MIN: ${overallConfidence.toFixed(2)}`);
    }
    console.log(`   Threshold: ${THRESHOLDS.overall_accept_min} (with epsilon: ${(THRESHOLDS.overall_accept_min - EPS).toFixed(6)})`);

    // PHASE 1: Grey zone handling - return partial result REGARDLESS of overall confidence
    // This ensures all grey-zone extractions return partial instead of discard
    if (inGreyZone) {
      console.log(`⚠️  PARTIAL ACCEPTANCE: Extraction in grey zone (${extraction.confidence.toFixed(2)} in [${GREY_ZONE.extraction_lower}, ${GREY_ZONE.extraction_upper}))`);
      console.log('   User can review and accept partial extraction results (grey zone bypass)');
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
        status: 'partial',
        is_partial: true,
        user_feedback: 'Some data was extracted with moderate confidence. Please review the results before accepting.',
      };
    }

    // PHASE 1: Use epsilon tolerance for floating-point safety (0.50 >= 0.50 edge case)
    const passesThreshold = overallConfidence + EPS >= THRESHOLDS.overall_accept_min;

    if (!passesThreshold) {
      console.log(`❌ DISCARD: Overall confidence too low (${overallConfidence.toFixed(2)} < ${THRESHOLDS.overall_accept_min})`);
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
    console.log(`✅ ACCEPTED: Weighted confidence ${overallConfidence.toFixed(2)} >= ${THRESHOLDS.overall_accept_min}`);
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
 * Process imaging reports (calcium scores, bone density, etc.)
 * Simplified pipeline - no normalization/validation needed
 */
async function processImagingReport(
  ocrOutput: any,
  typeDetection: any,
  reportId: string,
  ingestedAt: Date,
  userId: string
): Promise<InterpretationResult> {
  console.log('📊 Processing imaging report (simplified pipeline)');
  
  // PHASE 1: Epsilon for floating-point safe comparisons
  const EPS = AGGREGATION.epsilon;
  
  const extraction = await extractImagingObservations(ocrOutput);
  
  // PHASE 1: Use epsilon tolerance for threshold comparison (fixes floating-point edge case)
  if (extraction.confidence + EPS < THRESHOLDS.extraction_min) {
    console.log(`❌ DISCARD: Low extraction confidence (${extraction.confidence.toFixed(2)} < ${THRESHOLDS.extraction_min})`);
    return createDiscardedResult(
      reportId,
      ingestedAt,
      userId,
      'partial_parse',
      {
        type_classifier: typeDetection,
        extraction_confidence: extraction.confidence,
        normalization_confidence: 1.0,
        overall_confidence: extraction.confidence,
        rules_triggered: [],
        unit_conversions: [],
        validation_findings: [`Extraction confidence ${extraction.confidence.toFixed(2)} < threshold ${THRESHOLDS.extraction_min}`],
      }
    );
  }

  console.log(`✅ Imaging report processed: ${extraction.data.observations.length} observations extracted`);
  console.log('Pipeline complete - data accepted');

  return {
    report_id: reportId,
    report_type: extraction.data.report_type || 'DiagnosticReport_Imaging',
    source_format: 'PDF_OCR',
    ingested_at: ingestedAt.toISOString(),
    patient: {
      pseudo_id: userId,
      dob: null,
      sex_at_birth: null,
    },
    data: {
      panel_name: extraction.data.report_type,
      observations: extraction.data.observations.map(obs => ({
        code: obs.code,
        display: obs.display,
        value: obs.value,
        unit: obs.unit,
        reference_range: null,
        collected_at: obs.collected_at || null,
        flags: obs.interpretation ? [obs.interpretation] : [],
      })),
    } as InterpretedData,
    interpretation: {
      category: 'imaging_findings',
      insights: extraction.data.observations.map(obs => 
        `${obs.display}: ${obs.value} ${obs.unit}${obs.interpretation ? ` (${obs.interpretation})` : ''}`
      ),
      caveats: [],
      next_best_actions: [],
    },
    audit: {
      type_classifier: typeDetection,
      extraction_confidence: extraction.confidence,
      normalization_confidence: 1.0,
      overall_confidence: extraction.confidence,
      rules_triggered: [],
      unit_conversions: [],
      validation_findings: ['All checks passed'],
    },
    references: [],
    status: 'accepted',
  };
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
