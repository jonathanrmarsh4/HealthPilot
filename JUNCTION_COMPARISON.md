# Junction vs Health Auto Export - Integration Comparison

## Overview

This document compares Junction (formerly Vital) with the current Health Auto Export app integration for HealthPilot.

---

## 🏗️ Architecture

### Health Auto Export (Current)
- **Type**: iOS app (Health Auto Export)
- **Flow**: User's iPhone → App → Webhook to HealthPilot
- **Setup**: Install iOS app, configure webhook URL manually
- **Authentication**: Webhook secret verification
- **Reliability**: Depends on 3rd party iOS app

### Junction
- **Type**: Platform API with Mobile SDK
- **Flow**: User's iPhone → Junction SDK → Junction Cloud → Webhook to HealthPilot
- **Setup**: Integrate SDK or use OAuth connection flow
- **Authentication**: Svix webhook signatures (svix-id, svix-timestamp, svix-signature)
- **Reliability**: Enterprise-grade, Y Combinator-backed company

---

## 📊 Device Support

### Health Auto Export
- ✅ Apple Health only
- ❌ No other wearables

### Junction
- ✅ **Apple Health** (45+ data types)
- ✅ **300+ devices**: Fitbit, Garmin, Oura, Whoop, Strava, etc.
- ✅ **Medical devices**: Dexcom, Abbott CGM, blood pressure monitors
- ✅ **Lab integrations**: Quest Diagnostics, at-home testing

---

## 🔄 Data Flow Patterns

### Health Auto Export
**Single webhook format:**
```json
{
  "data": {
    "metrics": [
      {
        "name": "heart_rate",
        "units": "count/min",
        "data": [
          { "qty": 72, "date": "2024-01-01T10:00:00Z" }
        ]
      }
    ]
  }
}
```

**Processing:**
- All data arrives in single webhook
- Batch processing required
- Manual unit conversion needed

### Junction
**Three-stage event system:**

**1. Connection Event:**
```json
{
  "event_type": "provider.connection.created",
  "data": {
    "user_id": "...",
    "provider": { "name": "Apple HealthKit", "slug": "apple_health_kit" }
  }
}
```

**2. Historical Backfill Notification:**
```json
{
  "event_type": "historical.data.workouts.created",
  "data": {
    "user_id": "...",
    "start_date": "2020-06-21",
    "end_date": "2024-01-01",
    "provider": "apple_health_kit"
  }
}
```
_Note: Data-less notification. Fetch via API._

**3. Incremental Data Events:**
```json
{
  "event_type": "daily.data.workouts.created",
  "data": {
    "id": "185d0f34-...",
    "user_id": "...",
    "average_hr": 100,
    "calories": 300,
    "distance": 1700,
    "time_start": "2024-01-01T10:00:00Z",
    "time_end": "2024-01-01T11:00:00Z",
    "sport": { "id": 1, "name": "running" },
    "source": { "provider": "apple_health_kit", "type": "iphone" }
  }
}
```

**Processing:**
- Real-time incremental updates
- Event-driven architecture
- Pre-normalized data structure

---

## 🗂️ Data Mapping

### Workouts

| Field | Health Auto Export | Junction | Mapping |
|-------|-------------------|----------|---------|
| **Type** | `metric.name` = "Workout" | `data.sport.name` | ✅ Direct |
| **Start** | `dataPoint.startDate` | `data.time_start` | ✅ Direct |
| **End** | `dataPoint.endDate` | `data.time_end` | ✅ Direct |
| **Duration** | Calculate from start/end | `data.moving_time` (seconds) | ✅ Convert to minutes |
| **Calories** | `dataPoint.calories` | `data.calories` | ✅ Direct |
| **Distance** | `dataPoint.distance` | `data.distance` (meters) | ✅ Direct |
| **Heart Rate** | Separate metric | `data.average_hr`, `data.max_hr` | ✅ Embedded |
| **Source** | "health-auto-export" | `data.source.provider` | ⚠️ Map to sourceType |

### Sleep

