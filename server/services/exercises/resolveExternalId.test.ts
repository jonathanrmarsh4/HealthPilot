/**
 * Unit tests for exercise media matching algorithm
 * 
 * Tests ambiguous cases where multiple candidates share similar attributes
 * but differ in name specificity or equipment.
 */

import { describe, test, expect } from 'vitest';
import { resolve, score } from './resolveExternalId';

// Helper to create HP exercise
const hp = (
  name: string,
  target: string,
  bodyPart: string,
  equipment?: string
) => ({ 
  id: 'hp-test', 
  name, 
  target, 
  bodyPart, 
  equipment 
});

// Helper to create ExerciseDB candidate
const c = (
  id: string,
  name: string,
  target: string,
  bodyPart: string,
  equipment?: string
) => ({ 
  id, 
  name, 
  target, 
  bodyPart, 
  equipment 
});

describe('Exercise Media Matching - Ambiguous Cases', () => {
  test('bench press vs fly (same target/bodyPart, different name)', () => {
    const H = hp("Barbell Bench Press", "pectorals", "chest", "barbell");
    const R = resolve(H, [
      c("A", "dumbbell fly", "pectorals", "chest", "dumbbell"),
      c("B", "barbell bench press", "pectorals", "chest", "barbell")
    ]);
    
    // B should win with exact name match + equipment match
    expect(R?.top.c.id).toBe("B");
    expect(R?.top.score).toBeGreaterThan(5); // Should score high
  });

  test('row variants (tie-break on equipment match)', () => {
    const H = hp("Seated Row", "lats", "back", "cable");
    const R = resolve(H, [
      c("A", "barbell row", "lats", "back", "barbell"),
      c("B", "seated row", "lats", "back", "cable")
    ]);
    
    // B should win with exact name + equipment match
    expect(R?.top.c.id).toBe("B");
  });

  test('curl variants (prefer longer/exact name match)', () => {
    const H = hp("Incline Dumbbell Curl", "biceps", "arms", "dumbbell");
    const R = resolve(H, [
      c("A", "dumbbell curl", "biceps", "arms", "dumbbell"),
      c("B", "incline dumbbell curl", "biceps", "arms", "dumbbell")
    ]);
    
    // B should win with exact name match
    expect(R?.top.c.id).toBe("B");
    expect(R?.top.score).toBe(9); // Perfect match: 3+3+2+1
  });

  test('lat pulldown vs row confusion (same target/bodyPart/equipment)', () => {
    const H = hp("Lat Pulldown", "lats", "back", "cable");
    const R = resolve(H, [
      c("A", "seated cable row", "lats", "back", "cable"),
      c("B", "lat pulldown", "lats", "back", "cable")
    ]);
    
    // B should win with exact name match
    expect(R?.top.c.id).toBe("B");
  });

  test('substring vs exact match priority', () => {
    const H = hp("Push Up", "pectorals", "chest");
    const R = resolve(H, [
      c("A", "push", "pectorals", "chest"), // substring of name
      c("B", "push up", "pectorals", "chest") // exact match
    ]);
    
    // B should win with exact name match (3 points) vs substring (1 point)
    expect(R?.top.c.id).toBe("B");
  });

  test('equipment mismatch penalty', () => {
    const H = hp("Dumbbell Press", "pectorals", "chest", "dumbbell");
    const R = resolve(H, [
      c("A", "dumbbell press", "pectorals", "chest", "barbell"), // wrong equipment
      c("B", "dumbbell press", "pectorals", "chest", "dumbbell")  // correct equipment
    ]);
    
    // B should win with equipment match
    expect(R?.top.c.id).toBe("B");
    expect(R?.top.score).toBe(9); // 3+3+2+1
  });

  test('no candidates returns null', () => {
    const H = hp("Squat", "quads", "legs", "barbell");
    const R = resolve(H, []);
    
    expect(R).toBeNull();
  });

  test('case insensitivity and normalization', () => {
    const H = hp("BARBELL-SQUAT", "quads", "LEGS", "BARBELL");
    const R = resolve(H, [
      c("A", "barbell squat", "quads", "legs", "barbell")
    ]);
    
    // Should match despite different casing and separators
    expect(R?.top.score).toBe(9); // Perfect normalized match
  });
});

