/**
 * SmartFuel™ Reasoning Engine
 * 
 * Converts health signals (biomarkers, vitals, goals) into personalized nutrition guidance
 * following evidence-based rules from the rulepack.
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as yaml from 'yaml';
import type { Biomarker, NutritionProfile } from '@shared/schema';

// Load configuration files (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RULEPACK_PATH = path.join(__dirname, 'rulepack.yaml');
const ONTOLOGY_PATH = path.join(__dirname, 'ontology.json');

let rulepack: any;
let ontology: any;

try {
  const rulepackContent = fs.readFileSync(RULEPACK_PATH, 'utf8');
  rulepack = yaml.parse(rulepackContent);
  
  const ontologyContent = fs.readFileSync(ONTOLOGY_PATH, 'utf8');
  ontology = JSON.parse(ontologyContent);
} catch (error) {
  console.error('[SmartFuel] Failed to load configuration files:', error);
  throw new Error('SmartFuel configuration files not found');
}

interface HealthSignals {
  biomarkers: Biomarker[];
  nutritionProfile?: NutritionProfile;
  goals?: string[];
  userPreferences?: {
    dietType?: string;
    allergies?: string[];
    dislikedFoods?: string[];
  };
}

interface GuidanceItem {
  category: string;
  categoryLabel: string;
  examples: string[];
  reason: string;
  evidenceTier: string;
}

interface SmartFuelGuidance {
  themesDetected: string[];
  overview: string;
  avoid: GuidanceItem[];
  include: GuidanceItem[];
  targets: string[];
  tip: string;
  rulesApplied: string[];
  evidenceSource: any;
}

/**
 * Signal Normalizer - Converts biomarkers into standardized health signals
 */
class SignalNormalizer {
  normalize(biomarkers: Biomarker[]): Map<string, number> {
    const signals = new Map<string, number>();
    
    // Group biomarkers by type and get most recent value
    const biomarkerMap = new Map<string, Biomarker>();
    for (const biomarker of biomarkers) {
      const existing = biomarkerMap.get(biomarker.type);
      if (!existing || new Date(biomarker.recordedAt) > new Date(existing.recordedAt)) {
        biomarkerMap.set(biomarker.type, biomarker);
      }
    }
    
    // Map biomarker types to signal names
    const typeMapping: Record<string, string> = {
      'blood_pressure_systolic': 'bp_systolic',
      'blood_pressure_diastolic': 'bp_diastolic',
      'ldl_cholesterol': 'ldl_cholesterol',
      'total_cholesterol': 'total_cholesterol',
      'hdl_cholesterol': 'hdl_cholesterol',
      'triglycerides': 'triglycerides',
      'glucose': 'fasting_glucose',
      'fasting_glucose': 'fasting_glucose',
      'hba1c': 'hba1c',
      'creatinine': 'creatinine',
      'egfr': 'egfr',
      'alt': 'alt',
      'ast': 'ast',
      'hscrp': 'hsCRP',
      'hs_crp': 'hsCRP',
    };
    
    for (const [type, biomarker] of biomarkerMap.entries()) {
      const signalName = typeMapping[type.toLowerCase()] || type;
      signals.set(signalName, biomarker.value);
    }
    
    // Calculate derived signals
    const ldl = signals.get('ldl_cholesterol');
    const hdl = signals.get('hdl_cholesterol');
    const trig = signals.get('triglycerides');
    
    if (ldl && hdl) {
      signals.set('non_hdl', ldl + (trig || 0) / 5 - hdl);
    }
    
    if (trig && hdl) {
      signals.set('trig_hdl_ratio', trig / hdl);
    }
    
    return signals;
  }
}

/**
 * Risk Profiler - Identifies dietary risk themes based on biomarkers
 */
class RiskProfiler {
  identifyThemes(signals: Map<string, number>): string[] {
    const themes: string[] = [];
    
    if (!rulepack?.themes) {
      console.warn('[SmartFuel] No themes found in rulepack');
      return themes;
    }
    
    for (const [themeName, themeConfig] of Object.entries(rulepack.themes)) {
      const triggers = (themeConfig as any).triggers || [];
      let themeMatches = false;
      
      for (const trigger of triggers) {
        if (this.evaluateTrigger(trigger, signals)) {
          themeMatches = true;
          break;
        }
      }
      
      if (themeMatches) {
        themes.push(themeName);
      }
    }
    
    return themes;
  }
  
