# HealthPilot Workout Planner Demo

A deterministic, rule-based workout planning system that demonstrates how **readiness**, **health profile**, **goals**, and **training rules** affect workout generation.

## 🎯 Overview

This system proves that the planner accounts for:
1. **Readiness** - HRV/RHR/sleep trends → recovery flags → volume scaling
2. **Health Profile** - Equipment availability, limitations, contraindications
3. **Goals** - Hypertrophy vs Strength → rep ranges, exercise selection, rest periods
4. **Training Rules** - Templates, volume caps, time budgeting, progression, BP safety

## 📁 Files

- **`server/services/workout-planner.ts`** - Core module with all logic
  - `buildDayPlan()` - Generates workout plans with decision tracing
  - `swapAlternates()` - Finds exercise alternatives with scoring
  - `nextLoadDecision()` - Determines progression/deload based on recovery
  - `scoreExercise()` - Exercise scoring algorithm
  - `defaultConfig` - Templates and exercise database

- **`demo_workout_planner.ts`** - Interactive demo script
  - Shows USER_A (Hypertrophy, low recovery, elevated BP)
  - Shows USER_B (Strength, good recovery)
  - Demonstrates swap functionality
  - Shows progression decisions
  - Provides evidence summary

- **`planner_proof.test.ts`** - Comprehensive test suite
  - Test 1: Readiness scaling (volume reduction)
  - Test 2: BP safety rules (rep floor ≥6, rest ≥120s)
  - Test 3: Limitations honored (no contraindicated exercises)
  - Test 4: Goals steer selection (strength favors barbell)
  - Test 5: Time budget enforcement (accessories trimmed)
  - Test 6: Equipment availability affects scoring

## 🚀 Running the Demo

```bash
tsx demo_workout_planner.ts
```

### Expected Output

The demo will show:

#### USER_A (Hypertrophy • Low Recovery • Elevated BP)
- Volume scaled down (10 sets vs 13 baseline)
- Rest periods ≥120s on main lifts
- Rep floor ≥6 for BP safety
- Preferred modality: dumbbells (3 exercises)
- Shoulder limitation respected (no overhead press)
- Swap options with scoring

#### USER_B (Strength • Good Recovery)
- Full volume (18 sets)
- Longer rest periods (~180s)
- Lower rep ranges (5-8)
- Preferred modality: barbells (2 exercises)
- Ready for load progression

#### Decision Trace Example

```
📋 Slot: squat_pattern → Dumbbell Goblet Squat
   Sets: 2 | Reps: 6-10 | Rest: 120s | Time: ~6min
   Reasons:
     • equipment available
     • preferred modality: db
     • hypertrophy goal: moderate reps, moderate rest
     • low recovery: reduced volume, increased rest
     • elevated BP: rep floor ≥6, rest ≥120s
```

## 🧪 Running the Tests

```bash
tsx planner_proof.test.ts
```

### Expected Output

All 6 tests should pass:

```
✅ ALL TESTS PASSED!

Verified:
  ✓ Readiness scaling reduces volume
  ✓ BP safety rules enforced (rep floor, rest)
  ✓ Limitations honored (no contraindicated exercises)
  ✓ Goals steer exercise selection
  ✓ Time budget enforcement trims accessories
  ✓ Equipment availability affects scoring
```

## 📊 Key Findings

### Evidence Summary

**USER_A (Hypertrophy • Low Recovery • Elevated BP):**
- Total sets: 10 (reduced)
- Main lift rest: ≥120s (BP-safe)
- Overhead press: omitted (shoulder limitation)
- Dumbbell exercises: 3 (preferred modality)

**USER_B (Strength • Good Recovery):**
- Total sets: 18 (no penalty)
- Barbell exercises: 2 (strength preference)
- Main lift rest: ~180s (strength protocol)
- Progression: ready for load increase

### Volume Comparison
- USER_A: 10 sets (volume reduced by 23% due to recovery flags)
- USER_B: 18 sets (full volume)

### Modality Preference
- USER_A: 3 dumbbell exercises (preferred)
- USER_B: 2 barbell exercises (strength goal)

### Safety Rules
- USER_A: BP safety enforced (rep floor ≥6, rest ≥120s)
- USER_A: Shoulder limitation respected (no overhead press)
- USER_B: No restrictions applied

## 🔧 System Architecture

### Exercise Scoring Algorithm

```typescript
Base score: 50 points

Adjustments:
+ 20  Equipment available
- 1000 Equipment unavailable
+ 15  Preferred modality
- 30  Disliked exercise
- 1000 Contraindication match
+ 10  Strength goal + barbell
+ 5   Low recovery + machine
+ 5   Elevated BP + machine
```

### Volume Calculation Rules

**Base Values by Goal:**
- Strength: 4 sets, 5-8 reps, 180s rest
- Hypertrophy: 3 sets, 6-10 reps, 90s rest

**Recovery Scaling:**
- Low recovery: -1 set (min 2), rest ≥120s

**BP Safety:**
- Rep floor ≥6
- Rest ≥120s

**Priority Scaling:**
- Accessories (priority ≥3): -1 set

### Time Budget Enforcement

1. Calculate total estimated time
2. If over budget, sort by priority (highest first)
3. Trim accessories (priority ≥3) until under budget
4. Preserve main lifts (priority 1-2)

### Progression Logic

```typescript
if (recovery_flags present) → "deload"
else if (last 2 sessions at top of range) → "increase_small"
else → "maintain"
```

## 🎓 Learning Outcomes

This demo proves:

1. **Readiness affects volume**: Low recovery reduces sets by 1-2 per exercise
2. **BP safety is enforced**: Rep floors and rest periods protect cardiovascular health
3. **Limitations are respected**: Contraindications prevent injury risk
4. **Goals steer selection**: Strength favors barbells, hypertrophy allows variety
5. **Time budgets work**: System intelligently trims accessories while preserving main work
6. **Scoring is logical**: Equipment + preferences + safety = optimal exercise selection

## 🔍 Technical Details

- **Language**: TypeScript
- **Testing**: Node.js built-in assert module
- **Execution**: tsx (TypeScript Node.js runner)
- **Architecture**: Pure functions, deterministic output
- **No external APIs**: Fully self-contained demo

## 📝 Next Steps

To integrate this system into HealthPilot:

1. Connect to exercise database (1,000+ exercises)
2. Add user preference tracking
3. Integrate with readiness score system
4. Connect to training history
5. Add workout acceptance/rejection flow
6. Implement progressive overload tracking

---

**Status**: ✅ All tests passing, demo running successfully

**Last Updated**: 2025-10-23
