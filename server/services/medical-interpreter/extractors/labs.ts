// Lab Report Extractor
// Uses GPT-4 to extract structured lab observations from OCR text

import { getOpenAI } from '../client';
import type { ObservationLabsData, OCROutput } from '../types';
import { PROMPTS } from '../config';

/**
 * Extract lab observations from OCR text using GPT-4
 * @param ocrOutput - The OCR text output
 * @returns Structured lab observations data and extraction confidence
 */
export async function extractLabObservations(ocrOutput: OCROutput): Promise<{
  data: ObservationLabsData;
  confidence: number;
}> {
  try {
    const extractionPrompt = PROMPTS.extraction_by_type.Observation_Labs;
    
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `${PROMPTS.system}\n\n${extractionPrompt}`,
        },
        {
          role: 'user',
          content: `Extract lab observations from this report:\n\n${ocrOutput.text}\n\nReturn ONLY valid JSON matching this structure:
{
  "panel_name": "string or null",
  "observations": [
    {
      "code": "test code or abbreviation",
      "display": "full test name",
      "value": number or string,
      "unit": "measurement unit",
      "reference_range": {
        "low": number or null,
        "high": number or null,
        "unit": "unit string or null"
      },
      "collected_at": "ISO8601 timestamp or null",
      "flags": ["array of flag strings like 'high', 'low', 'abnormal']
    }
  ]
}`,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 8000, // Increased from 4000 for large lab reports
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from GPT-4');
    }

    // Robust JSON parsing with cleanup
    let parsed: ObservationLabsData;
    try {
      parsed = JSON.parse(content) as ObservationLabsData;
    } catch (parseError) {
      // Try cleaning up common JSON issues
      console.warn('Initial JSON parse failed, attempting cleanup...', parseError);
      const cleaned = content
        .replace(/,\s*}/g, '}')  // Remove trailing commas before }
        .replace(/,\s*]/g, ']')  // Remove trailing commas before ]
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
      
      try {
        parsed = JSON.parse(cleaned) as ObservationLabsData;
        console.log('✅ JSON cleanup successful');
      } catch (cleanupError) {
        console.error('JSON cleanup failed:', cleanupError);
        throw parseError; // Throw original error
      }
    }

    // Calculate extraction confidence based on data completeness
    const confidence = calculateExtractionConfidence(parsed);

    return {
      data: parsed,
      confidence,
    };
  } catch (error) {
    console.error('Lab extraction error:', error);
    
    // Return empty data with low confidence on error
    return {
      data: {
        panel_name: null,
        observations: [],
      },
      confidence: 0,
    };
  }
}

/**
 * Calculate extraction confidence based on data completeness
 */
function calculateExtractionConfidence(data: ObservationLabsData): number {
  if (data.observations.length === 0) {
    return 0;
  }

  let totalScore = 0;
  const observations = data.observations;

  for (const obs of observations) {
    let obsScore = 0;
    
    // Has code and display
    if (obs.code && obs.display) obsScore += 0.3;
    
    // Has value
    if (obs.value !== null && obs.value !== undefined) obsScore += 0.2;
    
    // Has unit
    if (obs.unit) obsScore += 0.2;
    
    // Has reference range
    if (obs.reference_range && (obs.reference_range.low !== null || obs.reference_range.high !== null)) {
      obsScore += 0.2;
    }
    
    // Has timestamp
    if (obs.collected_at) obsScore += 0.1;
    
    totalScore += Math.min(obsScore, 1.0);
  }

  return totalScore / observations.length;
}
