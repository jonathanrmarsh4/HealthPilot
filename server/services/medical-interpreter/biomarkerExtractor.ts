// Biomarker Extraction Service
// Converts lab observations to HealthPilot biomarker entries

import type { ObservationLabsData, LabObservation, ImagingObservation } from './types';
import type { InsertBiomarker } from '@shared/schema';
import { storage } from '../../storage';

/**
 * Mapping from common lab codes/displays to HealthPilot biomarker types
 * Includes LOINC codes, normalized variations, and common clinical names
 */
const LAB_TO_BIOMARKER_MAP: Record<string, { type: string; unit?: string }> = {
  // Lipid Panel
  'ldl': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'ldl_c': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'ldlc': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'low-density lipoprotein': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'ldl cholesterol': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  '2089-1': { type: 'ldl-cholesterol', unit: 'mmol/L' }, // LOINC
  '13457-7': { type: 'ldl-cholesterol', unit: 'mmol/L' }, // LOINC
  
  'hdl': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'hdl_c': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'hdlc': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'high-density lipoprotein': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'hdl cholesterol': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  '2085-9': { type: 'hdl-cholesterol', unit: 'mmol/L' }, // LOINC
  
  'cholesterol': { type: 'total-cholesterol', unit: 'mmol/L' },
  'total cholesterol': { type: 'total-cholesterol', unit: 'mmol/L' },
  'total_cholesterol': { type: 'total-cholesterol', unit: 'mmol/L' },
  '2093-3': { type: 'total-cholesterol', unit: 'mmol/L' }, // LOINC
  
  'triglycerides': { type: 'triglycerides', unit: 'mmol/L' },
  'trig': { type: 'triglycerides', unit: 'mmol/L' },
  '2571-8': { type: 'triglycerides', unit: 'mmol/L' }, // LOINC

  // Glucose & Diabetes
  'glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  'glu': { type: 'fasting-glucose', unit: 'mmol/L' },
  'glucose_fasting': { type: 'fasting-glucose', unit: 'mmol/L' },
  'fasting glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  'blood glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  '1558-6': { type: 'fasting-glucose', unit: 'mmol/L' }, // LOINC
  '2345-7': { type: 'fasting-glucose', unit: 'mmol/L' }, // LOINC
  
  'hba1c': { type: 'hba1c', unit: '%' },
  'a1c': { type: 'hba1c', unit: '%' },
  'glycated hemoglobin': { type: 'hba1c', unit: '%' },
  'hemoglobin a1c': { type: 'hba1c', unit: '%' },
  '4548-4': { type: 'hba1c', unit: '%' }, // LOINC
  '17856-6': { type: 'hba1c', unit: '%' }, // LOINC

  // Thyroid
  'tsh': { type: 'tsh', unit: 'mIU/L' },
  'thyroid stimulating hormone': { type: 'tsh', unit: 'mIU/L' },
  'thyroid_stimulating_hormone': { type: 'tsh', unit: 'mIU/L' },
  '3016-3': { type: 'tsh', unit: 'mIU/L' }, // LOINC
  
  't4': { type: 't4', unit: 'pmol/L' },
  'thyroxine': { type: 't4', unit: 'pmol/L' },
  '3026-2': { type: 't4', unit: 'pmol/L' }, // LOINC
  
  't3': { type: 't3', unit: 'pmol/L' },
  '3051-0': { type: 't3', unit: 'pmol/L' }, // LOINC

  // Liver Function
  'alt': { type: 'alt', unit: 'U/L' },
  'alat': { type: 'alt', unit: 'U/L' },
  'alanine aminotransferase': { type: 'alt', unit: 'U/L' },
  'ast': { type: 'ast', unit: 'U/L' },
  'asat': { type: 'ast', unit: 'U/L' },
  'aspartate aminotransferase': { type: 'ast', unit: 'U/L' },

  // Kidney Function
  'creatinine': { type: 'creatinine', unit: 'µmol/L' },
  'egfr': { type: 'egfr', unit: 'mL/min/1.73m²' },
  'urea': { type: 'urea', unit: 'mmol/L' },

  // Vitamins
  'vitamin d': { type: 'vitamin-d', unit: 'nmol/L' },
  '25-oh vitamin d': { type: 'vitamin-d', unit: 'nmol/L' },
  'vitamin b12': { type: 'vitamin-b12', unit: 'pmol/L' },
  'b12': { type: 'vitamin-b12', unit: 'pmol/L' },
  'folate': { type: 'folate', unit: 'nmol/L' },
  'folic acid': { type: 'folate', unit: 'nmol/L' },

  // Iron Studies
  'ferritin': { type: 'ferritin', unit: 'µg/L' },
  'iron': { type: 'serum-iron', unit: 'µmol/L' },
  'serum iron': { type: 'serum-iron', unit: 'µmol/L' },

  // Hormones
  'testosterone': { type: 'total-testosterone', unit: 'nmol/L' },
  'total testosterone': { type: 'total-testosterone', unit: 'nmol/L' },
  'testo': { type: 'total-testosterone', unit: 'nmol/L' },
  '2986-8': { type: 'total-testosterone', unit: 'nmol/L' }, // LOINC
  'cortisol': { type: 'serum-cortisol', unit: 'nmol/L' },
  '2143-6': { type: 'serum-cortisol', unit: 'nmol/L' }, // LOINC
  
  // Electrolytes
  'sodium': { type: 'sodium', unit: 'mmol/L' },
  'na': { type: 'sodium', unit: 'mmol/L' },
  '2951-2': { type: 'sodium', unit: 'mmol/L' }, // LOINC
  'potassium': { type: 'potassium', unit: 'mmol/L' },
  'k': { type: 'potassium', unit: 'mmol/L' },
  '2823-3': { type: 'potassium', unit: 'mmol/L' }, // LOINC
  'chloride': { type: 'chloride', unit: 'mmol/L' },
  'cl': { type: 'chloride', unit: 'mmol/L' },
  '2075-0': { type: 'chloride', unit: 'mmol/L' }, // LOINC
  'bicarbonate': { type: 'bicarbonate', unit: 'mmol/L' },
  'co2': { type: 'bicarbonate', unit: 'mmol/L' },
  '2028-9': { type: 'bicarbonate', unit: 'mmol/L' }, // LOINC

  // Inflammation
  'crp': { type: 'crp', unit: 'mg/L' },
  'c-reactive protein': { type: 'crp', unit: 'mg/L' },
  'hs-crp': { type: 'hscrp', unit: 'mg/L' },
  'high sensitivity crp': { type: 'hscrp', unit: 'mg/L' },

  // Complete Blood Count
  'wbc': { type: 'wbc', unit: '×10⁹/L' },
  'white blood cell': { type: 'wbc', unit: '×10⁹/L' },
  'rbc': { type: 'rbc', unit: '×10¹²/L' },
  'red blood cell': { type: 'rbc', unit: '×10¹²/L' },
  'hemoglobin': { type: 'haemoglobin', unit: 'g/L' },
  'haemoglobin': { type: 'haemoglobin', unit: 'g/L' },
  'hematocrit': { type: 'hct', unit: '%' },
  'haematocrit': { type: 'hct', unit: '%' },
  'hct': { type: 'hct', unit: '%' },
  'platelets': { type: 'platelets', unit: '×10⁹/L' },
};

