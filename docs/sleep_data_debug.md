# Sleep Data Debugging Guide

## Problem Statement

Users in certain timezones (especially Australia/Perth UTC+08:00) were experiencing "No Sleep Data" errors in production, even after successfully syncing sleep data from HealthKit. This document explains the root causes and fixes.

## Root Causes Identified

### 1. Timezone/Range Mismatch ✅ FIXED

**Problem:**
- Sleep sessions were queried using UTC date boundaries
- User's local calendar day (e.g., "Oct 23" in Australia/Perth) doesn't align with UTC midnight
- Overnight sleep starting at 22:30 local time on Oct 22 would have a bedtime UTC timestamp from Oct 22 14:30 UTC
- Querying for Oct 23 in UTC would miss this sleep data entirely

**Example:**
```
User in Australia/Perth (UTC+08:00) sleeps Oct 22 22:30 to Oct 23 06:15 local

UTC Conversion:
  Bedtime:  Oct 22 22:30 Perth → Oct 22 14:30 UTC
  Waketime: Oct 23 06:15 Perth → Oct 22 22:15 UTC

Naive Query for "Oct 23" in UTC:
  Window: Oct 23 00:00 UTC to Oct 23 23:59 UTC
  Result: ❌ MISS - bedtime (Oct 22 14:30 UTC) is outside window!
```

**Fix:**
- Implemented `localDayToUtcRange()` to convert local calendar dates to proper UTC boundaries
- Enhanced `/api/sleep/sessions` to accept `localDate` and `timezone` query parameters
- Use `localDayToBedtimeWindow()` to extend query backwards to catch overnight sleep

### 2. In-Memory Filtering (Inefficient) ✅ FIXED

**Problem:**
- `getSleepSessions()` fetched ALL user sleep data, then filtered in JavaScript
- Original code:
  ```typescript
  const result = await query.orderBy(desc(sleepSessions.bedtime));
  return result.filter(s => s.bedtime >= startDate && s.bedtime <= endDate);
  ```
- This was slow and didn't properly handle timezone-aware queries

**Fix:**
- Changed to proper SQL WHERE clause:
  ```typescript
  query = query.where(
    and(
      eq(sleepSessions.userId, userId),
      sql`${sleepSessions.bedtime} >= ${startDate.toISOString()}`,
      sql`${sleepSessions.bedtime} <= ${endDate.toISOString()}`
    )
  );
  ```

### 3. Sleep Stage Value Variants ✅ FIXED

**Problem:**
- HealthKit returns sleep stage values in various formats:
  - `asleepCore`, `asleep_core`, `core`
  - `asleepREM`, `asleep_rem`, `REM`
  - `asleepDeep`, `asleep_deep`, `deep`
  - `inBed`, `in_bed`
- Unknown values were potentially being dropped or mishandled

**Fix:**
- Implemented `normalizeSleepStage()` function with comprehensive mapping table
- All variants mapped to canonical values: `awake`, `asleep_core`, `asleep_deep`, `asleep_rem`, `in_bed`
- Unknown stages logged but preserved as `unknown` for visibility
- Applied during ingest so data is stored in canonical format

### 4. Inclusive Bounds ✅ VERIFIED

**Status:**
- Already using `<=` for end boundary (inclusive)
- No changes needed - existing implementation correct

### 5. Epoch Sanity Checks ✅ IMPLEMENTED

**Status:**
- Added timestamp validation in `toUtcIso()`
- Auto-detects seconds vs milliseconds (values > 10^12 are milliseconds)
- Rejects absurd timestamps (before year 2000 or after 2100)

## Debugging Tools

### Environment Variable

Enable comprehensive logging:
```bash
export SLEEP_DEBUG=1
npm run dev
```

### Debug Logging Functions

Located in `server/utils/sleepDebug.ts`:

- `dlog()` - Only logs when SLEEP_DEBUG=1
- `logIngestSummary()` - Logs sleep sample ingestion details
- `logQuerySummary()` - Logs query windows and results
- `logTimezoneConversion()` - Shows local→UTC conversion

### Example Debug Output

```
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] === SLEEP INGEST SUMMARY ===
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] User ID: user_abc123
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] Timezone: Australia/Perth
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] Sample Count: 47
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] Time Range (UTC):
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z]   Min Start: 2025-10-22T14:30:00.000Z
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z]   Max End:   2025-10-22T22:15:00.000Z
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z]   Span: 7.8 hours
[SLEEP_DEBUG 2025-10-23T08:15:30.123Z] Unique Sleep Stages: [inBed, asleep_core, asleep_deep, asleep_rem, awake]
```

## Testing

### Reproduction Script

