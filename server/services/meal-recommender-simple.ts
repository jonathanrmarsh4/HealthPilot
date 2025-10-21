/**
 * HealthPilot Simplified Meal Recommender v1.0
 * Streamlined for faster shipping - focuses on safety-critical filtering
 * Removes: Thompson Sampling, complex scoring, macro adjustments, substitutions
 */

import { db } from "../db";
import { mealLibrary, mealFeedback } from "@shared/schema";
import { and, eq, inArray, not, sql, desc } from "drizzle-orm";
import type { IStorage } from "../storage";

// Simplified types
interface UserProfile {
  userId: string;
  dietaryPattern: string[];  // vegan, vegetarian, pescatarian, etc.
  allergies: string[];       // Safety-critical
  intolerances: string[];    // Safety-critical
}

interface MealCandidate {
  mealId: string;
  title: string;
  mealSlot: string[];        // breakfast, lunch, dinner, snack
  serving: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  };
  cuisine: string;
  ingredients: string[];
  allergens: string[];
  prepTimeMin: number;
  imageUrl?: string;
}

interface RecommendationContext {
  requestId: string;
  mealSlot: "breakfast" | "lunch" | "dinner" | "snack";
  maxResults: number;
}

interface SimpleRecommendation {
  mealId: string;
  title: string;
  reason: string;
}

interface SimplifiedResponse {
  version: string;
  requestId: string;
  recommendations: SimpleRecommendation[];
  filteredOutCounts: {
    allergyConflict: number;
    intoleranceConflict: number;
    dietaryPatternConflict: number;
    slotMismatch: number;
    duplicates: number;
  };
}

export class SimplifiedMealRecommenderService {
  constructor(private storage: IStorage) {}

  /**
   * Main simplified recommendation function
   * Returns random selection from safely filtered meals
   */
  async recommendMeals(
    userProfile: UserProfile,
    context: RecommendationContext,
    candidateMeals: MealCandidate[]
  ): Promise<SimplifiedResponse> {
    const counts = {
      allergyConflict: 0,
      intoleranceConflict: 0,
      dietaryPatternConflict: 0,
      slotMismatch: 0,
      duplicates: 0,
    };

    // Get user's disliked meals to filter out
    const dislikedMeals = await this.getDislikedMeals(userProfile.userId);

    // Apply safety filters
    const safeMeals = this.applySafetyFilters(
      candidateMeals,
      userProfile,
      context,
      dislikedMeals,
      counts
    );

    // Shuffle and take requested amount
    const shuffled = this.shuffleArray(safeMeals);
    const selected = shuffled.slice(0, context.maxResults);

    // Convert to recommendations with simple reasons
    const recommendations: SimpleRecommendation[] = selected.map(meal => ({
      mealId: meal.mealId,
      title: meal.title,
      reason: this.getSimpleReason(meal, userProfile)
    }));

    return {
      version: "simplified-v1.0",
      requestId: context.requestId,
      recommendations,
      filteredOutCounts: counts,
    };
  }

  /**
   * Get list of permanently disliked meals for user
   */
  private async getDislikedMeals(userId: string): Promise<Set<string>> {
    try {
      const dislikes = await db
        .select({ mealLibraryId: mealFeedback.mealLibraryId })
        .from(mealFeedback)
        .where(
          and(
            eq(mealFeedback.userId, userId),
            eq(mealFeedback.feedback, "dislike")
          )
        );

      return new Set(
        dislikes
          .map(d => d.mealLibraryId)
          .filter((id): id is string => id !== null)
      );
    } catch (error) {
      console.error("Error fetching disliked meals:", error);
      return new Set();
    }
  }

  /**
   * Apply safety-critical filters only
   */
  private applySafetyFilters(
    meals: MealCandidate[],
    userProfile: UserProfile,
    context: RecommendationContext,
    dislikedMeals: Set<string>,
    counts: SimplifiedResponse['filteredOutCounts']
  ): MealCandidate[] {
    const seen = new Set<string>();
    const filtered: MealCandidate[] = [];

    for (const meal of meals) {
      // Remove duplicates
      if (seen.has(meal.mealId)) {
        counts.duplicates++;
        continue;
      }
      seen.add(meal.mealId);

      // Skip disliked meals
      if (dislikedMeals.has(meal.mealId)) {
        continue;
      }

      // Check meal slot (case-insensitive)
      const normalizedMealSlots = meal.mealSlot.map(slot => slot.toLowerCase());
      const normalizedContextSlot = context.mealSlot.toLowerCase();
      if (!normalizedMealSlots.includes(normalizedContextSlot)) {
        counts.slotMismatch++;
        continue;
      }

      // SAFETY: Check allergies
      if (this.hasAllergyConflict(meal, userProfile)) {
        counts.allergyConflict++;
        continue;
      }

      // SAFETY: Check intolerances
      if (this.hasIntoleranceConflict(meal, userProfile)) {
        counts.intoleranceConflict++;
        continue;
      }

      // Check dietary patterns
      if (this.hasDietaryPatternConflict(meal, userProfile)) {
        counts.dietaryPatternConflict++;
        continue;
      }

      filtered.push(meal);
    }

    return filtered;
  }

