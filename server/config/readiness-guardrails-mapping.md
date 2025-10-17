# Readiness Score to Guardrails Threshold Mapping

## Overview
This document maps the Health Insights AI readiness score system to the HealthPilot Training Operating System v1.0 guardrails auto-regulation triggers. This ensures consistent, evidence-based training prescription aligned with ACSM, NSCA, and WHO standards.

## Readiness Score Calculation
The readiness score (0-100) is calculated using a weighted multi-factor algorithm:

**Core Factors:**
- Sleep Quality (30% weight): Duration + efficiency + deep sleep %
- HRV - Heart Rate Variability (25% weight): Daily HRV vs 30-day baseline
- Resting Heart Rate (20% weight): Current RHR vs baseline (lower is better)
- Workout Load (15% weight): Recent training volume and intensity
- Recovery Time (10% weight): Time since last high-intensity workout

**Safety-First Logic:**
- Personal baseline override capability preserved (usePersonalBaselines flag)
- Biomarker-driven adjustments take precedence over calculated score
- Medical flags (elevated BP, abnormal biomarkers) override all training prescription

## Readiness Thresholds → Guardrails Auto-Regulation

### 🟢 High Readiness (75-100)
**Readiness Indicators:**
- HRV ≥ baseline (normal variability)
- RHR at or below baseline
- Sleep quality ≥ 70%
- Adequate recovery time (>24-48hr depending on intensity)

**Guardrails Response:**
- ✅ Full training intensity permitted (up to HR max caps)
- ✅ Progressive overload allowed (+10-15% volume per NSCA)
- ✅ High-intensity work authorized (HIIT, strength >85% 1RM)
- **Evidence:** ACSM recommends normal training progression when recovery markers optimal

### 🟡 Moderate Readiness (50-74)
**Readiness Indicators:**
- HRV 10-20% below baseline
- RHR 5-10% above baseline  
- Sleep quality 50-69%
- Moderate workout load in past 48hrs

**Guardrails Response:**
- ⚠️ Maintain current training volume (no progression this week per NSCA)
- ⚠️ Intensity capped at 75-80% max
- ⚠️ Prioritize technique over load
- ⚠️ Add extra rest day if score approaching 50
- **Evidence:** ACSM auto-regulation guidelines recommend maintaining when recovery suboptimal

### 🔴 Low Readiness (25-49)
**Readiness Indicators:**
- HRV >20% below baseline (triggers auto-regulation)
- RHR >10% above baseline (triggers recovery mode)
- Sleep quality <50%
- High recent workout load with inadequate recovery

**Guardrails Auto-Regulation Triggers (ACSM-based):**
```json
{
  "metric": "HRV",
  "delta_pct_vs_baseline": -20,
  "action": "reduce_intensity_25_pct"
}
```
```json
{
  "metric": "resting_hr", 
  "delta_pct_vs_baseline_gt": 10,
  "action": "recovery_week"
}
```

**Guardrails Response:**
- 🛑 Reduce intensity by 25% (ACSM stress response protocol)
- 🛑 Reduce volume by 15-20%
- 🛑 Focus on recovery modalities (sauna, low-intensity zone 2)
- 🛑 No progressive overload this week
- **Evidence:** ACSM recommends deload when HRV drops >20% or RHR rises >10%

### 🔴 Critical Low Readiness (<25)
**Readiness Indicators:**
- Severe HRV suppression (>30% below baseline)
- Significant RHR elevation (>15% above baseline)
- Sleep debt accumulated (<4-5 hrs per night)
- Multiple poor recovery markers

**Guardrails Response:**
- 🚫 **Full rest day mandated (WHO: minimum 1 rest day/week)**
- 🚫 Active recovery only (light walk, mobility, stretching)
- 🚫 Monitor for overtraining syndrome signs
- 🚫 Require 2+ consecutive days >50 readiness before resuming training
- **Evidence:** WHO physical activity guidelines mandate rest for adaptation; ACSM overtraining prevention protocols

## Biomarker Override Rules

Biomarkers can override readiness score when safety concerns present:

### Blood Pressure Threshold
```json
{
  "condition": "systolic_bp >= 140 OR diastolic_bp >= 90",
  "action": "pause_all_training",
  "source": "ACSM BP screening guidelines"
}
```
- Readiness score ignored
- Medical clearance required before training

### Metabolic Markers
- **Glucose >126 mg/dL OR HbA1c >6.5%**: Reduce intensity 15%, monitor during exercise (ADA)
- **Cortisol AM >20 μg/dL**: Reduce volume 25%, avoid high-intensity (ACSM stress protocols)
- **CRP-hs >3.0 mg/L**: Chronic inflammation, reduce impact exercises (ACSM)

### Hormonal Markers
- **Testosterone <300 ng/dL**: Possible overtraining, reduce volume 20% (NSCA recovery protocols)
- **Vitamin D <20 ng/mL**: Bone health concern, limit high-impact exercises

## Integration with Training Prescription

### Daily AI Insights
The AI daily insights system uses this mapping to:
1. Calculate readiness score from latest metrics
2. Apply guardrails auto-regulation triggers
3. Generate training recommendations with evidence citations
4. Provide recovery protocols when scores low

**Example AI Output:**
> "Readiness 45% today (HRV 22% below baseline). Recommend recovery session <60% intensity per ACSM auto-regulation guidelines. Focus on Zone 2 cardio 20-30min to promote parasympathetic recovery."

### Weekly Training Schedule
The `generateTrainingSchedule` function:
1. Receives current readiness + biomarkers
2. References guardrails for progression limits
3. Applies auto-regulation based on thresholds above
4. Includes evidence citations (ACSM/NSCA/WHO)

### Macro Recommendations
The `generateMacroRecommendations` function:
1. Adjusts targets based on biomarkers (ADA/AND/AHA guidelines)
2. Accounts for training load and recovery state
3. Provides citations for nutritional recommendations

## User Control & Transparency

**Personal Baseline Override:**
- Users can set personal HRV/RHR baselines if significantly different from population norms
- `usePersonalBaselines` flag in readiness calculation preserves this capability
- Guardrails still apply biomarker safety checks even with custom baselines

**Evidence Display:**
- All recommendations include brief citations
- Format: "ACSM: Recovery intensity <60% when readiness low"
- Builds user confidence through transparent, evidence-based guidance

## Standards Reference

- **ACSM**: American College of Sports Medicine - Exercise prescription and auto-regulation
- **NSCA**: National Strength & Conditioning Association - Progressive overload and periodization
- **WHO**: World Health Organization - Physical activity guidelines and rest requirements
- **ADA**: American Diabetes Association - Glucose management during exercise
- **AND**: Academy of Nutrition & Dietetics - Sports nutrition standards
- **AHA**: American Heart Association - Cardiovascular health and lipid management

## Implementation Files

1. `server/config/training-guardrails.json` - Complete guardrails configuration
2. `server/config/guardrails.ts` - Guardrails loading and system prompt builder
3. `server/services/ai.ts` - AI functions with guardrails integration
4. `server/routes.ts` - Readiness calculation with safety-first logic
5. This file - Readiness to guardrails mapping documentation