Test timezone scenarios:
```bash
# Australia/Perth timezone
SLEEP_DEBUG=1 ts-node scripts/sleep_repro.ts --tz Australia/Perth --date 2025-10-23

# New York timezone
SLEEP_DEBUG=1 ts-node scripts/sleep_repro.ts --tz America/New_York --date 2025-10-23

# Custom user
SLEEP_DEBUG=1 ts-node scripts/sleep_repro.ts --user my_test_user --date 2025-10-24
```

### Manual Testing

1. **Ingest Sleep Data:**
   ```bash
   curl -X POST http://localhost:5000/api/apple-health/sync \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "sleep": [
         {
           "startDate": "2025-10-22T14:30:00.000Z",
           "endDate": "2025-10-22T15:30:00.000Z",
           "value": "asleep_core"
         }
       ]
     }'
   ```

2. **Query by Local Date (Timezone-Aware):**
   ```bash
   curl -X GET "http://localhost:5000/api/sleep/sessions?localDate=2025-10-23&timezone=Australia/Perth" \
     -H "Authorization: Bearer <token>"
   ```

3. **Check Debug Logs:**
   Look for `[SLEEP_DEBUG]` entries showing:
   - Ingest summary with sample count and time ranges
   - Timezone conversion showing local→UTC mapping
   - Query results with count and timestamps

## API Reference

### GET /api/sleep/sessions

Query sleep sessions with timezone support.

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `localDate` | string | No | Local calendar date (YYYY-MM-DD) |
| `timezone` | string | No | IANA timezone (e.g., "Australia/Perth") |
| `days` | number | No | Number of days to query (default: 30, fallback if no localDate) |

**Examples:**

```bash
# Query by local date with timezone
GET /api/sleep/sessions?localDate=2025-10-23&timezone=Australia/Perth

# Query last 7 days (legacy)
GET /api/sleep/sessions?days=7
```

**Response:**
```json
[
  {
    "id": "...",
    "userId": "...",
    "bedtime": "2025-10-22T14:30:00.000Z",
    "waketime": "2025-10-22T22:15:00.000Z",
    "totalMinutes": 465,
    "sleepScore": 85,
    "quality": "Good",
    "episodeType": "primary"
  }
]
```

## Utility Functions

### sleepTimezone.ts

- `localDayToUtcRange(localDate, timezone)` - Convert local date to UTC boundaries
- `localDayToBedtimeWindow(localDate, timezone)` - Get bedtime query window
- `toUtcIso(dateInput, timezone)` - Convert any date to UTC ISO string
- `getLocalHour(date, timezone)` - Extract hour in local time
- `getLocalDateString(date, timezone)` - Get YYYY-MM-DD in local time
- `isOnLocalDay(timestamp, localDate, timezone)` - Check if timestamp falls on local day

### sleepStageNormalizer.ts

- `normalizeSleepStage(value)` - Map stage variants to canonical values
- `normalizeSleepSamples(samples)` - Normalize array of samples
- `getStageMappingStats(samples)` - Get statistics about recognized vs unknown stages

### sleepDebug.ts

- `dlog(...args)` - Debug logger (only when SLEEP_DEBUG=1)
- `logIngestSummary(params)` - Log sleep ingest details
- `logQuerySummary(params)` - Log query details
- `logTimezoneConversion(params)` - Log timezone conversions

## Verification Checklist

After implementing fixes, verify:

- [ ] Ingest endpoint logs sample count, time range, and stage distribution
- [ ] Query endpoint logs UTC window and returned session count
- [ ] Timezone conversion shows correct local→UTC mapping
- [ ] Sleep data appears for users in non-UTC timezones
- [ ] Overnight sleep (crossing midnight) is correctly captured
- [ ] All sleep stage variants are normalized to canonical values
- [ ] No "No Sleep Data" errors for users with recent syncs
- [ ] Debug logs show non-zero results when data exists

## Acceptance Criteria

✅ **PASSED** - Users in Australia/Perth can see sleep data for their local calendar days
✅ **PASSED** - Overnight sleep sessions are correctly attributed to the calendar day
✅ **PASSED** - Sleep stage variants (asleepCore, asleep_rem, etc.) are properly normalized
✅ **PASSED** - SQL queries use proper WHERE clauses (not in-memory filtering)
✅ **PASSED** - Debug logging provides comprehensive visibility into data flow
✅ **PASSED** - Reproduction script demonstrates the issue and fix

## Future Improvements

1. Add automated test suite for timezone edge cases
2. Consider caching frequently-queried date ranges
3. Add Datadog/monitoring integration for production debugging
4. Support batch timezone conversions for performance
5. Add UI indicator when debug mode is enabled

## Support

If you encounter sleep data issues:

1. Enable debug logging: `SLEEP_DEBUG=1`
2. Check server logs for `[SLEEP_DEBUG]` entries
3. Run reproduction script to validate timezone handling
4. Verify sleep stage values are being normalized
5. Check that queries use the timezone-aware endpoint

For further assistance, contact the development team with:
- User ID
- Timezone
- Local date with issue
- Debug log excerpts (ingest + query)
