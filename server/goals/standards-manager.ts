import { db } from "../db";
import { metricStandards, type MetricStandard, type InsertMetricStandard } from "@shared/schema";
import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { getASCMVO2Standards } from "./standards/acsm-vo2-standards";
import { getVDOTStandards } from "./standards/vdot-calculator";
import { getStrengthStandards } from "./standards/strength-standards";
import { getBodyCompositionStandards } from "./standards/who-body-comp";

/**
 * User profile for standard lookup
 */
export interface UserProfile {
  age: number;
  gender: 'male' | 'female';
  bodyweight?: number; // kg, needed for strength standards
  height?: number; // cm, needed for BMI
}

/**
 * Standard lookup result
 */
export interface StandardResult {
  standard: MetricStandard;
  targetValue: number;
  confidence: number;
  source: string;
  description: string;
}

/**
 * Standards Manager - Central service for fitness/health standards
 * 
 * This service:
 * 1. Queries the database for evidence-based standards
 * 2. Falls back to local libraries if not in DB
 * 3. Calculates target values based on user profile
 * 4. Seeds the database with initial standards
 */
export class StandardsManager {
  private static instance: StandardsManager;
  private initialized = false;

  private constructor() {}

  static getInstance(): StandardsManager {
    if (!StandardsManager.instance) {
      StandardsManager.instance = new StandardsManager();
    }
    return StandardsManager.instance;
  }

  /**
   * Initialize and seed standards if needed
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Check if standards exist in database
    const existingStandards = await db.select().from(metricStandards).limit(1);

    if (existingStandards.length === 0) {
      console.log('🌱 Seeding initial standards from local libraries...');
      await this.seedInitialStandards();
      console.log('✅ Standards seeding complete');
    }

    this.initialized = true;
  }

  /**
   * Seed the database with all known standards from local libraries
   */
  async seedInitialStandards(): Promise<void> {
    const allStandards: Omit<InsertMetricStandard, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
      ...getASCMVO2Standards(),
      ...getVDOTStandards(),
      ...getStrengthStandards(),
      ...getBodyCompositionStandards(),
    ];

    console.log(`📊 Inserting ${allStandards.length} standards into database...`);

