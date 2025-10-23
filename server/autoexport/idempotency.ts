/**
 * Idempotency key generation for HealthKit events
 * 
 * Ensures duplicate events are not stored multiple times
 */

import { createHash } from 'crypto';

export interface IdempotencyInput {
  userId: string;
  type: string;
  tsStart?: Date | null;
  tsEnd?: Date | null;
  tsInstant?: Date | null;
  value: any; // The actual value/data
}

/**
 * Generate a deterministic idempotency key for a HealthKit event
 * 
 * Format: sha256(userId|type|start|end|instant|stableValueHash)
 */
export function generateIdempotencyKey(input: IdempotencyInput): string {
  const parts: string[] = [
    input.userId,
    input.type,
    input.tsStart?.toISOString() || '',
    input.tsEnd?.toISOString() || '',
    input.tsInstant?.toISOString() || '',
  ];
  
  // Create a stable hash of the value
  // Sort object keys to ensure consistent hashing
  const valueHash = hashValue(input.value);
  parts.push(valueHash);
  
  const combined = parts.join('|');
  return createHash('sha256').update(combined).digest('hex');
}

/**
 * Create a stable hash of any value
 * Handles objects, arrays, primitives
 */
function hashValue(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      // Hash array elements
      return value.map(v => hashValue(v)).join(',');
    }
    
    // Sort object keys for deterministic hashing
    const sorted: any = {};
    Object.keys(value).sort().forEach(key => {
      sorted[key] = value[key];
    });
    return createHash('sha256').update(JSON.stringify(sorted)).digest('hex').substring(0, 16);
  }
  
  // Primitive value
  return String(value);
}