  private evaluateTrigger(trigger: string, signals: Map<string, number>): boolean {
    // Parse trigger like "bp_systolic > 130"
    const match = trigger.match(/^(\w+)\s*([><=]+)\s*(\d+(?:\.\d+)?)$/);
    if (!match) {
      console.warn(`[SmartFuel] Invalid trigger format: ${trigger}`);
      return false;
    }
    
    const [, signalName, operator, thresholdStr] = match;
    const threshold = parseFloat(thresholdStr);
    const value = signals.get(signalName);
    
    if (value === undefined) {
      return false;
    }
    
    switch (operator) {
      case '>': return value > threshold;
      case '>=': return value >= threshold;
      case '<': return value < threshold;
      case '<=': return value <= threshold;
      case '==': return value === threshold;
      default: return false;
    }
  }
}

/**
 * Target Setter - Generates numeric daily bounds from themes
 */
class TargetSetter {
  setTargets(themes: string[]): string[] {
    const targets: string[] = [];
    const seenTargets = new Set<string>();
    
    for (const themeName of themes) {
      const themeConfig = rulepack.themes?.[themeName];
      if (!themeConfig?.targets) continue;
      
      const themeTargets = themeConfig.targets;
      
      // Sodium
      if (themeTargets.sodium_mg_max && !seenTargets.has('sodium')) {
        targets.push(`Keep sodium under ${themeTargets.sodium_mg_max} mg/day`);
        seenTargets.add('sodium');
      }
      
      // Potassium
      if (themeTargets.potassium_mg_min && !seenTargets.has('potassium')) {
        targets.push(`Aim for at least ${themeTargets.potassium_mg_min} mg of potassium daily`);
        seenTargets.add('potassium');
      }
      if (themeTargets.potassium_mg_max && !seenTargets.has('potassium')) {
        targets.push(`Keep potassium under ${themeTargets.potassium_mg_max} mg/day`);
        seenTargets.add('potassium');
      }
      
      // Fiber
      if (themeTargets.fiber_g_min && !seenTargets.has('fiber')) {
        targets.push(`Aim for at least ${themeTargets.fiber_g_min} g of fiber daily`);
        seenTargets.add('fiber');
      }
      
      // Saturated fat
      if (themeTargets.sat_fat_g_max && !seenTargets.has('sat_fat')) {
        targets.push(`Stay below ${themeTargets.sat_fat_g_max} g of saturated fat per day`);
        seenTargets.add('sat_fat');
      }
      
      // Sugar
      if (themeTargets.sugar_g_max && !seenTargets.has('sugar')) {
        targets.push(`Limit added sugars to ${themeTargets.sugar_g_max} g/day`);
        seenTargets.add('sugar');
      }
      
      // Protein
      if (themeTargets.protein_g_max && !seenTargets.has('protein')) {
        targets.push(`Keep protein under ${themeTargets.protein_g_max} g/day`);
        seenTargets.add('protein');
      }
      if (themeTargets.protein_pct_min && !seenTargets.has('protein_pct')) {
        targets.push(`Aim for at least ${themeTargets.protein_pct_min}% of calories from protein`);
        seenTargets.add('protein_pct');
      }
      
      // Carbs
      if (themeTargets.carbs_pct_max && !seenTargets.has('carbs')) {
        targets.push(`Keep carbs under ${themeTargets.carbs_pct_max}% of total calories`);
        seenTargets.add('carbs');
      }
      
      // Omega-3
      if (themeTargets.omega3_g_min && !seenTargets.has('omega3')) {
        targets.push(`Include at least ${themeTargets.omega3_g_min} g of omega-3 fatty acids daily`);
        seenTargets.add('omega3');
      }
      
      // Plant sterols
      if (themeTargets.plant_sterols_mg_min && !seenTargets.has('plant_sterols')) {
        targets.push(`Aim for ${themeTargets.plant_sterols_mg_min} mg of plant sterols daily`);
        seenTargets.add('plant_sterols');
      }
      
      // Phosphorus
      if (themeTargets.phosphorus_mg_max && !seenTargets.has('phosphorus')) {
        targets.push(`Limit phosphorus to ${themeTargets.phosphorus_mg_max} mg/day`);
        seenTargets.add('phosphorus');
      }
    }
    
    return targets;
  }
}

