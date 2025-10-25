/**
 * seedExerciseTemplates.ts
 * 
 * Seeds the exercise_templates table with all templates referenced in RULES.
 * This ensures the validation system passes and workouts can be generated.
 * 
 * Safe to run multiple times - uses ON CONFLICT DO NOTHING.
 */

import { db } from "../db";
import { exerciseTemplates } from "../../shared/schema";
import { sql } from "drizzle-orm";
import { RULES, getMusclesForPattern } from "../services/rules";

interface TemplateRow {
  id: string;
  pattern: string;
  modality: string;
  angle: string;
  display_name: string;
}

/**
 * Generate all template rows from RULES
 */
function generateTemplateRows(): TemplateRow[] {
  const templates: TemplateRow[] = [];

  for (const [pattern, modalityMap] of Object.entries(RULES)) {
    for (const [modality, templateId] of Object.entries(modalityMap)) {
      // Generate display name from template ID
      // e.g., "tpl_bb_flat_bench" → "Barbell Bench Press"
      const displayName = generateDisplayName(templateId, pattern, modality);
      
      templates.push({
        id: templateId,
        pattern,
        modality,
        angle: inferAngle(templateId),
        display_name: displayName
      });
    }
  }

  return templates;
}

/**
 * Generate a human-readable display name from template ID
 */
function generateDisplayName(templateId: string, pattern: string, modality: string): string {
  // Remove 'tpl_' prefix
  let name = templateId.replace(/^tpl_/, '');
  
  // Common abbreviations
  const replacements: Record<string, string> = {
    'bb': 'Barbell',
    'db': 'Dumbbell',
    'kb': 'Kettlebell',
    'bw': 'Bodyweight',
    'ohp': 'Overhead Press',
    'rdl': 'Romanian Deadlift',
    'ab': 'Ab',
  };

  // Replace abbreviations
  for (const [abbr, full] of Object.entries(replacements)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'gi');
    name = name.replace(regex, full);
  }

  // Convert underscores to spaces and capitalize
  name = name
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return name;
}

/**
 * Infer angle from template ID
 */
function inferAngle(templateId: string): string {
  if (templateId.includes('incline')) return 'incline';
  if (templateId.includes('decline')) return 'decline';
  if (templateId.includes('flat')) return 'flat';
  return 'neutral';
}

/**
 * Main seeding function
 */
export async function seedExerciseTemplates(): Promise<void> {
  console.log("🌱 Seeding exercise templates...");

  const templates = generateTemplateRows();
  
  console.log(`   Found ${templates.length} templates to seed`);

  try {
    // Insert all templates using ON CONFLICT DO NOTHING
    // This makes it safe to run multiple times
    for (const template of templates) {
      await db
        .insert(exerciseTemplates)
        .values({
          id: template.id,
          pattern: template.pattern as any,
          modality: template.modality as any,
          angle: template.angle as any,
          unilateral: false,
          assisted: template.id.includes('assisted'),
          displayName: template.display_name,
          mediaUrl: null,
          coachingCues: []
        })
        .onConflictDoNothing();
    }

    console.log(`✅ Exercise templates seeded successfully`);
  } catch (error) {
    console.error("❌ Failed to seed exercise templates:", error);
    throw error;
  }
}

/**
 * Run if called directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  seedExerciseTemplates()
    .then(() => {
      console.log("✅ Seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seeding failed:", error);
      process.exit(1);
    });
}