| Field | Health Auto Export | Junction | Mapping |
|-------|-------------------|----------|---------|
| **Bedtime** | `dataPoint.date` | `data.bedtime_start` | ✅ Direct |
| **Waketime** | Calculate from duration | `data.bedtime_stop` | ✅ Direct |
| **Total** | `dataPoint.asleep` (seconds) | `data.total` (seconds) | ✅ Convert to minutes |
| **Awake** | Not provided | `data.awake` (seconds) | ✅ Convert to minutes |
| **Light** | Not provided | `data.light` (seconds) | ✅ Convert to minutes |
| **Deep** | Not provided | `data.deep` (seconds) | ✅ Convert to minutes |
| **REM** | Not provided | `data.rem` (seconds) | ✅ Convert to minutes |
| **Score** | Not provided | `data.score` (1-100) | ✅ Direct |
| **HRV** | Separate metric | `data.average_hrv` | ✅ Embedded |
| **Heart Rate** | Separate metric | `data.hr_average`, `data.hr_lowest` | ✅ Embedded |
| **Respiratory Rate** | Separate metric | `data.respiratory_rate` | ✅ Embedded |

### Biomarkers

| Type | Health Auto Export | Junction | Notes |
|------|-------------------|----------|-------|
| **Heart Rate** | `heart_rate` metric | `daily.data.heartrate` | ✅ Similar structure |
| **Weight** | `body_mass` metric | `daily.data.body` / `daily.data.weight` | ✅ Unit conversion needed |
| **Blood Glucose** | `blood_glucose` metric | `daily.data.glucose` | ✅ Unit conversion (mmol/L → mg/dL) |
| **Blood Pressure** | Systolic/Diastolic split | `daily.data.blood_pressure` | ✅ Similar split |
| **Steps** | `step_count` metric | `daily.data.steps` | ✅ Direct mapping |

---

## 🔐 Security & Authentication

### Health Auto Export
```typescript
// Webhook authentication
const webhookAuth = (req, res, next) => {
  const providedSecret = req.headers['x-webhook-secret'];
  const expectedSecret = process.env.WEBHOOK_SECRET;
  if (providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};
```

### Junction
```typescript
// Svix webhook signature verification (implemented in /api/junction/webhook)
const svixId = req.headers['svix-id'] as string;
const svixTimestamp = req.headers['svix-timestamp'] as string;
const svixSignature = req.headers['svix-signature'] as string;

if (!svixId || !svixTimestamp || !svixSignature) {
  return res.status(401).json({ error: "Missing webhook signature headers" });
}

// TODO: Full signature verification with Svix SDK
// const wh = new Webhook(JUNCTION_WEBHOOK_SECRET);
// wh.verify(JSON.stringify(req.body), headers);
```

**⚠️ Current Implementation Status:**
- ✅ **Sandbox**: Header presence validation only (checks svix-id, svix-timestamp, svix-signature exist)
- ❌ **Production**: NOT READY - Missing cryptographic signature verification
- 🔒 **Security Gap**: Current implementation accepts any request with Svix headers present, even if signature is invalid

**Production Requirements (CRITICAL):**
1. Install Svix SDK: `npm install svix`
2. Get webhook signing secret from Junction Dashboard → Webhooks → Signing Secret
3. Store secret in environment: `JUNCTION_WEBHOOK_SECRET`
4. Implement full verification:
```typescript
import { Webhook } from 'svix';

const wh = new Webhook(process.env.JUNCTION_WEBHOOK_SECRET);
const payload = wh.verify(
  JSON.stringify(req.body),
  {
    'svix-id': svixId,
    'svix-timestamp': svixTimestamp,
    'svix-signature': svixSignature
  }
); // Throws error if signature invalid
```

**Recommendation**: Junction's cryptographic signature verification (when fully implemented) is significantly more secure than simple secret comparison used by Health Auto Export.

---

## 💰 Cost Analysis

### Health Auto Export
- ✅ **Free** (user downloads iOS app)
- ❌ Relies on 3rd party app maintenance
- ❌ Limited to Apple devices

### Junction
- 💵 **Paid service** (pricing tiers available)
- ✅ Free tier for testing
- ✅ Enterprise support
- ✅ SLA guarantees
- ✅ Multi-device support

**Trade-off**: Free vs Reliability & Features

---

## 🚀 Integration Complexity

### Health Auto Export
**Setup Time**: 30 minutes
- [x] Create webhook endpoint
- [x] Add authentication middleware
- [x] Parse flexible payload formats
- [x] Map metrics to biomarkers
- [x] Handle unit conversions
- [x] User installs iOS app
- [x] User configures webhook URL manually

