/**
 * HealthPilot Meal Intelligence Orchestrator v1.0
 * Implements sophisticated meal recommendation with scoring, filtering, and bandit learning
 */

import { db } from "../db";
import { mealLibrary, mealPlans, users, nutritionProfiles, biomarkers } from "@shared/schema";
import { and, eq, inArray, not, sql, desc, gte, lte, or, isNull } from "drizzle-orm";
import type { MealLibrary, MealPlan, NutritionProfile, Biomarker } from "@shared/schema";
import type { IStorage } from "../storage";

// Types for the recommendation system
interface UserProfile {
  userId: string;
  age?: number;
  sex?: "male" | "female" | "other" | "unspecified";
  heightCm?: number;
  weightKg?: number;
  goals: string[];
  dietaryPattern: string[];
  allergies: string[];
  intolerances: string[];
  culturalEthics: string[];
  biomarkers: {
    ldlMgDl?: number;
    hdlMgDl?: number;
    tgMgDl?: number;
    hba1cPct?: number;
    fastingGlucoseMgDl?: number;
    bpSystolic?: number;
    bpDiastolic?: number;
    ckdStage?: number;
  };
  healthkit?: {
    tdeeKcal?: number;
    recentActivity?: {
      steps7dAvg?: number;
      vo2maxMlKgMin?: number;
    };
    weightTrend30d?: number;
  };
  calorieTargetKcal?: number;
  macroTargets?: {
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    fiberG?: number;
    sodiumMg?: number;
  };
  tastePreferences?: {
    likedTags?: string[];
    dislikedTags?: string[];
    likedIngredients?: string[];
    dislikedIngredients?: string[];
  };
  banditState?: {
    lastUpdated: Date;
    arms: Record<string, { alpha: number; beta: number }>;
  };
}

interface MealCandidate {
  mealId: string;
  title: string;
  mealSlot: string[];
  serving: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG?: number;
    sodiumMg?: number;
  };
  tags: string[];
  cuisine: string;
  ingredients: string[];
  allergens: string[];
  prepTimeMin: number;
  imageUrl?: string;
  sourceUrl?: string;
  thirdPartyId?: string;
  sourceData?: any;
}

interface RecommendationContext {
  requestId: string;
  timezone: string;
  mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
  dayPlanMacrosRemaining?: {
    kcal?: number;
    proteinG?: number;
    carbsG?: number;
    fatG?: number;
    sodiumMg?: number;
  };
  maxResults: number;
  diversityStrength: number;
  explorationStrength: number;
  allowSubstitutions: boolean;
}

interface FeedbackEvent {
  userId: string;
  mealId: string;
  timestamp: Date;
  signal: "like" | "dislike" | "saved" | "completed";
  strength: number;
}

interface FilteredOutCounts {
  allergyConflict: number;
  intoleranceConflict: number;
  dietaryPatternConflict: number;
  biomarkerRuleConflict: number;
  macroOverflowConflict: number;
  slotMismatch: number;
  duplicates: number;
  other: number;
}

interface MealRecommendation {
  mealId: string;
  score: number;
  reasons: string[];
  adjustments: {
    portionMultiplier: number;
    substitutions: Array<{
      from: string;
      to: string;
      reason: string;
    }>;
  };
}

interface RecommendationResponse {
  version: string;
  requestId: string;
  filteredOutCounts: FilteredOutCounts;
  recommendations: MealRecommendation[];
  fallback: {
    invoked: boolean;
    reason: string;
    suggestions: string[];
  };
  banditUpdates: {
    applied: boolean;
    arms: Record<string, { alpha: number; beta: number }>;
  };
  audit: {
    rulesApplied: string[];
    scoringWeights: {
      goalAlignment: number;
      macroFit: number;
      tasteMatch: number;
      diversityBonus: number;
      explorationBonus: number;
      prepTimeBonus: number;
    };
  };
}

export class MealRecommenderService {
  private readonly DEFAULT_WEIGHTS = {
    goalAlignment: 0.25,  // Reduced from 0.35
    macroFit: 0.20,       // Reduced from 0.25
    tasteMatch: 0.10,     // Reduced from 0.15
    diversityBonus: 0.10, // Same
    explorationBonus: 0.30, // Increased from 0.10 - Thompson Sampling is primary driver
    prepTimeBonus: 0.05   // Same
  };

  constructor(private storage: IStorage) {}

  /**
   * Main recommendation function
   */
  async recommendMeals(
    userProfile: UserProfile,
    context: RecommendationContext,
    candidateMeals: MealCandidate[],
    feedbackEvents?: FeedbackEvent[]
  ): Promise<RecommendationResponse> {
    const counts: FilteredOutCounts = {
      allergyConflict: 0,
      intoleranceConflict: 0,
      dietaryPatternConflict: 0,
      biomarkerRuleConflict: 0,
      macroOverflowConflict: 0,
      slotMismatch: 0,
      duplicates: 0,
      other: 0
    };

    const rulesApplied: string[] = [];

    // Apply feedback to bandit state if provided
    let updatedArms = userProfile.banditState?.arms || {};
    let banditApplied = false;
    if (feedbackEvents && feedbackEvents.length > 0) {
      updatedArms = this.applyFeedbackToBanditArms(updatedArms, feedbackEvents, candidateMeals);
      banditApplied = true;
    }

    // Strict filtering
    const filteredMeals = this.strictFilter(candidateMeals, userProfile, context, counts, rulesApplied);

    // Check if we need fallback
    if (filteredMeals.length < 3) {
      return this.createFallbackResponse(
        context.requestId,
        counts,
        "Too few meals after filtering",
        this.getSafeFallbackSuggestions(userProfile),
        updatedArms,
        banditApplied,
        rulesApplied
      );
    }

    // Score and rank meals
    const scoredMeals: MealRecommendation[] = [];
    for (const meal of filteredMeals) {
      const { portionMultiplier, substitutions } = this.tryFixMacrosAndSodium(meal, userProfile, context);
      
      const goalScore = this.calculateGoalAlignment(meal, userProfile, portionMultiplier, substitutions);
      const macroScore = this.calculateMacroFit(meal, userProfile, context, portionMultiplier);
      const tasteScore = this.calculateTasteMatch(meal, userProfile);
      const diversityScore = this.calculateDiversityBonus(meal, userProfile, context);
      const explorationScore = this.calculateExplorationBonus(meal, updatedArms, context);
      const prepTimeScore = this.calculatePrepTimeBonus(meal);

      const totalScore = 
        this.DEFAULT_WEIGHTS.goalAlignment * goalScore +
        this.DEFAULT_WEIGHTS.macroFit * macroScore +
        this.DEFAULT_WEIGHTS.tasteMatch * tasteScore +
        this.DEFAULT_WEIGHTS.diversityBonus * diversityScore +
        this.DEFAULT_WEIGHTS.explorationBonus * explorationScore +
        this.DEFAULT_WEIGHTS.prepTimeBonus * prepTimeScore;

      const reasons = this.getTopReasons(goalScore, macroScore, tasteScore, diversityScore, explorationScore, prepTimeScore);

      scoredMeals.push({
        mealId: meal.mealId,
        score: Math.round(totalScore * 10000) / 10000,
        reasons,
        adjustments: {
          portionMultiplier,
          substitutions
        }
      });
    }

    // Sort by score and limit results
    const rankedMeals = scoredMeals
      .sort((a, b) => b.score - a.score)
      .slice(0, context.maxResults);

    // Persist updated bandit state if it was modified
    if (banditApplied && userProfile.userId) {
      await this.persistBanditState(userProfile.userId, updatedArms);
    }

    // Save recommendation history for learning
    if (userProfile.userId && rankedMeals.length > 0) {
      await this.saveRecommendationHistory(
        userProfile.userId,
        context,
        rankedMeals
      );
    }

    return {
      version: "1.0",
      requestId: context.requestId,
      filteredOutCounts: counts,
      recommendations: rankedMeals,
      fallback: {
        invoked: false,
        reason: "",
        suggestions: []
      },
      banditUpdates: {
        applied: banditApplied,
        arms: updatedArms
      },
      audit: {
        rulesApplied,
        scoringWeights: this.DEFAULT_WEIGHTS
      }
    };
  }

