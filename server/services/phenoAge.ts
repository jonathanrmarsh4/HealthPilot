/**
 * PhenoAge Biological Age Calculator
 * Based on Levine et al. 2018 "An epigenetic biomarker of aging for lifespan and healthspan"
 * https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5940111/
 */

export interface PhenoAgeBiomarkers {
  albumin: number; // g/dL
  creatinine: number; // mg/dL
  glucose: number; // mg/dL
  crp: number; // mg/L (C-Reactive Protein)
  lymphocytePercent: number; // %
  mcv: number; // fL (Mean Cell Volume)
  rdw: number; // % (Red Cell Distribution Width)
  alp: number; // U/L (Alkaline Phosphatase)
  wbc: number; // 1000 cells/μL (White Blood Cell Count)
}

export interface PhenoAgeResult {
  phenoAge: number; // Calculated biological age
  chronologicalAge: number;
  ageDifference: number; // Positive = aging faster, Negative = aging slower
  missingBiomarkers: string[];
  availableBiomarkers: string[];
}

const REQUIRED_BIOMARKERS = [
  'albumin',
  'creatinine',
  'glucose',
  'crp',
  'lymphocytePercent',
  'mcv',
  'rdw',
  'alp',
  'wbc'
] as const;

/**
 * Calculate PhenoAge from biomarkers and chronological age
 * Returns null if any required biomarkers are missing
 */
export function calculatePhenoAge(
  biomarkers: Partial<PhenoAgeBiomarkers>,
  chronologicalAge: number
): PhenoAgeResult | null {
  // Check for missing biomarkers
  const missing: string[] = [];
  const available: string[] = [];
  
  REQUIRED_BIOMARKERS.forEach(key => {
    if (biomarkers[key] === undefined || biomarkers[key] === null) {
      missing.push(key);
    } else {
      available.push(key);
    }
  });
  
  // If any biomarkers are missing, return partial result
  if (missing.length > 0) {
    return {
      phenoAge: 0,
      chronologicalAge,
      ageDifference: 0,
      missingBiomarkers: missing,
      availableBiomarkers: available
    };
  }
  
  // All biomarkers present - calculate PhenoAge
  const { albumin, creatinine, glucose, crp, lymphocytePercent, mcv, rdw, alp, wbc } = biomarkers as PhenoAgeBiomarkers;
  
  // Step 1: Calculate linear predictor (xb)
  // Using published coefficients from Levine et al. 2018
  const xb = 
    -19.907 + 
    (-0.0336 * albumin) +
    (0.0095 * creatinine) +
    (0.1953 * glucose) +
    (0.0954 * Math.log(crp)) + // ln(CRP)
    (-0.012 * lymphocytePercent) +
    (0.0268 * mcv) +
    (0.3306 * rdw) +
    (0.00188 * alp) + // FIXED: Changed from negative to positive
    (0.0554 * wbc) +
    (0.0804 * chronologicalAge);
  
  // Step 2: Calculate mortality risk
  // mortality = 1 - 0.988^(exp(xb))
  const mortality = 1 - Math.pow(0.988, Math.exp(xb));
  
  // Step 3: Calculate Phenotypic Age
  // phenotypicAge = 141.5 + ln(-0.00553 * ln(1 - mortality)) / 0.090165
  const phenotypicAge = 141.50225 + (Math.log(-0.00553 * Math.log(1 - mortality)) / 0.090165);
  
  // Step 3: Calculate DNAm PhenoAge (biological age)
  // This is the mortality risk score
  const phenoAge = Math.round(phenotypicAge * 10) / 10; // Round to 1 decimal
  
  // Calculate age acceleration (difference from chronological age)
  const ageDifference = Math.round((phenoAge - chronologicalAge) * 10) / 10;
  
  return {
    phenoAge,
    chronologicalAge,
    ageDifference,
    missingBiomarkers: [],
    availableBiomarkers: available
  };
}

/**
 * Get user-friendly biomarker names for display
 */
export function getBiomarkerDisplayName(biomarker: string): string {
  const displayNames: Record<string, string> = {
    albumin: 'Albumin',
    creatinine: 'Creatinine',
    glucose: 'Blood Glucose',
    crp: 'C-Reactive Protein (CRP)',
    lymphocytePercent: 'Lymphocyte Percentage',
    mcv: 'Mean Cell Volume (MCV)',
    rdw: 'Red Cell Distribution Width (RDW)',
    alp: 'Alkaline Phosphatase (ALP)',
    wbc: 'White Blood Cell Count (WBC)'
  };
  
  return displayNames[biomarker] || biomarker;
}

/**
 * Get typical units for each biomarker
 */
export function getBiomarkerUnit(biomarker: string): string {
  const units: Record<string, string> = {
    albumin: 'g/dL',
    creatinine: 'mg/dL',
    glucose: 'mg/dL',
    crp: 'mg/L',
    lymphocytePercent: '%',
    mcv: 'fL',
    rdw: '%',
    alp: 'U/L',
    wbc: 'K/μL'
  };
  
  return units[biomarker] || '';
}

/**
 * Get which blood test panel contains each biomarker
 */
export function getBiomarkerSource(biomarker: string): string {
  const sources: Record<string, string> = {
    albumin: 'CMP (Comprehensive Metabolic Panel)',
    creatinine: 'CMP (Comprehensive Metabolic Panel)',
    glucose: 'CMP or Fasting Glucose Test',
    crp: 'CRP Test (separate order)',
    lymphocytePercent: 'CBC (Complete Blood Count)',
    mcv: 'CBC (Complete Blood Count)',
    rdw: 'CBC (Complete Blood Count)',
    alp: 'CMP (Comprehensive Metabolic Panel)',
    wbc: 'CBC (Complete Blood Count)'
  };
  
  return sources[biomarker] || 'Blood Test';
}
