import OpenAI from "openai";
import { db } from "../db";
import { metricStandards, type InsertMetricStandard } from "@shared/schema";
import { eq } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Source validation result
 */
interface SourceValidation {
  isReputable: boolean;
  evidenceLevel: 'peer_reviewed' | 'professional_org' | 'ai_discovered' | 'community';
  confidenceScore: number;
  reason: string;
}

/**
 * Discovered standard structure
 */
export interface DiscoveredStandard {
  metricKey: string;
  standardType: string;
  category: string;
  ageMin?: number;
  ageMax?: number;
  gender: 'male' | 'female' | 'all';
  valueMin?: number;
  valueMax?: number;
  valueSingle?: number;
  unit: string;
  percentile?: number;
  level?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceDescription: string;
  confidenceScore: number;
  evidenceLevel: 'peer_reviewed' | 'professional_org' | 'ai_discovered' | 'community';
}

/**
 * AI-Powered Standards Discovery System
 * 
 * This system discovers and validates fitness/health standards from reputable sources
 * when encountering metrics without existing standards in the database.
 * 
 * Process:
 * 1. Use AI to search for standards from reputable sources (PubMed, WHO, ACSM, NSCA, etc.)
 * 2. Validate source credibility
 * 3. Extract structured standard data
 * 4. Store in database for future use
 */
