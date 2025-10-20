// Type Detection Classifier
// Uses heuristic pattern matching to classify medical report types

import type { ReportType, TypeDetectionResult, OCROutput } from './types';
import { TYPE_DETECTION_HEURISTICS, THRESHOLDS } from './config';

/**
 * Classify a medical report based on text content using heuristic pattern matching
 * @param ocrOutput - The OCR/parsed text output
 * @returns Type detection result with label, confidence, and rationale
 */
export async function classifyReportType(ocrOutput: OCROutput): Promise<TypeDetectionResult> {
  const text = ocrOutput.text.toLowerCase();
  
  // Score each report type based on pattern matches
  const scores: Record<string, number> = {};
  const matchedPatterns: Record<string, string[]> = {};

  for (const heuristic of TYPE_DETECTION_HEURISTICS) {
    const patterns = heuristic.pattern.split('|');
    let matchCount = 0;
    const matched: string[] = [];

    for (const pattern of patterns) {
      const regex = new RegExp(pattern.toLowerCase(), 'i');
      if (regex.test(text)) {
        matchCount++;
        matched.push(pattern);
      }
    }

    // Calculate confidence based on match percentage
    const matchPercentage = matchCount / patterns.length;
    scores[heuristic.label] = matchPercentage;
    matchedPatterns[heuristic.label] = matched;
  }

  // Find the highest scoring type
  let bestLabel: ReportType = 'Other';
  let bestScore = 0;

  for (const [label, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label as ReportType;
    }
  }

  // Adjust confidence based on OCR quality
  const confidence = bestScore * ocrOutput.quality_score;

  // Build rationale
  const matchedTerms = matchedPatterns[bestLabel] || [];
  const rationale = matchedTerms.length > 0
    ? `Detected ${bestLabel} based on keywords: ${matchedTerms.slice(0, 3).join(', ')}`
    : 'No strong pattern matches found';

  return {
    label: confidence >= THRESHOLDS.type_detection ? bestLabel : 'Other',
    confidence,
    rationale,
  };
}