/**
 * Personalization Layer - Applies user preferences and resolves conflicts
 */
class PersonalizationLayer {
  applyPreferences(
    avoidList: GuidanceItem[],
    includeList: GuidanceItem[],
    dietType?: string,
    allergies?: string[]
  ): { avoid: GuidanceItem[], include: GuidanceItem[] } {
    const filteredAvoid = [...avoidList];
    let filteredInclude = [...includeList];
    
    // Apply diet type filters
    if (dietType && rulepack.diet_preferences?.[dietType]) {
      const excludeCategories = rulepack.diet_preferences[dietType].exclude_categories || [];
      
      // Remove categories that conflict with diet type
      filteredInclude = filteredInclude.filter(item => {
        // Check if this category should be excluded
        if (excludeCategories.includes(item.category)) {
          return false;
        }
        
        // For omega-3, filter to appropriate sources
        if (item.category === 'omega3_fish_nuts' && excludeCategories.includes('omega3_fish_nuts')) {
          // Update examples to plant-based only
          item.examples = item.examples.filter(ex => 
            ['walnuts', 'chia seeds', 'flaxseed'].includes(ex.toLowerCase())
          );
          item.categoryLabel = 'Omega-3 sources (plant-based)';
          return item.examples.length > 0;
        }
        
        return true;
      });
    }
    
    // Apply allergy filters (remove foods containing allergens from examples)
    if (allergies && allergies.length > 0) {
      const allergyKeywords = allergies.map(a => a.toLowerCase());
      
      filteredInclude = filteredInclude.map(item => ({
        ...item,
        examples: item.examples.filter(ex => {
          const exLower = ex.toLowerCase();
          return !allergyKeywords.some(allergen => exLower.includes(allergen));
        })
      })).filter(item => item.examples.length > 0);
    }
    
    return {
      avoid: filteredAvoid,
      include: filteredInclude
    };
  }
}

/**
 * Main SmartFuel Reasoner - Orchestrates all components
 */
export class SmartFuelReasoner {
  private signalNormalizer: SignalNormalizer;
  private riskProfiler: RiskProfiler;
  private targetSetter: TargetSetter;
  private personalization: PersonalizationLayer;
  
  constructor() {
    this.signalNormalizer = new SignalNormalizer();
    this.riskProfiler = new RiskProfiler();
    this.targetSetter = new TargetSetter();
    this.personalization = new PersonalizationLayer();
  }
  
  /**
   * Generate personalized nutrition guidance from health signals
   */
  generateGuidance(healthSignals: HealthSignals): SmartFuelGuidance {
    // Step 1: Normalize signals
    const signals = this.signalNormalizer.normalize(healthSignals.biomarkers);
    
    // Step 2: Identify risk themes
    const themes = this.riskProfiler.identifyThemes(signals);
    
    // If no themes detected, provide general healthy eating guidance
    if (themes.length === 0) {
      return this.generateDefaultGuidance(healthSignals);
    }
    
    // Step 3: Collect avoid and include items from themes
    const avoidItems: GuidanceItem[] = [];
    const includeItems: GuidanceItem[] = [];
    const rulesApplied: string[] = [];
    
    for (const themeName of themes) {
      const themeConfig = rulepack.themes?.[themeName];
      if (!themeConfig) continue;
      
      rulesApplied.push(themeName);
      
      // Process avoid items
      if (themeConfig.avoid) {
        for (const item of themeConfig.avoid) {
          const category = ontology.categories.find((c: any) => c.id === item.category);
          if (category) {
            avoidItems.push({
              category: item.category,
              categoryLabel: category.label,
              examples: category.examples.slice(0, 3), // Top 3 examples
              reason: item.reason,
              evidenceTier: item.evidence_tier
            });
          }
        }
      }
      
      // Process include items
      if (themeConfig.include) {
        for (const item of themeConfig.include) {
          const category = ontology.categories.find((c: any) => c.id === item.category);
          if (category) {
            includeItems.push({
              category: item.category,
              categoryLabel: category.label,
              examples: category.examples.slice(0, 3), // Top 3 examples
              reason: item.reason,
              evidenceTier: item.evidence_tier
            });
          }
        }
      }
    }
    
    // Step 4: Apply personalization
    const dietType = healthSignals.nutritionProfile?.dietaryPreferences?.[0];
    const allergies = healthSignals.nutritionProfile?.allergies;
    
    const { avoid, include } = this.personalization.applyPreferences(
      avoidItems,
      includeItems,
      dietType,
      allergies
    );
    
    // Step 5: Set targets
    const targets = this.targetSetter.setTargets(themes);
    
    // Step 6: Select tip
    const tip = this.selectTip(themes);
    
    // Step 7: Generate overview
    const overview = this.generateOverview(themes, healthSignals.goals);
    
    return {
      themesDetected: themes,
      overview,
      avoid,
      include,
      targets,
      tip,
      rulesApplied,
      evidenceSource: {
        biomarkers: Array.from(signals.entries()).map(([type, value]) => ({ type, value })),
        goals: healthSignals.goals || [],
        dietType,
        allergies: allergies || []
      }
    };
  }
  