export class StandardsDiscovery {
  /**
   * Discover standard for a given metric
   * 
   * @param metricKey - The metric to find standards for (e.g., 'lactate_threshold', 'resting_hr')
   * @param context - Additional context about the goal (helps AI understand what to search for)
   * @returns Discovered standard or null if none found
   */
  async discoverStandard(
    metricKey: string,
    context: string
  ): Promise<DiscoveredStandard | null> {
    console.log(`🔍 Discovering standard for metric: ${metricKey}`);
    
    try {
      // First, check if standard already exists
      const existing = await db
        .select()
        .from(metricStandards)
        .where(eq(metricStandards.metricKey, metricKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`✅ Standard already exists for ${metricKey}`);
        return null;
      }

      // Use AI to search for and structure the standard
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a fitness and health standards researcher. Your job is to find evidence-based standards for health and fitness metrics from reputable sources.

Focus on these source types:
1. Peer-reviewed research (PubMed, scientific journals)
2. Professional organizations (ACSM, NSCA, WHO, AHA, CDC)
3. Established textbooks and guidelines
4. Expert consensus statements

For each metric, provide:
- Standard values (ranges, percentiles, or absolute values)
- Age and gender stratification if applicable
- Source citation and credibility
- Classification levels (e.g., poor, fair, good, excellent)

Respond ONLY with a valid JSON object matching this schema:
{
  "found": boolean,
  "metricKey": string,
  "standardType": "percentile" | "bodyweight_ratio" | "absolute_value" | "pace_per_km",
  "category": "cardio" | "strength" | "body_comp" | "running" | "clinical",
  "standards": [
    {
      "ageMin": number | null,
      "ageMax": number | null,
      "gender": "male" | "female" | "all",
      "valueMin": number | null,
      "valueMax": number | null,
      "valueSingle": number | null,
      "unit": string,
      "percentile": number | null,
      "level": string
    }
  ],
  "sourceName": string,
  "sourceUrl": string,
  "sourceDescription": string,
  "evidenceLevel": "peer_reviewed" | "professional_org",
  "confidenceScore": number (0-1)
}`,
          },
          {
            role: "user",
            content: `Find evidence-based standards for the metric "${metricKey}".

Context from user's goal: ${context}

Search for standards from reputable sources like:
- ACSM (American College of Sports Medicine)
- NSCA (National Strength and Conditioning Association)
- WHO (World Health Organization)
- AHA (American Heart Association)
- PubMed peer-reviewed research
- Clinical practice guidelines

Provide the most authoritative and recent standard you can find.`,
          },
        ],
        temperature: 0.3, // Lower temperature for more factual responses
        response_format: { type: "json_object" },
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        console.log(`❌ No response from AI for ${metricKey}`);
        return null;
      }

      const result = JSON.parse(responseText);

      if (!result.found || !result.standards || result.standards.length === 0) {
        console.log(`❌ No standard found for ${metricKey}`);
        return null;
      }

      // Validate the source
      const validation = this.validateSource(result.sourceName, result.evidenceLevel);

      if (!validation.isReputable) {
        console.log(`⚠️ Source not reputable for ${metricKey}: ${validation.reason}`);
        return null;
      }

      // Return the first (most relevant) standard
      const firstStandard = result.standards[0];
      
      const discovered: DiscoveredStandard = {
        metricKey: result.metricKey,
        standardType: result.standardType,
        category: result.category,
        ageMin: firstStandard.ageMin,
        ageMax: firstStandard.ageMax,
        gender: firstStandard.gender,
        valueMin: firstStandard.valueMin,
        valueMax: firstStandard.valueMax,
        valueSingle: firstStandard.valueSingle,
        unit: firstStandard.unit,
        percentile: firstStandard.percentile,
        level: firstStandard.level,
        sourceName: result.sourceName,
        sourceUrl: result.sourceUrl,
        sourceDescription: result.sourceDescription,
        confidenceScore: Math.min(result.confidenceScore, validation.confidenceScore),
        evidenceLevel: validation.evidenceLevel,
      };

      console.log(`✅ Discovered standard for ${metricKey} from ${discovered.sourceName}`);

      return discovered;
    } catch (error) {
      console.error(`❌ Error discovering standard for ${metricKey}:`, error);
      return null;
    }
  }

  /**
   * Validate source credibility
   * 
   * @param sourceName - Name of the source
   * @param claimedLevel - Evidence level claimed by AI
   * @returns Validation result
   */
  validateSource(
    sourceName: string,
    claimedLevel: string
  ): SourceValidation {
    const lowerSource = sourceName.toLowerCase();

    // Tier 1: Major professional organizations and peer-reviewed journals
    const tier1Sources = [
      'acsm', 'american college of sports medicine',
      'nsca', 'national strength and conditioning association',
      'who', 'world health organization',
      'aha', 'american heart association',
      'cdc', 'centers for disease control',
      'nih', 'national institutes of health',
      'pubmed', 'peer-reviewed', 'journal', 'lancet', 'jama', 'nejm',
    ];

    // Tier 2: Established experts and textbooks
    const tier2Sources = [
      'jack daniels', 'mark rippetoe', 'lon kilgore',
      'exrx', 'strength level', 'symmetric strength',
      'ace', 'american council on exercise',
      'nasm', 'national academy of sports medicine',
    ];

    // Check tier 1 (highest confidence)
    if (tier1Sources.some(t1 => lowerSource.includes(t1))) {
      return {
        isReputable: true,
        evidenceLevel: claimedLevel === 'peer_reviewed' ? 'peer_reviewed' : 'professional_org',
        confidenceScore: 1.0,
        reason: 'Recognized professional organization or peer-reviewed source',
      };
    }

    // Check tier 2 (good confidence)
    if (tier2Sources.some(t2 => lowerSource.includes(t2))) {
      return {
        isReputable: true,
        evidenceLevel: 'professional_org',
        confidenceScore: 0.85,
        reason: 'Established expert or professional resource',
      };
    }

    // Unknown source - require manual verification
    return {
      isReputable: false,
      evidenceLevel: 'ai_discovered',
      confidenceScore: 0.5,
      reason: 'Source not in recognized list - requires manual verification',
    };
  }

  /**
   * Store discovered standard in database
   * 
   * @param standard - The discovered standard to store
   * @returns ID of the inserted standard
   */
  async storeStandard(standard: DiscoveredStandard): Promise<string> {
    const insertData: Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'> = {
      metricKey: standard.metricKey,
      standardType: standard.standardType,
      category: standard.category,
      ageMin: standard.ageMin ?? null,
      ageMax: standard.ageMax ?? null,
      gender: standard.gender,
      valueMin: standard.valueMin ?? null,
      valueMax: standard.valueMax ?? null,
      valueSingle: standard.valueSingle ?? null,
      unit: standard.unit,
      percentile: standard.percentile ?? null,
      level: standard.level ?? null,
      sourceName: standard.sourceName,
      sourceUrl: standard.sourceUrl ?? null,
      sourceDescription: standard.sourceDescription,
      confidenceScore: standard.confidenceScore,
      evidenceLevel: standard.evidenceLevel,
      isActive: 1,
      verifiedByAdmin: 0, // AI-discovered standards need manual review
      lastVerifiedAt: new Date(),
    };

    const result = await db.insert(metricStandards).values(insertData).returning({ id: metricStandards.id });

    console.log(`💾 Stored standard for ${standard.metricKey} with ID: ${result[0].id}`);

    return result[0].id;
  }

  /**
   * Discover and store a standard in one operation
   */
  async discoverAndStore(
    metricKey: string,
    context: string
  ): Promise<string | null> {
    const discovered = await this.discoverStandard(metricKey, context);
    
    if (!discovered) {
      return null;
    }

    return await this.storeStandard(discovered);
  }
}

// Export singleton instance
export const standardsDiscovery = new StandardsDiscovery();
