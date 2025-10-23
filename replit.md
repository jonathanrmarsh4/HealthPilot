# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
**Runtime Environment:** Node.js 20, TypeScript 5.x, npm, Replit (NixOS).

**Frontend:** React 18, Vite 5.x, Wouter, shadcn/ui + Radix UI, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Lucide React + React Icons.

**Backend:** Express.js, RESTful APIs with Zod validation, express-session, WebSocket (for Voice Chat), Multer.

**Database:** PostgreSQL (Neon-backed), Drizzle ORM, Drizzle-Zod.

**Mobile:** Capacitor 7 (iOS native app), capacitor-health plugin.

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, PWA support for iOS.
- Visualizations for biomarker trends, readiness, and health scores.
- Customizable dashboard with persistent widget visibility and order.
- AI Chat Widget with history.
- Redesigned Training Page with daily-focused UX and organized sidebar navigation.
- Universal Tile Management System for customizable page layouts.
- Swipe-based interface for meal feedback.
- Glass-morphism modal UI for Voice Chat.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards and goal-driven assistance.
- **Freemium Model:** Subscription tiers (free/premium/enterprise) with varied access to features.
- **Data Tracking & Management:** Biomarker tracking, smart deduplication for sleep, comprehensive workout tracking from Apple Health.
- **Personalized Recommendations & Automation:** AI-generated meal plans, macro recommendations, exercise recommendations with auto-scheduling. Features like Simplified Meal Recommendation System (v1.0) and Simplified Nutrition Profile are implemented.
- **Readiness Score System:** Multi-factor weighted scoring.
- **Scheduling & Reminders:** AI insights scheduling, supplement tracking, daily reminders.
- **User Profiling & Onboarding:** Fitness profile personalization, contextual AI onboarding.
- **Security & Authentication:** Replit Auth (OpenID Connect), role-based access control, IDOR protection, Zod validation, secure file uploads.
- **Privacy & Compliance:** International privacy compliance (GDPR, HIPAA, etc.), granular consent, audit logging, account deletion, JSON data export, Privacy Dashboard.
- **Payment Processing:** Stripe integration for subscriptions.
- **Native iOS App:** Complete native iOS app via Capacitor 7 with HealthKit integration.
- **Progressive Overload Training System:** Double progression algorithm.
- **HealthPilot Training Operating System v1.0 (AI Guardrails):** Evidence-based guardrail system enforcing safety-first training prescription with AI recovery insights.
- **AI Exercise Alternatives & Swap Feature:** AI-powered exercise alternative suggestions.
- **Intelligent Exercise-Specific Tracking:** Smart classification system for exercise tracking.
- **Muscle Group Frequency Tracking System:** Tracks training frequency across 8 major muscle groups.
- **Voice Chat System (Premium Feature):** WebSocket + OpenAI Realtime API for natural voice interaction.
- **Universal Medical Data Interpreter:** AI-powered system for ingesting and interpreting medical data (PDFs, images, FHIR, HL7).
- **Native Exercise Library:** HealthPilot maintains a comprehensive library of 1,000+ exercises with internal metadata (muscles, equipment, category, instructions). Exercise details modal displays exercise information with neutral placeholder instead of external media.
- **Landing Page CMS:** Custom-built content management system for landing page content.
- **Mobile Scrolling Optimization:** Improvements for mobile/tablet scrolling in admin interfaces.
- **Unified Insights Hub:** Integration of Daily Health, AI Coach, and Trend Analysis into a single tabbed interface.
- **Baseline Mode & Feature Flag System:** Comprehensive feature flag infrastructure allowing progressive AI/ML feature rollout with a `BASELINE_MODE_ENABLED` master override. Infrastructure flags (like `EXERCISE_MEDIA_STRICT_BINDING_ENABLED`) operate independently of baseline mode for data quality/safety features.
- **Daily AI Training Generator:** Standards-based AI workout generation system that creates personalized daily training sessions following ACSM/NSCA/WHO guidelines. Generates workouts at 4am user timezone via cron scheduler with on-demand fallback. Includes safety validation, exercise fuzzy matching to native library, and accept/reject/regenerate workflow. Controlled by `DAILY_AI_TRAINING_GENERATOR_ENABLED` feature flag.
- **Sleep Scoring v2.0 Algorithm:** Advanced sleep analysis system processing HealthKit data with episode clustering, primary/nap detection, and 6-component scoring (Duration 0-25pts, Efficiency 0-20pts, Deep 0-10pts, REM 0-10pts, Fragmentation -10 to +10pts, Regularity 0-5pts). Features timezone-aware calculations using `formatInTimeZone` throughout, wall-clock time comparisons for regularity scoring, smart deduplication with 30-minute overlap detection, and sessionization logic for split-night handling. Implemented in `server/services/sleepScoring.ts` with comprehensive test coverage. Database schema updated with v2.0 fields (episodeType, awakeningsCount, sleepEfficiency, sleepMidpointLocal, nightKeyLocalDate, flags). Backward compatible with existing v1.0 data.
- **Symptoms Tracking System:** Comprehensive symptom monitoring system allowing users to track health symptoms with episode-based grouping, severity scoring (0-10 scale), trend analysis (better/worse/same), and contextual tags. Features include smart context suggestions (after_workout, poor_sleep, stress_high, etc.), real-time trend updates with one-tap actions, health signal snapshots at recording time, and automatic episode resolution. Database schema supports FHIR coding, episode linking for longitudinal tracking, and multi-event episodes. Frontend includes dedicated Symptoms page (`/symptoms`) with active/resolved sections and SymptomTile dashboard widget for quick updates. Implemented with PostgreSQL backend, RESTful API endpoints, TanStack Query, and shadcn/ui components following HealthPilot's design patterns.
- **AI Symptom Correlation Engine:** Intelligent analysis system that correlates symptoms with objective health signals (sleep quality, HRV, blood pressure, activity, medications). Implements 6 evidence-based correlation rules and generates AI-powered insights with safety-first language (non-diagnostic, tentative phrasing). Integrated into Daily Insights Scheduler (2:00 AM local time) alongside metric deviation detection. Features include red-flag detection for urgent symptoms (chest pain, severe headache, one-sided weakness), priority scoring based on severity/trend/correlations, and GPT-4o-powered insight generation with fallback templates. Environment toggle: `INCLUDE_SYMPTOMS_IN_INSIGHTS` (default: true). Correlation rules: poor sleep → fatigue, HRV drop → stress symptoms, BP spike → headaches, high training load → soreness, activity drop → mood/energy, medication changes → digestive/cognitive symptoms. Implementation files: `server/services/symptomCorrelation.ts`, `server/services/symptomInsightGeneration.ts`, integrated in `server/services/dailyInsightsScheduler.ts`.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook and native HealthKit integration via Capacitor)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe