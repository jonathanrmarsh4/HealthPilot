# Daily Health Insights Debug Guide

## Overview
This guide helps debug why the Daily Health Insights dashboard tile shows no insights.

## Quick Diagnosis

### 1. Check if insights exist
```sql
-- Replace :userId with actual user ID
-- Replace :date with YYYY-MM-DD format

SELECT COUNT(*) as total_insights
FROM daily_health_insights
WHERE user_id = :userId
AND date = :date;
```

### 2. Inspect sample insights
```sql
SELECT 
  id,
  date,
  generated_for,
  title,
  message,
  metric,
  severity,
  confidence,
  score,
  status,
  created_at
FROM daily_health_insights
WHERE user_id = :userId
AND date >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY date DESC, score DESC
LIMIT 20;
```

### 3. Check raw input data availability

**Sleep Data:**
```sql
-- Get UTC range for local day in Australia/Perth (UTC+8)
-- For 2025-10-23 local → 2025-10-22 16:00:00 UTC to 2025-10-23 15:59:59 UTC

SELECT COUNT(*) as sleep_sessions
FROM sleep_sessions
WHERE user_id = :userId
AND started_at BETWEEN :startUtc AND :endUtc;

SELECT 
  started_at,
  ended_at,
  total_hours,
  sleep_score,
  rem_minutes,
  deep_minutes
FROM sleep_sessions
WHERE user_id = :userId
AND started_at BETWEEN :startUtc AND :endUtc
ORDER BY started_at DESC
LIMIT 5;
```

**Daily Metrics (HRV, RHR, etc):**
```sql
SELECT metric_name, COUNT(*) as count, AVG(value) as avg_value
FROM daily_metrics
WHERE user_id = :userId
AND date BETWEEN :date - INTERVAL '7 days' AND :date
GROUP BY metric_name;

SELECT date, metric_name, value
FROM daily_metrics
WHERE user_id = :userId
AND metric_name IN ('hrv', 'resting_heart_rate', 'steps')
AND date = :date;
```

**Workouts:**
```sql
SELECT COUNT(*) as workout_count
FROM workouts
WHERE user_id = :userId
AND started_at BETWEEN :startUtc AND :endUtc;

SELECT 
  started_at,
  workout_type,
  duration,
  intensity
FROM workouts
WHERE user_id = :userId
AND started_at BETWEEN :startUtc AND :endUtc
ORDER BY started_at DESC
LIMIT 5;
```

**Biomarkers:**
```sql
SELECT COUNT(*) as biomarker_count
FROM biomarkers
WHERE user_id = :userId
AND observed_at BETWEEN :startUtc AND :endUtc;

SELECT 
  marker_name,
  value,
  unit,
  observed_at
FROM biomarkers
WHERE user_id = :userId
AND observed_at BETWEEN :startUtc AND :endUtc
ORDER BY observed_at DESC
LIMIT 10;
```

**Symptoms:**
```sql
SELECT COUNT(*) as symptom_count
FROM symptom_events
WHERE user_id = :userId
AND recorded_at BETWEEN :startUtc AND :endUtc;

SELECT 
  episode_id,
  name,
  severity,
  trend,
  context,
  recorded_at
FROM symptom_events
WHERE user_id = :userId
AND recorded_at BETWEEN :startUtc AND :endUtc
ORDER BY recorded_at DESC
LIMIT 10;
```

### 4. Check baseline data (required for deviations)
```sql
-- Baseline requires at least 14 days of historical data
SELECT metric_name, COUNT(*) as days_of_data
FROM daily_metrics
WHERE user_id = :userId
AND date BETWEEN CURRENT_DATE - INTERVAL '30 days' AND CURRENT_DATE
GROUP BY metric_name
HAVING COUNT(*) < 14;

-- If above returns rows, those metrics don't have enough baseline data
```

### 5. Check insights generation errors
```sql
-- Look for patterns in insight generation results
SELECT 
  date,
  generated_for,
  COUNT(*) as insights_count,
  MAX(created_at) as last_generated
FROM daily_health_insights
WHERE user_id = :userId
GROUP BY date, generated_for
ORDER BY date DESC
LIMIT 10;
```

## Common Root Causes

### Cause 1: Timezone Mismatch
**Symptom:** Insights generated for wrong date
**Fix:** Ensure UTC range conversion uses correct timezone offset

```typescript
// Australia/Perth is UTC+8 (no DST)
const startUtc = new Date(`${localDate}T00:00:00+08:00`);
const endUtc = new Date(`${localDate}T23:59:59.999+08:00`);
```

### Cause 2: Insufficient Baseline Data
**Symptom:** No insights despite having data
**Fix:** User needs at least 14 days of metrics for baseline computation

**Check:**
```sql
SELECT 
  metric_name,
  MIN(date) as first_date,
  MAX(date) as last_date,
  COUNT(DISTINCT date) as days_with_data
FROM daily_metrics
WHERE user_id = :userId
GROUP BY metric_name;
```

### Cause 3: No Significant Deviations
**Symptom:** Data exists but no insights generated
**Expected:** Insights only generated when metrics deviate significantly from baseline
**Threshold:** Typically ±15% deviation required

### Cause 4: Scheduler Not Running
**Symptom:** Old insights but no new ones
**Check:** Server logs for `[DailyInsights]` messages

```bash
grep "DailyInsights" logs/application.log | tail -20
```

### Cause 5: API Response Shape Mismatch
**Symptom:** Frontend receives data but doesn't render
**Fix:** Ensure API returns correct format:

```json
{
  "startDate": "2025-10-16",
  "endDate": "2025-10-23",
  "insights": [...],
  "total": 5
}
```

## Reproduction Steps

1. **Set debug mode:**
   ```bash
   export INSIGHTS_DEBUG=1
   ```

2. **Run repro script:**
   ```bash
   tsx server/scripts/insights_repro.ts --user <userId> --date 2025-10-23
   ```

3. **Check output:**
   - Verify raw inputs exist
   - Check insights generation succeeded
   - Confirm insights written to database
   - Validate API returns data

## Manual Trigger (Testing)

```bash
curl -X POST https://your-domain.replit.app/api/insights/generate-v2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

## Production Checklist

- [ ] Scheduler is running (check logs for hourly cron messages)
- [ ] At least 14 days of metrics data exists for baseline
- [ ] UTC timezone conversion is correct for Australia/Perth
- [ ] API endpoint `/api/insights/history` returns 200
- [ ] Frontend fetches from correct endpoint
- [ ] Database has `daily_health_insights` table
- [ ] Environment variable `INCLUDE_SYMPTOMS_IN_INSIGHTS` is not false
- [ ] OpenAI API key is configured (for AI-generated insights)

## Quick Fixes

### Force regenerate insights for today:
```bash
tsx server/scripts/insights_repro.ts --user <userId> --date $(date +%Y-%m-%d)
```

### Backfill last 7 days:
```bash
for i in {0..6}; do
  date=$(date -d "$i days ago" +%Y-%m-%d)
  tsx server/scripts/insights_repro.ts --user <userId> --date $date
done
```
