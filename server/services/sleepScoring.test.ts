/**
 * Sleep Scoring v2.0 Algorithm Tests
 * 
 * Validates that the algorithm produces correct scores according to specification
 */

import { describe, it, expect } from 'vitest';
import {
  parseRawSegments,
  clusterIntoEpisodes,
  selectPrimaryEpisode,
  calculateSleepScore,
  calculateNapScore,
  validateSleepEpisode,
  type RawSleepSegment,
} from './sleepScoring';

describe('Sleep Scoring v2.0', () => {
  describe('parseRawSegments', () => {
    it('should correctly parse raw HealthKit segments', () => {
      const raw: RawSleepSegment[] = [
        {
          startDate: '2025-10-22T22:00:00Z',
          endDate: '2025-10-22T22:30:00Z',
          value: 'asleep_core',
        },
        {
          startDate: '2025-10-22T22:30:00Z',
          endDate: '2025-10-22T23:00:00Z',
          value: 'asleep_deep',
        },
        {
          startDate: '2025-10-22T23:00:00Z',
          endDate: '2025-10-22T23:10:00Z',
          value: 'awake',
        },
      ];
      
      const segments = parseRawSegments(raw);
      
      expect(segments).toHaveLength(3);
      expect(segments[0].stage).toBe('light');
      expect(segments[0].durationMinutes).toBe(30);
      expect(segments[1].stage).toBe('deep');
      expect(segments[1].durationMinutes).toBe(30);
      expect(segments[2].stage).toBe('awake');
      expect(segments[2].durationMinutes).toBe(10);
    });
    
    it('should map various sleep stage types correctly', () => {
      const raw: RawSleepSegment[] = [
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-22T22:30:00Z', value: 'asleep_rem' },
        { startDate: '2025-10-22T22:30:00Z', endDate: '2025-10-22T23:00:00Z', value: 'asleep_deep' },
        { startDate: '2025-10-22T23:00:00Z', endDate: '2025-10-22T23:30:00Z', value: 'asleep_light' },
        { startDate: '2025-10-22T23:30:00Z', endDate: '2025-10-22T23:40:00Z', value: 'awake' },
      ];
      
      const segments = parseRawSegments(raw);
      
      expect(segments[0].stage).toBe('rem');
      expect(segments[1].stage).toBe('deep');
      expect(segments[2].stage).toBe('light');
      expect(segments[3].stage).toBe('awake');
    });
  });
  
  describe('clusterIntoEpisodes', () => {
    it('should cluster continuous segments into one episode', () => {
      const raw: RawSleepSegment[] = [
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-22T23:00:00Z', value: 'asleep_light' },
        { startDate: '2025-10-22T23:00:00Z', endDate: '2025-10-23T00:00:00Z', value: 'asleep_deep' },
        { startDate: '2025-10-23T00:00:00Z', endDate: '2025-10-23T01:00:00Z', value: 'asleep_rem' },
      ];
      
      const segments = parseRawSegments(raw);
      const episodes = clusterIntoEpisodes(segments);
      
      expect(episodes).toHaveLength(1);
      expect(episodes[0].lightMinutes).toBe(60);
      expect(episodes[0].deepMinutes).toBe(60);
      expect(episodes[0].remMinutes).toBe(60);
    });
    
    it('should split episodes on long awake gaps (>= 90 min)', () => {
      const raw: RawSleepSegment[] = [
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-22T23:00:00Z', value: 'asleep_light' },
        { startDate: '2025-10-22T23:00:00Z', endDate: '2025-10-23T01:00:00Z', value: 'awake' }, // 120 min awake
        { startDate: '2025-10-23T01:00:00Z', endDate: '2025-10-23T02:00:00Z', value: 'asleep_light' },
      ];
      
      const segments = parseRawSegments(raw);
      const episodes = clusterIntoEpisodes(segments);
      
      expect(episodes).toHaveLength(2);
      expect(episodes[0].lightMinutes).toBe(60);
      expect(episodes[1].lightMinutes).toBe(60);
    });
    
    it('should track awakenings count correctly', () => {
      const raw: RawSleepSegment[] = [
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-22T23:00:00Z', value: 'asleep_light' },
        { startDate: '2025-10-22T23:00:00Z', endDate: '2025-10-22T23:05:00Z', value: 'awake' }, // 5 min awakening
        { startDate: '2025-10-22T23:05:00Z', endDate: '2025-10-23T00:00:00Z', value: 'asleep_deep' },
        { startDate: '2025-10-23T00:00:00Z', endDate: '2025-10-23T00:03:00Z', value: 'awake' }, // 3 min awakening
        { startDate: '2025-10-23T00:03:00Z', endDate: '2025-10-23T01:00:00Z', value: 'asleep_rem' },
      ];
      
      const segments = parseRawSegments(raw);
      const episodes = clusterIntoEpisodes(segments);
      
      expect(episodes).toHaveLength(1);
      expect(episodes[0].awakeningsCount).toBe(2); // Both >= 2 min
      expect(episodes[0].longestAwakeBoutMinutes).toBe(5);
    });
  });
  
  describe('selectPrimaryEpisode', () => {
    it('should select longest episode overlapping primary window', () => {
      const raw: RawSleepSegment[] = [
        // Nap (too short for primary)
        { startDate: '2025-10-22T14:00:00Z', endDate: '2025-10-22T14:30:00Z', value: 'asleep_light' },
        // Primary sleep (7 hours)
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-23T05:00:00Z', value: 'asleep_light' },
      ];
      
      const segments = parseRawSegments(raw);
      const episodes = clusterIntoEpisodes(segments);
      const primary = selectPrimaryEpisode(episodes);
      
      expect(primary).toBeDefined();
      expect(primary!.inBedMinutes).toBeGreaterThanOrEqual(180); // >= 3 hours
      expect(primary!.episodeType).toBe('primary');
    });
    
    it('should reject episodes shorter than 180 minutes', () => {
      const raw: RawSleepSegment[] = [
        { startDate: '2025-10-22T22:00:00Z', endDate: '2025-10-23T00:30:00Z', value: 'asleep_light' }, // 150 min
      ];
      
      const segments = parseRawSegments(raw);
      const episodes = clusterIntoEpisodes(segments);
      const primary = selectPrimaryEpisode(episodes);
      
      expect(primary).toBeNull(); // Too short for primary
    });
  });
  
  describe('calculateSleepScore - Duration Component', () => {
    it('should award 25 points for 7-9 hours', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 8 * 60, // 8 hours
        inBedMinutes: 8 * 60,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.durationComponent).toBe(25);
    });
    
    it('should award 18 points for 6.5-7 hours', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 6.7 * 60, // 6.7 hours
        inBedMinutes: 7 * 60,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.durationComponent).toBe(18);
    });
    
    it('should award 0 points for < 5 hours', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 4.5 * 60, // 4.5 hours
        inBedMinutes: 5 * 60,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.durationComponent).toBe(0);
    });
  });
  
  describe('calculateSleepScore - Efficiency Component', () => {
    it('should award 20 points for >= 95% efficiency', () => {
      const episode = createTestEpisode({
        inBedMinutes: 480,
        actualSleepMinutes: 460, // 95.8% efficiency
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.efficiencyComponent).toBe(20);
    });
    
    it('should award 16 points for 90-94.9% efficiency', () => {
      const episode = createTestEpisode({
        inBedMinutes: 480,
        actualSleepMinutes: 440, // 91.7% efficiency
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.efficiencyComponent).toBe(16);
    });
    
    it('should award 0 points for < 80% efficiency', () => {
      const episode = createTestEpisode({
        inBedMinutes: 480,
        actualSleepMinutes: 360, // 75% efficiency
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.efficiencyComponent).toBe(0);
    });
  });
  
  describe('calculateSleepScore - Deep Sleep Component', () => {
    it('should award 10 points for 15-25% deep sleep', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 480,
        deepMinutes: 96, // 20%
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.deepComponent).toBe(10);
    });
    
    it('should award 6 points for 10-15% deep sleep', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 480,
        deepMinutes: 60, // 12.5%
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.deepComponent).toBe(6);
    });
    
    it('should award 2 points for < 10% deep sleep', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 480,
        deepMinutes: 40, // 8.3%
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.deepComponent).toBe(2);
    });
  });
  
  describe('calculateSleepScore - REM Sleep Component', () => {
    it('should award 10 points for 18-28% REM sleep', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 480,
        remMinutes: 110, // 22.9%
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.remComponent).toBe(10);
    });
    
    it('should award 6 points for 15-18% REM sleep', () => {
      const episode = createTestEpisode({
        actualSleepMinutes: 480,
        remMinutes: 80, // 16.7%
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.remComponent).toBe(6);
    });
  });
  
  describe('calculateSleepScore - Fragmentation Component', () => {
    it('should start at +10 and subtract penalties', () => {
      const episode = createTestEpisode({
        awakeningsCount: 1,
        longestAwakeBoutMinutes: 5,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.fragmentationComponent).toBe(10); // No penalties
    });
    
    it('should penalize >= 5 awakenings by 6 points', () => {
      const episode = createTestEpisode({
        awakeningsCount: 5,
        longestAwakeBoutMinutes: 10,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.fragmentationComponent).toBe(4); // 10 - 6
    });
    
    it('should penalize >= 30 min longest bout by 6 points', () => {
      const episode = createTestEpisode({
        awakeningsCount: 2,
        longestAwakeBoutMinutes: 30,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.fragmentationComponent).toBe(4); // 10 - 6
    });
    
    it('should combine penalties but floor at -10', () => {
      const episode = createTestEpisode({
        awakeningsCount: 6,
        longestAwakeBoutMinutes: 40,
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.breakdown.fragmentationComponent).toBe(-2); // 10 - 6 - 6 = -2
    });
  });
  
  describe('calculateSleepScore - Regularity Component', () => {
    it('should award 5 points for <= 30 min variance', () => {
      const episode = createTestEpisode({
        sleepMidpointLocal: new Date('2025-10-23T03:00:00'),
      });
      
      const previousMidpoints = [
        new Date('2025-10-22T03:15:00'),
        new Date('2025-10-21T02:50:00'),
      ];
      
      const result = calculateSleepScore(episode, previousMidpoints);
      
      expect(result.breakdown.regularityComponent).toBe(5);
    });
    
    it('should award 3 points for 31-60 min variance', () => {
      const episode = createTestEpisode({
        sleepMidpointLocal: new Date('2025-10-23T03:00:00'),
      });
      
      const previousMidpoints = [
        new Date('2025-10-22T03:50:00'),
        new Date('2025-10-21T03:40:00'),
      ];
      
      const result = calculateSleepScore(episode, previousMidpoints);
      
      expect(result.breakdown.regularityComponent).toBe(3);
    });
    
    it('should award 3 points when no history available', () => {
      const episode = createTestEpisode({});
      
      const result = calculateSleepScore(episode, []);
      
      expect(result.breakdown.regularityComponent).toBe(3); // Default mid-range
    });
  });
  
  describe('calculateSleepScore - Full Integration', () => {
    it('should match specification example (excellent sleep)', () => {
      // Specification example: 7.5 hours, 92% efficiency, optimal stages
      const episode = createTestEpisode({
        inBedMinutes: 500,
        actualSleepMinutes: 460, // 7.67 hours, 92% efficiency
        deepMinutes: 85, // 18.5%
        remMinutes: 145, // 31.5% - over optimal but within acceptable
        lightMinutes: 230,
        awakeningsCount: 3,
        longestAwakeBoutMinutes: 12,
        sleepMidpointLocal: new Date('2025-10-23T03:00:00'),
      });
      
      const result = calculateSleepScore(episode);
      
      expect(result.score).toBeGreaterThanOrEqual(65);
      expect(result.score).toBeLessThanOrEqual(85);
      expect(result.quality).toBe('good');
    });
  });
  
  describe('calculateNapScore', () => {
    it('should score 20-30 min naps as optimal (10 points)', () => {
      const nap = createTestEpisode({
        inBedMinutes: 25,
        episodeType: 'nap',
      });
      
      const result = calculateNapScore(nap);
      
      expect(result.score).toBe(10);
    });
    
    it('should detect restorative naps with >= 10 min REM', () => {
      const nap = createTestEpisode({
        inBedMinutes: 45,
        remMinutes: 15,
        episodeType: 'nap',
      });
      
      const result = calculateNapScore(nap);
      
      expect(result.restorative).toBe(true);
      expect(result.readinessCredit).toBe(2);
    });
    
    it('should detect restorative naps with >= 10 min deep sleep', () => {
      const nap = createTestEpisode({
        inBedMinutes: 60,
        deepMinutes: 12,
        episodeType: 'nap',
      });
      
      const result = calculateNapScore(nap);
      
      expect(result.restorative).toBe(true);
      expect(result.readinessCredit).toBe(2);
    });
  });
  
  describe('validateSleepEpisode', () => {
    it('should validate good episodes', () => {
      const episode = createTestEpisode({
        inBedMinutes: 480,
        actualSleepMinutes: 450,
      });
      
      const validation = validateSleepEpisode(episode);
      
      expect(validation.valid).toBe(true);
    });
    
    it('should reject episodes with data_inconsistent flag', () => {
      const episode = createTestEpisode({
        flags: ['data_inconsistent'],
      });
      
      const validation = validateSleepEpisode(episode);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('mismatch');
    });
    
    it('should reject primary episodes < 180 minutes', () => {
      const episode = createTestEpisode({
        inBedMinutes: 150,
        episodeType: 'primary',
      });
      
      const validation = validateSleepEpisode(episode);
      
      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('180');
    });
  });
});

// Helper function to create test episodes
function createTestEpisode(overrides: Partial<{
  inBedMinutes: number;
  actualSleepMinutes: number;
  awakeMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  awakeningsCount: number;
  longestAwakeBoutMinutes: number;
  sleepMidpointLocal: Date;
  episodeType: 'primary' | 'nap';
  flags: string[];
}> = {}) {
  const inBedMinutes = overrides.inBedMinutes ?? 480; // 8 hours default
  const actualSleepMinutes = overrides.actualSleepMinutes ?? 450; // 7.5 hours default
  const awakeMinutes = overrides.awakeMinutes ?? (inBedMinutes - actualSleepMinutes);
  
  const lightMinutes = overrides.lightMinutes ?? 250;
  const deepMinutes = overrides.deepMinutes ?? 100;
  const remMinutes = overrides.remMinutes ?? 100;
  
  const episodeStart = new Date('2025-10-22T22:00:00Z');
  const episodeEnd = new Date(episodeStart.getTime() + inBedMinutes * 60 * 1000);
  
  return {
    episodeId: crypto.randomUUID(),
    episodeType: overrides.episodeType ?? 'primary' as const,
    episodeStart,
    episodeEnd,
    inBedMinutes,
    actualSleepMinutes,
    awakeMinutes,
    lightMinutes,
    deepMinutes,
    remMinutes,
    sleepEfficiency: actualSleepMinutes / inBedMinutes,
    awakeningsCount: overrides.awakeningsCount ?? 2,
    longestAwakeBoutMinutes: overrides.longestAwakeBoutMinutes ?? 10,
    sleepMidpointLocal: overrides.sleepMidpointLocal ?? new Date('2025-10-23T03:00:00'),
    nightKeyLocalDate: '2025-10-22',
    segments: [],
    flags: overrides.flags ?? [],
  };
}
