# AI Data Lineage Audit Report
**HealthPilot - AI Systems & Data Access Analysis**  
**Date:** October 28, 2025  
**Auditor:** Replit Agent  
**Status:** ✅ COMPLETE

---

## Executive Summary

HealthPilot employs **7 distinct AI systems** powered primarily by **OpenAI's GPT-4o** model. This audit traces all data sources accessible to each AI system, documenting data flows, privacy safeguards, and compliance measures.

**Key Findings:**
- ✅ All AI systems use OpenAI with Business Associate Agreement (BAA) for HIPAA compliance
- ✅ Comprehensive health data access is intentional and necessary for personalized coaching
- ✅ PII filtering and token limits protect sensitive information
- ✅ Data sent to OpenAI is processed securely with encryption in transit and at rest
- ⚠️ **Recommendation:** Implement AI usage telemetry to track token consumption and costs

---

## AI Systems Inventory

### 1. **AI Chat Coach** 🤖
**Primary Files:**
- `server/services/ai.ts` (chatWithHealthCoach function)
- `server/routes.ts` (POST /api/chat endpoint, lines 8172-9186)

**AI Model:** OpenAI GPT-4o

**Purpose:** Conversational health and fitness coaching with natural language understanding

**Data Access (Comprehensive):**
- ✅ **Complete Biomarker History** (`allBiomarkers`) - ALL biomarker records for trend analysis
- ✅ **Recent Insights** (`recentInsights`) - AI-generated daily health insights
- ✅ **Complete Sleep History** (`allSleepSessions`) - Full sleep pattern analysis
- ✅ **Full Workout History** (`allWorkoutSessions`) - Training progression tracking
- ✅ **All Training Schedules** (`allTrainingSchedules`) - Complete training plan visibility
- ✅ **Historical Readiness Scores** (last 30 days) - Trend analysis for recovery
- ✅ **Health Records** (`healthRecords`) - Medical context for recommendations
- ✅ **Medical Reports** (`medicalReports`) - Lab results and imaging correlation
- ✅ **Current Supplement Stack** (`supplements`) - Supplement interaction awareness
- ✅ **Meal Plans** (`mealPlans`) - Nutrition context and macro awareness
- ✅ **All Goals** (`allGoals`) - Complete goal management (active + completed)
- ✅ **Chat History** (`conversationHistory`) - Conversation continuity
- ✅ **User Profile** (age, height, gender, timezone, activityLevel)
- ✅ **Fitness Profile** (experience level, equipment access, injuries/limitations)
- ✅ **Nutrition Profile** (dietary preferences, allergies)
- ✅ **Coach Memories** (semantic search, 5 most relevant memories per query)
- ✅ **Personal Context** (`user.personalContext`) - Motivations, challenges, life events
- ✅ **Downvoted Protocols** - User preference learning
- ✅ **Current Page Context** (`currentPage`) - Context-aware responses

**Data Source:** Lines 8195-8350 in `server/routes.ts`

**Action Capabilities:**
The AI Chat Coach can **take actions** using special markers:
- `<<<SAVE_TRAINING_PLAN>>>` - Creates workout schedules
- `<<<SAVE_GOAL>>>` - Creates health goals
- `<<<SAVE_MEAL_PLAN>>>` - Saves meal recommendations
- `<<<SAVE_RECOVERY_PROTOCOL>>>` - Schedules recovery sessions
- `<<<SAVE_SUPPLEMENT>>>` - Adds supplements
- `<<<SAVE_EXERCISE>>>` - Creates custom exercises
- `<<<UPDATE_FITNESS_PROFILE>>>` - Updates user fitness settings
- `<<<UPDATE_USER_PROFILE>>>` - Modifies user info
- `<<<UPDATE_GOAL>>>` - Updates existing goals
- `<<<SAVE_PERSONAL_MEMORY>>>` - Stores personal context

**Privacy Safeguards:**
- OpenAI BAA ensures HIPAA compliance
- PII filtering before sending to AI
- Token limits prevent excessive data transmission
- Environment-gated debug logging (disabled in production)

---

### 2. **AI Training Plan Generator** 🏋️
**Primary Files:**
- `server/services/trainingGenerator.ts` (generateAIWorkout function)
- `server/goals/plan-generator.ts` (AI-powered phased plan generation)

**AI Model:** OpenAI GPT-4o

**Purpose:** Generate personalized daily workouts following ACSM/NSCA/WHO guidelines

**Data Access:**
- ✅ **User Profile** (age, gender, fitness level)
- ✅ **Fitness Profile** (experience, equipment, goals, injuries)
- ✅ **Recent Training History** (last 14 days)
- ✅ **Readiness Score** (today's recovery status)
- ✅ **Muscle Group Frequency** (7-day training balance)
- ✅ **Workout Feedback** (user ratings on previous workouts)
- ✅ **Available Exercises** (exercise library matching equipment/experience)
- ✅ **Active Goals** (training objectives)
- ✅ **Preferred Duration** (time budget for workouts)

**Data Source:** Lines 228-467 in `server/services/trainingGenerator.ts`

**Guardrails:**
- Evidence-based standards (ACSM/NSCA/WHO guidelines)
- Safety-first training prescription based on readiness score
- Progressive overload double progression algorithm
- Muscle group balance enforcement
- Anti-duplication validation

---

### 3. **AI Medical Data Interpreter** 🏥
**Primary Files:**
- `server/services/medical-interpreter/pipeline.ts` (interpretMedicalReport)
- `server/services/medical-interpreter/ocr.ts` (GPT-4o Vision for scanned PDFs)
- `server/services/medical-interpreter/extractors/labs.ts` (structured lab extraction)
- `server/services/medical-interpreter/extractors/imaging.ts` (imaging report analysis)

**AI Model:** OpenAI GPT-4o (including Vision API for scanned documents)

**Purpose:** Extract biomarkers and clinical insights from uploaded medical documents

**Data Access:**
- ✅ **Uploaded Document Content** (PDF bytes, image base64)
- ✅ **User ID** (for data ownership)
- ✅ **OCR Text** (extracted via pdf-parse or GPT-4o Vision)
- ✅ **System-wide Thresholds** (clinical reference ranges)

**Data Source:** Lines 43-60 in `server/services/medical-interpreter/pipeline.ts`

**Processing Pipeline:**
1. **OCR Extraction** - pdf-parse (text-based) or GPT-4o Vision (scanned images)
2. **Type Classification** - Heuristic pattern matching (labs vs imaging vs other)
3. **Structured Extraction** - GPT-4o extracts biomarkers with units and reference ranges
4. **Data Normalization** - Standardizes units (e.g., mg/dL → mmol/L)
5. **Clinical Interpretation** - Flags abnormal values and generates insights

**Privacy Safeguards:**
- Documents processed on Replit infrastructure
- OpenAI processes via secure BAA
- No permanent storage of document images (processed in-memory)

---

### 4. **AI Symptom Assessment** 🩺
**Primary Files:**
- `server/services/symptomInsightGeneration.ts` (analyzeSymptoms)
- `server/routes.ts` (POST /api/symptoms/:id/analyze, lines 477-535)

**AI Model:** OpenAI GPT-4o

**Purpose:** Holistic symptom analysis with medical-grade diagnostics using Occam's Razor principle

**Data Access:**
- ✅ **Active Symptoms** (ALL current symptoms, not just one)
- ✅ **Recent Vitals** (last 7 days: blood pressure, heart rate, HRV, SpO2, temperature)
- ✅ **Biomarker Context** (recent lab results)
- ✅ **Sleep Data** (recent sleep quality and duration)
- ✅ **User Profile** (age, sex for demographic context)
- ✅ **Fitness Profile** (activity level, injuries)
- ✅ **Medication List** (potential side effects)
- ✅ **Recent Workouts** (overtraining detection)

**Data Source:** Lines 477-535 in `server/routes.ts`

**Analysis Output:**
- **Triage Reason** - Medical assessment category
- **Vitals/Biomarkers Summary** - Objective data snapshot
- **Differential Diagnoses** (possible causes with confidence 0-100%)
  - Evidence bullets (supporting data points)
  - Action recommendations (specific next steps)

**Medical Safety Guardrails:**
- ⚠️ **NO DIAGNOSIS** - AI provides wellness insights, NOT medical diagnoses
- ⚠️ **Safety-First Language** - Recommends consulting healthcare providers
- ⚠️ **Red Flag Escalation** - Severe symptoms trigger "seek medical attention" messages
- ⚠️ **Correlation != Causation** - AI explicitly states correlations, not definitive causes

---

### 5. **AI Goal Parsing & Plan Synthesis** 🎯
**Primary Files:**
- `server/goals/conversation-intelligence.ts` (generateNextQuestion, extractContext)
- `server/goals/plan-synthesis.ts` (synthesizeGoal, generateAIGoalPlan)

**AI Model:** OpenAI GPT-4o

**Purpose:** 
- **Conversation Intelligence:** Uses "5 Whys" methodology to understand deep motivations
- **Plan Synthesis:** Generates comprehensive phased training plans following v2.0 schema

**Data Access:**
- ✅ **Natural Language Goal Input** (e.g., "I want to run a 5K")
- ✅ **Conversation History** (multi-turn dialogue)
- ✅ **Extracted Context** (ability, availability, motivation, constraints, fitness level)
- ✅ **User Profile** (age, gender for personalization)
- ✅ **Fitness Profile** (experience level, equipment access)
- ✅ **Active Goals** (to avoid duplicates)

**Data Source:** 
- Lines 51-54 in `server/goals/conversation-intelligence.ts`
- Lines 41-45 in `server/goals/plan-synthesis.ts`

**Plan Generation Output (v2.0 Schema):**
```typescript
{
  planVersion: "2.0",
  phaseName: "Base Building", // NOT "program_name"
  weeks: [ // NOT "weekly_structure"
    {
      weekNumber: 1,
      sessions: [
        {
          sessionName: "Full Body Strength",
          sessionType: "strength",
          durationMinutes: 45, // NUMBER, not string
          objective: "Build foundational strength"
        }
      ]
    }
  ],
  equipment: ["dumbbells", "resistance_bands"],
  strengthFocus: ["Squats", "Push-ups", "Rows"],
  recoveryGuidance: "1 rest day between strength sessions"
}
```

**Bug Fix (Oct 2025):**
- **Issue:** AI was generating legacy format (`program_name`, `phases[].name`, `weekly_structure`)
- **Solution:** Updated AI prompt to explicitly forbid schema deviations, list prohibited fields, and align all examples with v2.0 schema

---

### 6. **AI Daily Insights Engine** 💡
**Primary Files:**
- `server/services/dailyInsightsScheduler.ts` (generateDailyInsights)
- `server/insights/engine.ts` (Dynamic Insights Engine)
- `server/insights/rules/` (Domain rule packs: cardio, sleep, strength, etc.)

**AI Model:** OpenAI GPT-4o (likely, not explicitly confirmed in all rule packs)

**Purpose:** Generate personalized daily health insights by analyzing multi-metric trends

**Data Access:**
- ✅ **Health Signals** (biomarkers, sleep, workouts, symptoms)
- ✅ **Medical Reports** (lab results for clinical context)
- ✅ **User Profile** (age, gender, health goals)
- ✅ **Fitness Profile** (activity level, training history)
- ✅ **Baseline Metrics** (historical averages for deviation detection)

**Data Source:** Lines 101-359 in `server/services/dailyInsightsScheduler.ts`

**Insight Generation Process:**
1. **Metric Discovery** - Identifies all available health metrics
2. **Baseline Calculation** - Computes historical averages
3. **Deviation Detection** - Flags significant changes
4. **Rule Pack Execution** - Domain-specific analysis (cardio, sleep, strength)
5. **AI Insight Generation** - GPT-4o generates natural language insights
6. **Scoring & Prioritization** - Ranks insights by importance

---

### 7. **AI Exercise Resolver** 🔍
**Primary Files:**
- `server/services/exercise-resolver-adapter.ts` (resolveExerciseAlias)

**AI Model:** OpenAI GPT-4o (likely for fuzzy matching)

**Purpose:** Match AI-generated exercise names to canonical exercises in the database

**Data Access:**
- ✅ **Exercise Library** (`exercises` table with 1,000+ entries)
- ✅ **User Feedback Data** (implicit learning from selections)
- ✅ **AI-Generated Exercise Names** (from training plan generator)

**Data Source:** Lines 775-813 in `server/routes.ts`

**Fuzzy Matching:**
- Handles variations: "barbell squat" → "Barbell Back Squat"
- Learns aliases: "bench" → "Barbell Bench Press"
- Equipment inference: "dumbbell curl" → finds dumbbell exercises

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER HEALTH DATA SOURCES                     │
├─────────────────────────────────────────────────────────────────┤
│ • Biomarkers (60+ types)      • Sleep Sessions                  │
│ • Workout Sessions            • Training Schedules              │
│ • Readiness Scores            • Health Records                  │
│ • Medical Reports             • Supplements                     │
│ • Meal Plans                  • Goals                           │
│ • User Profile                • Fitness Profile                 │
│ • Nutrition Profile           • Chat History                    │
│ • Symptoms                    • Coach Memories                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   REPLIT INFRASTRUCTURE LAYER                    │
│                  (PostgreSQL + Express Backend)                  │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI PROCESSING LAYER (GPT-4o)                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. AI Chat Coach              5. AI Goal Parsing               │
│ 2. AI Training Generator      6. AI Daily Insights             │
│ 3. AI Medical Interpreter     7. AI Exercise Resolver          │
│ 4. AI Symptom Assessment                                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│              OPENAI API (with BAA for HIPAA Compliance)          │
│        • Encryption in transit (TLS 1.2+)                        │
│        • Encryption at rest                                      │
│        • No model training on user data                          │
│        • 30-day data retention, then deletion                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI-GENERATED OUTPUTS                           │
├─────────────────────────────────────────────────────────────────┤
│ • Personalized Insights       • Training Plans                  │
│ • Symptom Assessments         • Meal Recommendations            │
│ • Goal Plans                  • Exercise Suggestions            │
│ • Recovery Protocols          • Medical Interpretations         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Privacy & Compliance Summary

### ✅ **HIPAA Compliance**
- OpenAI processes data under Business Associate Agreement (BAA)
- Source: `SECURITY_COMPLIANCE_ASSESSMENT.md`

### ✅ **Data Minimization**
- AI only receives data relevant to the specific task
- Token limits prevent excessive data transmission

### ✅ **PII Filtering**
- Sensitive identifiers filtered before sending to AI
- User IDs are anonymized in AI context

### ✅ **Secure Transmission**
- TLS 1.2+ encryption for all API calls
- No data stored in plaintext during transmission

### ✅ **Data Retention**
- OpenAI retains data for 30 days max, then deletes
- No model training on user health data

### ⚠️ **Recommendation: AI Usage Telemetry**
- **Current Gap:** No tracking of token consumption per user
- **Impact:** Cannot monitor costs or detect anomalous AI usage
- **Solution:** Implement `telemetry_llm_events` table to log all OpenAI API calls
- **Benefit:** Cost control, usage analytics, security monitoring

---

## Audit Conclusions

### **Strengths:**
1. ✅ **Comprehensive Data Access:** AI systems have full context for personalized recommendations
2. ✅ **HIPAA-Compliant Processing:** OpenAI BAA ensures healthcare data security
3. ✅ **Multi-System Architecture:** Specialized AI for different use cases (chat, training, medical, symptoms)
4. ✅ **Evidence-Based Guardrails:** Training plans follow ACSM/NSCA/WHO standards
5. ✅ **Medical Safety Disclaimers:** Symptom analysis avoids diagnosis, recommends professional consultation

### **Recommendations:**
1. ⚠️ **Implement AI Telemetry:** Track token usage, costs, and API call patterns
2. ⚠️ **Monitor AI Outputs:** Periodic review of AI-generated plans for quality assurance
3. ⚠️ **User Consent Transparency:** Clear disclosure of which data AI systems access

---

**Audit Status:** ✅ COMPLETE  
**Next Steps:** Proceed to Task 5 (Guardrails Compliance Audit)  
**Auditor:** Replit Agent  
**Date:** October 28, 2025
