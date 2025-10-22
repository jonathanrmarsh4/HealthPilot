/**
 * Exercise Conversion Tests
 * 
 * Tests the conversion logic from ExerciseDB format to HP exercise format
 */

import { describe, it, expect } from 'vitest';
import { convertExerciseDbToHp, validateConvertedExercise } from '../convertExerciseDbToHp';

describe('convertExerciseDbToHp', () => {
  it('converts barbell bench press correctly', () => {
    const dbExercise = {
      exerciseId: '0025',
      name: 'Barbell Bench Press',
      bodyPart: 'chest',
      equipment: 'barbell',
      target: 'pectorals',
      secondaryMuscles: ['triceps', 'shoulders'],
      instructions: [
        'Lie flat on a bench',
        'Lower the bar to your chest',
        'Press the bar back up',
      ],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.name).toBe('Barbell Bench Press');
    expect(result.muscles).toContain('chest');
    expect(result.muscles).toContain('arms'); // triceps normalized to arms
    expect(result.muscles).toContain('shoulders');
    expect(result.equipment).toBe('barbell');
    expect(result.category).toBe('compound'); // chest + multiple muscles
    expect(result.trackingType).toBe('weight_reps');
    expect(result.incrementStep).toBe(2.5);
    expect(result.restDefault).toBe(120); // compound exercises get more rest
    expect(result.exercisedbId).toBe('0025');
    expect(result.instructions).toBeTruthy();
  });

  it('converts bodyweight pull-up correctly', () => {
    const dbExercise = {
      exerciseId: '0100',
      name: 'Pull-Up',
      bodyPart: 'back',
      equipment: 'body weight',
      target: 'lats',
      secondaryMuscles: ['biceps', 'forearms'],
      instructions: ['Hang from bar', 'Pull yourself up', 'Lower with control'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('bodyweight');
    expect(result.category).toBe('compound'); // back + multiple muscles
    expect(result.trackingType).toBe('bodyweight_reps');
    expect(result.incrementStep).toBe(0); // bodyweight exercises don't have weight increments
    expect(result.difficulty).toBe('advanced'); // bodyweight compound = advanced
  });

  it('converts machine exercise correctly', () => {
    const dbExercise = {
      exerciseId: '0200',
      name: 'Leg Press',
      bodyPart: 'legs',
      equipment: 'leverage machine',
      target: 'quads',
      secondaryMuscles: ['glutes', 'hamstrings'],
      instructions: ['Sit in machine', 'Push with legs', 'Control the return'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('machine');
    expect(result.category).toBe('compound'); // legs + glutes
    expect(result.trackingType).toBe('weight_reps');
    expect(result.incrementStep).toBe(5); // machines use larger increments
    expect(result.difficulty).toBe('beginner'); // machines are easier
  });

  it('converts dumbbell isolation exercise correctly', () => {
    const dbExercise = {
      exerciseId: '0300',
      name: 'Dumbbell Bicep Curl',
      bodyPart: 'arms',
      equipment: 'dumbbell',
      target: 'biceps',
      secondaryMuscles: ['forearms'],
      instructions: ['Hold dumbbells', 'Curl up', 'Lower slowly'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('dumbbell');
    expect(result.category).toBe('isolation'); // only arms targeted
    expect(result.trackingType).toBe('weight_reps');
    expect(result.incrementStep).toBe(2.0); // dumbbells use smaller increments
    expect(result.restDefault).toBe(60); // isolation gets less rest
    expect(result.difficulty).toBe('beginner');
  });

  it('normalizes muscle names correctly', () => {
    const dbExercise = {
      exerciseId: '0400',
      name: 'Test Exercise',
      bodyPart: 'back',
      equipment: 'cable',
      target: 'lats',
      secondaryMuscles: ['traps', 'biceps'],
      instructions: ['Test'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.muscles).toContain('back'); // lats → back
    expect(result.muscles).toContain('back'); // traps → back (deduplicated)
    expect(result.muscles).toContain('arms'); // biceps → arms
  });

  it('deduplicates muscles correctly', () => {
    const dbExercise = {
      exerciseId: '0500',
      name: 'Test Exercise',
      bodyPart: 'chest',
      equipment: 'cable',
      target: 'pectorals',
      secondaryMuscles: ['pectorals', 'chest'], // duplicates
      instructions: ['Test'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    // Should only have chest once
    const chestCount = result.muscles.filter(m => m === 'chest').length;
    expect(chestCount).toBe(1);
  });

  it('handles medicine ball exercises (other equipment) correctly', () => {
    const dbExercise = {
      exerciseId: '0600',
      name: 'Medicine Ball Slam',
      bodyPart: 'core',
      equipment: 'medicine ball',
      target: 'abs',
      secondaryMuscles: ['shoulders', 'lats'],
      instructions: ['Hold medicine ball', 'Slam to ground', 'Catch on bounce'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('other'); // medicine ball normalized to other
    expect(result.category).toBe('compound'); // core + shoulders + back
    expect(result.category).not.toBe('cardio'); // should NOT be cardio
    expect(result.muscles).toContain('core');
    expect(result.muscles).toContain('shoulders');
    expect(result.muscles).toContain('back');
  });

  it('handles stability ball exercises (other equipment) correctly', () => {
    const dbExercise = {
      exerciseId: '0700',
      name: 'Stability Ball Crunch',
      bodyPart: 'core',
      equipment: 'stability ball',
      target: 'abs',
      secondaryMuscles: [],
      instructions: ['Lie on ball', 'Perform crunch', 'Control movement'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('other'); // stability ball normalized to other
    expect(result.category).toBe('isolation'); // only core targeted
    expect(result.category).not.toBe('cardio'); // should NOT be cardio
  });

  it('handles weighted exercises (other equipment) correctly', () => {
    const dbExercise = {
      exerciseId: '0800',
      name: 'Weighted Step-Up',
      bodyPart: 'legs',
      equipment: 'weighted',
      target: 'quads',
      secondaryMuscles: ['glutes', 'hamstrings'],
      instructions: ['Step up', 'Extend leg', 'Step down'],
    };

    const result = convertExerciseDbToHp(dbExercise);

    expect(result.equipment).toBe('other'); // weighted normalized to other
    expect(result.category).toBe('compound'); // legs + glutes
    expect(result.category).not.toBe('cardio'); // should NOT be cardio
  });
});

describe('validateConvertedExercise', () => {
  it('accepts valid exercise', () => {
    const exercise = {
      name: 'Test Exercise',
      muscles: ['chest', 'arms'],
      equipment: 'barbell',
      incrementStep: 2.5,
      tempoDefault: null,
      restDefault: 90,
      instructions: 'Test instructions',
      videoUrl: null,
      difficulty: 'intermediate',
      category: 'compound',
      trackingType: 'weight_reps',
      exercisedbId: '1234',
    };

    const result = validateConvertedExercise(exercise);

    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('rejects exercise with no name', () => {
    const exercise = {
      name: '',
      muscles: ['chest'],
      equipment: 'barbell',
      incrementStep: 2.5,
      tempoDefault: null,
      restDefault: 90,
      instructions: null,
      videoUrl: null,
      difficulty: 'intermediate',
      category: 'compound',
      trackingType: 'weight_reps',
      exercisedbId: '1234',
    };

    const result = validateConvertedExercise(exercise);

    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing name');
  });

  it('rejects exercise with invalid equipment', () => {
    const exercise = {
      name: 'Test',
      muscles: ['chest'],
      equipment: 'invalid_equipment',
      incrementStep: 2.5,
      tempoDefault: null,
      restDefault: 90,
      instructions: null,
      videoUrl: null,
      difficulty: 'intermediate',
      category: 'compound',
      trackingType: 'weight_reps',
      exercisedbId: '1234',
    };

    const result = validateConvertedExercise(exercise);

    expect(result.valid).toBe(false);
    expect(result.issues.some(i => i.includes('Invalid equipment'))).toBe(true);
  });
});
