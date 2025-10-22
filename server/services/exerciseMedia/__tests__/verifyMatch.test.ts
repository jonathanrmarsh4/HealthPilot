/**
 * Verification Match Tests
 * 
 * Tests the strict binding verification logic that ensures ExerciseDB items
 * match the clicked exercise before displaying media.
 */

import { describe, it, expect } from 'vitest';
import { verifyDbItemMatches } from '../verifyMatch';
import type { ExerciseDBItemFull } from '../../exerciseDb/getById';

describe('verifyDbItemMatches', () => {
  describe('exact matches', () => {
    it('accepts same name + same target', () => {
      const hp = {
        name: 'Lat Pulldown',
        target: 'lats',
        bodyPart: 'back',
      };
      const db: ExerciseDBItemFull = {
        id: 'X',
        name: 'Lat Pulldown',
        target: 'lats',
        bodyPart: 'back',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
      expect(result.reasons).toBeUndefined();
    });

    it('accepts same name + same bodyPart (when target differs)', () => {
      const hp = {
        name: 'Plank',
        target: 'abs',
        bodyPart: 'core',
      };
      const db: ExerciseDBItemFull = {
        id: 'Y',
        name: 'Plank',
        target: 'core',
        bodyPart: 'core',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
      expect(result.reasons).toBeUndefined();
    });
  });

  describe('name variations', () => {
    it('accepts name containing HP name', () => {
      const hp = {
        name: 'Squat',
        target: 'quads',
        bodyPart: 'legs',
      };
      const db: ExerciseDBItemFull = {
        id: 'Z',
        name: 'Barbell Squat',
        target: 'quads',
        bodyPart: 'legs',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
    });

    it('accepts HP name containing DB name', () => {
      const hp = {
        name: 'Barbell Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
      };
      const db: ExerciseDBItemFull = {
        id: 'A',
        name: 'Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
    });

    it('normalizes special characters and case', () => {
      const hp = {
        name: 'Dumbbell Bicep Curl',
        target: 'biceps',
        bodyPart: 'arms',
      };
      const db: ExerciseDBItemFull = {
        id: 'B',
        name: 'DUMBBELL  BICEP-CURL!!!',
        target: 'biceps',
        bodyPart: 'arms',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
    });
  });

  describe('rejection cases', () => {
    it('rejects name mismatch even if GIF exists', () => {
      const hp = {
        name: 'Lat Pulldown',
        target: 'lats',
        bodyPart: 'back',
      };
      const db: ExerciseDBItemFull = {
        id: 'C',
        name: 'Tricep Pushdown', // completely different exercise
        target: 'triceps',
        bodyPart: 'arms',
        gifUrl: 'https://example.com/gif.gif',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(false);
      expect(result.reasons).toBeDefined();
      expect(result.reasons!.length).toBeGreaterThan(0);
      expect(result.reasons!.some(r => r.includes('Name mismatch'))).toBe(true);
    });

    it('rejects muscle mismatch (neither target nor bodyPart match)', () => {
      const hp = {
        name: 'Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
      };
      const db: ExerciseDBItemFull = {
        id: 'D',
        name: 'Bench Press',
        target: 'quads', // wrong muscle
        bodyPart: 'legs', // wrong body part
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(false);
      expect(result.reasons).toBeDefined();
      expect(result.reasons!.some(r => r.includes('Muscle mismatch'))).toBe(true);
    });

    it('requires BOTH name AND (target OR bodyPart) match', () => {
      const hp = {
        name: 'Squat',
        target: 'quads',
        bodyPart: 'legs',
      };
      const db: ExerciseDBItemFull = {
        id: 'E',
        name: 'Deadlift', // name mismatch
        target: 'quads', // target matches
        bodyPart: 'legs', // bodyPart matches
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(false);
      expect(result.reasons!.some(r => r.includes('Name mismatch'))).toBe(true);
    });
  });

  describe('equipment handling', () => {
    it('does not block on equipment mismatch (informational only)', () => {
      const hp = {
        name: 'Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
        equipment: 'barbell',
      };
      const db: ExerciseDBItemFull = {
        id: 'F',
        name: 'Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
        equipment: 'dumbbell',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      // Should pass despite equipment difference
      expect(result.ok).toBe(true);
    });

    it('handles null equipment gracefully', () => {
      const hp = {
        name: 'Push-Up',
        target: 'pecs',
        bodyPart: 'chest',
        equipment: null,
      };
      const db: ExerciseDBItemFull = {
        id: 'G',
        name: 'Push-Up',
        target: 'pecs',
        bodyPart: 'chest',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles empty string names', () => {
      const hp = {
        name: '',
        target: 'unknown',
        bodyPart: 'unknown',
      };
      const db: ExerciseDBItemFull = {
        id: 'H',
        name: '',
        target: 'unknown',
        bodyPart: 'unknown',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      // Empty names should match (edge case)
      expect(result.ok).toBe(true);
    });

    it('handles whitespace-only names (both normalize to empty)', () => {
      const hp = {
        name: '   ',
        target: 'quads',
        bodyPart: 'legs',
      };
      const db: ExerciseDBItemFull = {
        id: 'I',
        name: '   ',
        target: 'quads',
        bodyPart: 'legs',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      // After normalization, both are empty strings, which match
      expect(result.ok).toBe(true);
    });
  });

  describe('realistic scenarios', () => {
    it('accepts squat variations with overlapping names', () => {
      const scenarios = [
        { hp: 'Back Squat', db: 'Barbell Back Squat' }, // "back squat" is in "barbell back squat"
        { hp: 'Squat', db: 'Barbell Squat' }, // "squat" is in "barbell squat"
        { hp: 'BACK SQUAT', db: 'back squat' }, // exact match (case insensitive)
      ];

      scenarios.forEach(({ hp: hpName, db: dbName }) => {
        const result = verifyDbItemMatches(
          { name: hpName, target: 'quads', bodyPart: 'legs' },
          { id: 'test', name: dbName, target: 'quads', bodyPart: 'legs' }
        );
        expect(result.ok).toBe(true);
      });
    });

    it('rejects cross-contamination (chest exercise with leg demo)', () => {
      const hp = {
        name: 'Bench Press',
        target: 'pecs',
        bodyPart: 'chest',
      };
      const db: ExerciseDBItemFull = {
        id: 'J',
        name: 'Leg Press',
        target: 'quads',
        bodyPart: 'legs',
      };
      
      const result = verifyDbItemMatches(hp, db);
      
      expect(result.ok).toBe(false);
      expect(result.reasons!.length).toBe(2); // Both name and muscle mismatch
    });
  });
});