  private generateDefaultGuidance(healthSignals: HealthSignals): SmartFuelGuidance {
    return {
      themesDetected: ['general_health'],
      overview: "Your biomarkers look good! SmartFuel recommends maintaining a balanced, whole-foods diet to support your long-term health.",
      avoid: [
        {
          category: 'refined_sugars_sweets',
          categoryLabel: 'Refined sugars and sweets',
          examples: ['candy', 'soda', 'pastries'],
          reason: 'Excess sugar increases inflammation and metabolic risk',
          evidenceTier: 'A'
        },
        {
          category: 'processed_meats',
          categoryLabel: 'Processed meats',
          examples: ['bacon', 'sausage', 'deli meats'],
          reason: 'High in sodium and preservatives',
          evidenceTier: 'A'
        }
      ],
      include: [
        {
          category: 'colorful_vegetables_fruits',
          categoryLabel: 'Colorful vegetables and fruits',
          examples: ['bell peppers', 'berries', 'leafy greens'],
          reason: 'Rich in antioxidants and fiber for overall health',
          evidenceTier: 'A'
        },
        {
          category: 'whole_grains_fiber',
          categoryLabel: 'Whole grains with fiber',
          examples: ['brown rice', 'quinoa', 'oats'],
          reason: 'Support digestive health and stable energy',
          evidenceTier: 'A'
        }
      ],
      targets: [
        'Aim for at least 25-30 g of fiber daily',
        'Include a variety of colorful vegetables each day'
      ],
      tip: 'Focus on whole, minimally processed foods for optimal health',
      rulesApplied: ['default'],
      evidenceSource: {
        biomarkers: [],
        goals: healthSignals.goals || [],
        dietType: healthSignals.nutritionProfile?.dietaryPreferences?.[0],
        allergies: healthSignals.nutritionProfile?.allergies || []
      }
    };
  }
  
  private generateOverview(themes: string[], goals?: string[]): string {
    const themeLabels: Record<string, string> = {
      'hypertension': 'blood pressure management',
      'elevated_ldl': 'cholesterol balance',
      'elevated_triglycerides': 'triglyceride control',
      'insulin_resistance': 'blood sugar regulation',
      'kidney_health': 'kidney support',
      'liver_health': 'liver health',
      'inflammation': 'inflammation reduction'
    };
    
    const focusAreas = themes.map(t => themeLabels[t] || t).slice(0, 2);
    
    if (focusAreas.length === 0) {
      return "SmartFuel has analyzed your data to provide personalized nutrition guidance.";
    }
    
    if (focusAreas.length === 1) {
      return `SmartFuel is helping you improve ${focusAreas[0]}.`;
    }
    
    return `SmartFuel has identified key focus areas: ${focusAreas.join(' and ')}.`;
  }
  
  private selectTip(themes: string[]): string {
    // Select tip from first theme
    if (themes.length > 0) {
      const themeConfig = rulepack.themes?.[themes[0]];
      if (themeConfig?.tips && themeConfig.tips.length > 0) {
        return themeConfig.tips[0];
      }
    }
    
    return 'Small, consistent improvements drive lasting results';
  }
}