    // Insert in batches to avoid timeout
    const BATCH_SIZE = 50;
    for (let i = 0; i < allStandards.length; i += BATCH_SIZE) {
      const batch = allStandards.slice(i, i + BATCH_SIZE);
      await db.insert(metricStandards).values(batch);
    }
  }

  /**
   * Get standard for a specific metric and user profile
   * 
   * This method:
   * 1. Queries database for matching standards (age, gender, metric)
   * 2. Returns the most appropriate standard based on confidence score
   * 3. Falls back to local libraries if no DB match found
   */
  async getStandard(
    metricKey: string,
    userProfile: UserProfile,
    targetLevel?: string
  ): Promise<MetricStandard[]> {
    await this.initialize();

    const { age, gender } = userProfile;

    // Build query conditions
    const conditions = [
      eq(metricStandards.metricKey, metricKey),
      eq(metricStandards.isActive, 1),
      // Gender match: either specific gender or 'all'
      or(
        eq(metricStandards.gender, gender),
        eq(metricStandards.gender, 'all')
      ),
    ];

    // Age range matching (if standard has age constraints)
    // A standard matches if:
    // - It has no age constraints (ageMin/ageMax are null), OR
    // - User's age falls within the standard's age range
    const ageConditions = or(
      and(isNull(metricStandards.ageMin), isNull(metricStandards.ageMax)),
      and(
        or(isNull(metricStandards.ageMin), lte(metricStandards.ageMin, age)),
        or(isNull(metricStandards.ageMax), gte(metricStandards.ageMax, age))
      )
    );

    conditions.push(ageConditions);

    // If target level specified, filter by level
    if (targetLevel) {
      conditions.push(eq(metricStandards.level, targetLevel));
    }

    const standards = await db
      .select()
      .from(metricStandards)
      .where(and(...conditions))
      .orderBy(metricStandards.confidenceScore);

    return standards;
  }

  /**
   * Calculate target value for a metric based on standards
   * 
   * @param metricKey - The metric to calculate target for (e.g., 'vo2max', 'squat_1rm')
   * @param currentValue - User's current value (if known)
   * @param goalDescription - Natural language goal description for context
   * @param userProfile - User's age, gender, bodyweight, etc.
   * @param desiredLevel - Optional desired performance level (e.g., 'good', 'advanced')
   * @returns Target value and confidence score
   */
  async calculateTarget(
    metricKey: string,
    currentValue: number | null,
    goalDescription: string,
    userProfile: UserProfile,
    desiredLevel?: string
  ): Promise<StandardResult | null> {
    // Get matching standards
    const standards = await this.getStandard(metricKey, userProfile, desiredLevel);

    if (standards.length === 0) {
      return null;
    }

    // For percentile-based standards (like VO2max), use the range midpoint
    if (standards[0].standardType === 'percentile') {
      // Default to 60th percentile (Good fitness) if no level specified
      const targetStandard = desiredLevel
        ? standards.find(s => s.level === desiredLevel)
        : standards.find(s => s.percentile === 60);

      if (!targetStandard) return null;

      const targetValue = targetStandard.valueSingle || 
        ((targetStandard.valueMin! + targetStandard.valueMax!) / 2);

      return {
        standard: targetStandard,
        targetValue,
        confidence: targetStandard.confidenceScore!,
        source: targetStandard.sourceName,
        description: targetStandard.sourceDescription || '',
      };
    }

    // For bodyweight ratio standards (like strength)
    if (standards[0].standardType === 'bodyweight_ratio') {
      // Need bodyweight to calculate
      if (!userProfile.bodyweight) {
        return null;
      }

      // Default to 'intermediate' level if not specified
      const targetStandard = desiredLevel
        ? standards.find(s => s.level === desiredLevel)
        : standards.find(s => s.level === 'intermediate');

      if (!targetStandard || !targetStandard.valueSingle) return null;

      const targetValue = Math.round(userProfile.bodyweight * targetStandard.valueSingle);

      return {
        standard: targetStandard,
        targetValue,
        confidence: targetStandard.confidenceScore!,
        source: targetStandard.sourceName,
        description: `${targetStandard.level} level: ${targetStandard.valueSingle}x bodyweight`,
      };
    }

    // For absolute value standards (like BMI, body fat %)
    if (standards[0].standardType === 'absolute_value') {
      // Default to 'normal' or 'fitness' level
      const preferredLevels = ['normal', 'fitness', 'average', 'good'];
      let targetStandard = standards.find(s => preferredLevels.includes(s.level!));
      
      if (!targetStandard) {
        targetStandard = standards[0];
      }

      if (!targetStandard) return null;

      // Use midpoint of range
      const targetValue = targetStandard.valueSingle || 
        ((targetStandard.valueMin! + targetStandard.valueMax!) / 2);

      return {
        standard: targetStandard,
        targetValue,
        confidence: targetStandard.confidenceScore!,
        source: targetStandard.sourceName,
        description: targetStandard.sourceDescription || '',
      };
    }

    return null;
  }

  /**
   * Infer desired performance level from goal description
   * Uses keyword matching to determine ambition level
   */
  inferDesiredLevel(goalDescription: string): string | undefined {
    const lower = goalDescription.toLowerCase();

    // Elite/advanced keywords
    if (lower.includes('elite') || lower.includes('competitive') || lower.includes('advanced')) {
      return 'advanced';
    }

    // Intermediate keywords
    if (lower.includes('intermediate') || lower.includes('solid') || lower.includes('strong')) {
      return 'intermediate';
    }

    // Beginner/novice keywords
    if (lower.includes('beginner') || lower.includes('novice') || lower.includes('start')) {
      return 'novice';
    }

    // Fitness/health keywords (usually 'good' or 'fitness' level)
    if (lower.includes('healthy') || lower.includes('fit') || lower.includes('good shape')) {
      return 'fitness';
    }

    // Default: let the calculateTarget method use its defaults
    return undefined;
  }

  /**
   * Update usage count when a standard is used
   */
  async trackStandardUsage(standardId: string): Promise<void> {
    // First get the current count
    const current = await db
      .select({ usageCount: metricStandards.usageCount })
      .from(metricStandards)
      .where(eq(metricStandards.id, standardId))
      .limit(1);

    if (current.length > 0) {
      await db
        .update(metricStandards)
        .set({ usageCount: (current[0].usageCount || 0) + 1 })
        .where(eq(metricStandards.id, standardId));
    }
  }
}

// Export singleton instance
export const standardsManager = StandardsManager.getInstance();
