/**
 * Exercise Name Canonicalization
 * 
 * Normalizes exercise names to prevent semantic duplicates
 * 
 * Examples of duplicates caught:
 * - "DB Bench Press" → "Dumbbell Bench Press" (abbreviation expansion)
 * - "Incline Dumbbell Press" → "Dumbbell Press" (modifier removal)
 * - "Back Squat (Barbell)" → "Barbell Back Squat" (word-order normalization)
 * - "Wide-Grip Pull-Up" → "Pull-Up" (punctuation + modifier removal)
 * 
 * Normalization rules:
 * 1. Lowercase
 * 2. Expand abbreviations (DB→dumbbell, BB→barbell)
 * 3. Remove punctuation (parentheses, commas, hyphens, etc.)
 * 4. Remove descriptive modifiers (incline, wide, seated, etc.)
 * 5. Sort tokens alphabetically (catches word-order differences)
 */

export function canonicalize(name: string): string {
  let normalized = name
    .toLowerCase()
    // Expand abbreviations
    .replace(/\b(db|dumbbell)\b/g, 'dumbbell')
    .replace(/\b(bb|barbell)\b/g, 'barbell')
    // Remove punctuation (parentheses, commas, hyphens, slashes, periods, apostrophes)
    .replace(/[(),\-\/.:']/g, ' ')
    // Remove common descriptive modifiers that distinguish exercise variants
    .replace(/\b(incline|decline|flat|wide|close|narrow|neutral|overhand|underhand|supinated|pronated|mixed|grip|stance|seated|standing|lying|reverse|alternating|single|double|leg|arm|hand)\b/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Sort tokens alphabetically to catch word-order differences
  // e.g., "Back Squat Barbell" → "back barbell squat"
  // This catches cases where the same lift has different word ordering
  const tokens = normalized.split(' ').filter(t => t.length > 0).sort();
  
  return tokens.join(' ');
}

/**
 * Check if a list of exercise names contains duplicates after canonicalization
 */
export function hasDuplicates(exerciseNames: string[]): boolean {
  const canonical = exerciseNames.map(canonicalize);
  const uniqueSet = new Set(canonical);
  return uniqueSet.size !== canonical.length;
}

/**
 * Get duplicate exercise names from a list
 */
export function findDuplicates(exerciseNames: string[]): string[] {
  const canonical = exerciseNames.map(canonicalize);
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  
  canonical.forEach((name, idx) => {
    if (seen.has(name)) {
      duplicates.add(exerciseNames[idx]);
    }
    seen.add(name);
  });
  
  return Array.from(duplicates);
}
