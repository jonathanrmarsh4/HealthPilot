# Exercise Media Matching Telemetry System

## Overview
Instrumentation system to capture and review exercise media matching attempts for data labeling, threshold tuning, and backfilling missing exercisedbId mappings.

**Status:** ✅ COMPLETED (October 22, 2025)

## Purpose
Provide operational visibility into the ExerciseDB fuzzy name matching algorithm to:
1. **Data Labeling**: Capture suppressed/low-confidence matches for human review
2. **Threshold Tuning**: Collect real-world scoring data to optimize confidence thresholds
3. **Backfill Missing IDs**: Identify exercises without exercisedbId mappings for manual assignment

## Architecture

### Database Schema
**Table:** `exercisedb_media_attempt_logs`

```typescript
{
  id: varchar("id").primaryKey(),
  hpExerciseId: integer("hp_exercise_id"),           // exercises.id
  hpExerciseName: text("hp_exercise_name"),          // exercises.name
  target: text("target"),                             // exercises.target
  bodyPart: text("body_part"),                        // exercises.bodyPart
  equipment: text("equipment"),                       // exercises.equipment
  
  reason: text("reason").notNull(),                   // SUPPRESSED | NO_MATCH | LOW_CONFIDENCE | OK
  externalId: text("external_id"),                    // exercisedb_exercises.id (if chosen)
  chosenId: text("chosen_id"),                        // ExerciseDB ID string (if chosen)
  chosenName: text("chosen_name"),                    // Name of chosen candidate
  score: integer("score"),                            // Matching score
  candidateCount: integer("candidate_count"),         // Number of candidates considered
  
  reviewStatus: text("review_status").notNull().default('pending'), // pending | reviewed | approved | rejected
  reviewedBy: text("reviewed_by"),                    // User ID of reviewer
  reviewedAt: timestamp("reviewed_at"),               // Timestamp of review
  approvedExercisedbId: text("approved_exercisedb_id"), // Human-approved correct ID
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
}
```

### Logging Reasons
- **SUPPRESSED**: `EXERCISE_MEDIA_AUTOMAP_ENABLED` flag is OFF, no lookup attempted
- **NO_MATCH**: No candidates found in ExerciseDB database (all exercises scored < 5)
- **LOW_CONFIDENCE**: Match found with score = 5 (just above threshold but below confident)
- **OK**: Successful match with score >= 6 (confident match)

### Score Thresholds (0-10 Confidence Scale)
- **SCORE_GOOD** (7+): Exact name + target + bodyPart or near-perfect combo
- **SCORE_OK** (6+): Acceptable if other signals align (confident match threshold)
- **SCORE_LOW** (5): Just above threshold but below confident
- **Rejected**: score < 5 (not logged, too unreliable)

### Sampling Logic
To prevent log spam, sampling is applied:
- **50% sampling rate** for SUPPRESSED and LOW_CONFIDENCE events
- **500 events/day cap** across all reasons (resets at midnight)
- NO_MATCH and OK events always logged (subject to daily cap)

## Storage Layer Methods

### Core Methods (server/storage.ts)

#### `logMediaAttempt(data: InsertMediaAttemptLog): Promise<SelectMediaAttemptLog>`
Logs a media matching attempt with automatic daily cap enforcement.
```typescript
await storage.logMediaAttempt({
  hpExerciseId: 123,
  hpExerciseName: "Barbell Squat",
  target: "quads",
  bodyPart: "legs",
  equipment: "barbell",
  reason: "LOW_CONFIDENCE",
  chosenId: "0001",
  chosenName: "barbell full squat",
  score: 5,
  candidateCount: 5,
});
```

#### `getMediaAttemptLogs(filters): Promise<SelectMediaAttemptLog[]>`
Retrieves logs with optional filtering:
```typescript
const logs = await storage.getMediaAttemptLogs({
  reason: "LOW_CONFIDENCE",
  reviewStatus: "pending",
  limit: 50,
  offset: 0,
});
```

