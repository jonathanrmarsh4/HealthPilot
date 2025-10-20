// Biomarker Extraction Service
// Converts lab observations to HealthPilot biomarker entries

import type { ObservationLabsData, LabObservation } from './types';
import type { InsertBiomarker } from '@shared/schema';
import { storage } from '../../storage';

/**
 * Mapping from common lab codes/displays to HealthPilot biomarker types
 */
const LAB_TO_BIOMARKER_MAP: Record<string, { type: string; unit?: string }> = {
  // Lipid Panel
  'ldl': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'low-density lipoprotein': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'ldl cholesterol': { type: 'ldl-cholesterol', unit: 'mmol/L' },
  'hdl': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'high-density lipoprotein': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'hdl cholesterol': { type: 'hdl-cholesterol', unit: 'mmol/L' },
  'cholesterol': { type: 'total-cholesterol', unit: 'mmol/L' },
  'total cholesterol': { type: 'total-cholesterol', unit: 'mmol/L' },
  'triglycerides': { type: 'triglycerides', unit: 'mmol/L' },
  'trig': { type: 'triglycerides', unit: 'mmol/L' },

  // Glucose & Diabetes
  'glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  'fasting glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  'blood glucose': { type: 'fasting-glucose', unit: 'mmol/L' },
  'hba1c': { type: 'hba1c', unit: '%' },
  'a1c': { type: 'hba1c', unit: '%' },
  'glycated hemoglobin': { type: 'hba1c', unit: '%' },
  'hemoglobin a1c': { type: 'hba1c', unit: '%' },

  // Thyroid
  'tsh': { type: 'tsh', unit: 'mIU/L' },
  'thyroid stimulating hormone': { type: 'tsh', unit: 'mIU/L' },
  't4': { type: 't4', unit: 'pmol/L' },
  'thyroxine': { type: 't4', unit: 'pmol/L' },
  't3': { type: 't3', unit: 'pmol/L' },

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
  'cortisol': { type: 'serum-cortisol', unit: 'nmol/L' },

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

  if (!labData.observations || labData.observations.length === 0) {
    console.log('No observations to extract biomarkers from');
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
 * Map a lab observation to a biomarker insert object
 */
function mapObservationToBiomarker(
  obs: LabObservation,
  userId: string,
  reportId: string
): InsertBiomarker | null {
  // Try to find matching biomarker type
  const searchKey = obs.code.toLowerCase();
  const displayKey = obs.display.toLowerCase();
  
  const mapping = LAB_TO_BIOMARKER_MAP[searchKey] || LAB_TO_BIOMARKER_MAP[displayKey];
  
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
