// Unit Normalization Service
// Converts non-SI units to SI units using spec conversion tables

import type { UnitConversion, ObservationLabsData, LabObservation } from './types';
import { UNIT_CONVERSIONS } from './config';

/**
 * Normalize lab observation units to SI
 * @param data - Lab observations data
 * @returns Normalized data and conversion records
 */
export function normalizeLabData(
  data: ObservationLabsData
): {
  normalizedData: ObservationLabsData;
  conversions: UnitConversion[];
  confidence: number;
} {
  const conversions: UnitConversion[] = [];
  const normalizedObservations: LabObservation[] = [];
  const totalObservations = data.observations.length;
  let successfulConversions = 0;

  for (const obs of data.observations) {
    const normalized = normalizeObservation(obs);
    normalizedObservations.push(normalized.observation);
    
    if (normalized.conversion) {
      conversions.push(normalized.conversion);
      successfulConversions++;
    } else if (isAlreadySI(obs.unit)) {
      successfulConversions++;
    }
  }

  const confidence = totalObservations > 0
    ? successfulConversions / totalObservations
    : 1.0;

  return {
    normalizedData: {
      ...data,
      observations: normalizedObservations,
    },
    conversions,
    confidence,
  };
}

/**
 * Normalize a single observation
 */
function normalizeObservation(obs: LabObservation): {
  observation: LabObservation;
  conversion: UnitConversion | null;
} {
  // Find conversion spec for this observation
  const conversionSpec = findConversionSpec(obs.code.toLowerCase(), obs.unit);

  if (!conversionSpec) {
    // No conversion needed or unit not recognized
    return { observation: obs, conversion: null };
  }

  // Convert value
  const numericValue = typeof obs.value === 'number' ? obs.value : parseFloat(obs.value);
  if (isNaN(numericValue)) {
    return { observation: obs, conversion: null };
  }

  const convertedValue = numericValue * conversionSpec.factor;

  // Convert reference range if present
  const convertedRefRange = obs.reference_range ? {
    low: obs.reference_range.low !== null 
      ? obs.reference_range.low * conversionSpec.factor 
      : null,
    high: obs.reference_range.high !== null
      ? obs.reference_range.high * conversionSpec.factor
      : null,
    unit: conversionSpec.to,
  } : obs.reference_range;

  const conversion: UnitConversion = {
    field: obs.code,
    from: obs.unit,
    to: conversionSpec.to,
    factor: conversionSpec.factor,
  };

  return {
    observation: {
      ...obs,
      value: convertedValue,
      unit: conversionSpec.to,
      reference_range: convertedRefRange,
    },
    conversion,
  };
}

/**
 * Find conversion spec for a given analyte and unit
 */
function findConversionSpec(analyte: string, fromUnit: string): typeof UNIT_CONVERSIONS[0] | null {
  // Normalize units for comparison
  const normalizedFromUnit = fromUnit.trim().toLowerCase();
  
  return UNIT_CONVERSIONS.find(conv => 
    conv.from.toLowerCase() === normalizedFromUnit &&
    analyte.includes(conv.analyte.toLowerCase())
  ) || null;
}

/**
 * Check if unit is already SI
 */
function isAlreadySI(unit: string): boolean {
  const siUnits = ['mmol/l', 'µmol/l', 'g/l', 'u/l', 'iu/l', 'pmol/l', 'ng/l'];
  return siUnits.some(si => unit.toLowerCase().includes(si));
}
