/**
 * Unit tests for SimpleMatcher
 * 
 * Tests common exercise confusions and edge cases to ensure deterministic,
 * correct matching of HealthPilot exercises to ExerciseDB entries.
 */

import { describe, it, expect } from 'vitest';
import { resolveSimple, MATCH_THRESHOLD, type HPExercise, type ExerciseDBCandidate } from '../simpleMatcher';

describe('SimpleMatcher', () => {
  describe('Lat Pulldown vs Seated Row', () => {
    it('should match Lat Pulldown correctly, not Seated Row', () => {
      const hp: HPExercise = {
        id: '1',
        name: 'Lat Pulldown',
        muscles: ['back'],
        equipment: 'cable',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Seated Row',
          target: 'upper back',
          bodyPart: 'back',
          equipment: 'cable',
        },
        {
          exerciseId: 'B',
          name: 'Lat Pulldown',
          target: 'lats',
          bodyPart: 'back',
          equipment: 'cable',
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      expect(result).not.toBeNull();
      expect(result?.exercisedbId).toBe('B');
      expect(result?.name).toBe('Lat Pulldown');
      expect(result?.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });
  });
  
  describe('Bench Press Variants', () => {
    it('should match Barbell Bench Press to barbell variant, not dumbbell', () => {
      const hp: HPExercise = {
        id: '2',
        name: 'Barbell Bench Press',
        muscles: ['chest'],
        equipment: 'barbell',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Dumbbell Bench Press',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'dumbbell',
        },
        {
          exerciseId: 'B',
          name: 'Barbell Bench Press',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'barbell',
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      expect(result).not.toBeNull();
      expect(result?.exercisedbId).toBe('B');
      expect(result?.equipment).toBe('barbell');
    });
    
    it('should REJECT same-name/different-equipment candidates (CRITICAL bug prevention)', () => {
      const hp: HPExercise = {
        id: '3',
        name: 'Bench Press',
        muscles: ['chest'],
        equipment: 'barbell',
      };
      
      const wrongEquipment: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Bench Press',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'dumbbell',  // Wrong equipment!
        },
      ];
      
      const result = resolveSimple(hp, wrongEquipment);
      
      // CRITICAL: Equipment conflict penalty (5) must push score below threshold (7)
      // Name match: +2 (closeName), Target: +3, BodyPart: +2, EquipmentConflict: -5
      // Total: 2+3+2-5 = 2 < MATCH_THRESHOLD(7) → Should return null
      expect(result).toBeNull();
    });
    
    it('should penalize equipment mismatch when other candidates exist', () => {
      const hp: HPExercise = {
        id: '4',
        name: 'Bench Press',
        muscles: ['chest'],
        equipment: 'barbell',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Bench Press',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'dumbbell',  // Wrong equipment!
        },
        {
          exerciseId: 'B',
          name: 'Barbell Bench Press',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'barbell',  // Correct equipment
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      // Should choose correct equipment variant
      expect(result).not.toBeNull();
      expect(result?.exercisedbId).toBe('B');
      expect(result?.equipment).toBe('barbell');
    });
  });
  
  describe('Synonym Handling', () => {
    it('should treat "pushup" and "push up" as equivalent', () => {
      const hp: HPExercise = {
        id: '4',
        name: 'Pushup',
        muscles: ['chest'],
        equipment: 'bodyweight',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Push Up',
          target: 'pectorals',
          bodyPart: 'chest',
          equipment: 'body weight',
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      expect(result).not.toBeNull();
      expect(result?.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });
    
    it('should recognize RDL as Romanian Deadlift', () => {
      const hp: HPExercise = {
        id: '5',
        name: 'RDL',
        muscles: ['hamstrings'],
        equipment: 'barbell',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Romanian Deadlift',
          target: 'hamstrings',
          bodyPart: 'legs',
          equipment: 'barbell',
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      expect(result).not.toBeNull();
      expect(result?.name).toContain('Romanian Deadlift');
    });
  });
  
  describe('Target Muscle Mismatch Detection', () => {
    it('should penalize wrong target muscle', () => {
      const hp: HPExercise = {
        id: '6',
        name: 'Squat',
        muscles: ['legs'],
        equipment: 'barbell',
      };
      
      const wrongMuscle: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Squat',
          target: 'pectorals',  // Wrong! Squat doesn't target chest
          bodyPart: 'chest',
          equipment: 'barbell',
        },
      ];
      
      const result = resolveSimple(hp, wrongMuscle);
      
      // Should either return null or have very low score
      if (result) {
        expect(result.score).toBeLessThan(MATCH_THRESHOLD);
      }
    });
  });
  
  describe('Confidence Levels', () => {
    it('should assign high confidence to excellent matches', () => {
      const hp: HPExercise = {
        id: '7',
        name: 'Deadlift',
        muscles: ['hamstrings'],
        equipment: 'barbell',
      };
      
      const perfect: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Barbell Deadlift',
          target: 'hamstrings',
          bodyPart: 'legs',
          equipment: 'barbell',
        },
      ];
      
      const result = resolveSimple(hp, perfect);
      
      expect(result).not.toBeNull();
      expect(result?.confidence).toBe('high');
      expect(result?.score).toBeGreaterThanOrEqual(9);
    });
    
    it('should assign medium confidence to good matches', () => {
      const hp: HPExercise = {
        id: '8',
        name: 'Curl',
        muscles: ['biceps'],
        equipment: 'dumbbell',
      };
      
      const good: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Dumbbell Bicep Curl',  // Name close but not exact
          target: 'biceps',
          bodyPart: 'arms',
          equipment: 'dumbbell',
        },
      ];
      
      const result = resolveSimple(hp, good);
      
      expect(result).not.toBeNull();
      expect(['medium', 'high']).toContain(result?.confidence);
      expect(result?.score).toBeGreaterThanOrEqual(MATCH_THRESHOLD);
    });
  });
  
  describe('Threshold Enforcement', () => {
    it('should return null if score below MATCH_THRESHOLD', () => {
      const hp: HPExercise = {
        id: '9',
        name: 'Extremely Unique Exercise Name XYZ123',
        muscles: ['chest'],
        equipment: 'other',
      };
      
      const poorMatches: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Completely Different Exercise',
          target: 'lats',
          bodyPart: 'back',
          equipment: 'cable',
        },
      ];
      
      const result = resolveSimple(hp, poorMatches);
      
      expect(result).toBeNull();
    });
  });
  
  describe('No Candidates', () => {
    it('should return null when no candidates provided', () => {
      const hp: HPExercise = {
        id: '10',
        name: 'Any Exercise',
        muscles: ['chest'],
        equipment: 'barbell',
      };
      
      const result = resolveSimple(hp, []);
      
      expect(result).toBeNull();
    });
  });
  
  describe('Score Breakdown Transparency', () => {
    it('should provide transparent score breakdown', () => {
      const hp: HPExercise = {
        id: '11',
        name: 'Overhead Press',
        muscles: ['shoulders'],
        equipment: 'barbell',
      };
      
      const candidates: ExerciseDBCandidate[] = [
        {
          exerciseId: 'A',
          name: 'Barbell Overhead Press',
          target: 'delts',
          bodyPart: 'shoulders',
          equipment: 'barbell',
        },
      ];
      
      const result = resolveSimple(hp, candidates);
      
      expect(result).not.toBeNull();
      expect(result?.breakdown).toBeDefined();
      expect(typeof result?.breakdown).toBe('object');
      expect(Object.keys(result?.breakdown || {}).length).toBeGreaterThan(0);
    });
  });
});
