// Interpretation Rules Engine
// Applies evidence-based rules to generate insights

import type { 
  Interpretation, 
  ObservationLabsData, 
  LabObservation,
  InterpretationCategory 
} from './types';
import { INTERPRETATION_RULES } from './config';

/**
 * Interpret lab observations and generate insights
 * @param data - Normalized lab data
 * @param patientSex - Patient sex for sex-specific rules
 * @returns Interpretation with category, insights, and recommendations
 */
export function interpretLabData(
  data: ObservationLabsData,
  patientSex: string | null
): {
  interpretation: Interpretation;
  rulesTriggered: string[];
} {
  const insights: string[] = [];
  const caveats: string[] = [];
  const nextBestActions: string[] = [];
  const rulesTriggered: string[] = [];
  let overallCategory: InterpretationCategory = 'Normal';

  // Find specific analytes
  const ldl = findObservation(data.observations, ['ldl', 'low-density lipoprotein']);
  const hba1c = findObservation(data.observations, ['hba1c', 'a1c', 'glycated hemoglobin']);
  const glucose = findObservation(data.observations, ['glucose', 'blood glucose']);
  const cholesterol = findObservation(data.observations, ['cholesterol', 'total cholesterol']);

  // Apply Lipid Risk Rule
  if (ldl) {
    const ldlValue = typeof ldl.value === 'number' ? ldl.value : parseFloat(String(ldl.value));
    if (!isNaN(ldlValue)) {
      const ldlCategory = interpretLDL(ldlValue, ldl.unit);
      if (ldlCategory.category !== 'Normal') {
        overallCategory = ldlCategory.category;
      }
      insights.push(ldlCategory.insight);
      if (ldlCategory.action) {
        nextBestActions.push(ldlCategory.action);
      }
      rulesTriggered.push('LipidRiskSimple');
    }
  }

  // Apply A1c Glycemia Rule
  if (hba1c) {
    const a1cValue = typeof hba1c.value === 'number' ? hba1c.value : parseFloat(String(hba1c.value));
    if (!isNaN(a1cValue)) {
      const a1cCategory = interpretA1c(a1cValue);
      if (a1cCategory.category !== 'Normal' && overallCategory === 'Normal') {
        overallCategory = a1cCategory.category;
      }
      insights.push(a1cCategory.insight);
      if (a1cCategory.action) {
        nextBestActions.push(a1cCategory.action);
      }
      rulesTriggered.push('A1cGlycemia');
    }
  }

  // Apply Glucose interpretation
  if (glucose && !hba1c) {
    const glucoseValue = typeof glucose.value === 'number' ? glucose.value : parseFloat(String(glucose.value));
    if (!isNaN(glucoseValue)) {
      const glucoseCategory = interpretGlucose(glucoseValue, glucose.unit);
      if (glucoseCategory.category !== 'Normal' && overallCategory === 'Normal') {
        overallCategory = glucoseCategory.category;
      }
      insights.push(glucoseCategory.insight);
    }
  }

  // Add general caveats
  if (data.observations.length < 3) {
    caveats.push('Limited data available - interpretations based on partial panel');
  }

  // Default insights if nothing specific found
  if (insights.length === 0) {
    insights.push('All measured values appear within typical ranges');
  }

  // Default action if nothing specific
  if (nextBestActions.length === 0 && overallCategory !== 'Normal') {
    nextBestActions.push('Discuss results with your healthcare provider');
  }

  return {
    interpretation: {
      category: overallCategory,
      insights,
      caveats,
      next_best_actions: nextBestActions,
    },
    rulesTriggered,
  };
}

/**
 * Find observation by code/display name
 */
function findObservation(observations: LabObservation[], searchTerms: string[]): LabObservation | null {
  return observations.find(obs => 
    searchTerms.some(term => 
      obs.code.toLowerCase().includes(term) || 
      obs.display.toLowerCase().includes(term)
    )
  ) || null;
}

/**
 * Interpret LDL cholesterol
 */
function interpretLDL(value: number, unit: string): {
  category: InterpretationCategory;
  insight: string;
  action?: string;
} {
  // Convert to mmol/L if needed
  let ldlMmol = value;
  if (unit.toLowerCase().includes('mg/dl')) {
    ldlMmol = value * 0.0259;
  }

  if (ldlMmol >= 4.9) {
    return {
      category: 'Abnormal',
      insight: 'LDL cholesterol is significantly elevated, which may increase cardiovascular risk',
      action: 'Consult with a healthcare provider about lipid management strategies',
    };
  } else if (ldlMmol >= 3.4) {
    return {
      category: 'Borderline',
      insight: 'LDL cholesterol is above optimal levels',
      action: 'Consider lifestyle modifications and discuss with your healthcare provider',
    };
  } else {
    return {
      category: 'Normal',
      insight: 'LDL cholesterol is within optimal range',
    };
  }
}

/**
 * Interpret HbA1c
 */
function interpretA1c(value: number): {
  category: InterpretationCategory;
  insight: string;
  action?: string;
} {
  if (value >= 6.5) {
    return {
      category: 'Abnormal',
      insight: 'HbA1c indicates elevated average blood glucose levels',
      action: 'Consult with a healthcare provider about glucose management',
    };
  } else if (value >= 5.7) {
    return {
      category: 'Borderline',
      insight: 'HbA1c suggests slightly elevated average blood glucose',
      action: 'Consider lifestyle modifications to improve glycemic control',
    };
  } else {
    return {
      category: 'Normal',
      insight: 'HbA1c indicates well-controlled blood glucose levels',
    };
  }
}

/**
 * Interpret fasting glucose
 */
function interpretGlucose(value: number, unit: string): {
  category: InterpretationCategory;
  insight: string;
} {
  // Convert to mmol/L if needed
  let glucoseMmol = value;
  if (unit.toLowerCase().includes('mg/dl')) {
    glucoseMmol = value * 0.0555;
  }

  if (glucoseMmol >= 7.0) {
    return {
      category: 'Abnormal',
      insight: 'Fasting glucose is elevated',
    };
  } else if (glucoseMmol >= 5.6) {
    return {
      category: 'Borderline',
      insight: 'Fasting glucose is slightly elevated',
    };
  } else if (glucoseMmol < 3.9) {
    return {
      category: 'Borderline',
      insight: 'Fasting glucose is on the lower end of normal',
    };
  } else {
    return {
      category: 'Normal',
      insight: 'Fasting glucose is within normal range',
    };
  }
}
