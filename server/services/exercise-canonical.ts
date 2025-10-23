/**
 * Exercise Name Canonicalization
 * 
 * Normalizes exercise names to prevent semantic duplicates
 * (e.g., "DB Bench Press" and "Dumbbell Bench Press" are treated as the same)
 */

export function canonicalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(db|dumbbell)\b/g, 'dumbbell')
    .replace(/\b(bb|barbell)\b/g, 'barbell')
    .replace(/\s+/g, ' ')
    .trim();
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
