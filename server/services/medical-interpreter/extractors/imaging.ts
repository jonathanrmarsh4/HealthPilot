// Imaging Report Extractor
// Extracts key metrics from imaging reports (CT calcium score, bone density, etc.)

import { openai } from '../client';
import type { OCROutput } from '../types';
import { PROMPTS } from '../config';

export interface ImagingObservation {
  code: string;
  display: string;
  value: number | string;
  unit: string;
  interpretation?: string;
  collected_at?: string;
}

export interface ImagingReportData {
  report_type: string; // e.g., "Cardiac CT Calcium Score", "DEXA Bone Density"
  observations: ImagingObservation[];
}

/**
 * Extract imaging observations from OCR text using GPT-4
 */
export async function extractImagingObservations(ocrOutput: OCROutput): Promise<{
  data: ImagingReportData;
  confidence: number;
}> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are a medical imaging report interpreter. Extract key quantitative findings from imaging reports.
          
Focus on extracting:
- Calcium scores (coronary, aortic)
- Bone density scores (T-score, Z-score)
- Tumor measurements
- Organ volumes
- Other quantitative imaging findings

Return structured data with the metric name, value, and unit.`,
        },
        {
          role: 'user',
          content: `Extract imaging findings from this report:\n\n${ocrOutput.text}\n\nReturn ONLY valid JSON matching this structure:
{
  "report_type": "type of imaging study (e.g., 'Cardiac CT Calcium Score', 'DEXA Bone Density')",
  "observations": [
    {
      "code": "metric code or abbreviation (e.g., 'CAC', 'T_SCORE')",
      "display": "full metric name (e.g., 'Coronary Artery Calcium Score', 'Lumbar Spine T-Score')",
      "value": number or string,
      "unit": "measurement unit (e.g., 'Agatston units', 'SD')",
      "interpretation": "clinical interpretation if provided (e.g., 'mild', 'moderate risk')",
      "collected_at": "ISO8601 timestamp or null"
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4');
    }

    // Robust JSON parsing
    let parsed: ImagingReportData;
    try {
      parsed = JSON.parse(content) as ImagingReportData;
    } catch (parseError) {
      console.warn('Initial JSON parse failed, attempting cleanup...', parseError);
      const cleaned = content
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      
      try {
        parsed = JSON.parse(cleaned) as ImagingReportData;
        console.log('✅ JSON cleanup successful');
      } catch (cleanupError) {
        console.error('JSON cleanup failed:', cleanupError);
        throw parseError;
      }
    }

    // Calculate extraction confidence
    const confidence = calculateExtractionConfidence(parsed);

    return {
      data: parsed,
      confidence,
    };
  } catch (error) {
    console.error('Imaging extraction error:', error);
    
    return {
      data: {
        report_type: '',
        observations: [],
      },
      confidence: 0,
    };
  }
}

/**
 * Calculate extraction confidence based on data completeness
 */
function calculateExtractionConfidence(data: ImagingReportData): number {
  if (data.observations.length === 0) {
    return 0;
  }

  let totalScore = 0;
  const observations = data.observations;

  for (const obs of observations) {
    let obsScore = 0;
    
    if (obs.code && obs.display) obsScore += 0.4;
    if (obs.value !== null && obs.value !== undefined) obsScore += 0.3;
    if (obs.unit) obsScore += 0.3;
    
    totalScore += obsScore;
  }

  return totalScore / observations.length;
}
