/**
 * Sleep Score Calculation Service v2.0
 * 
 * Calculates a 0-100 nightly sleep quality score using:
 * - Robust sessionization (primary sleep vs naps)
 * - Proper stage aggregation
 * - Fragmentation penalties
 * - Sleep regularity tracking
 * 
 * Based on sleep science research and clinical guidelines.
 * 
 * @version 2.0
 */

import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { format } from 'date-fns';

export interface RawSleepSegment {
  startDate: string;      // ISO timestamp
  endDate: string;        // ISO timestamp
  value: string;          // Sleep stage type (awake, asleep_rem, asleep_deep, asleep_core, etc.)
  source?: string;        // Bundle identifier if available
}

export interface SleepEpisode {
  episodeId: string;
  episodeType: 'primary' | 'nap';
  episodeStart: Date;
  episodeEnd: Date;
  inBedMinutes: number;
  actualSleepMinutes: number;
  awakeMinutes: number;
  lightMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  sleepEfficiency: number;
  awakeningsCount: number;
  longestAwakeBoutMinutes: number;
  sleepMidpointLocal: Date;
  nightKeyLocalDate: string;  // YYYY-MM-DD in local timezone
  segments: ProcessedSegment[];
  flags: string[];
}

export interface ProcessedSegment {
  start: Date;
  end: Date;
  durationMinutes: number;
  stage: 'awake' | 'light' | 'deep' | 'rem';
}

export interface SleepScoreResult {
  score: number;              // 0-100 calculated score
  quality: "excellent" | "good" | "fair" | "poor";
  actualSleepMinutes: number;
  sleepHours: number;
  breakdown: {
    durationComponent: number;      // 0-25 points
    efficiencyComponent: number;    // 0-20 points
    deepComponent: number;          // 0-10 points
    remComponent: number;           // 0-10 points
    fragmentationComponent: number; // -10 to +10 points
    regularityComponent: number;    // 0-5 points
  };
  percentages: {
    deep: number;
    rem: number;
    light: number;
    efficiency: number;
  };
  fragmentation: {
    awakeningsCount: number;
    longestAwakeBoutMinutes: number;
  };
}

export interface NapScoreResult {
  score: number;              // 0-10 for naps
  restorative: boolean;       // Has >= 10 min REM or deep
  readinessCredit: number;    // 0 or 2
}

const CONSTANTS = {
  // Episode clustering
  MERGE_GAP_MINUTES: 90,
  MICRO_AWAKE_MERGE_MINUTES: 20,
  LONG_AWAKE_SPLIT_MINUTES: 90,
  
  // Primary episode detection
  PRIMARY_WINDOW_START_HOUR: 15,    // 3pm local
  PRIMARY_WINDOW_END_HOUR: 12,      // 12pm next day local
  PRIMARY_MIN_MINUTES: 180,          // 3 hours minimum
  PRIMARY_MAX_MINUTES: 960,          // 16 hours maximum
  
  // Nap detection
  NAP_MIN_MINUTES: 10,
  NAP_MAX_MINUTES: 180,
  
  // Awakening tracking
  MIN_AWAKENING_MINUTES: 2,         // Count awakenings >= 2 min
  
  // Validation
  STAGE_SUM_TOLERANCE_MINUTES: 15,  // Increased to handle HealthKit data overlaps/gaps
};

/**
 * Parse raw HealthKit sleep segments into processed segments
 */