describe('Exercise Media Matching - Scoring Edge Cases', () => {
  test('perfect score: exact match on all fields', () => {
    const H = hp("Barbell Squat", "quads", "legs", "barbell");
    const candidate = c("1", "barbell squat", "quads", "legs", "barbell");
    
    const s = score(H, candidate);
    expect(s).toBe(9); // 3 (name) + 3 (target) + 2 (bodyPart) + 1 (equipment)
  });

  test('no match on any field scores 0', () => {
    const H = hp("Squat", "quads", "legs", "barbell");
    const candidate = c("1", "bench press", "pectorals", "chest", "dumbbell");
    
    const s = score(H, candidate);
    expect(s).toBe(0);
  });

  test('target + bodyPart match but wrong name and equipment', () => {
    const H = hp("Barbell Squat", "quads", "legs", "barbell");
    const candidate = c("1", "leg press", "quads", "legs", "machine");
    
    const s = score(H, candidate);
    expect(s).toBe(5); // 3 (target) + 2 (bodyPart)
  });

  test('substring name match with all other fields matching', () => {
    const H = hp("Incline Bench Press", "pectorals", "chest", "barbell");
    const candidate = c("1", "bench press", "pectorals", "chest", "barbell");
    
    const s = score(H, candidate);
    expect(s).toBe(7); // 1 (substring) + 3 (target) + 2 (bodyPart) + 1 (equipment)
  });

  test('missing equipment on HealthPilot exercise', () => {
    const H = hp("Push Up", "pectorals", "chest"); // no equipment
    const candidate = c("1", "push up", "pectorals", "chest", "bodyweight");
    
    const s = score(H, candidate);
    expect(s).toBe(8); // 3 (name) + 3 (target) + 2 (bodyPart), no equipment bonus
  });

  test('null vs empty string equipment normalization', () => {
    const H = hp("Push Up", "pectorals", "chest", null as any);
    const candidate = c("1", "push up", "pectorals", "chest", "");
    
    const s = score(H, candidate);
    expect(s).toBe(8); // Should treat null and empty string as no equipment
  });
});

describe('Exercise Media Matching - Real-World Scenarios', () => {
  test('cable crossover vs dumbbell fly', () => {
    const H = hp("Cable Crossover", "pectorals", "chest", "cable");
    const R = resolve(H, [
      c("A", "dumbbell fly", "pectorals", "chest", "dumbbell"),
      c("B", "cable crossover", "pectorals", "chest", "cable"),
      c("C", "cable fly", "pectorals", "chest", "cable")
    ]);
    
    // B should win with exact name match
    expect(R?.top.c.id).toBe("B");
  });

  test('tricep pushdown variants', () => {
    const H = hp("Cable Tricep Pushdown", "triceps", "arms", "cable");
    const R = resolve(H, [
      c("A", "overhead tricep extension", "triceps", "arms", "dumbbell"),
      c("B", "tricep pushdown", "triceps", "arms", "cable"),
      c("C", "cable tricep pushdown", "triceps", "arms", "cable")
    ]);
    
    // C should win with exact match
    expect(R?.top.c.id).toBe("C");
  });

  test('deadlift variants', () => {
    const H = hp("Romanian Deadlift", "hamstrings", "legs", "barbell");
    const R = resolve(H, [
      c("A", "conventional deadlift", "hamstrings", "legs", "barbell"),
      c("B", "romanian deadlift", "hamstrings", "legs", "barbell"),
      c("C", "stiff leg deadlift", "hamstrings", "legs", "barbell")
    ]);
    
    // B should win with exact name match
    expect(R?.top.c.id).toBe("B");
  });

  test('machine vs free weight preference', () => {
    const H = hp("Leg Press", "quads", "legs", "machine");
    const R = resolve(H, [
      c("A", "barbell squat", "quads", "legs", "barbell"),
      c("B", "leg press", "quads", "legs", "machine"),
      c("C", "goblet squat", "quads", "legs", "dumbbell")
    ]);
    
    // B should win with name + equipment match
    expect(R?.top.c.id).toBe("B");
  });
});