#### `getMediaAttemptStats(): Promise<MediaAttemptStats>`
Returns aggregated statistics:
```typescript
{
  totalLogs: 1234,
  byReason: {
    SUPPRESSED: 500,
    NO_MATCH: 234,
    LOW_CONFIDENCE: 400,
    OK: 100,
  },
  byReviewStatus: {
    pending: 900,
    reviewed: 234,
    approved: 80,
    rejected: 20,
  },
}
```

#### `updateMediaAttemptReview(id, updates): Promise<SelectMediaAttemptLog>`
Updates review status and approved ID:
```typescript
await storage.updateMediaAttemptReview("log-123", {
  reviewStatus: "approved",
  reviewedBy: "user-456",
  approvedExercisedbId: "0123",
});
```

#### `getTodaysMediaAttemptCount(): Promise<number>`
Returns count of logs created today (for daily cap enforcement).

## Admin API Endpoints

### GET `/api/admin/media-logs`
Retrieve media attempt logs with filters.

**Query Parameters:**
- `reason` (optional): Filter by reason (SUPPRESSED, NO_MATCH, LOW_CONFIDENCE, OK)
- `reviewStatus` (optional): Filter by review status (pending, reviewed, approved, rejected)
- `limit` (optional): Number of records (default: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "logs": [
    {
      "id": "abc123",
      "hpExerciseId": 42,
      "hpExerciseName": "Barbell Squat",
      "target": "quads",
      "bodyPart": "legs",
      "equipment": "barbell",
      "reason": "LOW_CONFIDENCE",
      "chosenId": "0001",
      "chosenName": "barbell full squat",
      "score": 5,
      "candidateCount": 5,
      "reviewStatus": "pending",
      "createdAt": "2025-10-22T03:45:00.000Z"
    }
  ],
  "count": 1
}
```

### GET `/api/admin/media-logs/stats`
Get aggregated statistics.

**Response:**
```json
{
  "totalLogs": 1234,
  "byReason": {
    "SUPPRESSED": 500,
    "NO_MATCH": 234,
    "LOW_CONFIDENCE": 400,
    "OK": 100
  },
  "byReviewStatus": {
    "pending": 900,
    "reviewed": 234,
    "approved": 80,
    "rejected": 20
  }
}
```

### PATCH `/api/admin/media-logs/:id/review`
Update review status for a log entry.

**Request Body:**
```json
{
  "reviewStatus": "approved",
  "approvedExercisedbId": "0123"
}
```

**Response:**
```json
{
  "success": true,
  "log": {
    "id": "abc123",
    "reviewStatus": "approved",
    "reviewedBy": "user-456",
    "reviewedAt": "2025-10-22T03:50:00.000Z",
    "approvedExercisedbId": "0123"
  }
}
```

### GET `/api/admin/media-logs/export`
Export logs to CSV or JSON.

**Query Parameters:**
- `format` (optional): Export format (csv | json, default: csv)
- `reason` (optional): Filter by reason
- `reviewStatus` (optional): Filter by review status

**Response (CSV):**
```csv
id,hpExerciseId,hpExerciseName,target,bodyPart,equipment,reason,externalId,chosenId,chosenName,score,candidateCount,reviewStatus,createdAt
abc123,42,"Barbell Squat",quads,legs,barbell,LOW_CONFIDENCE,,0001,"barbell full squat",75,5,pending,2025-10-22T03:45:00.000Z
```

**Response (JSON):**
```json
[
  {
    "id": "abc123",
    "hpExerciseId": 42,
    ...
  }
]
```

## ExerciseDB Service Integration

### Confidence Scoring Algorithm (0-10 Scale)

The fuzzy matching algorithm evaluates three dimensions:

**1. Name Match (0-4 points)**
- Exact match: 4 points
- Full substring: 3 points
- Most words match (≥80%): 3 points
- Half words match (≥50%): 2 points
- Some words match (≥30%): 1 point
- Poor match: 0 points

**2. Target Muscle (0-3 points)**
- Matches target muscle: +3 points
- No muscle specified: 0 points
- Wrong muscle: -1 point

**3. Equipment (0-3 points)**
- Exact equipment match: +3 points
- Partial match: +2 points
- No equipment specified: 0 points
- Different equipment: -1 point
- Conflicting equipment: -2 points

**Examples:**
- "Barbell Squat" → "barbell squat": 4 (name) + 3 (target) + 3 (equip) = **10/10** ✅ EXCELLENT
- "Leg Press" → "lever leg press": 3 (name) + 3 (target) + 2 (equip) = **8/10** ✅ GOOD
- "Squat" → "barbell squat": 3 (name) + 0 (no muscle) + 0 (no equip) = **6/10** ✅ OK
- "Barbell Curl" → "dumbbell curl": 3 (name) + 3 (target) + (-2) (conflict) = **4/10** ❌ REJECTED

### Instrumentation Point
Located in `server/services/exercisedb/exercisedb.ts`:

```typescript
// Thresholds
const SCORE_GOOD = 7;   // exact name + target + bodyPart or near-perfect combo
const SCORE_OK = 6;     // acceptable if other signals align
const SCORE_LOW = 5;    // suppressed by default
function isConfident(score: number) { return score >= SCORE_OK; }

