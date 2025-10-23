# Health Auto Export Webhook Debugging Guide

## Overview
This guide helps diagnose why certain Health Auto Export metrics aren't being stored in HealthPilot.

## Quick Diagnosis Checklist

### ✅ Step 1: Enable Debug Mode

1. **Add Secret in Replit:**
   - Open your Repl
   - Click the "Secrets" icon (🔒) in the left sidebar (Tools section)
   - Click "New Secret"
   - Key: `AE_DEBUG`
   - Value: `1`
   - Click "Add Secret"

2. **Restart the server:**
   - The server should auto-restart when you add the secret
   - Or manually restart the workflow

3. **Verify debug mode is active:**
   - Check logs for: `Debug mode: ENABLED ✅`

### ✅ Step 2: Test Webhook Locally

Run the test script to verify the webhook handler:

```bash
# Test all metric types
npm run test-webhook -- --all

# Test specific metric
npm run test-webhook -- --type=bloodPressure
npm run test-webhook -- --type=weight
npm run test-webhook -- --type=sleep
```

Expected debug output:
```
[AE_DEBUG] === WEBHOOK RECEIVED ===
[AE_DEBUG] User ID: 34226453
[AE_DEBUG] Metric types and counts:
  - Blood Pressure: 2 samples
  - Weight: 1 samples
[AE_DEBUG] Sample structure for "Blood Pressure":
  {
    name: 'Blood Pressure',
    units: 'mmHg',
    dataCount: 2,
    firstDataPoint: {
      keys: ['date', 'systolic', 'diastolic'],
      sample: { date: '2025-10-23...', systolic: 120, diastolic: 80 }
    }
  }
[AE_DEBUG] 🩺 Processing Blood Pressure data: 2 readings
[AE_DEBUG]   📈 Systolic: 120 mmHg at 2025-10-23...
[AE_DEBUG]   📉 Diastolic: 80 mmHg at 2025-10-23...
[AE_DEBUG] ✅ Inserted 4 BP readings
```

### ✅ Step 3: Check Health Auto Export Configuration

#### Required Configuration in Health Auto Export App:

1. **Data Types Enabled:**
   - ✅ Blood Pressure
   - ✅ Heart Rate
   - ✅ Heart Rate Variability
   - ✅ Weight
   - ✅ Lean Body Mass
   - ✅ Sleep Analysis
   - ✅ Steps
   - ✅ Active Energy

2. **Webhook URL:**
   ```
   Production: https://healthpilot.pro/api/health-auto-export/webhook
   Development: https://YOUR-REPL-URL.replit.dev/api/health-auto-export/webhook
   ```

3. **Export Schedule:**
   - Should be enabled and set to run automatically
   - Manual trigger: Tap "Send Now" or "Export Now"

4. **HealthKit Permissions:**
   Go to: **Settings → Health → Data Access & Devices → Health Auto Export**
   
   Verify ALL permissions are granted:
   - ✅ Blood Pressure
   - ✅ Heart Rate
   - ✅ Heart Rate Variability
   - ✅ Weight
   - ✅ Lean Body Mass
   - ✅ Sleep Analysis
   - ✅ Steps
   - ✅ Active Energy Burned

### ✅ Step 4: Verify Data in Apple Health

Before troubleshooting the webhook, verify data exists in Apple Health:

1. Open **Health** app on iPhone
2. Go to **Browse** tab
3. Check each category:
   - **Heart → Blood Pressure** - Should show recent readings
   - **Body Measurements → Weight** - Should show recent weight
   - **Body Measurements → Lean Body Mass** - Should show data
   - **Sleep** - Should show sleep sessions
   - **Activity → Steps** - Should show step counts

If data is missing in Apple Health, Health Auto Export can't send it!

### ✅ Step 5: Check Database for Received Data

Query the database to see what was actually stored:

```sql
-- Check recent biomarkers from Health Auto Export
SELECT type, value, unit, recorded_at, source 
FROM biomarkers 
WHERE user_id = 'YOUR_USER_ID' 
  AND source = 'health-auto-export' 
ORDER BY recorded_at DESC 
LIMIT 20;

-- Count by type
SELECT type, COUNT(*) as count, MAX(recorded_at) as latest
FROM biomarkers 
WHERE user_id = 'YOUR_USER_ID' 
  AND source = 'health-auto-export'
GROUP BY type
ORDER BY latest DESC;

-- Check sleep sessions
SELECT bedtime, waketime, total_minutes, sleep_score
FROM sleep_sessions
WHERE user_id = 'YOUR_USER_ID'
  AND source = 'apple-health'
ORDER BY bedtime DESC
LIMIT 10;
```

## Common Issues & Solutions

### Issue 1: No Data Arriving at All
**Symptoms:** No metrics showing up in database, no webhook logs