/**
 * Extract and create biomarkers from lab observations
 * @param labData - Lab observations data from interpreter
 * @param userId - User ID
 * @param reportId - Medical report ID for linking
 * @returns Array of created biomarker IDs
 */
export async function extractBiomarkersFromLabs(
  labData: ObservationLabsData,
  userId: string,
  reportId: string
): Promise<string[]> {
  const createdBiomarkers: string[] = [];

  console.log('🔍 labData structure:', JSON.stringify(labData, null, 2).substring(0, 500));
  
  if (!labData.observations || labData.observations.length === 0) {
    console.log('⚠️ No observations to extract biomarkers from. labData.observations:', labData.observations);
    return createdBiomarkers;
  }

  console.log(`🔬 Extracting biomarkers from ${labData.observations.length} lab observations`);

  for (const obs of labData.observations) {
    try {
      const biomarkerData = mapObservationToBiomarker(obs, userId, reportId);
      
      if (biomarkerData) {
        // Upsert biomarker (create or update if exists on same date)
        const biomarker = await storage.upsertBiomarker(biomarkerData);
        createdBiomarkers.push(biomarker.id);
        console.log(`✅ Created/updated biomarker: ${biomarkerData.type} = ${biomarkerData.value} ${biomarkerData.unit}`);
      } else {
        console.log(`⚠️  Could not map observation to biomarker: ${obs.display} (${obs.code})`);
      }
    } catch (error) {
      console.error(`❌ Error creating biomarker from observation ${obs.code}:`, error);
    }
  }

  console.log(`📊 Successfully extracted ${createdBiomarkers.length} biomarkers`);
  return createdBiomarkers;
}

/**
 * Normalize a lab code or display name for lookup
 * Handles LOINC codes, underscores, hyphens, and variations
 */
function normalizeLabKey(key: string): string[] {
  const lower = key.toLowerCase().trim();
  const variants = [lower];
  
  // Add version without hyphens and underscores
  const normalized = lower.replace(/[-_]/g, ' ');
  if (normalized !== lower) {
    variants.push(normalized);
  }
  
  // Add version without spaces
  const compact = lower.replace(/[-_\s]/g, '');
  if (compact !== lower) {
    variants.push(compact);
  }
  
  // Add version with underscores replaced by spaces
  const underscoreToSpace = lower.replace(/_/g, ' ');
  if (underscoreToSpace !== lower) {
    variants.push(underscoreToSpace);
  }
  
  return variants;
}

/**
 * Map a lab observation to a biomarker insert object
 */
