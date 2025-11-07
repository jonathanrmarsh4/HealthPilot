/**
 * SmartFuel™ NLG (Natural Language Generation) Engine
 * 
 * Transforms structured guidance data into friendly, plain-English explanations
 * following SmartFuel's voice and tone guidelines.
 */

interface GuidanceItem {
  category: string;
  categoryLabel: string;
  examples: string[];
  reason: string;
  evidenceTier: string;
}

/**
 * NLG Template Engine - Generates natural language from structured guidance
 */
export class SmartFuelNLG {
  
  /**
   * Format an "avoid" guidance item into natural language
   */
  formatAvoidItem(item: GuidanceItem): string {
    const examples = this.formatExamples(item.examples, 2);
    return `Limit ${item.categoryLabel.toLowerCase()} like ${examples} - ${item.reason.toLowerCase()}.`;
  }
  
  /**
   * Format an "include" guidance item into natural language
   */
  formatIncludeItem(item: GuidanceItem): string {
    const examples = this.formatExamples(item.examples, 2);
    return `Add more ${item.categoryLabel.toLowerCase()} like ${examples} - ${item.reason.toLowerCase()}.`;
  }
  
  /**
   * Format a list of examples with proper grammar
   */
  private formatExamples(examples: string[], limit: number = 2): string {
    const selected = examples.slice(0, limit);
    
    if (selected.length === 0) {
      return '';
    }
    
    if (selected.length === 1) {
      return selected[0];
    }
    
    if (selected.length === 2) {
      return `${selected[0]} and ${selected[1]}`;
    }
    
    // For 3+ examples: "item1, item2, and item3"
    const lastItem = selected[selected.length - 1];
    const restItems = selected.slice(0, -1);
    return `${restItems.join(', ')}, and ${lastItem}`;
  }
  
  /**
   * Generate overview summary with appropriate tone
   */
  generateOverview(themesDetected: string[], _primaryGoal?: string): string {
    const themeLabels: Record<string, string> = {
      'hypertension': 'blood pressure management',
      'elevated_ldl': 'cholesterol balance',
      'elevated_triglycerides': 'triglyceride control',
      'insulin_resistance': 'blood sugar regulation',
      'kidney_health': 'kidney support',
      'liver_health': 'liver health',
      'inflammation': 'inflammation reduction'
    };
    
    if (themesDetected.length === 0) {
      return "SmartFuel has analyzed your latest data. Keep up the great work with balanced nutrition!";
    }
    
    const focusAreas = themesDetected
      .map(theme => themeLabels[theme] || theme)
      .slice(0, 2);
    
    if (focusAreas.length === 1) {
      return `SmartFuel is helping you improve ${focusAreas[0]}.`;
    }
    
    return `SmartFuel has identified key focus areas: ${focusAreas.join(' and ')}.`;
  }
  
  /**
   * Format all avoid items as readable strings
   */
  formatAvoidList(avoidItems: GuidanceItem[]): string[] {
    return avoidItems.map(item => this.formatAvoidItem(item));
  }
  
  /**
   * Format all include items as readable strings
   */
  formatIncludeList(includeItems: GuidanceItem[]): string[] {
    return includeItems.map(item => this.formatIncludeItem(item));
  }
  
  /**
   * Select an appropriate tip based on context
   */
  selectTip(themesDetected: string[], allTips?: string[]): string {
    const defaultTips = [
      'Small, consistent improvements drive lasting results.',
      'Focus on progress, not perfection.',
      'One meal at a time - you\'ve got this.',
    ];
    
    const tips = allTips || defaultTips;
    
    // For now, return first tip (can be made more intelligent)
    return tips[0];
  }
  
  /**
   * Add context-aware emphasis to guidance text
   */
  addEmphasis(text: string, _severity: 'high' | 'moderate' | 'low' = 'moderate'): string {
    // This could be used in the future to adjust tone based on severity
    // For now, we keep consistent friendly tone
    return text;
  }
  
  /**
   * Convert evidence tier to human-readable format
   */
  formatEvidenceTier(tier: string): string {
    const tierLabels: Record<string, string> = {
      'A': 'Strong clinical evidence',
      'B': 'Well-supported by research',
      'C': 'Expert consensus'
    };
    
    return tierLabels[tier] || 'Evidence-based';
  }
}

/**
 * Helper function to create formatted guidance display
 */
export function formatGuidanceForDisplay(guidance: {
  overview: string;
  avoid: GuidanceItem[];
  include: GuidanceItem[];
  targets: string[];
  tip: string;
}): {
  overview: string;
  avoidItems: string[];
  includeItems: string[];
  targets: string[];
  tip: string;
} {
  const nlg = new SmartFuelNLG();
  
  return {
    overview: guidance.overview,
    avoidItems: nlg.formatAvoidList(guidance.avoid),
    includeItems: nlg.formatIncludeList(guidance.include),
    targets: guidance.targets,
    tip: guidance.tip
  };
}
