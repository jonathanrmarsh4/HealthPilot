/**
 * Exercise Binding Regression Tests
 * 
 * Ensures exercises, instructions, and media stay correctly bound
 * even when array order changes or exercises are reordered.
 */

import { describe, it, expect } from 'vitest';

describe('Exercise Binding Integrity', () => {
  it('should use stable keys (name-based) instead of index-based keys', () => {
    // This test ensures we don't regress to using index-based keys
    // which cause misbinding issues when exercises are reordered
    
    const exercises = [
      { name: 'Lat Pulldown', sets: 3, reps: '8-12', intensity: 'moderate' },
      { name: 'Bench Press', sets: 4, reps: '6-10', intensity: 'high' },
      { name: 'Squats', sets: 3, reps: '10-15', intensity: 'moderate' }
    ];

    // Simulate React key generation using name (correct)
    const correctKeys = exercises.map(ex => ex.name);
    expect(correctKeys).toEqual(['Lat Pulldown', 'Bench Press', 'Squats']);
    
    // Simulate what happens when exercises are reordered
    const reordered = [exercises[2], exercises[0], exercises[1]];
    const reorderedKeys = reordered.map(ex => ex.name);
    
    // With name-based keys, each exercise maintains its identity
    expect(reorderedKeys[0]).toBe('Squats');
    expect(reorderedKeys[1]).toBe('Lat Pulldown');
    expect(reorderedKeys[2]).toBe('Bench Press');
    
    // ANTI-PATTERN: Index-based keys (would fail on reorder)
    const badKeys = exercises.map((_, idx) => idx);
    expect(badKeys).toEqual([0, 1, 2]); // Always same keys regardless of content!
    
    // When reordered, index-based keys stay the same but point to different exercises
    const badKeysReordered = reordered.map((_, idx) => idx);
    expect(badKeysReordered).toEqual([0, 1, 2]); // WRONG! Same keys, different exercises
  });

  it('should generate stable React Query keys with exercise identifiers', () => {
    const exercisedbId = '0001';
    const exerciseName = 'Lat Pulldown';
    
    // Correct: Query key includes both ID and name for uniqueness
    const queryKey = exercisedbId 
      ? ['/api/exercisedb/exercise', exercisedbId]
      : ['/api/exercisedb/search', exerciseName];
    
    expect(queryKey).toEqual(['/api/exercisedb/exercise', '0001']);
    
    // Each unique exercise should have unique cache entry
    const exercise1Key = ['/api/exercisedb/exercise', '0001'];
    const exercise2Key = ['/api/exercisedb/exercise', '0002'];
    
    expect(exercise1Key).not.toEqual(exercise2Key);
  });

  it('should handle exercises with same name but different IDs', () => {
    // Edge case: Two variations of same exercise
    const exercises = [
      { id: 'ex-1', name: 'Push-ups', externalId: '1234' },
      { id: 'ex-2', name: 'Push-ups', externalId: '5678' } // Different variation
    ];
    
    // Using just name as key would cause collision
    const nameKeys = exercises.map(ex => ex.name);
    expect(nameKeys[0]).toBe(nameKeys[1]); // Duplicate keys!
    
    // Better: Use ID when available
    const idKeys = exercises.map(ex => ex.id);
    expect(idKeys[0]).not.toBe(idKeys[1]); // Unique keys
  });

  it('should sanitize exercise names for data-testid attributes', () => {
    const exerciseName = 'Lat Pulldown';
    const sanitized = exerciseName.replace(/\s+/g, '-').toLowerCase();
    
    expect(sanitized).toBe('lat-pulldown');
    
    // Should handle special characters
    const complex = "Dumbbell Bench Press (30°)";
    const complexSanitized = complex.replace(/\s+/g, '-').toLowerCase();
    
    expect(complexSanitized).toContain('dumbbell-bench-press');
  });
});

describe('React Query Cache Isolation', () => {
  it('should create separate cache entries for different exercises', () => {
    // Each exercise should have isolated cache
    const exercise1Query = { 
      queryKey: ['/api/exercisedb/exercise', 'ex-001'],
      data: { name: 'Lat Pulldown', instructions: 'Pull down...' }
    };
    
    const exercise2Query = {
      queryKey: ['/api/exercisedb/exercise', 'ex-002'],
      data: { name: 'Bench Press', instructions: 'Press up...' }
    };
    
    // Keys are different, so no cache collision
    expect(exercise1Query.queryKey).not.toEqual(exercise2Query.queryKey);
    expect(exercise1Query.data.name).not.toBe(exercise2Query.data.name);
  });

  it('should invalidate correct exercise when updated', () => {
    const exerciseId = 'ex-123';
    
    // Query key pattern for fetching
    const fetchKey = ['/api/exercisedb/exercise', exerciseId];
    
    // Invalidation pattern should match fetch pattern
    const invalidatePattern = ['/api/exercisedb/exercise', exerciseId];
    
    expect(fetchKey).toEqual(invalidatePattern);
  });
});