async searchExerciseByName(exerciseName: string): Promise<ExerciseDBExercise | null> {
  // Check feature flag
  if (!canUseExerciseMediaAutomap()) {
    // Sample 50% of suppressed attempts
    await logMediaAttempt({ reason: "SUPPRESSED", ... });
    return null;
  }
  
  // ... exact match check (returns immediately with score 10) ...
  
  // Score all exercises (0-10 scale)
  const scoredExercises = allExercises
    .map(ex => ({
      exercise: ex,
      score: calculateMatchScore(exerciseName, ex) // Returns 0-10
    }))
    .filter(item => item.score >= SCORE_LOW) // Keep candidates >= 5
    .sort((a, b) => b.score - a.score);
  
  if (scoredExercises.length > 0) {
    const bestMatch = scoredExercises[0];
    
    // Only return if confident (>= 6)
    if (isConfident(bestMatch.score)) {
      await logMediaAttempt({ reason: "OK", score: bestMatch.score, ... });
      return bestMatch.exercise;
    } else {
      // Score is 5 (LOW_CONFIDENCE): sampled at 50%
      await logMediaAttempt({ reason: "LOW_CONFIDENCE", score: bestMatch.score, ... });
      return null;
    }
  }
  
  // No candidates found
  await logMediaAttempt({ reason: "NO_MATCH", candidateCount: 0, ... });
  return null;
}
```

### Sampling Behavior
- **SUPPRESSED**: 50% sampled (flag disabled)
- **NO_MATCH**: Always logged (100%)
- **LOW_CONFIDENCE**: 50% sampled (score = 5)
- **OK**: Always logged (100%, score >= 6)

## Testing Guide

### 1. Enable Instrumentation
Ensure the telemetry flag is enabled in `.env`:
```bash
EXERCISE_MEDIA_TELEMETRY_ENABLED=true
```

### 2. Test Different Scenarios

#### Scenario A: SUPPRESSED (Flag OFF)
```bash
# Set flag OFF in .env
EXERCISE_MEDIA_AUTOMAP_ENABLED=false

# Access ExerciseDetailsModal for any exercise
# Check logs: Should see ~50% of attempts logged with reason=SUPPRESSED
```

#### Scenario B: NO_MATCH
```bash
# Create an exercise with a very unique name that won't match ExerciseDB
curl -X POST http://localhost:5000/api/exercises \
  -H "Content-Type: application/json" \
  -d '{"name": "XYZABC Unique Movement", "target": "quads"}'

# Access ExerciseDetailsModal
# Check logs: Should see NO_MATCH entry
```

#### Scenario C: LOW_CONFIDENCE
```bash
# Create exercise with ambiguous name
curl -X POST http://localhost:5000/api/exercises \
  -H "Content-Type: application/json" \
  -d '{"name": "Leg Thing", "target": "quads"}'

# Access ExerciseDetailsModal
# Check logs: May see LOW_CONFIDENCE if score < 50
```

#### Scenario D: OK (Successful Match)
```bash
# Use well-known exercise name
curl -X POST http://localhost:5000/api/exercises \
  -H "Content-Type: application/json" \
  -d '{"name": "Barbell Squat", "target": "quads", "bodyPart": "legs", "equipment": "barbell"}'