**Solutions:**
1. Verify webhook URL is correct in Health Auto Export
2. Check if exports are succeeding in the app (should show "Upload successful")
3. Verify network connectivity (app needs internet to send webhooks)
4. Check authentication - webhook requires valid Replit Auth session

### Issue 2: Some Metrics Missing (e.g., Blood Pressure)
**Symptoms:** HR/Steps working, but BP/Weight/Sleep not appearing

**Solutions:**
1. Check Apple Health permissions (Step 3 above)
2. Verify data exists in Apple Health (Step 4 above)
3. Look for unmapped metric warnings in logs:
   ```
   [AE_DEBUG] ⚠️ Unmapped metric type: "some_name" - skipping
   ```
4. Check if metric name format differs (snake_case vs camelCase vs Title Case)

### Issue 3: Data Sent But Not Stored
**Symptoms:** Webhook receives data, but database queries return nothing

**Solutions:**
1. Check for value extraction errors in logs:
   ```
   [AE_DEBUG] ⚠️ Skipping data point - no value found
   ```
2. Verify unit conversion is working (kg/lb, mmHg, etc.)
3. Check for date parsing issues (invalid ISO dates)
4. Look for database constraint violations in error logs

### Issue 4: Wrong Data Format
**Symptoms:** Expected fields missing, values in wrong units

**Solutions:**
1. Check the sample structure debug output:
   ```
   [AE_DEBUG] Sample structure for "Weight":
     { keys: ['date', 'kg'], ... }  // vs expected ['date', 'qty']
   ```
2. Add field name variations to metricMapping
3. Update value extraction logic in webhook handler

## Supported Metric Name Variations

The webhook handler supports multiple name formats:

### Blood Pressure
- `Blood Pressure` (Title Case)
- `blood_pressure` (snake_case)
- `bloodPressure` (camelCase)

**Field names:**
- `systolic` / `sys`
- `diastolic` / `dia`

### Weight
- `Weight`
- `weight`
- `Body Weight` / `body_weight` / `bodyWeight`
- `weight_body_mass` / `weightBodyMass`

### Lean Body Mass
- `Lean Body Mass`
- `lean_body_mass`
- `leanBodyMass`

### Sleep Analysis
- `Sleep Analysis`
- `sleep_analysis`
- `sleepAnalysis`

### Heart Rate
- `Heart Rate`
- `heart_rate`
- `heartRate`
- `Resting Heart Rate` / `resting_heart_rate` / `restingHeartRate`

### HRV
- `Heart Rate Variability`
- `heart_rate_variability`
- `heartRateVariability`
- `HRV` / `hrv`

## Unit Conversions

The webhook automatically converts units:

| Metric | Input Units | Storage Unit |
|--------|-------------|--------------|
| Weight | kg, lbs | lbs |
| Lean Body Mass | kg, lbs | lbs |
| Blood Pressure | mmHg | mmHg |
| Heart Rate | bpm | bpm |
| HRV | ms | ms |
| Steps | count | steps |
| Energy | kcal, kJ | kcal |

## Advanced Debugging

### Capture Raw Webhook Payload

Add this to webhook handler temporarily:

```typescript
// After payload parsing
console.log('📦 RAW PAYLOAD:', JSON.stringify(req.body, null, 2));
```

### Test Different Payload Formats

Use curl to test specific formats:

```bash
# Test with sys/dia field names (instead of systolic/diastolic)
curl -X POST http://localhost:5000/api/health-auto-export/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "metrics": [{
        "name": "blood_pressure",
        "units": "mmHg",
        "data": [{"date": "2025-10-23T12:00:00Z", "sys": 120, "dia": 80}]
      }]
    }
  }'
```

### Monitor Live Exports

1. Have server logs open with AE_DEBUG=1
2. Open Health Auto Export app
3. Tap "Send Now"
4. Watch logs in real-time
5. Compare what's sent vs what's logged

## Expected Workflow

1. **Health Auto Export** reads data from Apple Health
2. **Packages** metrics into JSON payload
3. **POSTs** to HealthPilot webhook URL
4. **Webhook handler** receives and logs (if AE_DEBUG=1)
5. **Maps** metric names to internal types
6. **Extracts** values from data points
7. **Converts** units to standard format
8. **Stores** in database via `storage.upsertBiomarker()`
9. **Returns** success response

Any break in this chain will cause data loss.

## Getting Help

If issues persist after following this guide:

1. Capture debug logs showing the issue
2. Run test script and note which tests fail
3. Export database query results
4. Document exact steps taken
5. Note any error messages
6. Share all above with support

## Maintenance

- Review logs periodically for unmapped metrics
- Update metric name mappings as Health Auto Export changes
- Monitor for new HealthKit data types
- Keep unit conversion table updated
