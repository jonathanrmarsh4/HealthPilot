/**
 * Feature Flag Tests
 * 
 * Tests that infrastructure flags (like strict media binding) work independently
 * of BASELINE_MODE and are not disabled when baseline mode is enabled.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { flags } from '../flags';

describe('Feature Flags', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    flags.clearCache();
  });

  afterEach(() => {
    process.env = originalEnv;
    flags.clearCache();
  });

  describe('Infrastructure flags', () => {
    it('EXERCISE_MEDIA_STRICT_BINDING_ENABLED should default to true', () => {
      const result = flags.isEnabled('EXERCISE_MEDIA_STRICT_BINDING_ENABLED');
      expect(result).toBe(true);
    });

    it('EXERCISE_MEDIA_STRICT_BINDING_ENABLED should work independently of BASELINE_MODE', () => {
      // Set baseline mode to true (default)
      process.env.BASELINE_MODE_ENABLED = 'true';
      flags.clearCache();
      
      const strictBindingEnabled = flags.isEnabled('EXERCISE_MEDIA_STRICT_BINDING_ENABLED');
      const baselineModeEnabled = flags.isEnabled('BASELINE_MODE_ENABLED');
      
      expect(baselineModeEnabled).toBe(true);
      expect(strictBindingEnabled).toBe(true); // Should still be true despite baseline mode
    });

    it('EXERCISE_MEDIA_STRICT_BINDING_ENABLED can be explicitly disabled', () => {
      process.env.EXERCISE_MEDIA_STRICT_BINDING_ENABLED = 'false';
      flags.clearCache();
      
      const result = flags.isEnabled('EXERCISE_MEDIA_STRICT_BINDING_ENABLED');
      expect(result).toBe(false);
    });

    it('EXERCISE_SIMPLE_MATCHER_ENABLED should work independently of BASELINE_MODE', () => {
      process.env.BASELINE_MODE_ENABLED = 'true';
      process.env.EXERCISE_SIMPLE_MATCHER_ENABLED = 'true';
      flags.clearCache();
      
      const simpleMatcherEnabled = flags.isEnabled('EXERCISE_SIMPLE_MATCHER_ENABLED');
      expect(simpleMatcherEnabled).toBe(true);
    });
  });

  describe('AI feature flags', () => {
    it('AI_MEAL_FILTERS_ENABLED should be disabled when BASELINE_MODE is enabled', () => {
      process.env.BASELINE_MODE_ENABLED = 'true';
      process.env.AI_MEAL_FILTERS_ENABLED = 'true';
      flags.clearCache();
      
      const result = flags.isEnabled('AI_MEAL_FILTERS_ENABLED');
      expect(result).toBe(false); // Should be false due to baseline mode
    });

    it('AI_MEAL_FILTERS_ENABLED should be enabled when BASELINE_MODE is disabled', () => {
      process.env.BASELINE_MODE_ENABLED = 'false';
      process.env.AI_MEAL_FILTERS_ENABLED = 'true';
      flags.clearCache();
      
      const result = flags.isEnabled('AI_MEAL_FILTERS_ENABLED');
      expect(result).toBe(true);
    });
  });

  describe('isBaselineMode helper', () => {
    it('should return true when baseline mode is enabled', () => {
      process.env.BASELINE_MODE_ENABLED = 'true';
      flags.clearCache();
      
      expect(flags.isBaselineMode()).toBe(true);
    });

    it('should return false when baseline mode is disabled', () => {
      process.env.BASELINE_MODE_ENABLED = 'false';
      flags.clearCache();
      
      expect(flags.isBaselineMode()).toBe(false);
    });
  });
});
