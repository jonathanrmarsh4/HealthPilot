// Type Detection Classifier
// Uses weighted heuristic pattern matching with exclusions to classify medical report types

import type { ReportType, TypeDetectionResult, OCROutput } from './types';
import { TYPE_DETECTION_HEURISTICS, THRESHOLDS } from './config';

interface Heuristic {
  label: string;
  patterns: string;
  weight?: number;
  exclusions?: string;
}

/**
 * Classify a medical report based on text content using weighted heuristic pattern matching
 * @param ocrOutput - The OCR/parsed text output
 * @returns Type detection result with label, confidence, and rationale
 */
export async function classifyReportType(ocrOutput: OCROutput): Promise<TypeDetectionResult> {
  const text = ocrOutput.text.toLowerCase();
  
  // Score each report type based on weighted pattern matches with exclusion penalties
  const labelScores: Record<string, number> = {};
  const labelWeights: Record<string, number> = {};
  const matchedPatterns: Record<string, string[]> = {};

  for (const heuristic of TYPE_DETECTION_HEURISTICS as Heuristic[]) {
    const label = heuristic.label;
    const weight = heuristic.weight || 1.0;
    const patterns = heuristic.patterns.split('|');
    const exclusions = heuristic.exclusions ? heuristic.exclusions.split('|') : [];
    
    let matchCount = 0;
    const matched: string[] = [];

    // Count pattern matches
    for (const pattern of patterns) {
      const regex = new RegExp(pattern.toLowerCase(), 'i');
      if (regex.test(text)) {
        matchCount++;
        matched.push(pattern);
      }
    }

    // Check exclusions - penalize if any exclusion pattern is found
    let exclusionPenalty = 0;
    for (const exclusion of exclusions) {
      if (exclusion.trim()) {
        const regex = new RegExp(exclusion.toLowerCase(), 'i');
        if (regex.test(text)) {
          exclusionPenalty += 0.5; // Heavy penalty for each exclusion hit
        }
      }
    }

    // Calculate weighted score
    const matchRatio = matchCount / patterns.length;
    const weightedScore = matchRatio * weight - exclusionPenalty;

    // Accumulate scores for labels (multiple heuristics can contribute to same label)
    if (!labelScores[label]) {
      labelScores[label] = 0;
      labelWeights[label] = 0;
      matchedPatterns[label] = [];
    }
    
    labelScores[label] += Math.max(0, weightedScore); // Don't allow negative scores
    labelWeights[label] += weight;
    matchedPatterns[label].push(...matched);
  }

  // Normalize scores by total possible weight for each label
  const normalizedScores: Record<string, number> = {};
  for (const [label, score] of Object.entries(labelScores)) {
    normalizedScores[label] = score / (labelWeights[label] || 1);
  }

  // Find the highest scoring type
  let bestLabel: ReportType = 'Other';
  let bestScore = 0;

  for (const [label, score] of Object.entries(normalizedScores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLabel = label as ReportType;
    }
  }

  // Adjust confidence based on OCR quality
  const confidence = Math.min(1.0, bestScore * ocrOutput.quality_score);

  // Build rationale
  const matchedTerms = matchedPatterns[bestLabel] || [];
  const rationale = matchedTerms.length > 0
    ? `Detected ${bestLabel} based on keywords: ${matchedTerms.slice(0, 3).join(', ')}`
    : 'No strong pattern matches found';

  console.log(`🏷️  Classification: ${bestLabel} (score: ${bestScore.toFixed(2)}, confidence: ${confidence.toFixed(2)})`);
  console.log(`   Matched terms: ${matchedTerms.slice(0, 5).join(', ')}`);

  return {
    label: confidence >= THRESHOLDS.type_detection ? bestLabel : 'Other',
    confidence,
    rationale,
  };
}
