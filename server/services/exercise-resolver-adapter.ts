/**
 * HealthPilot Exercise Resolver Adapter
 * 
 * Bridges HealthPilot's exercise database schema with the exercise-resolver's KnownMap format.
 * Provides utilities to load exercises from the database and resolve AI-generated exercise names.
 */

import type { IStorage } from "../storage";
import { resolveExerciseName, rememberAlias, fsAliasStore, attachAliasStore, type KnownMap, type ResolveOutcome, type ResolverOptions } from "./exercise-resolver";
import type { Exercise } from "@shared/schema";
import path from "path";

// Initialize file-based alias storage for Node.js (persists learned aliases)
const ALIAS_CACHE_PATH = path.join(process.cwd(), "exercise_alias_cache.json");
attachAliasStore(fsAliasStore(ALIAS_CACHE_PATH));

/**
 * Convert HealthPilot exercises to KnownMap format for the resolver
 */
export function buildKnownMap(exercises: Exercise[]): KnownMap {
  const known: KnownMap = {};
  
  for (const ex of exercises) {
    // Build tags from equipment, category, muscles, and body part for better matching
    const tags: string[] = [];
    
    if (ex.equipment) tags.push(ex.equipment);
    if (ex.category) tags.push(ex.category);
    if (ex.muscles && ex.muscles.length > 0) tags.push(...ex.muscles);
    if (ex.bodyPart) tags.push(ex.bodyPart);
    if (ex.target) tags.push(ex.target);
    
    known[ex.id] = {
      id: ex.id,
      name: ex.name,
      tags: tags.filter((t, i, arr) => arr.indexOf(t) === i) // dedupe
    };
  }
  
  return known;
}

/**
 * Resolve an AI-generated exercise name to a canonical exercise from the database
 * 
 * @param aiExerciseName - The noisy/AI-generated exercise name (e.g., "lat pull down", "bb back squat")
 * @param storage - Database storage instance
 * @param opts - Resolver options (minAuto, deltaGuard, topK)
 * @returns Resolution outcome: resolved, needs_confirmation, or unknown
 */
export async function resolveAIExercise(
  aiExerciseName: string,
  storage: IStorage,
  opts?: ResolverOptions
): Promise<ResolveOutcome & { exercise?: Exercise }> {
  // Load all exercises from database
  const exercises = await storage.getAllExercises();
  const knownMap = buildKnownMap(exercises);
  
  // Resolve using the exercise resolver
  const outcome = resolveExerciseName(aiExerciseName, knownMap, opts);
  
  // If resolved, attach the full exercise object
  if (outcome.kind === "resolved") {
    const exercise = exercises.find(e => e.id === outcome.canonical_id);
    return { ...outcome, exercise };
  }
  
  return outcome;
}

/**
 * Bulk resolve multiple AI-generated exercise names
 * 
 * @param aiExerciseNames - Array of AI-generated exercise names
 * @param storage - Database storage instance
 * @param opts - Resolver options
 * @returns Array of resolution outcomes with exercise objects
 */
export async function resolveAIExercises(
  aiExerciseNames: string[],
  storage: IStorage,
  opts?: ResolverOptions
): Promise<Array<ResolveOutcome & { exercise?: Exercise; originalName: string }>> {
  // Load all exercises once for efficiency
  const exercises = await storage.getAllExercises();
  const knownMap = buildKnownMap(exercises);
  
  const results: Array<ResolveOutcome & { exercise?: Exercise; originalName: string }> = [];
  
  for (const aiName of aiExerciseNames) {
    const outcome = resolveExerciseName(aiName, knownMap, opts);
    
    if (outcome.kind === "resolved") {
      const exercise = exercises.find(e => e.id === outcome.canonical_id);
      results.push({ ...outcome, exercise, originalName: aiName });
    } else {
      results.push({ ...outcome, originalName: aiName });
    }
  }
  
  return results;
}

/**
 * Teach the resolver a new alias (user or system-corrected mapping)
 * 
 * @param rawName - The AI-generated or user-provided name
 * @param exerciseId - The canonical exercise ID to map to
 */
export function teachAlias(rawName: string, exerciseId: string): void {
  rememberAlias(rawName, exerciseId);
}

/**
 * Resolution summary for logging/debugging
 */
export interface ResolutionSummary {
  total: number;
  resolved: number;
  needsConfirmation: number;
  unknown: number;
  resolutions: Array<{
    original: string;
    status: "resolved" | "needs_confirmation" | "unknown";
    canonical?: string;
    score?: number;
  }>;
}

/**
 * Generate a summary of bulk resolution results
 */
export function summarizeResolutions(
  results: Array<ResolveOutcome & { originalName: string }>
): ResolutionSummary {
  const summary: ResolutionSummary = {
    total: results.length,
    resolved: 0,
    needsConfirmation: 0,
    unknown: 0,
    resolutions: []
  };
  
  for (const result of results) {
    if (result.kind === "resolved") {
      summary.resolved++;
      summary.resolutions.push({
        original: result.originalName,
        status: "resolved",
        canonical: result.canonical_id,
        score: result.score
      });
    } else if (result.kind === "needs_confirmation") {
      summary.needsConfirmation++;
      summary.resolutions.push({
        original: result.originalName,
        status: "needs_confirmation"
      });
    } else {
      summary.unknown++;
      summary.resolutions.push({
        original: result.originalName,
        status: "unknown"
      });
    }
  }
  
  return summary;
}
