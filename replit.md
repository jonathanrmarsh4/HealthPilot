# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions and enhancing user health through data.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
**Frontend:** React 18, Vite 5.x, Wouter, shadcn/ui + Radix UI, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Lucide React + React Icons.
**Backend:** Express.js, RESTful APIs with Zod validation, express-session, WebSocket (for Voice Chat), Multer.
**Database:** PostgreSQL (Neon-backed), Drizzle ORM, Drizzle-Zod.
**Mobile:** Capacitor 7 (iOS native app), capacitor-health plugin.

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, PWA support for iOS.
- Customizable dashboard with persistent widgets, AI Chat Widget with history.
- Redesigned Training Page with daily-focused UX and organized sidebar navigation.
- Universal Tile Management System and swipe-based interface for meal feedback.
- Glass-morphism modal UI for Voice Chat.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards.
- **Freemium Model:** Subscription tiers (free/premium/enterprise) for feature access.
- **Data Tracking & Management:** Biomarker tracking, smart deduplication, comprehensive workout tracking from Apple Health.
- **Universal HealthKit Ingest System v1.0:** Append-only raw data warehouse for HealthKit events, with idempotent ingestion, type registry for 50+ metric types, and automatic unit normalization.
- **Personalized Recommendations & Automation:** AI-generated meal plans, macro, and exercise recommendations with auto-scheduling.
- **Readiness Score System:** Multi-factor weighted scoring.
- **Scheduling & Reminders:** AI insights scheduling, supplement tracking, daily reminders.
- **User Profiling & Onboarding:** Fitness profile personalization, contextual AI onboarding.
- **Security & Authentication:** Replit Auth (OpenID Connect), role-based access control, IDOR protection, Zod validation, secure file uploads.
- **Privacy & Compliance:** International privacy compliance (GDPR, HIPAA), granular consent, audit logging, account deletion, JSON data export, Privacy Dashboard.
- **Native iOS App:** Complete native iOS app via Capacitor 7 with HealthKit integration.
- **Progressive Overload Training System:** Double progression algorithm for training.
- **HealthPilot Training Operating System v1.0 (AI Guardrails):** Evidence-based guardrail system for safety-first training prescription and AI recovery insights.
- **AI Exercise Alternatives & Swap Feature:** AI-powered exercise alternative suggestions.
- **Intelligent Exercise-Specific Tracking:** Smart classification system for exercise tracking.
- **Muscle Group Frequency Tracking System:** Tracks training frequency across 8 major muscle groups.
- **Voice Chat System (Premium Feature):** WebSocket + OpenAI Realtime API for natural voice interaction.
- **Universal Medical Data Interpreter:** AI-powered system for ingesting and interpreting medical data (PDFs, images, FHIR, HL7).
- **Native Exercise Library:** Comprehensive library of 1,000+ exercises with internal metadata.
- **Landing Page CMS:** Custom-built content management system for landing page content.
- **Unified Insights Hub:** Integration of Daily Health, AI Coach, and Trend Analysis into a single tabbed interface.
- **Baseline Mode & Feature Flag System:** Comprehensive feature flag infrastructure for progressive AI/ML feature rollout with a `BASELINE_MODE_ENABLED` master override.
- **Daily AI Training Generator:** Standards-based AI workout generation system following ACSM/NSCA/WHO guidelines, generating personalized daily sessions via cron scheduler with on-demand fallback.
- **Muscle Group Balance + Anti-Duplication Enforcement v1.0.0:** Advanced workout generation preventing duplicates and enforcing muscle group balance using canonicalization, balance snapshots, and server-side validation guards.
- **Dynamic Time Budget System:** AI workout generator respects user's `preferredDuration`, dynamically adjusting exercise count and sets to efficiently fill the time budget.
- **Comprehensive Biomarker Insights Analysis:** Daily Insights system analyzing 60+ biomarker types alongside HealthKit metrics, using clinical reference ranges and baseline deviation detection for personalized health insights.
- **Sleep Scoring v2.0 Algorithm:** Advanced sleep analysis system processing HealthKit data with episode clustering, primary/nap detection, and 6-component scoring, featuring timezone-aware calculations and smart deduplication.
- **SmartFuel™ Precision Nutrition Guidance System v1.0:** Complete evidence-based nutrition guidance system replacing legacy Spoonacular-based meal recommendations. Analyzes biomarkers (cholesterol, blood pressure, glucose), health goals, and dietary preferences to generate personalized "what to avoid" and "what to include" guidance. Built on YAML-based clinical rule packs (18 evidence-based rules for conditions like hypertension, elevated LDL, prediabetes) and a JSON food ontology (100+ categorized foods). Uses a multi-layer reasoning engine (signal normalizer, risk profiler, target setter, personalization layer) and NLG template system to convert structured data into friendly, actionable advice. Features include: theme-based risk detection, dietary preference filtering (vegetarian/vegan/paleo/keto), allergy accommodation, numeric daily targets, evidence tier labeling, and contextual tips. Legacy meal/recipe features parked using FEATURE_SHOW_RECIPE_FEATURES flag (default: false) for potential future reactivation. SmartFuelTile dashboard widget and full SmartFuelPage implementation with mobile-responsive design.
- **Symptoms Tracking System:** Comprehensive symptom monitoring system allowing users to track symptoms with episode-based grouping, severity scoring, trend analysis, and contextual tags.
- **AI Symptom Correlation Engine v2.0 - Holistic Assessment with Medical-Grade Diagnostics:** Intelligent analysis system that combines ALL active symptoms into a SINGLE AI query with comprehensive biomarkers (sleep, HRV, BP, activity, medications) to identify root causes and patterns. Uses Occam's Razor principle to find the fewest causes explaining the most symptoms, implementing 6 evidence-based correlation rules with safety-first language. Generates comprehensive diagnostic assessments with: triage reason, vitals/biomarkers summary, and multiple differential diagnoses (possible causes) each with confidence percentages (0-100%), evidence bullets, and specific action recommendations. Symptom diagnosis/triage appears exclusively in the Daily tab for medical assessment, not in AI Coach recommendations. Data stored in JSONB evidence field: `triageReason`, `vitalsCollected`, `biomarkersCollected`, `possibleCauses[]`.
- **Dynamic Insights Engine v1.0:** Modular insights generation architecture that discovers and analyzes all available metrics without hardcoding, built around a metric registry, discovery system, data readers, analysis primitives, and domain rule packs.
- **Automatic Timezone Synchronization:** Intelligent timezone detection system ensuring accurate scheduling and time-based features across all timezones, using browser-based detection and server-side validation.
- **Exercise Template Auto-Seeding System:** Automatic database seeding system ensuring all exercise templates referenced in rules exist in the database at application startup.
- **Template-to-Exercise Enrichment System v1.0:** Critical fix ensuring workout generation properly resolves template_ids to exercise_ids during save, preventing exercise mismatch bugs. All workout generation code paths (API routes, scheduler) now use `enrichWorkoutBlocks` to map templates → exercises BEFORE database storage, eliminating fuzzy matching discrepancies between workout preview and session execution.
- **Cost Rollup Scheduler & Telemetry System:** Automated daily cost aggregation system running at 02:30 UTC to aggregate telemetry_llm_events into cost_user_daily and cost_global_daily tables for the admin Cost Control Dashboard. Instrumented OpenAI client tracks all LLM usage regardless of API key source (Replit integration or custom key), enabling comprehensive monitoring of AI costs, token usage, and user spending patterns.
- **Production-Ready Native iOS App (Capacitor 7):** Complete mobile infrastructure with MobileBootstrap, 5 adapters (SecureStorage with Keychain, HealthKit, Haptics, Share, Browser), Native Diagnostics screen, and comprehensive documentation (OPERATIONS.md, MOBILE_READINESS_CHECKLIST.md, TEST_PLAN_IOS.md). Uses @aparajita/capacitor-secure-storage for true iOS Keychain and Android Keystore encryption of auth tokens. Validation suite ensures all requirements met.
- **Advanced Goals System v2 - Workout-Based Metric Detection & Manual Updates:** Enhanced goal tracking system with automatic detection of running/cycling distances from HealthKit workout sessions. System queries workout_sessions table to extract latest and max distances for running and cycling activities, automatically populating metric baselines. Includes manual metric update capability via PATCH /api/goals/:goalId/metrics/:metricId endpoint with IDOR protection (verifies both goal ownership and metric-goal relationship). MetricUpdateDialog component provides user-friendly UI for updating individual metric values with real-time cache invalidation. Metric mapper recognizes endurance_event canonical type and maps running-distance/cycling-distance to HealthKit workout data sources. Each metric in GoalInsightCard displays an Edit button for manual progress updates.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook and native HealthKit integration via Capacitor)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe