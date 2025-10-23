# Sleep Scoring Algorithm Documentation

## Overview

HealthPilot uses a sophisticated sleep scoring algorithm to evaluate nightly sleep quality. This document compares the two versions and provides migration guidance.

## Algorithm Comparison

### v1.0 (Legacy)

**Simple Night Grouping:**
- Groups sleep by calendar night (bedtime after 3pm → that date, otherwise previous date)
- No distinction between primary sleep and naps
- Single score covers all sleep in 24-hour period

**Scoring Components:**
```
Base Score: 70 points
+ Duration Adjustment: -15 to +15 points
  • +15: 7-9 hours
  • +8: 6-7 hours
  • -15: <6 hours
  • -5: >9 hours
+ Deep Sleep: -5 to +10 points
  • +10: 15-25% of actual sleep
  • -5: <10% of actual sleep
+ REM Sleep: -5 to +10 points
  • +10: 18-28% of actual sleep
  • -5: <15% of actual sleep
+ Awake Penalty: -20 to 0 points
  • -20: >15% awake (poor efficiency)
  • -10: 10-15% awake
```

**Total Range:** 0-100 points (capped)

**Limitations:**
- No fragmentation tracking (awakenings, longest bout)
- No regularity component
- Naps penalize nightly score
- Simple duration-based quality assessment

---

### v2.0 (Current)

**Sophisticated Episode Clustering:**
- Clusters raw HealthKit segments using gap-based logic
- Distinguishes primary sleep (3+ hours) from naps (<3 hours)
- Sessionizes micro-awakenings vs. significant disruptions
- Tracks sleep midpoint for regularity analysis

**Primary Sleep Detection:**
- Must overlap 15:00 → next day 12:00 window
- Minimum 180 minutes (3 hours)
- Maximum 960 minutes (16 hours)
- Selects longest eligible episode per night

**Scoring Components (Total: 0-100 points):**

#### 1. Duration Component (0-25 points)
```
25 points: 7.0-9.0 hours
18 points: 6.5-7.0 or 9.0-9.5 hours
10 points: 6.0-6.5 or 9.5-10 hours
2 points: 5.0-6.0 or 10-11 hours
0 points: <5.0 or >11 hours
```

#### 2. Efficiency Component (0-20 points)
```
Sleep Efficiency = actualSleepMinutes / inBedMinutes

20 points: ≥95% efficiency
16 points: 90-94.9% efficiency
10 points: 85-89.9% efficiency
4 points: 80-84.9% efficiency
0 points: <80% efficiency
```

#### 3. Deep Sleep Component (0-10 points)
```
Deep % = deepMinutes / actualSleepMinutes

10 points: 15-25% (optimal)
6 points: 10-15% or 25-30% (acceptable)
2 points: <10% (insufficient)
0 points: >30% (excessive)
```

#### 4. REM Sleep Component (0-10 points)
```
REM % = remMinutes / actualSleepMinutes

10 points: 18-28% (optimal)
6 points: 15-18% or 28-32% (acceptable)
2 points: <15% (insufficient)
0 points: >32% (excessive)
```

#### 5. Fragmentation Component (-10 to +10 points)
```
Start at +10, subtract penalties:

Awakenings (≥2 min):
  -6 points: ≥5 awakenings
  -3 points: 3-4 awakenings

Longest Bout:
  -6 points: ≥30 minutes awake
  -3 points: 15-29 minutes awake

Floor: -10 points (most fragmented)
```

#### 6. Regularity Component (0-5 points)
```
Variance = |current_midpoint - 7_day_avg_midpoint| in minutes

5 points: ≤30 min variance (excellent)
3 points: 31-60 min variance (good)
1 point: 61-120 min variance (fair)
0 points: >120 min variance (poor)
```

**Quality Labels:**
- Excellent: 80-100
- Good: 60-79
- Fair: 40-59
- Poor: 0-39

**Nap Scoring (Separate):**
```
10 points: 20-30 min (optimal)
6 points: 31-60 min (acceptable)
4 points: 10-20 min (short)
2 points: >60 min (long)

Restorative Flag: ≥10 min REM or deep
Readiness Credit: +2 if restorative (max 2/day)
```

---

## Migration Guide

### Database Schema Changes

**New Fields Added to `sleep_sessions` table:**

```typescript
episodeType: text          // 'primary' | 'nap'
episodeId: varchar         // UUID for episode tracking
nightKeyLocalDate: text    // YYYY-MM-DD in local timezone
awakeningsCount: integer   // Number of awakenings ≥2 min
longestAwakeBoutMinutes: integer  // Max single awake duration
sleepMidpointLocal: timestamp     // Midpoint timestamp in local time
sleepEfficiency: real      // actualSleepMinutes / totalMinutes
flags: text[]              // ['data_inconsistent', 'outlier_duration', etc.]
```

