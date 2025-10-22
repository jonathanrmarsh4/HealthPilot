# Baseline Mode Documentation

## Overview

HealthPilot uses a **Feature Flag System** to progressively enable AI/ML capabilities. By default, the system operates in **Baseline Mode** — a deterministic, catalog-style experience with all AI features disabled. This ensures stable core functionality before introducing algorithmic complexity.

## Philosophy

**Baseline Mode = AI OFF** → Simple, predictable, catalog-based functionality
**AI Enabled Mode = AI ON** → Personalized recommendations, intelligent ranking, context-aware filtering

This approach allows us to:
1. Ship stable core features faster
2. Debug and validate baseline functionality without AI interference
3. Progressively roll out AI features one at a time
4. Maintain a fallback mode if AI services experience issues

## Feature Flags

All flags are defined in `shared/config/flags.ts` with type safety and environment variable support.

### Master Flag

#### `BASELINE_MODE_ENABLED` (default: `true`)
- **Level:** Site-wide
- **Description:** Master override that disables all AI/ML features
- **When enabled:** Forces all AI feature flags to `false` regardless of their individual settings
- **Impact:** System operates in deterministic catalog mode

### AI Feature Flags (all default to `false`)

#### `AI_MEAL_FILTERS_ENABLED`
- **Level:** Site-wide
- **Description:** Allow AI-powered meal filtering based on user context (goals, biomarkers, preferences)
- **Baseline behavior:** Only basic filters work (mealType, tag)
- **AI behavior:** Intelligent filtering based on user health data and goals

#### `AI_MEAL_RANKING_ENABLED`
- **Level:** Site-wide
- **Description:** Use AI to rank and sort meal recommendations
- **Baseline behavior:** Sort by `popularityScore DESC, createdAt DESC` (deterministic)
- **AI behavior:** Personalized ranking based on user preferences and feedback history

#### `MEAL_GOAL_FILTER_ENABLED`
- **Level:** Site-wide
- **Description:** Filter meals based on user goals (weight loss, muscle gain, etc.)
- **Baseline behavior:** No goal-based filtering
- **AI behavior:** Meals filtered to align with active user goals

#### `MEAL_PREFERENCE_WEIGHTING_ENABLED`
- **Level:** User-specific
- **Description:** Weight meal recommendations based on user like/dislike history
- **Baseline behavior:** No preference-based weighting
- **AI behavior:** Meals ranked higher if similar to previously liked meals

#### `BIOMARKER_FILTER_ENABLED`
- **Level:** Site-wide
- **Description:** Filter meals and workouts based on biomarker data
- **Baseline behavior:** No biomarker-based filtering
- **AI behavior:** Recommendations adjusted based on health metrics (e.g., avoid high-sodium meals if blood pressure is elevated)

#### `AI_WORKOUT_SELECTION_ENABLED`
- **Level:** Site-wide
- **Description:** Use AI to generate and customize workout plans
- **Baseline behavior:** Workout generation disabled, returns 403 error
- **AI behavior:** AI generates personalized workout plans based on goals, experience, and recovery metrics

#### `EXERCISE_MEDIA_AUTOMAP_ENABLED`
- **Level:** Site-wide
- **Description:** Auto-map exercise names to media (GIFs) using fuzzy matching
- **Baseline behavior:** Only show GIFs for exercises with explicit `exercisedbId` (ID-based lookup)
- **AI behavior:** Fuzzy match exercise names to find relevant demonstration GIFs

## How Flags Work

### Environment Variables

**Backend (server-side):**
```bash
# .env file or environment
BASELINE_MODE_ENABLED=true
AI_MEAL_FILTERS_ENABLED=false
AI_WORKOUT_SELECTION_ENABLED=false
```

**Frontend (client-side):**
```bash
# Must use VITE_ prefix for frontend visibility
VITE_BASELINE_MODE_ENABLED=true
VITE_AI_MEAL_FILTERS_ENABLED=false
```

### Override Logic

The flag system implements **master override** logic:

```typescript
// If BASELINE_MODE_ENABLED is true:
//   → All AI feature flags forced to false
//   → Individual flag settings are ignored
//   → System operates in deterministic catalog mode

// If BASELINE_MODE_ENABLED is false:
//   → Individual AI feature flags are respected
//   → Allows progressive rollout of AI features
```

### Code Usage

```typescript
import { isBaselineMode, canUseAIMealRanking } from '@shared/config/flags';

// Check if in baseline mode
if (isBaselineMode()) {
  // Use deterministic catalog logic
  return getAllMeals({ sort: 'popularityScore' });
} else if (canUseAIMealRanking()) {
  // Use AI-powered ranking
  return getPersonalizedMeals(userId);
}
```

## Baseline Mode Behavior

### Meals & Nutrition

**Endpoint:** `GET /api/meals`
- ✅ **Allowed filters:** `mealType` (breakfast/lunch/dinner/snack), `tag`
- ✅ **Pagination:** 24 items per page with deterministic sorting
- ✅ **Sorting:** `popularityScore DESC, createdAt DESC` (stable, repeatable)
- ❌ **Disabled:** AI ranking, goal filtering, biomarker filtering, preference weighting
- 📊 **Telemetry:** Logs `MealBaselineEvent` with timestamp, filters, result counts

**UI:** `MealCatalogBrowser` component
- Category tabs for meal types (Breakfast, Lunch, Dinner, Snacks)
- Visible pagination controls (Previous/Next + page numbers)
- Grid layout showing 24 meals per page
- No personalization or "recommended for you" badges

### Workouts & Training

**Endpoint:** `POST /api/training-schedules/generate`
- ❌ **Disabled:** Returns `403 Forbidden` with clear error message
- ℹ️ **Message:** "AI workout generation is currently disabled. Baseline mode only supports manually created workouts."

**UI:** Workout generation features are hidden when `AI_WORKOUT_SELECTION_ENABLED=false`

### Exercise Demonstrations

**Behavior:** `EXERCISE_MEDIA_AUTOMAP_ENABLED=false`
- ✅ **GIF display:** Only for exercises with explicit `exercisedbId` (direct ID match)
- ❌ **Fuzzy matching:** Name-based exercise matching is disabled
- 🖼️ **Fallback:** Show placeholder image when `exercisedbId` is null

#### Training Phase 1: Baseline Debug (Oct 2025)

**Implementation Status:** ✅ **COMPLETED**

**Goal:** Establish strict exercise media validation with deterministic behavior and comprehensive telemetry.

**Key Changes:**

1. **Flag Guards in ExerciseDBService** (`server/services/exercisedb/exercisedb.ts`)
   - `searchExercisesByName()` respects `EXERCISE_MEDIA_AUTOMAP_ENABLED` flag
   - When flag is `false`: Returns `null` immediately (no fuzzy matching)
   - When flag is `true`: Uses fuzzy matching algorithm
   - Prevents accidental AI usage in baseline mode

2. **Exercise Data Normalizer** (`server/lib/normalizers/exerciseNormalizer.ts`)
   - **Purpose:** Ensure consistent data format from database → frontend
   - **Key Functions:**
     - `normalizeInstructions()`: Converts any format → `string[]` (handles string, array, JSONB)
     - `logMissingExercisedbId()`: Telemetry for exercises without external IDs
     - `validateExerciseForMedia()`: Strict boolean check for `exercisedbId` presence
   - **Output:** `NormalizedExercise` interface with `hasExternalMedia` flag

3. **Workout Session Start Logic** (`server/routes.ts` line 4825-4863)
   - Guards `deriveExercisedbId()` call with `canUseExerciseMediaAutomap()` check
   - **Baseline mode:** Skips exercisedbId resolution entirely
   - **AI mode:** Attempts fuzzy matching to link exercises to ExerciseDB catalog
   - Logs clear messages: `"BASELINE_MODE: Skipping exercisedbId resolution..."`

4. **Frontend Component** (`client/src/components/ExerciseDetailsModal.tsx`)
   - Already implements baseline-aware behavior
   - Shows "Exercise demonstration unavailable" when `exercisedbId` is `null`
   - Displays "Exercise media requires direct ExerciseDB mapping" explanation
   - Disables fuzzy search queries when `canUseExerciseMediaAutomap() === false`

