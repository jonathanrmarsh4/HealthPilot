/**
 * Utility functions for parsing and displaying evidence citations in AI recommendations
 */

export interface Citation {
  text: string;
  standard: string; // e.g., "ACSM", "NSCA", "WHO", "AND", "ADA"
}

const STANDARDS_MAP: Record<string, string> = {
  'ACSM': 'American College of Sports Medicine',
  'ACSM_HRMAX': 'ACSM Heart Rate Maximum Guidelines',
  'NSCA': 'National Strength & Conditioning Association', 
  'NSCA_PROGRESSION': 'NSCA Progressive Overload Principles',
  'WHO': 'World Health Organization',
  'AND': 'Academy of Nutrition & Dietetics',
  'ADA': 'American Diabetes Association',
  'AHA': 'American Heart Association',
};

/**
 * URLs for evidence-based standards - links to official organization websites
 */
const STANDARDS_URL_MAP: Record<string, string> = {
  'ACSM': 'https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines',
  'ACSM_HRMAX': 'https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines',
  'NSCA': 'https://www.nsca.com/education/articles/nsca-coach/essentials-of-strength-training-and-conditioning/',
  'NSCA_PROGRESSION': 'https://www.nsca.com/education/articles/nsca-coach/essentials-of-strength-training-and-conditioning/',
  'WHO': 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
  'AND': 'https://www.eatright.org/health/wellness/fad-diets/what-is-an-rd',
  'ADA': 'https://diabetes.org/health-wellness/fitness',
  'AHA': 'https://www.heart.org/en/healthy-living/fitness/fitness-basics/aha-recs-for-physical-activity-in-adults',
};

/**
 * Extract citations from text
 * Looks for patterns like "ACSM: text", "Per NSCA, text", "NSCA recommends text"
 * De-duplicates citations by standard to avoid rendering identical badges
 */
export function extractCitations(text: string): Citation[] {
  const citations: Citation[] = [];
  const standardsPattern = Object.keys(STANDARDS_MAP).join('|');
  
  // Pattern 1: "ACSM: text"
  const colonPattern = new RegExp(`(${standardsPattern}):\\s*([^.,(]+)`, 'gi');
  let match;
  while ((match = colonPattern.exec(text)) !== null) {
    citations.push({
      standard: match[1].toUpperCase(),
      text: match[2].trim(),
    });
  }
  
  // Pattern 2: "Per NSCA, text" or "Per NSCA guidelines"
  const perPattern = new RegExp(`[Pp]er\\s+(${standardsPattern})(?:\\s+guidelines)?[,\\s]+([^.]+)`, 'gi');
  while ((match = perPattern.exec(text)) !== null) {
    citations.push({
      standard: match[1].toUpperCase(),
      text: match[2].trim(),
    });
  }
  
  // Pattern 3: "ACSM recommends/suggests text"
  const recommendsPattern = new RegExp(`(${standardsPattern})\\s+(recommends|suggests)\\s+([^.]+)`, 'gi');
  while ((match = recommendsPattern.exec(text)) !== null) {
    citations.push({
      standard: match[1].toUpperCase(),
      text: `${match[2]} ${match[3]}`.trim(),
    });
  }
  
  // De-duplicate by standard, keeping the first occurrence
  const seen = new Set<string>();
  return citations.filter(citation => {
    if (seen.has(citation.standard)) {
      return false;
    }
    seen.add(citation.standard);
    return true;
  });
}

/**
 * Get full name of a standard abbreviation
 */
export function getStandardFullName(abbreviation: string): string {
  return STANDARDS_MAP[abbreviation.toUpperCase()] || abbreviation;
}

/**
 * Get URL for a standard abbreviation
 */
export function getStandardUrl(abbreviation: string): string | null {
  return STANDARDS_URL_MAP[abbreviation.toUpperCase()] || null;
}

/**
 * Remove citation text from description to get clean description
 * Removes patterns like "(ACSM: text)" or "(Per NSCA, text)"
 */
export function removeCitations(text: string): string {
  const standardsPattern = Object.keys(STANDARDS_MAP).join('|');
  
  // Remove parenthetical citations
  let cleaned = text.replace(
    new RegExp(`\\((?:${standardsPattern})[^)]*\\)`, 'gi'),
    ''
  );
  
  // Clean up extra spaces
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}
