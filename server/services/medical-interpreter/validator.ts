// Validation Service
// Validates extracted data against spec rules

import type { ValidationResult, ObservationLabsData, LabObservation } from './types';

/**
 * Validate lab observations data
 * @param data - Lab observations to validate
 * @param ingestedAt - Ingestion timestamp
 * @returns Validation results array
 */
export function validateLabData(
  data: ObservationLabsData,
  ingestedAt: Date
): ValidationResult[] {
  const results: ValidationResult[] = [];

  for (const obs of data.observations) {
    // Rule 1: Observation values must be numeric when a numeric unit is present
    if (hasNumericUnit(obs.unit)) {
      const numericValue = typeof obs.value === 'number' ? obs.value : parseFloat(String(obs.value));
      if (isNaN(numericValue)) {
        results.push({
          outcome: 'fail',
          message: `Value for ${obs.display} is not numeric despite having numeric unit ${obs.unit}`,
          field: obs.code,
        });
      }
    }

    // Rule 2: Reference range unit must match observation unit
    if (obs.reference_range && obs.reference_range.unit) {
      if (obs.reference_range.unit !== obs.unit) {
        results.push({
          outcome: 'warn',
          message: `Reference range unit (${obs.reference_range.unit}) does not match observation unit (${obs.unit}) for ${obs.display}`,
          field: obs.code,
        });
      }
    }

    // Rule 3: Timestamp ordering - collected_at must be <= ingested_at
    if (obs.collected_at) {
      const collectedDate = new Date(obs.collected_at);
      if (collectedDate > ingestedAt) {
        results.push({
          outcome: 'warn',
          message: `Collection time (${obs.collected_at}) is in the future relative to ingestion time`,
          field: obs.code,
        });
      }
    }

    // Rule 4: Missing units when required
    if (!obs.unit || obs.unit.trim() === '') {
      results.push({
        outcome: 'fail',
        message: `Missing unit for ${obs.display}`,
        field: obs.code,
      });
    }

    // Rule 5: Outlier screening (simplified - flag extremely high/low values)
    if (typeof obs.value === 'number' && obs.reference_range) {
      const { low, high } = obs.reference_range;
      if (low !== null && high !== null) {
        const range = high - low;
        const deviation = Math.abs(obs.value - (low + high) / 2);
        
        // Flag if value is >8 standard deviations from midpoint (simplified)
        if (deviation > range * 4) {
          results.push({
            outcome: 'warn',
            message: `Value ${obs.value} ${obs.unit} for ${obs.display} is unusually far from reference range`,
            field: obs.code,
          });
        }
      }
    }
  }

  // If no issues found, add pass result
  if (results.length === 0) {
    results.push({
      outcome: 'pass',
      message: 'All validation checks passed',
    });
  }

  return results;
}

/**
 * Check if a unit suggests numeric values
 */
function hasNumericUnit(unit: string): boolean {
  const numericUnits = [
    'mg/dl', 'mmol/l', 'µmol/l', 'g/l', 'u/l', '%',
    'bpm', 'mmhg', 'cm', 'kg', 'fl', 'pg', 'x10^9/l'
  ];
  return numericUnits.some(nu => unit.toLowerCase().includes(nu));
}