**Telemetry:**

```typescript
// Logged via exerciseNormalizer.ts
{
  exerciseId: 123,
  name: "Barbell Squat",
  reason: "NO_EXTERNAL_ID",
  timestamp: "2025-10-22T03:00:00.000Z"
}
```

**Data Requirements:**

- **ExerciseDB Database:** Requires 1,300+ exercises from ExerciseDB API
- **Current Status:** ⚠️ Only 10 exercises synced (RapidAPI BASIC tier, not ULTRA tier)
- **Root Cause:** API subscription limitation (10 exercises vs. 1,300+ on ULTRA tier)
- **Resolution:** Upgrade RapidAPI key to ULTRA tier, then run `/api/exercisedb/sync`

**Admin Endpoints:**

- `POST /api/exercisedb/sync` (admin-only): Bulk import exercises from ExerciseDB API
- Auto-sync runs on server start if no sync log exists or >30 days old

**Validation Rules:**

| Scenario | exercisedbId | EXERCISE_MEDIA_AUTOMAP_ENABLED | Behavior |
|----------|--------------|-------------------------------|----------|
| Direct ID match | Present | `false` (baseline) | ✅ Show GIF via `/api/exercisedb/image?exerciseId={id}` |
| Direct ID match | Present | `true` (AI) | ✅ Show GIF via direct lookup |
| No ID, name-based | `null` | `false` (baseline) | ❌ Show placeholder, no fuzzy matching |
| No ID, name-based | `null` | `true` (AI) | ✅ Attempt fuzzy match, show GIF if confident |

**Testing:**

```bash
# 1. Verify baseline mode is enabled
curl http://localhost:5000/api/meals | jq '.baselineMode'

# 2. Check ExerciseDB sync status
curl http://localhost:5000/api/exercisedb/sync-status -H "Cookie: ..." | jq

# 3. Test exercise with exercisedbId (should show GIF)
# Open workout session, click "View Exercise" on any synced exercise

# 4. Test exercise without exercisedbId (should show placeholder)
# Create custom exercise, verify placeholder appears
```

**Known Issues:**

- ⚠️ **Limited Exercise Variety:** Only 10 exercises in database due to BASIC tier API
  - **Impact:** Most exercises will show placeholders
  - **Fix:** Upgrade RapidAPI subscription to ULTRA tier
  - **Verification:** After upgrade, run sync and confirm ~1,300 exercises imported

### AI Health Coach

**Endpoint:** `POST /api/chat`
- ❌ **Disabled:** Returns `403 Forbidden` in baseline mode
- ℹ️ **Message:** "AI health coach is currently disabled. Please enable AI features to use personalized health recommendations."

### Daily Insights

**Endpoint:** `POST /api/insights/generate`
- ❌ **Disabled:** Returns `403 Forbidden` in baseline mode
- ℹ️ **Message:** "Daily health insights require AI analysis which is not available in baseline mode."

## Recommended Rollout Order

When gradually re-enabling AI features, follow this sequence to minimize risk:

### Phase 1: Read-Only AI Features (Low Risk)
1. `EXERCISE_MEDIA_AUTOMAP_ENABLED=true`
   - Non-invasive, only improves exercise GIF matching
   - No user data processing or personalization

### Phase 2: Meal Intelligence (Medium Risk)
2. `AI_MEAL_RANKING_ENABLED=true`
   - Enables AI-powered meal sorting
   - Verify ranking quality with telemetry data
3. `MEAL_PREFERENCE_WEIGHTING_ENABLED=true`
   - User-specific weighting based on feedback
   - Monitor for diversity in recommendations

### Phase 3: Contextual Filtering (Medium-High Risk)
4. `AI_MEAL_FILTERS_ENABLED=true`
   - Context-aware meal filtering
   - Test with various user profiles
5. `MEAL_GOAL_FILTER_ENABLED=true`
   - Goal-based meal filtering
   - Validate alignment with user goals

### Phase 4: Health Data Integration (High Risk)
6. `BIOMARKER_FILTER_ENABLED=true`
   - Biomarker-driven recommendations
   - Requires careful validation of health data correlations