# Access ExerciseDetailsModal
# Check logs: Should see OK entry with high score
```

### 3. Query Logs via API

```bash
# Get all logs
curl http://localhost:5000/api/admin/media-logs

# Filter by reason
curl http://localhost:5000/api/admin/media-logs?reason=LOW_CONFIDENCE

# Get statistics
curl http://localhost:5000/api/admin/media-logs/stats

# Export to CSV
curl http://localhost:5000/api/admin/media-logs/export?format=csv > logs.csv

# Export to JSON
curl http://localhost:5000/api/admin/media-logs/export?format=json > logs.json
```

### 4. Review and Approve

```bash
# Update review status
curl -X PATCH http://localhost:5000/api/admin/media-logs/abc123/review \
  -H "Content-Type: application/json" \
  -d '{"reviewStatus": "approved", "approvedExercisedbId": "0123"}'
```

## Daily Cap Behavior

The system enforces a 500 events/day cap with the following characteristics:

### Current Implementation (Per-Process)
- **Counter scope**: Per-process (in-memory), not shared across server instances
- **Reset logic**: Based on `Date().toDateString()` comparison
- **Timezone**: Uses server's local timezone (not UTC)
- **Reset time**: Midnight in server's local timezone (00:00:00)

### Behavior
1. Each server process maintains its own counter
2. Counter resets when `new Date().toDateString()` changes
3. Once cap is reached, no new logs are created until reset
4. Console warning logged: `[Media Telemetry] Daily cap reached (500), skipping log`

### Implications
- **Single-instance deployments**: Works as intended (500 events/day total)
- **Multi-instance deployments**: Each instance gets its own 500/day cap
  - Example: 3 instances = up to 1,500 events/day across fleet
- **Process restarts**: Counter resets on restart (same day)

### Trade-offs
✅ **Advantages**:
- Simple implementation (no database reads per log)
- Zero latency overhead
- Works offline/without database

⚠️ **Limitations**:
- Not truly global across multiple server instances
- Timezone-dependent (not UTC)
- Counter lost on process restart

### Future Enhancement Options
If strict fleet-wide 500/day cap is required:
1. **Database counter**: Store daily count in database (adds DB read latency per log)
2. **Redis counter**: Use shared cache with TTL (requires Redis dependency)
3. **UTC normalization**: Switch from `.toDateString()` to UTC date comparison

**Current Decision**: Per-process cap is acceptable for MVP. Prevents runaway logging on any single instance while keeping implementation simple and performant.

## Use Cases

### 1. Data Labeling Workflow
1. Query logs with `reviewStatus=pending` and `reason=LOW_CONFIDENCE`
2. Review each entry's HP exercise details and chosen ExerciseDB match
3. Verify if the match is correct or select correct ID
4. Update via PATCH `/api/admin/media-logs/:id/review`
5. Export approved mappings for bulk update

### 2. Threshold Tuning
1. Export all logs to CSV
2. Analyze score distribution for LOW_CONFIDENCE vs OK
3. Identify optimal threshold that maximizes precision/recall
4. Update confidence thresholds in ExerciseDB service

### 3. Backfill Missing IDs
1. Query logs with `reason=NO_MATCH`
2. Review exercises with no candidates found
3. Manually search ExerciseDB for correct match
4. Update via review approval with correct exercisedbId
5. Use approved IDs to populate exercises.exercisedbId

## Security Considerations
- All endpoints require `isAdmin` middleware
- Review actions logged with `reviewedBy` user ID
- No PII stored in logs (only exercise metadata)
- Daily cap prevents abuse/spam

## Performance Impact
- Sampling reduces log volume by ~50% for SUPPRESSED/LOW_CONFIDENCE
- Daily cap (500) limits database writes
- Async logging doesn't block media matching
- Indexes on `reason`, `reviewStatus`, `createdAt` for fast queries

## Future Enhancements
- Admin UI for batch labeling (drag-and-drop approval)
- ML-based threshold recommendations from collected data
- Automated backfill scripts using approved mappings
- Export to training data format for model fine-tuning