function mapObservationToBiomarker(
  obs: LabObservation,
  userId: string,
  reportId: string
): InsertBiomarker | null {
  // Try to find matching biomarker type using normalized keys
  const codeVariants = normalizeLabKey(obs.code);
  const displayVariants = normalizeLabKey(obs.display);
  
  let mapping = null;
  
  // Try all variants of code first
  for (const variant of codeVariants) {
    if (LAB_TO_BIOMARKER_MAP[variant]) {
      mapping = LAB_TO_BIOMARKER_MAP[variant];
      break;
    }
  }
  
  // If not found, try all variants of display
  if (!mapping) {
    for (const variant of displayVariants) {
      if (LAB_TO_BIOMARKER_MAP[variant]) {
        mapping = LAB_TO_BIOMARKER_MAP[variant];
        break;
      }
    }
  }
  
  if (!mapping) {
    return null;
  }

  // Extract numeric value
  const numericValue = typeof obs.value === 'number' 
    ? obs.value 
    : parseFloat(String(obs.value));

  if (isNaN(numericValue)) {
    console.warn(`Non-numeric value for ${obs.display}: ${obs.value}`);
    return null;
  }

  // Determine date
  const date = obs.collected_at ? new Date(obs.collected_at) : new Date();

  // Build biomarker insert object
  const biomarker: InsertBiomarker = {
    userId,
    type: mapping.type,
    value: numericValue,
    unit: obs.unit || mapping.unit || '',
    date,
    source: 'medical-interpreter',
    recordId: reportId,
    notes: `Auto-extracted from ${obs.display} (${obs.code})`,
  };

  // Add reference range if available
  if (obs.reference_range && obs.reference_range.low !== null && obs.reference_range.high !== null) {
    biomarker.referenceRange = {
      low: obs.reference_range.low,
      high: obs.reference_range.high,
    };
  }

  return biomarker;
}

/**
 * Get summary of biomarkers that will be extracted (without actually creating them)
 * Useful for preview before committing
 */
export function previewBiomarkerExtraction(labData: ObservationLabsData): {
  totalObservations: number;
  mappableObservations: number;
  unmappedObservations: string[];
} {
  const unmapped: string[] = [];
  let mappable = 0;

  for (const obs of labData.observations) {
    const searchKey = obs.code.toLowerCase();
    const displayKey = obs.display.toLowerCase();
    const mapping = LAB_TO_BIOMARKER_MAP[searchKey] || LAB_TO_BIOMARKER_MAP[displayKey];
    
    if (mapping) {
      mappable++;
    } else {
      unmapped.push(`${obs.display} (${obs.code})`);
    }
  }

  return {
    totalObservations: labData.observations.length,
    mappableObservations: mappable,
    unmappedObservations: unmapped,
  };
}

/**
 * Mapping from imaging codes to HealthPilot biomarker types
 */
const IMAGING_TO_BIOMARKER_MAP: Record<string, { type: string; unit?: string }> = {
  'cac': { type: 'calcium-score', unit: 'Agatston units' },
  'coronary artery calcium': { type: 'calcium-score', unit: 'Agatston units' },
  'coronary artery calcium score': { type: 'calcium-score', unit: 'Agatston units' },
  'calcium score': { type: 'calcium-score', unit: 'Agatston units' },
};

/**
 * Map an imaging observation to a biomarker entry
 */
function mapImagingObservationToBiomarker(
  obs: ImagingObservation,
  userId: string,
  reportId: string
): InsertBiomarker | null {
  const searchKey = obs.code.toLowerCase();
  const displayKey = obs.display.toLowerCase();
  const mapping = IMAGING_TO_BIOMARKER_MAP[searchKey] || IMAGING_TO_BIOMARKER_MAP[displayKey];

  if (!mapping) {
    return null;
  }

  const biomarker: InsertBiomarker = {
    userId,
    type: mapping.type,
    value: obs.value,
    unit: obs.unit || mapping.unit || '',
    recordedAt: new Date(obs.collected_at),
    source: 'medical-report',
    medicalReportId: reportId,
    notes: obs.flags?.join('; ') || null,
  };

  return biomarker;
}

/**
 * Extract biomarkers from imaging observations
 */
export async function extractBiomarkersFromImaging(
  imagingData: { observations: ImagingObservation[] },
  userId: string,
  reportId: string
): Promise<string[]> {
  const createdBiomarkers: string[] = [];

  if (!imagingData.observations || imagingData.observations.length === 0) {
    console.log('No imaging observations to extract biomarkers from');
    return createdBiomarkers;
  }

  console.log(`🔬 Extracting biomarkers from ${imagingData.observations.length} imaging observations`);

  for (const obs of imagingData.observations) {
    try {
      const biomarkerData = mapImagingObservationToBiomarker(obs, userId, reportId);
      
      if (biomarkerData) {
        const biomarker = await storage.upsertBiomarker(biomarkerData);
        createdBiomarkers.push(biomarker.id);
        console.log(`✅ Created/updated biomarker: ${biomarkerData.type} = ${biomarkerData.value} ${biomarkerData.unit}`);
      } else {
        console.log(`⚠️  Could not map imaging observation to biomarker: ${obs.display} (${obs.code})`);
      }
    } catch (error) {
      console.error(`❌ Error creating biomarker from imaging observation ${obs.code}:`, error);
    }
  }

  console.log(`📊 Successfully extracted ${createdBiomarkers.length} biomarkers from imaging`);
  return createdBiomarkers;
}
