/**
 * Template-Exercise Bridge
 * 
 * Maps template_ids from the pattern-based system to exercise_ids
 * in the existing exercises table for compatibility with exercise_sets tracking
 */

import type { IStorage } from "../storage";
import { getMusclesForPattern } from "./rules";
import type { Pattern, Modality } from "./structured-workouts-kit";

export interface TemplateData {
  id: string; // template_id
  pattern: Pattern;
  modality: Modality;
  displayName: string;
  muscles: string[];
}

/**
 * Get or create an exercise in the exercises table for a given template
 * This allows the pattern-based system to work with the existing exercise_sets tracking
 * 
 * @param storage - Database storage interface
 * @param template - Template data from exercise_templates table
 * @returns Exercise ID that can be used with exercise_sets
 */
export async function getOrCreateExerciseForTemplate(
  storage: IStorage,
  template: TemplateData
): Promise<string> {
  // Try to find existing exercise by name
  const existingExercise = await storage.getExerciseByName(template.displayName);
  
  if (existingExercise) {
    return existingExercise.id;
  }

  // Create new exercise based on template
  const exerciseData = {
    name: template.displayName,
    muscles: template.muscles,
    equipment: mapModalityToEquipment(template.modality),
    category: getCategoryFromPattern(template.pattern),
    difficulty: "intermediate", // default
    trackingType: "weight_reps" // default for strength training
  };

  const newExercise = await storage.createExercise(exerciseData);
  
  console.log(`✅ Created exercise "${template.displayName}" (${newExercise.id}) from template ${template.id}`);
  
  return newExercise.id;
}

/**
 * Map modality to equipment string for exercises table
 */
function mapModalityToEquipment(modality: Modality): string {
  const mapping: Record<Modality, string> = {
    barbell: "barbell",
    dumbbell: "dumbbell",
    machine: "machine",
    cable: "cable",
    bodyweight: "bodyweight",
    kettlebell: "kettlebell",
    smith: "machine", // Smith machine is a type of machine
    landmine: "barbell", // Landmine uses barbell
    band: "band",
    plate: "other"
  };
  
  return mapping[modality] || "other";
}

/**
 * Determine exercise category from pattern
 */
function getCategoryFromPattern(pattern: Pattern): string {
  const compounds: Pattern[] = [
    "knee_dominant",
    "hip_hinge",
    "horizontal_press",
    "horizontal_pull",
    "vertical_press",
    "vertical_pull",
    "lunge_split"
  ];
  
  if (compounds.includes(pattern)) {
    return "compound";
  }
  
  return "isolation";
}

/**
 * Batch process multiple templates to exercises
 */
export async function batchGetOrCreateExercises(
  storage: IStorage,
  templates: TemplateData[]
): Promise<Map<string, string>> {
  const templateIdToExerciseId = new Map<string, string>();
  
  for (const template of templates) {
    const exerciseId = await getOrCreateExerciseForTemplate(storage, template);
    templateIdToExerciseId.set(template.id, exerciseId);
  }
  
  return templateIdToExerciseId;
}