### Phase 5: Complex AI Services (Highest Risk)
7. `AI_WORKOUT_SELECTION_ENABLED=true`
   - AI workout plan generation
   - Thorough testing required for safety and effectiveness
8. **AI Chat & Daily Insights** (currently controlled by `BASELINE_MODE_ENABLED`)
   - Complex LLM-powered features
   - Enable only when all other features are stable

### Final Step: Disable Baseline Mode
Once all individual AI features are stable:
```bash
BASELINE_MODE_ENABLED=false
```
This removes the master override and allows AI features to operate normally.

## Testing & Validation

### Flag Combination Testing
- ✅ Test all flags individually enabled/disabled
- ✅ Verify BASELINE_MODE override works correctly
- ✅ Confirm environment variable parsing (true/false/1/0/yes/no)

### API Contract Testing
- ✅ Verify `/api/meals` pagination is deterministic
- ✅ Confirm AI endpoints return 403 in baseline mode
- ✅ Test telemetry logging for baseline events

### UI/UX Verification
- ✅ Meal catalog shows ≥24 items per page
- ✅ Category tabs switch correctly (breakfast/lunch/dinner/snack)
- ✅ Pagination controls work (next/prev/page numbers)
- ✅ Exercise GIFs only show for exercisedbId matches
- ✅ AI features gracefully disabled (no errors, clear messaging)

## Troubleshooting

### "AI features still running in baseline mode"
**Cause:** Environment variable not set correctly
**Fix:** 
```bash
# Backend
export BASELINE_MODE_ENABLED=true

# Frontend (requires restart)
echo "VITE_BASELINE_MODE_ENABLED=true" >> .env
```

### "Meals not showing in catalog"
**Cause:** Database might not have meals with `isActive=true`
**Fix:** Check meal data:
```sql
SELECT COUNT(*) FROM meals WHERE "isActive" = true;
```

### "Pagination showing wrong number of items"
**Cause:** Frontend/backend mismatch on page size
**Fix:** Both should use `PAGE_SIZE = 24` constant

### "Exercise GIFs not loading"
**Cause:** Exercises missing `exercisedbId` in baseline mode
**Fix:** Either:
1. Map exercises to ExerciseDB IDs, or
2. Accept placeholder images in baseline mode

## Development Commands

```bash
# Check current flag states (console log)
npm run dev
# Then in browser console:
# flags.getAllFlags()

# Run tests for flag system
npm run test -- shared/config/flags.test.ts

# Verify API behavior
curl -X GET "http://localhost:5000/api/meals?mealType=breakfast&page=1&limit=24"

# Check TypeScript compilation
npm run typecheck

# Lint code
npm run lint
```

## Summary

**Baseline Mode Status:** ✅ **ENABLED BY DEFAULT**

| Flag | Default | Status | Impact |
|------|---------|--------|--------|
| `BASELINE_MODE_ENABLED` | `true` | 🟢 Active | Master override - forces all AI OFF |
| `AI_MEAL_FILTERS_ENABLED` | `false` | ⚪ Disabled | Basic filters only |
| `AI_MEAL_RANKING_ENABLED` | `false` | ⚪ Disabled | Deterministic sorting |
| `MEAL_GOAL_FILTER_ENABLED` | `false` | ⚪ Disabled | No goal-based filtering |
| `MEAL_PREFERENCE_WEIGHTING_ENABLED` | `false` | ⚪ Disabled | No preference weighting |
| `BIOMARKER_FILTER_ENABLED` | `false` | ⚪ Disabled | No biomarker filtering |
| `AI_WORKOUT_SELECTION_ENABLED` | `false` | ⚪ Disabled | Workout gen disabled |
| `EXERCISE_MEDIA_AUTOMAP_ENABLED` | `false` | ⚪ Disabled | ID-only GIF matching |

**Result:** HealthPilot runs in stable, deterministic catalog mode with zero AI/ML interference.

---

**Last Updated:** October 22, 2025  
**Version:** 1.0.0  
**Maintainer:** HealthPilot Engineering Team