  /**
   * Check if meal conflicts with user allergies
   */
  private hasAllergyConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const allergy of userProfile.allergies) {
      // Check allergens field
      if (meal.allergens.includes(allergy)) {
        return true;
      }

      // Check ingredients for allergen keywords
      const allergyKeywords = this.getAllergyKeywords(allergy);
      for (const ingredient of meal.ingredients) {
        const ingredientLower = ingredient.toLowerCase();
        if (allergyKeywords.some(keyword => ingredientLower.includes(keyword))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if meal conflicts with user intolerances
   */
  private hasIntoleranceConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const intolerance of userProfile.intolerances) {
      const intoleranceKeywords = this.getIntoleranceKeywords(intolerance);
      for (const ingredient of meal.ingredients) {
        const ingredientLower = ingredient.toLowerCase();
        if (intoleranceKeywords.some(keyword => ingredientLower.includes(keyword))) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if meal conflicts with dietary pattern (vegan, vegetarian, etc.)
   */
  private hasDietaryPatternConflict(meal: MealCandidate, userProfile: UserProfile): boolean {
    for (const pattern of userProfile.dietaryPattern) {
      const patternLower = pattern.toLowerCase();

      if (patternLower === "vegan") {
        const animalProducts = ["meat", "dairy", "egg", "fish", "seafood", "chicken", "beef", "pork", "milk", "cheese", "butter", "yogurt", "honey"];
        for (const ingredient of meal.ingredients) {
          const ingredientLower = ingredient.toLowerCase();
          if (animalProducts.some(ap => ingredientLower.includes(ap))) {
            return true;
          }
        }
      }

      if (patternLower === "vegetarian") {
        const meatProducts = ["meat", "fish", "seafood", "chicken", "beef", "pork", "bacon", "sausage", "lamb"];
        for (const ingredient of meal.ingredients) {
          const ingredientLower = ingredient.toLowerCase();
          if (meatProducts.some(mp => ingredientLower.includes(mp))) {
            return true;
          }
        }
      }

      if (patternLower === "pescatarian") {
        const nonFishMeat = ["chicken", "beef", "pork", "bacon", "sausage", "lamb", "turkey"];
        for (const ingredient of meal.ingredients) {
          const ingredientLower = ingredient.toLowerCase();
          if (nonFishMeat.some(nfm => ingredientLower.includes(nfm))) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Get allergen keywords for ingredient matching
   */
  private getAllergyKeywords(allergy: string): string[] {
    const allergyLower = allergy.toLowerCase();
    const keywords: Record<string, string[]> = {
      "dairy": ["milk", "cheese", "butter", "cream", "yogurt", "lactose", "whey", "casein"],
      "eggs": ["egg", "eggs", "mayonnaise"],
      "fish": ["fish", "salmon", "tuna", "cod", "halibut", "trout"],
      "shellfish": ["shrimp", "crab", "lobster", "clam", "oyster", "mussel", "scallop"],
      "tree nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia"],
      "peanuts": ["peanut", "peanuts"],
      "wheat": ["wheat", "flour", "bread", "pasta"],
      "soy": ["soy", "tofu", "tempeh", "soy sauce", "edamame"],
      "gluten": ["wheat", "barley", "rye", "gluten"],
    };

    return keywords[allergyLower] || [allergyLower];
  }

  /**
   * Get intolerance keywords for ingredient matching
   */
  private getIntoleranceKeywords(intolerance: string): string[] {
    const intoleranceLower = intolerance.toLowerCase();
    const keywords: Record<string, string[]> = {
      "lactose": ["milk", "cheese", "butter", "cream", "yogurt", "lactose"],
      "gluten": ["wheat", "barley", "rye", "gluten", "bread", "pasta"],
      "fructose": ["fructose", "honey", "agave", "high fructose"],
    };

    return keywords[intoleranceLower] || [intoleranceLower];
  }

  /**
   * Generate simple reason for meal recommendation
   */
  private getSimpleReason(meal: MealCandidate, userProfile: UserProfile): string {
    const reasons = [];

    // Mention cuisine
    if (meal.cuisine) {
      reasons.push(`${meal.cuisine} cuisine`);
    }

    // Mention quick prep if under 30 min
    if (meal.prepTimeMin <= 30) {
      reasons.push("quick to prepare");
    }

    // Mention dietary alignment
    if (userProfile.dietaryPattern.length > 0) {
      reasons.push(`fits your ${userProfile.dietaryPattern.join(", ")} diet`);
    }

    if (reasons.length === 0) {
      return "Matches your preferences";
    }

    return reasons.slice(0, 2).join(", ");
  }

  /**
   * Shuffle array using Fisher-Yates algorithm
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Record simple like/dislike feedback
   */
  async recordFeedback(
    userId: string,
    mealLibraryId: string,
    feedback: "like" | "dislike"
  ): Promise<void> {
    try {
      await db.insert(mealFeedback).values({
        userId,
        mealLibraryId,
        feedback,
        feedbackType: "permanent", // All feedback is permanent in simplified version
        swipeDirection: feedback === "like" ? "right" : "left",
        userWasPremium: 0, // Can be updated based on actual user tier
      });
    } catch (error) {
      console.error("Error recording meal feedback:", error);
      throw error;
    }
  }

  /**
   * Get like/dislike counts for a meal
   */
  async getMealFeedbackCounts(mealLibraryId: string): Promise<{
    likes: number;
    dislikes: number;
  }> {
    try {
      const [likesResult, dislikesResult] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(mealFeedback)
          .where(
            and(
              eq(mealFeedback.mealLibraryId, mealLibraryId),
              eq(mealFeedback.feedback, "like")
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(mealFeedback)
          .where(
            and(
              eq(mealFeedback.mealLibraryId, mealLibraryId),
              eq(mealFeedback.feedback, "dislike")
            )
          ),
      ]);

      return {
        likes: Number(likesResult[0]?.count || 0),
        dislikes: Number(dislikesResult[0]?.count || 0),
      };
    } catch (error) {
      console.error("Error getting meal feedback counts:", error);
      return { likes: 0, dislikes: 0 };
    }
  }
}