  /**
   * Strict filtering to ensure safety and dietary compliance
   */
  private strictFilter(
    meals: MealCandidate[],
    userProfile: UserProfile,
    context: RecommendationContext,
    counts: FilteredOutCounts,
    rulesApplied: string[]
  ): MealCandidate[] {
    const seen = new Set<string>();
    const filtered: MealCandidate[] = [];

    for (const meal of meals) {
      // Check for duplicates
      if (seen.has(meal.mealId)) {
        counts.duplicates++;
        continue;
      }
      seen.add(meal.mealId);

      // Check meal slot
      if (!meal.mealSlot.includes(context.mealSlot)) {
        counts.slotMismatch++;
        continue;
      }

      // Check allergies
      if (this.hasAllergyConflict(meal, userProfile)) {
        counts.allergyConflict++;
        rulesApplied.push(`Filtered ${meal.title} - allergy conflict`);
        continue;
      }

      // Check intolerances
      if (this.hasIntoleranceConflict(meal, userProfile)) {
        counts.intoleranceConflict++;
        rulesApplied.push(`Filtered ${meal.title} - intolerance conflict`);
        continue;
      }

      // Check dietary patterns
      if (this.hasDietaryPatternConflict(meal, userProfile)) {
        counts.dietaryPatternConflict++;
        rulesApplied.push(`Filtered ${meal.title} - dietary pattern conflict`);
        continue;
      }

      // Check biomarker rules
      if (this.hasBiomarkerRuleConflict(meal, userProfile)) {
        counts.biomarkerRuleConflict++;
        rulesApplied.push(`Filtered ${meal.title} - biomarker rule conflict`);
        continue;
      }

      // Check macro overflow (allow if within 120%)
      if (this.hasMacroOverflow(meal, context)) {
        counts.macroOverflowConflict++;
        rulesApplied.push(`Filtered ${meal.title} - macro overflow`);
        continue;
      }

      filtered.push(meal);
    }

    return filtered;
  }

