# 🚀 Quick Start: Health Auto Export Webhook Debugging

## Step 1: Add AE_DEBUG Secret ⚙️

1. **Open Replit Secrets Panel:**
   - Look in the left sidebar for the **Tools** section
   - Click the 🔒 **Secrets** icon (or lock icon)

2. **Add New Secret:**
   - Click **"New Secret"** button
   - **Key:** `AE_DEBUG`
   - **Value:** `1`
   - Click **"Add Secret"**

3. **Restart Server:**
   - The workflow should auto-restart
   - Or click the restart button in the workflow panel

4. **Verify:**
   - Check logs for: `Debug mode: ENABLED ✅`

## Step 2: Run Webhook Tests 🧪

### Test All Metrics (Recommended)
```bash
tsx scripts/test-webhook.ts --all
```

### Test Specific Metric
```bash
# Blood Pressure
tsx scripts/test-webhook.ts --type=bloodPressure

# Weight
tsx scripts/test-webhook.ts --type=weight

# Sleep
tsx scripts/test-webhook.ts --type=sleep

# Lean Body Mass
tsx scripts/test-webhook.ts --type=leanBodyMass
```

## Step 3: Check Results 📊

### Look for Debug Output in Logs

You should see detailed output like:

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
      sample: { date: '2025-10-23T12:00:00Z', systolic: 120, diastolic: 80 }
    }
  }

[AE_DEBUG] 🩺 Processing Blood Pressure data: 2 readings
[AE_DEBUG]   📈 Systolic: 120 mmHg at 2025-10-23T12:00:00Z
[AE_DEBUG]   📉 Diastolic: 80 mmHg at 2025-10-23T12:00:00Z
[AE_DEBUG] ✅ Inserted 4 BP readings
```

### Query Database

```sql
-- Check what was inserted
SELECT type, value, unit, recorded_at 
FROM biomarkers 
WHERE source = 'health-auto-export' 
ORDER BY recorded_at DESC 
LIMIT 20;
```

## Step 4: Trigger Real Export from iPhone 📱

1. **Open Health Auto Export app**
2. **Verify webhook URL:**
   - Should be: `https://healthpilot.pro/api/health-auto-export/webhook`
3. **Tap "Send Now"** or **"Export Now"**
4. **Watch server logs** in real-time for debug output
5. **Verify success** in app (should show "Upload successful")

## Step 5: Verify Health Auto Export Configuration 📋

### Check App Settings

1. **Data Types Enabled:**
   - ✅ Blood Pressure
   - ✅ Heart Rate  
   - ✅ Heart Rate Variability
   - ✅ Weight
   - ✅ Lean Body Mass
   - ✅ Sleep Analysis
   - ✅ Steps
   - ✅ Active Energy

2. **HealthKit Permissions:**
   - Go to: **Settings → Health → Data Access & Devices → Health Auto Export**
   - Make sure ALL are checked ✅

3. **Data Exists in Apple Health:**
   - **Blood Pressure:** Health app → Browse → Heart → Blood Pressure
   - **Weight:** Health app → Browse → Body Measurements → Weight
   - **Sleep:** Health app → Browse → Sleep

## Common Issues 🔧

### ❌ "No metrics found in payload"
**Solution:** Check that Health Auto Export has data to send. Verify in Apple Health app.

### ❌ "Unmapped metric type: xyz"
**Solution:** The metric name format doesn't match. Check debug logs for exact name and add to `metricMapping` in `server/routes.ts`.

### ❌ "Skipping data point - no value found"
**Solution:** The data structure is different than expected. Check the sample structure in debug logs and update value extraction logic.

### ❌ Test script gives auth error
**Solution:** The test script needs authentication. You can:
1. Set `AUTH_TOKEN` environment variable with a valid session token
2. Or test after publishing/deploying where auth is configured

## What to Look For 🔍

✅ **Good Signs:**
- Debug logs show metric types received
- "Processing X data points" messages
- "Inserted X readings" success messages
- Database queries return new rows

❌ **Bad Signs:**
- "Unmapped metric type" warnings
- "Skipping data point" warnings  
- No debug output (AE_DEBUG not enabled)
- Empty database queries

## Next Steps 📚

For detailed troubleshooting, see:
- **[docs/health-auto-export-debug.md](docs/health-auto-export-debug.md)** - Complete debugging guide

For questions about:
- Metric name variations → See debug guide Section "Supported Metric Name Variations"
- Unit conversions → See debug guide Section "Unit Conversions"
- Payload formats → See debug guide Section "Advanced Debugging"

## Summary 📝

1. ✅ Add `AE_DEBUG=1` secret
2. ✅ Run test script: `tsx scripts/test-webhook.ts --all`
3. ✅ Check debug logs
4. ✅ Trigger real export from iPhone
5. ✅ Verify data in database

Debug logs will tell you **exactly** what's happening with each metric!
