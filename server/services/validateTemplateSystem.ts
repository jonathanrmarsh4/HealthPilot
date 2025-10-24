/**
 * validateTemplateSystem.ts
 * 
 * Startup validation that ensures RULES and database templates are in sync.
 * Fails fast if:
 * - RULES references template_ids that don't exist in database
 * - Patterns in PATTERN_TO_MUSCLES have no RULES coverage
 * 
 * This prevents silent runtime failures when AI generates workouts.
 */

import { db } from "../db";
import { exerciseTemplates } from "../../shared/schema";
import { RULES, PATTERN_TO_MUSCLES } from "./rules";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates that all template_ids referenced in RULES exist in the database
 */
async function validateTemplateIds(): Promise<{ errors: string[], warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Get all template_ids from database
  const dbTemplates = await db.select({ id: exerciseTemplates.id }).from(exerciseTemplates);
  const dbTemplateIds = new Set(dbTemplates.map(t => t.id));

  // Check every template_id referenced in RULES
  for (const [pattern, modalityMap] of Object.entries(RULES)) {
    for (const [modality, templateId] of Object.entries(modalityMap)) {
      if (!dbTemplateIds.has(templateId)) {
        errors.push(
          `RULES references non-existent template: ${pattern} × ${modality} → ${templateId}`
        );
      }
    }
  }

  return { errors, warnings };
}

/**
 * Validates that all patterns in PATTERN_TO_MUSCLES have at least one RULES mapping
 */
function validatePatternCoverage(): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const allPatterns = Object.keys(PATTERN_TO_MUSCLES);
  
  for (const pattern of allPatterns) {
    const modalityMap = RULES[pattern as keyof typeof RULES];
    
    if (!modalityMap || Object.keys(modalityMap).length === 0) {
      errors.push(
        `Pattern '${pattern}' is in PATTERN_TO_MUSCLES but has no RULES coverage. ` +
        `AI can select this pattern but it will fail at runtime.`
      );
    }
  }

  return { errors, warnings };
}

/**
 * Main validation function - runs at app startup
 * Throws error if critical issues are found
 */
export async function validateTemplateSystem(): Promise<ValidationResult> {
  console.log("🔍 Validating template system integrity...");

  const patternResult = validatePatternCoverage();
  const templateResult = await validateTemplateIds();

  const allErrors = [...patternResult.errors, ...templateResult.errors];
  const allWarnings = [...patternResult.warnings, ...templateResult.warnings];

  // Log results
  if (allErrors.length > 0) {
    console.error("❌ Template system validation FAILED:");
    allErrors.forEach(err => console.error(`  - ${err}`));
  }

  if (allWarnings.length > 0) {
    console.warn("⚠️ Template system warnings:");
    allWarnings.forEach(warn => console.warn(`  - ${warn}`));
  }

  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log("✅ Template system validation passed");
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Strict validation - throws if any errors found
 * Use this at startup to prevent app from running with broken template config
 */
export async function validateTemplateSystemStrict(): Promise<void> {
  const result = await validateTemplateSystem();
  
  if (!result.valid) {
    throw new Error(
      `Template system validation failed with ${result.errors.length} error(s):\n` +
      result.errors.map(e => `  - ${e}`).join('\n')
    );
  }
}