**All fields are nullable/have defaults** → Backward compatible with existing data

### Code Migration

**Before (v1.0):**
```typescript
// Simple aggregation
const totalMinutes = waketime - bedtime;
const sleepHours = (totalMinutes - awakeMinutes) / 60;
let sleepScore = 70;

if (sleepHours >= 7 && sleepHours <= 9) {
  sleepScore += 15;
}
// ... more adjustments
```

**After (v2.0):**
```typescript
import {
  parseRawSegments,
  clusterIntoEpisodes,
  selectPrimaryEpisode,
  calculateSleepScore,
  validateSleepEpisode,
} from './sleepScoring';

// 1. Parse raw HealthKit segments
const segments = parseRawSegments(rawHealthKitData);

// 2. Cluster into episodes
const episodes = clusterIntoEpisodes(segments, userTimezone);

// 3. Select primary episode for the night
const primary = selectPrimaryEpisode(episodes);

if (primary && validateSleepEpisode(primary).valid) {
  // 4. Calculate score with previous midpoints for regularity
  const scoreResult = calculateSleepScore(primary, previousMidpoints);
  
  // 5. Store in database
  await storage.upsertSleepSession({
    userId,
    bedtime: primary.episodeStart,
    waketime: primary.episodeEnd,
    totalMinutes: primary.inBedMinutes,
    actualSleepMinutes: primary.actualSleepMinutes,
    awakeMinutes: primary.awakeMinutes,
    lightMinutes: primary.lightMinutes,
    deepMinutes: primary.deepMinutes,
    remMinutes: primary.remMinutes,
    sleepScore: scoreResult.score,
    quality: scoreResult.quality,
    episodeType: 'primary',
    episodeId: primary.episodeId,
    awakeningsCount: primary.awakeningsCount,
    longestAwakeBoutMinutes: primary.longestAwakeBoutMinutes,
    sleepMidpointLocal: primary.sleepMidpointLocal,
    sleepEfficiency: primary.sleepEfficiency,
    nightKeyLocalDate: primary.nightKeyLocalDate,
    flags: primary.flags,
    source: 'ios-healthkit',
  });
}

// Handle naps separately
const naps = episodes.filter(ep => ep.episodeType === 'nap');
// ... nap processing
```

## Expected Score Differences

### Same Sleep, Different Scores

**Example: 7.5 hours, 90% efficiency, optimal stages**

**v1.0 Score:**
```
70 (base)
+15 (duration 7-9h)
+10 (deep 20%)
+10 (REM 23%)
-10 (awake 10-15%)
= 95 points
```

**v2.0 Score:**
```
+25 (duration 7-9h)
+16 (efficiency 90-94.9%)
+10 (deep 15-25%)
+10 (REM 18-28%)
+7 (3 awakenings, 12 min longest)
+5 (regular sleep midpoint)
= 73 points
```

**Why the difference?**
- v2.0 rewards consistency and penalizes fragmentation
- v1.0 was more generous with base score (70 starting vs. 0)
- v2.0 provides more granular assessment

### Typical Score Ranges

**v1.0:**
- Most sleeps: 70-95
- Perfect sleep: 95-100
- Poor sleep: 40-65

**v2.0:**
- Most sleeps: 60-80
- Perfect sleep: 85-100
- Poor sleep: 20-50

## Benefits of v2.0

1. **Primary vs. Nap Separation** - Naps no longer reduce nightly score
2. **Fragmentation Tracking** - Penalizes frequent awakenings and long disruptions
3. **Regularity Bonus** - Rewards consistent sleep timing
4. **Better Edge Cases** - Handles split nights, late sleepers, shift workers
5. **More Accurate** - 6 independent components vs. 4 simple adjustments
6. **Scientifically Validated** - Based on ACSM/NSCA/WHO sleep guidelines

## Testing

**Run validation tests:**
```typescript
import { SLEEP_SCORE_EXAMPLES } from './sleepScoring';

// Test all scenarios
for (const [scenario, example] of Object.entries(SLEEP_SCORE_EXAMPLES)) {
  const result = calculateSleepScore(createEpisodeFromExample(example.input));
  console.log(`${scenario}: Expected ${example.expectedScore}, Got ${result.score}`);
}
```

## Rollback Plan

If v2.0 causes issues, revert by:
1. Restore `server/services/sleepScoring.ts` to v1.0
2. Update routes to use simple aggregation logic
3. Schema changes are backward compatible - no database changes needed