  private hasAllergyConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const allergy of userProfile.allergies) {
      if (meal.allergens.includes(allergy)) return true;
      // Also check ingredients for common allergen patterns
      const allergyKeywords = this.getAllergyKeywords(allergy);
      for (const ingredient of meal.ingredients) {
        if (allergyKeywords.some(keyword => ingredient.toLowerCase().includes(keyword))) {
          return true;
        }
      }
    }
    return false;
  }

  private hasIntoleranceConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const intolerance of userProfile.intolerances) {
      const intoleranceKeywords = this.getIntoleranceKeywords(intolerance);
      for (const ingredient of meal.ingredients) {
        if (intoleranceKeywords.some(keyword => ingredient.toLowerCase().includes(keyword))) {
          return true;
        }
      }
    }
    return false;
  }

  private hasDietaryPatternConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const pattern of userProfile.dietaryPattern) {
      switch (pattern) {
        case "vegan":
          if (this.containsAnimalProducts(meal)) return true;
          break;
        case "vegetarian":
          if (this.containsMeat(meal)) return true;
          break;
        case "pescatarian":
          if (this.containsNonFishMeat(meal)) return true;
          break;
        case "keto":
          if (meal.serving.carbsG > 20) return true;
          break;
        case "low_carb":
          if (meal.serving.carbsG > 50) return true;
          break;
        case "gluten_free":
          if (this.containsGluten(meal)) return true;
          break;
        case "dairy_free":
          if (this.containsDairy(meal)) return true;
          break;
        case "halal":
          if (this.isNotHalal(meal)) return true;
          break;
        case "kosher":
          if (this.isNotKosher(meal)) return true;
          break;
      }
    }
    return false;
  }

  private hasBiomarkerRuleConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    const bio = userProfile.biomarkers;
    
    // High blood pressure - limit sodium
    if ((bio.bpSystolic && bio.bpSystolic > 140) || (bio.bpDiastolic && bio.bpDiastolic > 90)) {
      if (meal.serving.sodiumMg && meal.serving.sodiumMg > 600) return true;
    }
    
    // High cholesterol - limit saturated fat
    if (bio.ldlMgDl && bio.ldlMgDl > 160) {
      // Estimate saturated fat as 30% of total fat
      const estimatedSatFat = meal.serving.fatG * 0.3;
      if (estimatedSatFat > 7) return true;
    }
    
    // Diabetes - limit simple carbs
    if (bio.hba1cPct && bio.hba1cPct > 6.5) {
      if (meal.serving.carbsG > 45 && !meal.serving.fiberG) return true;
    }
    
    return false;
  }

  private hasMacroOverflow(meal: MealCandidate, context: RecommendationContext): boolean {
    if (!context.dayPlanMacrosRemaining) return false;
    
    const remaining = context.dayPlanMacrosRemaining;
    
    // Allow up to 120% of remaining macros
    if (remaining.kcal && meal.serving.kcal > remaining.kcal * 1.2) return true;
    if (remaining.proteinG && meal.serving.proteinG > remaining.proteinG * 1.2) return true;
    if (remaining.carbsG && meal.serving.carbsG > remaining.carbsG * 1.2) return true;
    if (remaining.fatG && meal.serving.fatG > remaining.fatG * 1.2) return true;
    if (remaining.sodiumMg && meal.serving.sodiumMg && meal.serving.sodiumMg > remaining.sodiumMg * 1.2) return true;
    
    return false;
  }

  /**
   * Scoring functions
   */
  private calculateGoalAlignment(
    meal: MealCandidate,
    userProfile: UserProfile,
    portionMultiplier: number,
    substitutions: any[]
  ): number {
    let score = 0.5; // Base score
    
    for (const goal of userProfile.goals) {
      switch (goal) {
        case "fat_loss":
          // Prefer high protein, moderate carb, lower calorie meals
          if (meal.serving.proteinG > 30) score += 0.1;
          if (meal.serving.kcal < 500) score += 0.1;
          if (meal.serving.fiberG && meal.serving.fiberG > 5) score += 0.1;
          break;
        case "muscle_gain":
          // Prefer high protein, adequate calories
          if (meal.serving.proteinG > 35) score += 0.15;
          if (meal.serving.kcal > 400) score += 0.1;
          break;
        case "metabolic_health":
          // Prefer balanced macros, high fiber
          if (meal.serving.fiberG && meal.serving.fiberG > 7) score += 0.15;
          if (meal.tags.includes("low_gi")) score += 0.1;
          break;
        case "bp_control":
          // Prefer low sodium
          if (!meal.serving.sodiumMg || meal.serving.sodiumMg < 400) score += 0.2;
          break;
        case "glucose_control":
          // Prefer low carb, high fiber
          if (meal.serving.carbsG < 30) score += 0.1;
          if (meal.serving.fiberG && meal.serving.fiberG > 5) score += 0.1;
          break;
      }
    }
    
    return Math.min(1, score * portionMultiplier);
  }

  private calculateMacroFit(
    meal: MealCandidate,
    userProfile: UserProfile,
    context: RecommendationContext,
    portionMultiplier: number
  ): number {
    if (!userProfile.macroTargets) return 0.5;
    
    const targets = userProfile.macroTargets;
    const serving = {
      proteinG: meal.serving.proteinG * portionMultiplier,
      carbsG: meal.serving.carbsG * portionMultiplier,
      fatG: meal.serving.fatG * portionMultiplier,
      kcal: meal.serving.kcal * portionMultiplier
    };
    
    // Calculate per-meal targets (assuming 3 meals + 1 snack)
    const mealFraction = context.mealSlot === "snack" ? 0.15 : 0.28;
    
    let totalError = 0;
    let components = 0;
    
    if (targets.proteinG) {
      const target = targets.proteinG * mealFraction;
      const error = Math.abs(serving.proteinG - target) / target;
      totalError += error;
      components++;
    }
    
    if (targets.carbsG) {
      const target = targets.carbsG * mealFraction;
      const error = Math.abs(serving.carbsG - target) / target;
      totalError += error;
      components++;
    }
    
    if (targets.fatG) {
      const target = targets.fatG * mealFraction;
      const error = Math.abs(serving.fatG - target) / target;
      totalError += error;
      components++;
    }
    
    if (components === 0) return 0.5;
    
    const avgError = totalError / components;
    return Math.max(0, 1 - avgError);
  }

  private calculateTasteMatch(meal: MealCandidate, userProfile: UserProfile): number {
    if (!userProfile.tastePreferences) return 0.5;
    
    const prefs = userProfile.tastePreferences;
    let score = 0.5;
    
    // Check liked tags
    if (prefs.likedTags) {
      for (const tag of prefs.likedTags) {
        if (meal.tags.includes(tag)) score += 0.1;
      }
    }
    
    // Check disliked tags
    if (prefs.dislikedTags) {
      for (const tag of prefs.dislikedTags) {
        if (meal.tags.includes(tag)) score -= 0.2;
      }
    }
    
    // Check liked ingredients
    if (prefs.likedIngredients) {
      for (const ingredient of prefs.likedIngredients) {
        if (meal.ingredients.some(i => i.toLowerCase().includes(ingredient.toLowerCase()))) {
          score += 0.05;
        }
      }
    }
    
    // Check disliked ingredients
    if (prefs.dislikedIngredients) {
      for (const ingredient of prefs.dislikedIngredients) {
        if (meal.ingredients.some(i => i.toLowerCase().includes(ingredient.toLowerCase()))) {
          score -= 0.15;
        }
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateDiversityBonus(meal: MealCandidate, userProfile: UserProfile, context: RecommendationContext): number {
    // For now, simple diversity based on cuisine
    // In production, would track recent meal history
    return context.diversityStrength * 0.5;
  }

  private calculateExplorationBonus(meal: MealCandidate, arms: Record<string, any>, context: RecommendationContext): number {
    // Thompson Sampling: Sample from Beta distribution for each arm
    // Higher samples indicate more promising options based on past feedback
    
    let totalSample = 0;
    let sampleCount = 0;
    
    // Sample per-meal arm (most specific)
    const mealKey = `meal:${meal.mealId}`;
    if (arms[mealKey]) {
      const arm = arms[mealKey];
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      totalSample += sample * 2; // Weight meal-specific data higher
      sampleCount += 2;
    } else {
      // Initialize new meal with optimistic prior
      const sample = this.sampleBeta(1, 1);
      totalSample += sample * 2;
      sampleCount += 2;
    }
    
    // Sample cuisine arm
    const cuisineKey = `cuisine:${meal.cuisine}`;
    if (arms[cuisineKey]) {
      const arm = arms[cuisineKey];
      const sample = this.sampleBeta(arm.alpha, arm.beta);
      totalSample += sample;
      sampleCount++;
    } else {
      const sample = this.sampleBeta(1, 1);
      totalSample += sample;
      sampleCount++;
    }
    
    // Sample tag arms (top 3 tags)
    for (const tag of meal.tags.slice(0, 3)) {
      const tagKey = `tag:${tag}`;
      if (arms[tagKey]) {
        const arm = arms[tagKey];
        const sample = this.sampleBeta(arm.alpha, arm.beta);
        totalSample += sample * 0.5; // Weight tags lower
        sampleCount += 0.5;
      } else {
        const sample = this.sampleBeta(1, 1);
        totalSample += sample * 0.5;
        sampleCount += 0.5;
      }
    }
    
    // Return weighted average of samples
    // This becomes the primary driver of exploration/exploitation
    const avgSample = sampleCount > 0 ? totalSample / sampleCount : 0.5;
    
    // Apply exploration strength to control the influence of Thompson Sampling
    return avgSample * context.explorationStrength;
  }

  private calculatePrepTimeBonus(meal: MealCandidate): number {
    // Prefer quicker meals
    if (meal.prepTimeMin <= 15) return 1.0;
    if (meal.prepTimeMin <= 30) return 0.7;
    if (meal.prepTimeMin <= 45) return 0.5;
    return 0.3;
  }

  /**
   * Bandit learning functions
   */
  private applyFeedbackToBanditArms(
    arms: Record<string, { alpha: number; beta: number }>,
    feedbackEvents: FeedbackEvent[],
    meals: MealCandidate[]
  ): Record<string, { alpha: number; beta: number }> {
    const updatedArms = { ...arms };
    
    for (const event of feedbackEvents) {
      const meal = meals.find(m => m.mealId === event.mealId);
      if (!meal) continue;
      
      // Update per-meal arm (most specific and important)
      const mealKey = `meal:${event.mealId}`;
      if (!updatedArms[mealKey]) {
        updatedArms[mealKey] = { alpha: 1, beta: 1 };
      }
      
      // Update meal arm based on signal
      switch (event.signal) {
        case "like":
        case "completed":
          updatedArms[mealKey].alpha += event.strength;
          break;
        case "dislike":
          updatedArms[mealKey].beta += event.strength;
          break;
        case "saved":
          updatedArms[mealKey].alpha += 0.7 * event.strength;
          break;
      }
      
      // Update cuisine arm
      const cuisineKey = `cuisine:${meal.cuisine}`;
      if (!updatedArms[cuisineKey]) {
        updatedArms[cuisineKey] = { alpha: 1, beta: 1 };
      }
      
      // Update cuisine based on signal (less weight than meal-specific)
      switch (event.signal) {
        case "like":
        case "completed":
          updatedArms[cuisineKey].alpha += event.strength * 0.5;
          break;
        case "dislike":
          updatedArms[cuisineKey].beta += event.strength * 0.5;
          break;
        case "saved":
          updatedArms[cuisineKey].alpha += 0.3 * event.strength;
          break;
      }
      
      // Update tag arms
      for (const tag of meal.tags.slice(0, 3)) {
        const tagKey = `tag:${tag}`;
        if (!updatedArms[tagKey]) {
          updatedArms[tagKey] = { alpha: 1, beta: 1 };
        }
        
        switch (event.signal) {
          case "like":
          case "completed":
            updatedArms[tagKey].alpha += event.strength * 0.3;
            break;
          case "dislike":
            updatedArms[tagKey].beta += event.strength * 0.3;
            break;
          case "saved":
            updatedArms[tagKey].alpha += 0.2 * event.strength;
            break;
        }
      }
    }
    
    return updatedArms;
  }

  private sampleBeta(alpha: number, beta: number): number {
    // Proper Thompson Sampling using Beta distribution
    // Using Marsaglia's method for sampling from Beta distribution
    
    // First sample from two Gamma distributions
    const gammaAlpha = this.sampleGamma(alpha);
    const gammaBeta = this.sampleGamma(beta);
    
    // Beta(α, β) = Gamma(α, 1) / (Gamma(α, 1) + Gamma(β, 1))
    return gammaAlpha / (gammaAlpha + gammaBeta);
  }
  
  private sampleGamma(shape: number): number {
    // Marsaglia and Tsang's method for Gamma sampling
    // For shape >= 1
    if (shape < 1) {
      // For shape < 1, use Gamma(shape + 1) and transform
      const sample = this.sampleGamma(shape + 1);
      return sample * Math.pow(Math.random(), 1 / shape);
    }
    
    const d = shape - 1/3;
    const c = 1 / Math.sqrt(9 * d);
    
    while (true) {
      let x, v;
      do {
        x = this.sampleNormal(0, 1);
        v = 1 + c * x;
      } while (v <= 0);
      
      v = v * v * v;
      const u = Math.random();
      
      if (u < 1 - 0.0331 * x * x * x * x) {
        return d * v;
      }
      
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }
  
  private sampleNormal(mean: number, variance: number): number {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + Math.sqrt(variance) * z0;
  }

  /**
   * Helper functions
   */
  private tryFixMacrosAndSodium(
    meal: MealCandidate,
    userProfile: UserProfile,
    context: RecommendationContext
  ): { portionMultiplier: number; substitutions: any[] } {
    let portionMultiplier = 1.0;
    const substitutions: any[] = [];
    
    // Check if we need to scale portions
    if (context.dayPlanMacrosRemaining) {
      const remaining = context.dayPlanMacrosRemaining;
      
      // Calculate needed scaling
      const scalingFactors: number[] = [];
      
      if (remaining.kcal && meal.serving.kcal > remaining.kcal) {
        scalingFactors.push(remaining.kcal / meal.serving.kcal);
      }
      if (remaining.proteinG && meal.serving.proteinG > remaining.proteinG) {
        scalingFactors.push(remaining.proteinG / meal.serving.proteinG);
      }
      if (remaining.carbsG && meal.serving.carbsG > remaining.carbsG) {
        scalingFactors.push(remaining.carbsG / meal.serving.carbsG);
      }
      if (remaining.fatG && meal.serving.fatG > remaining.fatG) {
        scalingFactors.push(remaining.fatG / meal.serving.fatG);
      }
      
      if (scalingFactors.length > 0) {
        const minScaling = Math.min(...scalingFactors);
        if (minScaling < 1.0 && minScaling >= 0.6) {
          portionMultiplier = minScaling;
        }
      }
    }
    
    // Check for ingredient substitutions if allowed
    if (context.allowSubstitutions) {
      // Example: Replace high-sodium ingredients
      if (meal.serving.sodiumMg && meal.serving.sodiumMg > 800) {
        if (meal.ingredients.some(i => i.toLowerCase().includes("salt"))) {
          substitutions.push({
            from: "salt",
            to: "herbs and spices",
            reason: "Reduce sodium content"
          });
        }
      }
    }
    
    return { portionMultiplier, substitutions };
  }

  private getTopReasons(
    goalScore: number,
    macroScore: number,
    tasteScore: number,
    diversityScore: number,
    explorationScore: number,
    prepTimeScore: number
  ): string[] {
    const scores = [
      { name: "Aligns with health goals", score: goalScore },
      { name: "Matches macro targets", score: macroScore },
      { name: "Fits taste preferences", score: tasteScore },
      { name: "Adds meal variety", score: diversityScore },
      { name: "Recommended for you", score: explorationScore },
      { name: "Quick to prepare", score: prepTimeScore }
    ];
    
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(s => s.name);
  }

  private createFallbackResponse(
    requestId: string,
    counts: FilteredOutCounts,
    reason: string,
    suggestions: string[],
    arms: Record<string, any>,
    banditApplied: boolean,
    rulesApplied: string[]
  ): RecommendationResponse {
    return {
      version: "1.0",
      requestId,
      filteredOutCounts: counts,
      recommendations: [],
      fallback: {
        invoked: true,
        reason,
        suggestions
      },
      banditUpdates: {
        applied: banditApplied,
        arms
      },
      audit: {
        rulesApplied,
        scoringWeights: this.DEFAULT_WEIGHTS
      }
    };
  }

  private getSafeFallbackSuggestions(userProfile: UserProfile): string[] {
    const suggestions: string[] = [];
    
    // Suggest basic, safe meals based on dietary patterns
    if (userProfile.dietaryPattern.includes("vegan")) {
      suggestions.push("Quinoa Buddha Bowl with Roasted Vegetables");
      suggestions.push("Chickpea and Spinach Curry");
      suggestions.push("Overnight Oats with Berries");
    } else if (userProfile.dietaryPattern.includes("vegetarian")) {
      suggestions.push("Greek Salad with Feta");
      suggestions.push("Vegetable Stir-fry with Tofu");
      suggestions.push("Egg and Avocado Toast");
    } else {
      suggestions.push("Grilled Chicken with Steamed Vegetables");
      suggestions.push("Salmon with Quinoa and Asparagus");
      suggestions.push("Turkey and Vegetable Wrap");
    }
    
    return suggestions.slice(0, 3);
  }

  // Dietary checking helpers
  private getAllergyKeywords(allergy: string): string[] {
    const keywords: Record<string, string[]> = {
      peanut: ["peanut", "groundnut", "arachis"],
      tree_nut: ["almond", "cashew", "walnut", "pecan", "pistachio", "hazelnut", "macadamia"],
      shellfish: ["shrimp", "lobster", "crab", "prawn", "crayfish", "scallop", "oyster"],
      egg: ["egg", "albumin", "mayonnaise"],
      dairy: ["milk", "cheese", "butter", "cream", "yogurt", "whey", "casein", "lactose"],
      sesame: ["sesame", "tahini", "hummus"],
      soy: ["soy", "soya", "tofu", "tempeh", "edamame", "miso"],
      gluten: ["wheat", "barley", "rye", "spelt", "kamut", "flour", "bread", "pasta"],
      fish: ["salmon", "tuna", "cod", "halibut", "tilapia", "bass", "trout", "sardine"]
    };
    return keywords[allergy] || [allergy];
  }

  private getIntoleranceKeywords(intolerance: string): string[] {
    const keywords: Record<string, string[]> = {
      lactose: ["milk", "cream", "cheese", "yogurt", "butter", "ice cream"],
      fructose: ["honey", "agave", "high fructose corn syrup", "apple", "pear", "mango"],
      histamine: ["aged cheese", "wine", "beer", "fermented", "smoked", "cured"],
      fodmap: ["garlic", "onion", "beans", "lentils", "wheat", "apple", "milk"]
    };
    return keywords[intolerance] || [intolerance];
  }

  private containsAnimalProducts(meal: MealCandidate): boolean {
    const animalKeywords = [
      "meat", "chicken", "beef", "pork", "lamb", "turkey", "duck", "goose", "veal", 
      "fish", "salmon", "tuna", "shrimp", "lobster", "crab", "oyster",
      "egg", "milk", "cheese", "butter", "cream", "yogurt", "whey", "casein",
      "honey", "gelatin", "lard", "tallow", "anchovy", "prawn", "squid"
    ];
    return meal.ingredients.some(ing => 
      animalKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private containsMeat(meal: MealCandidate): boolean {
    const meatKeywords = [
      "meat", "chicken", "beef", "pork", "lamb", "turkey", "duck", "goose", "veal",
      "bacon", "ham", "sausage", "salami", "pepperoni", "prosciutto",
      "fish", "salmon", "tuna", "tilapia", "cod", "bass", "trout", "halibut",
      "shrimp", "prawn", "lobster", "crab", "scallop", "oyster", "mussel"
    ];
    return meal.ingredients.some(ing => 
      meatKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private containsNonFishMeat(meal: MealCandidate): boolean {
    const nonFishMeatKeywords = [
      "meat", "chicken", "beef", "pork", "lamb", "turkey", "duck", "goose", "veal",
      "bacon", "ham", "sausage", "salami", "pepperoni", "prosciutto", "rabbit"
    ];
    return meal.ingredients.some(ing => 
      nonFishMeatKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private containsGluten(meal: MealCandidate): boolean {
    const glutenKeywords = [
      "wheat", "flour", "bread", "pasta", "barley", "rye", "spelt",
      "couscous", "bulgur", "kamut", "triticale", "farro", "semolina",
      "malt", "cracker", "cereal", "cookie", "cake", "pastry", "bagel"
    ];
    return meal.ingredients.some(ing => 
      glutenKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private containsDairy(meal: MealCandidate): boolean {
    const dairyKeywords = [
      "milk", "cheese", "butter", "cream", "yogurt", "whey", "casein", "ghee",
      "ice cream", "sour cream", "cottage cheese", "ricotta", "mozzarella", 
      "cheddar", "feta", "gouda", "brie", "mascarpone", "buttermilk", "kefir"
    ];
    return meal.ingredients.some(ing => 
      dairyKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private isNotHalal(meal: MealCandidate): boolean {
    const haramKeywords = [
      "pork", "bacon", "ham", "prosciutto", "pancetta", "chorizo", 
      "alcohol", "wine", "beer", "liquor", "vodka", "whiskey", "rum",
      "gelatin", "lard", "pepperoni"
    ];
    return meal.ingredients.some(ing => 
      haramKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    );
  }

  private isNotKosher(meal: MealCandidate): boolean {
    const nonKosherKeywords = [
      "pork", "bacon", "ham", "prosciutto", "pancetta",
      "shellfish", "shrimp", "lobster", "crab", "oyster", "mussel", "clam",
      "squid", "octopus", "calamari", "scallop", "eel", "catfish"
    ];
    // Check for dairy + meat combinations (fish + dairy is kosher)
    const hasDairy = this.containsDairy(meal);
    const hasNonFishMeat = this.containsNonFishMeat(meal);
    
    return meal.ingredients.some(ing => 
      nonKosherKeywords.some(keyword => ing.toLowerCase().includes(keyword))
    ) || (hasDairy && hasNonFishMeat);
  }

  /**
   * Persistence methods for bandit state and recommendation history
   */
  private async persistBanditState(
    userId: string,
    arms: Record<string, { alpha: number; beta: number }>
  ): Promise<void> {
    try {
      // Save each arm to the database
      for (const [armKey, params] of Object.entries(arms)) {
        await this.storage.updateUserBanditState(userId, armKey, params.alpha, params.beta);
      }
    } catch (error) {
      console.error('Failed to persist bandit state:', error);
      // Non-critical error, don't throw
    }
  }

  private async saveRecommendationHistory(
    userId: string,
    context: RecommendationContext,
    recommendations: MealRecommendation[]
  ): Promise<void> {
    try {
      await this.storage.saveMealRecommendationHistory({
        userId,
        mealSlot: context.mealSlot,
        recommendationDate: new Date(),
        recommendationContext: {
          requestId: context.requestId,
          maxResults: context.maxResults,
          dayPlanMacrosRemaining: context.dayPlanMacrosRemaining
        },
        recommendedMeals: recommendations.map(r => ({
          mealId: r.mealId,
          score: r.score,
          reasons: r.reasons,
          adjustments: r.adjustments
        })),
        filteringStats: {} // Could add filtering stats if needed
      });
    } catch (error) {
      console.error('Failed to save recommendation history:', error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Load bandit state from storage
   */
  async loadBanditState(userId: string): Promise<Record<string, { alpha: number; beta: number }>> {
    try {
      const states = await this.storage.getUserBanditState(userId);
      const arms: Record<string, { alpha: number; beta: number }> = {};
      
      for (const state of states) {
        arms[state.armKey] = {
          alpha: state.alpha,
          beta: state.beta
        };
      }
      
      return arms;
    } catch (error) {
      console.error('Failed to load bandit state:', error);
      return {}; // Return empty state on error
    }
  }
}

// Create a singleton instance with storage
import { getStorage } from "../storage";
export const mealRecommenderService = new MealRecommenderService(getStorage());