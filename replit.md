# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions and enhancing user health through data.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
**Frontend:** React 18, Vite 5.x, Wouter, shadcn/ui + Radix UI, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Lucide React + React Icons.
**Backend:** Express.js, RESTful APIs with Zod validation, express-session, WebSocket (for Voice Chat), Multer, date-fns-tz for timezone-aware date handling.
**Database:** PostgreSQL (Neon-backed), Drizzle ORM, Drizzle-Zod.
**Mobile:** Capacitor 7 (iOS native app), custom @healthpilot/healthkit plugin for comprehensive HealthKit integration (26 data types vs standard 5).
**Timezone Support:** All date-based features are fully timezone-aware using user's stored timezone preference.

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, PWA support for iOS.
- Customizable dashboard with persistent widgets, AI Chat Widget with history.
- Redesigned Training Page with daily-focused UX and organized sidebar navigation.
- Universal Tile Management System and swipe-based interface for meal feedback.
- Glass-morphism modal UI for Voice Chat.
- Swipe-to-Open Sidebar for mobile gesture navigation.
- Premium Theme System v2.0 - Dual-Personality Liquid Glass Design.
- Dual Schedule System: Separate schedules on Training page (training workouts, recommendations, insights) and Recovery page (recovery sessions).
- Mobile-Optimized Workout UI: Streamlined workout generation interface and active workout session display.
- Fixed-Position Mobile Header with iOS safe-area support and symmetric content padding (scrollbar-hide utility).

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions.
- **Freemium Model:** Subscription tiers (free/premium/enterprise).
- **Data Tracking & Management:** Biomarker tracking, smart deduplication, comprehensive workout tracking.
- **Universal HealthKit Ingest System v1.0:** Append-only raw data warehouse for HealthKit events with idempotent ingestion and unit normalization.
- **Personalized Recommendations & Automation:** AI-generated meal plans, macro, and exercise recommendations with auto-scheduling.
- **Readiness Score System:** Multi-factor weighted scoring.
- **Scheduling & Reminders:** AI insights scheduling, supplement tracking, daily reminders.
- **User Profiling & Onboarding:** Fitness profile personalization, contextual AI onboarding.
- **Security & Authentication:** Replit Auth (OpenID Connect), role-based access control, IDOR protection, Zod validation, secure file uploads.
- **Privacy & Compliance:** International privacy compliance (GDPR, HIPAA), granular consent, audit logging, account deletion, JSON data export, Privacy Dashboard.
- **Native iOS App with HealthKit Integration v3.0:** Production-ready native iOS app with timezone-aware step counting.
- **iOS Background Fetch System v3.0:** Native iOS background processing for automatic HealthKit sync (with proper queue draining and data loss prevention), AI insights generation, daily workout creation, and notification updates. Fixed critical bug where AppDelegate was calling non-existent endpoint and not properly draining HealthKit queue. Fixed Active Calories field name mismatch (calories → activeCalories) ensuring data syncs correctly since Oct 23rd.
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
- **Baseline Mode & Feature Flag System:** Comprehensive feature flag infrastructure for progressive AI/ML feature rollout.
- **Daily AI Training Generator:** Standards-based AI workout generation system following ACSM/NSCA/WHO guidelines.
- **Muscle Group Balance + Anti-Duplication Enforcement v1.0.0:** Advanced workout generation preventing duplicates and enforcing muscle group balance.
- **Dynamic Time Budget System:** AI workout generator respects user's `preferredDuration`.
- **Comprehensive Biomarker Insights Analysis:** Daily Insights system analyzing 60+ biomarker types alongside HealthKit metrics.
- **Sleep Scoring v2.0 Algorithm:** Advanced sleep analysis system processing HealthKit data.
- **SmartFuel™ Precision Nutrition Guidance System v1.0:** Complete evidence-based nutrition guidance system.
- **Symptoms Tracking System:** Comprehensive symptom monitoring system.
- **AI Symptom Correlation Engine v2.0:** Intelligent analysis system combining active symptoms with comprehensive biomarkers.
- **Dynamic Insights Engine v1.0:** Modular insights generation architecture.
- **Automatic Timezone Synchronization v2.0:** Intelligent timezone detection system ensuring accurate scheduling and time-based features.
- **Exercise Template Auto-Seeding System:** Automatic database seeding system.
- **Template-to-Exercise Enrichment System v1.1:** Ensures workout generation properly resolves template_ids to exercise_ids.
- **Cost Rollup Scheduler & Telemetry System:** Automated daily cost aggregation system.
- **Advanced Goals System v2:** Enhanced goal tracking system with automatic detection of distances from HealthKit.
- **AI-Powered Training Plan Generation System v2.0:** Replaces hardcoded training templates with GPT-4o-generated phased plans.
- **Native Apple Pay + Stripe Integration v1.0:** Production-ready dual-platform payment system.
- **Comprehensive Notifications Layer v1.0:** Event-driven notification system featuring OneSignal push notifications, local scheduled reminders, in-app notification center, deep linking, and iOS Background Fetch integration.
- **Advanced Recovery Scheduling System v1.0:** Comprehensive recovery protocol scheduling with frequency patterns and AI-powered timing recommendations.
- **Multi-Dimensional Recovery System v1.0:** Muscle-group-specific recovery tracking system using fatigue modeling with exponential decay curves.
- **iOS Live Activities for Workout Tracking v1.0:** Real-time lock screen workout tracking with Live Activities.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (native HealthKit via custom @healthpilot/healthkit Capacitor plugin; fallback: Health Auto Export iOS app webhook)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe (iOS native PaymentSheet + web Checkout Sessions)
- **Push Notifications:** OneSignal