### Junction
**Setup Time**: 2-3 hours
- [x] Create Junction account
- [x] Get API keys
- [x] Create webhook endpoint
- [x] Handle 3 event types (connection, historical, incremental)
- [x] Map resource types to biomarkers
- [x] Implement user linking (vital user_id ↔ healthpilot user_id)
- [x] Add Svix signature verification
- [ ] Build user connection flow (OAuth or Link)
- [ ] Optional: Integrate Mobile SDK for direct sync

**Winner**: Health Auto Export is simpler to set up initially, but Junction offers more features and reliability.

---

## ✅ Pros & Cons

### Health Auto Export

**Pros:**
- ✅ Free
- ✅ Simple setup
- ✅ Works with existing infrastructure
- ✅ No additional dependencies
- ✅ Already tested and working

**Cons:**
- ❌ Apple Health only
- ❌ Depends on 3rd party iOS app
- ❌ Manual user setup required
- ❌ Limited data granularity (sleep stages)
- ❌ No historical backfill control
- ❌ No multi-device support

### Junction

**Pros:**
- ✅ **300+ devices** supported
- ✅ Enterprise-grade reliability
- ✅ Standardized API across all devices
- ✅ Rich data (sleep stages, HRV, etc.)
- ✅ Historical backfill control
- ✅ OAuth connection flow (better UX)
- ✅ Real-time event delivery
- ✅ Webhook retry logic
- ✅ Provider status monitoring
- ✅ Lab test integration potential
- ✅ SDK for direct device access

**Cons:**
- ❌ Paid service
- ❌ More complex integration
- ❌ User mapping required
- ❌ Learning curve

---

## 🎯 Recommendation

### Keep Health Auto Export if:
- Budget is primary concern
- Only Apple Health users
- Current solution meets all needs
- Simple is priority

### Migrate to Junction if:
- Want to support **Fitbit, Garmin, Oura, Whoop**, etc.
- Need **enterprise reliability**
- Want **richer data** (sleep stages, HRV trends)
- Planning **lab test integration**
- Willing to invest in **better UX** (OAuth vs manual setup)
- Need **provider diversity** for user retention

---

## 🔄 Migration Path

If you decide to migrate to Junction:

1. **Phase 1: Testing** (Current - Completed ✅)
   - [x] Test Junction sandbox
   - [x] Build webhook endpoint
   - [x] Verify data mapping

2. **Phase 2: User Linking**
   - [ ] Create user mapping table (healthpilot_user_id ↔ vital_user_id)
   - [ ] Build connection flow UI
   - [ ] Implement OAuth or Link widget

3. **Phase 3: Parallel Run**
   - [ ] Run both integrations side-by-side
   - [ ] Compare data quality
   - [ ] Monitor reliability

4. **Phase 4: Migration**
   - [ ] Migrate users incrementally
   - [ ] Deprecate Health Auto Export
   - [ ] Remove old webhook endpoint

---

## 📝 Next Steps

### Immediate (Testing Complete)
- [x] Junction sandbox API tested
- [x] Webhook endpoint created
- [x] Data mapping documented

### Decision Required
- [ ] Evaluate cost vs benefit
- [ ] Decide: Keep Health Auto Export OR Migrate to Junction
- [ ] If migrating: Build user connection flow
- [ ] If keeping: Document limitations for future reference

---

## 🧪 Test Results

### Junction Sandbox Testing
- ✅ API access verified
- ✅ Test user created: `healthpilot_test_user_001`
- ✅ Providers list fetched (Apple Health + 300 others)
- ✅ Webhook endpoint built and ready
- ✅ Data mapping confirmed

### Webhook Endpoint
- **URL**: `POST /api/junction/webhook`
- **Events Handled**:
  - `provider.connection.created` ✅
  - `historical.data.{resource}.created` ✅
  - `daily.data.{resource}.created/updated` ✅
- **Resources Mapped**:
  - Workouts ✅
  - Sleep ✅
  - Heart Rate ✅
  - Weight ✅
  - Blood Glucose ✅
  - Blood Pressure ✅

---

## 📚 Resources

- **Junction Docs**: https://docs.junction.com/
- **API Reference**: https://docs.junction.com/api-reference/
- **Webhook Guide**: https://docs.junction.com/webhooks/introduction
- **Event Catalog**: https://docs.junction.com/event-catalog/
- **Sandbox Access**: https://api.sandbox.tryvital.io/

---

**Last Updated**: October 12, 2025  
**Sandbox API Key**: Stored securely in `VITAL_SANDBOX_KEY` environment variable