export function parseRawSegments(rawSegments: RawSleepSegment[]): ProcessedSegment[] {
  return rawSegments
    .filter(seg => {
      const sleepType = seg.value?.toLowerCase() || '';
      // CRITICAL: Filter out "in_bed" segments - they're container segments that overlap
      // with all other stages. Including them causes awake time to balloon to full session.
      return !sleepType.includes('in_bed');
    })
    .map(seg => {
      const start = new Date(seg.startDate);
      const end = new Date(seg.endDate);
      const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      
      // Map sleep stage types
      const sleepType = seg.value?.toLowerCase() || '';
      let stage: 'awake' | 'light' | 'deep' | 'rem';
      
      if (sleepType.includes('awake')) {
        stage = 'awake';
      } else if (sleepType.includes('rem') || sleepType === 'asleep_rem') {
        stage = 'rem';
      } else if (sleepType.includes('deep') || sleepType === 'asleep_deep') {
        stage = 'deep';
      } else {
        // Default to light for core/light/unknown
        stage = 'light';
      }
      
      return { start, end, durationMinutes, stage };
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());
}

/**
 * Cluster segments into episodes using gap-based logic
 */
export function clusterIntoEpisodes(
  segments: ProcessedSegment[],
  userTimezone: string = 'UTC'
): SleepEpisode[] {
  if (segments.length === 0) return [];
  
  const episodes: SleepEpisode[] = [];
  let currentEpisodeSegments: ProcessedSegment[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    
    if (currentEpisodeSegments.length === 0) {
      currentEpisodeSegments.push(seg);
      continue;
    }
    
    const lastSeg = currentEpisodeSegments[currentEpisodeSegments.length - 1];
    const gapMinutes = Math.round((seg.start.getTime() - lastSeg.end.getTime()) / (1000 * 60));
    
    // Split into new episode if gap is too long
    if (gapMinutes >= CONSTANTS.LONG_AWAKE_SPLIT_MINUTES) {
      episodes.push(createEpisodeFromSegments(currentEpisodeSegments, userTimezone));
      currentEpisodeSegments = [seg];
    } else {
      currentEpisodeSegments.push(seg);
    }
  }
  
  // Add final episode
  if (currentEpisodeSegments.length > 0) {
    episodes.push(createEpisodeFromSegments(currentEpisodeSegments, userTimezone));
  }
  
  return episodes;
}

/**
 * Create an episode from a cluster of segments
 */
function createEpisodeFromSegments(
  segments: ProcessedSegment[],
  userTimezone: string
): SleepEpisode {
  const episodeStart = segments[0].start;
  const episodeEnd = segments[segments.length - 1].end;
  const inBedMinutes = Math.round((episodeEnd.getTime() - episodeStart.getTime()) / (1000 * 60));
  
  // Aggregate stage minutes
  let awakeMinutes = 0;
  let lightMinutes = 0;
  let deepMinutes = 0;
  let remMinutes = 0;
  
  // Track awakenings
  let awakeningsCount = 0;
  let longestAwakeBoutMinutes = 0;
  
  for (const seg of segments) {
    switch (seg.stage) {
      case 'awake':
        awakeMinutes += seg.durationMinutes;
        if (seg.durationMinutes >= CONSTANTS.MIN_AWAKENING_MINUTES) {
          awakeningsCount++;
          longestAwakeBoutMinutes = Math.max(longestAwakeBoutMinutes, seg.durationMinutes);
        }
        break;
      case 'light':
        lightMinutes += seg.durationMinutes;
        break;
      case 'deep':
        deepMinutes += seg.durationMinutes;
        break;
      case 'rem':
        remMinutes += seg.durationMinutes;
        break;
    }
  }
  
  const actualSleepMinutes = inBedMinutes - awakeMinutes;
  const sleepEfficiency = inBedMinutes > 0 ? actualSleepMinutes / inBedMinutes : 0;
  
  // Calculate midpoint and store as Date object (will be compared properly later)
  const midpointMs = (episodeStart.getTime() + episodeEnd.getTime()) / 2;
  const sleepMidpointLocal = new Date(midpointMs);
  
  // Determine night key (local date) using user's timezone
  // Extract hour in user's timezone
  const startHourLocal = Number(formatInTimeZone(episodeStart, userTimezone, 'H'));
  
  // If start is after 3pm local, use that date; otherwise use previous date
  let nightKeyLocalDate: string;
  if (startHourLocal >= CONSTANTS.PRIMARY_WINDOW_START_HOUR) {
    // Episode starts after 3pm local, use that date
    nightKeyLocalDate = formatInTimeZone(episodeStart, userTimezone, 'yyyy-MM-dd');
  } else {
    // Episode starts before 3pm local, attribute to previous day
    const previousDay = new Date(episodeStart.getTime() - 12 * 60 * 60 * 1000);
    nightKeyLocalDate = formatInTimeZone(previousDay, userTimezone, 'yyyy-MM-dd');
  }
  
  // Determine episode type (will be refined later)
  const durationMinutes = inBedMinutes;
  let episodeType: 'primary' | 'nap' = 'primary';
  
  if (durationMinutes >= CONSTANTS.NAP_MIN_MINUTES && durationMinutes <= CONSTANTS.NAP_MAX_MINUTES) {
    episodeType = 'nap';
  }
  
  // Validate stage sum
  const stageSum = awakeMinutes + lightMinutes + deepMinutes + remMinutes;
  const flags: string[] = [];
  
  const stageDiff = Math.abs(stageSum - inBedMinutes);
  if (stageDiff > CONSTANTS.STAGE_SUM_TOLERANCE_MINUTES) {
    console.log(`⚠️ Stage validation failed for ${nightKeyLocalDate}:`);
    console.log(`  inBedMinutes: ${inBedMinutes}`);
    console.log(`  stageSum: ${stageSum} (awake:${awakeMinutes} + light:${lightMinutes} + deep:${deepMinutes} + rem:${remMinutes})`);
    console.log(`  difference: ${stageDiff} minutes (tolerance: ${CONSTANTS.STAGE_SUM_TOLERANCE_MINUTES})`);
    flags.push('data_inconsistent');
  }
  
  if (durationMinutes > CONSTANTS.PRIMARY_MAX_MINUTES) {
    flags.push('outlier_duration');
  }
  
  return {
    episodeId: crypto.randomUUID(),
    episodeType,
    episodeStart,
    episodeEnd,
    inBedMinutes,
    actualSleepMinutes,
    awakeMinutes,
    lightMinutes,
    deepMinutes,
    remMinutes,
    sleepEfficiency,
    awakeningsCount,
    longestAwakeBoutMinutes,
    sleepMidpointLocal,
    nightKeyLocalDate,
    segments,
    flags,
  };
}

/**
 * Select primary episode from a list of episodes for a given night
 */
export function selectPrimaryEpisode(episodes: SleepEpisode[], userTimezone: string = 'UTC'): SleepEpisode | null {
  // Filter eligible primary episodes
  const eligible = episodes.filter(ep => {
    // Must be within valid duration range
    if (ep.inBedMinutes < CONSTANTS.PRIMARY_MIN_MINUTES) return false;
    if (ep.inBedMinutes > CONSTANTS.PRIMARY_MAX_MINUTES) return false;
    
    // Extract midpoint hour in user's timezone
    const midpointHour = Number(formatInTimeZone(ep.sleepMidpointLocal, userTimezone, 'H'));
    
    // Check if midpoint falls in typical overnight sleep window (8pm to 11am local)
    // This is more robust than checking start/end times for split nights
    const inOvernightWindow = midpointHour >= 20 || midpointHour <= 11;
    
    return inOvernightWindow;
  });
  
  if (eligible.length === 0) {
    // Fallback: select longest episode between 12:00 and 15:00 local time
    const fallback = episodes.filter(ep => {
      const startHour = Number(formatInTimeZone(ep.episodeStart, userTimezone, 'H'));
      return startHour >= 12 && startHour < CONSTANTS.PRIMARY_WINDOW_START_HOUR 
        && ep.inBedMinutes >= CONSTANTS.PRIMARY_MIN_MINUTES;
    });
    
    if (fallback.length === 0) return null;
    
    return fallback.reduce((longest, ep) => 
      ep.inBedMinutes > longest.inBedMinutes ? ep : longest
    );
  }
  
  // Select longest eligible episode
  const primary = eligible.reduce((longest, ep) => 
    ep.inBedMinutes > longest.inBedMinutes ? ep : longest
  );
  
  primary.episodeType = 'primary';
  return primary;
}

/**
 * Calculate sleep score for primary episode using v2.0 algorithm
 */
export function calculateSleepScore(
  episode: SleepEpisode,
  previousMidpoints?: Date[],  // For regularity component
  userTimezone?: string  // User's timezone for regularity calculation
): SleepScoreResult {
  const {
    actualSleepMinutes,
    inBedMinutes,
    deepMinutes,
    remMinutes,
    lightMinutes,
    awakeningsCount,
    longestAwakeBoutMinutes,
    sleepEfficiency,
  } = episode;
  
  const sleepHours = actualSleepMinutes / 60;
  
  const breakdown = {
    durationComponent: 0,
    efficiencyComponent: 0,
    deepComponent: 0,
    remComponent: 0,
    fragmentationComponent: 0,
    regularityComponent: 0,
  };
  
  // 1. Duration Component (0-25 points)
  if (sleepHours >= 7 && sleepHours <= 9) {
    breakdown.durationComponent = 25;
  } else if ((sleepHours >= 6.5 && sleepHours < 7) || (sleepHours > 9 && sleepHours <= 9.5)) {
    breakdown.durationComponent = 18;
  } else if ((sleepHours >= 6 && sleepHours < 6.5) || (sleepHours > 9.5 && sleepHours <= 10)) {
    breakdown.durationComponent = 10;
  } else if ((sleepHours >= 5 && sleepHours < 6) || (sleepHours > 10 && sleepHours <= 11)) {
    breakdown.durationComponent = 2;
  } else {
    breakdown.durationComponent = 0;
  }
  
  // 2. Efficiency Component (0-20 points)
  if (sleepEfficiency >= 0.95) {
    breakdown.efficiencyComponent = 20;
  } else if (sleepEfficiency >= 0.90) {
    breakdown.efficiencyComponent = 16;
  } else if (sleepEfficiency >= 0.85) {
    breakdown.efficiencyComponent = 10;
  } else if (sleepEfficiency >= 0.80) {
    breakdown.efficiencyComponent = 4;
  } else {
    breakdown.efficiencyComponent = 0;
  }
  
  // 3. Deep Sleep Component (0-10 points)
  const deepPercentage = actualSleepMinutes > 0 ? deepMinutes / actualSleepMinutes : 0;
  if (deepPercentage >= 0.15 && deepPercentage <= 0.25) {
    breakdown.deepComponent = 10;
  } else if ((deepPercentage >= 0.10 && deepPercentage < 0.15) || (deepPercentage > 0.25 && deepPercentage <= 0.30)) {
    breakdown.deepComponent = 6;
  } else if (deepPercentage < 0.10) {
    breakdown.deepComponent = 2;
  } else {
    breakdown.deepComponent = 0;
  }
  
  // 4. REM Sleep Component (0-10 points)
  const remPercentage = actualSleepMinutes > 0 ? remMinutes / actualSleepMinutes : 0;
  if (remPercentage >= 0.18 && remPercentage <= 0.28) {
    breakdown.remComponent = 10;
  } else if ((remPercentage >= 0.15 && remPercentage < 0.18) || (remPercentage > 0.28 && remPercentage <= 0.32)) {
    breakdown.remComponent = 6;
  } else if (remPercentage < 0.15) {
    breakdown.remComponent = 2;
  } else {
    breakdown.remComponent = 0;
  }
  
  // 5. Fragmentation Component (-10 to +10 points)
  breakdown.fragmentationComponent = 10; // Start at max
  
  if (awakeningsCount >= 5) {
    breakdown.fragmentationComponent -= 6;
  } else if (awakeningsCount >= 3) {
    breakdown.fragmentationComponent -= 3;
  }
  
  if (longestAwakeBoutMinutes >= 30) {
    breakdown.fragmentationComponent -= 6;
  } else if (longestAwakeBoutMinutes >= 15) {
    breakdown.fragmentationComponent -= 3;
  }
  
  breakdown.fragmentationComponent = Math.max(-10, breakdown.fragmentationComponent);
  
  // 6. Regularity Component (0-5 points)
  if (previousMidpoints && previousMidpoints.length > 0 && userTimezone) {
    // Convert all midpoints to minutes-from-midnight in user's timezone
    // This allows us to compare wall-clock times regardless of day offset
    const toMinutesFromMidnight = (date: Date): number => {
      const hour = Number(formatInTimeZone(date, userTimezone, 'H'));
      const minute = Number(formatInTimeZone(date, userTimezone, 'm'));
      return hour * 60 + minute;
    };
    
    const currentMinutes = toMinutesFromMidnight(episode.sleepMidpointLocal);
    const previousMinutes = previousMidpoints.map(mp => toMinutesFromMidnight(mp));
    
    // Calculate average of previous midpoints (in minutes from midnight)
    const avgPreviousMinutes = previousMinutes.reduce((sum, m) => sum + m, 0) / previousMinutes.length;
    
    // Calculate variance (handle wrap-around at midnight)
    let variance = Math.abs(currentMinutes - avgPreviousMinutes);
    
    // Handle wrap-around: if variance > 12 hours, use the shorter path
    if (variance > 12 * 60) {
      variance = 24 * 60 - variance;
    }
    
    if (variance <= 30) {
      breakdown.regularityComponent = 5;
    } else if (variance <= 60) {
      breakdown.regularityComponent = 3;
    } else if (variance <= 120) {
      breakdown.regularityComponent = 1;
    } else {
      breakdown.regularityComponent = 0;
    }
  } else {
    // No history available, award mid-range points
    breakdown.regularityComponent = 3;
  }
  
  // Calculate final score
  const score = Math.max(0, Math.min(100, Math.round(
    breakdown.durationComponent +
    breakdown.efficiencyComponent +
    breakdown.deepComponent +
    breakdown.remComponent +
    breakdown.fragmentationComponent +
    breakdown.regularityComponent
  )));
  
  // Determine quality
  let quality: "excellent" | "good" | "fair" | "poor";
  if (score >= 80) {
    quality = "excellent";
  } else if (score >= 60) {
    quality = "good";
  } else if (score >= 40) {
    quality = "fair";
  } else {
    quality = "poor";
  }
  
  const lightPercentage = actualSleepMinutes > 0 ? lightMinutes / actualSleepMinutes : 0;
  
  return {
    score,
    quality,
    actualSleepMinutes,
    sleepHours,
    breakdown,
    percentages: {
      deep: deepPercentage,
      rem: remPercentage,
      light: lightPercentage,
      efficiency: sleepEfficiency,
    },
    fragmentation: {
      awakeningsCount,
      longestAwakeBoutMinutes,
    },
  };
}

/**
 * Calculate nap score (separate from nightly score)
 */
export function calculateNapScore(episode: SleepEpisode): NapScoreResult {
  const { inBedMinutes, deepMinutes, remMinutes } = episode;
  
  let score = 0;
  
  // Duration points (0-10)
  if (inBedMinutes >= 20 && inBedMinutes <= 30) {
    score = 10;
  } else if (inBedMinutes >= 31 && inBedMinutes <= 60) {
    score = 6;
  } else if (inBedMinutes >= 10 && inBedMinutes < 20) {
    score = 4;
  } else if (inBedMinutes > 60) {
    score = 2;
  }
  
  // Restorative flag: >= 10 min REM or deep
  const restorative = (deepMinutes >= 10) || (remMinutes >= 10);
  
  // Readiness credit
  const readinessCredit = restorative ? 2 : 0;
  
  return {
    score,
    restorative,
    readinessCredit,
  };
}

/**
 * Validate sleep episode data
 */
export function validateSleepEpisode(episode: SleepEpisode): { valid: boolean; reason?: string } {
  // Check for data inconsistency flag
  if (episode.flags.includes('data_inconsistent')) {
    return { valid: false, reason: "Stage minutes sum mismatch" };
  }
  
  // Check for outlier duration flag
  if (episode.flags.includes('outlier_duration')) {
    return { valid: false, reason: "Duration exceeds 16 hours" };
  }
  
  // Primary episodes must meet minimum duration
  if (episode.episodeType === 'primary' && episode.inBedMinutes < CONSTANTS.PRIMARY_MIN_MINUTES) {
    return { valid: false, reason: "Primary episode too short (< 180 minutes)" };
  }
  
  return { valid: true };
}
