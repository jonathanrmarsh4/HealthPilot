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
**Timezone Support:** All date-based features (workout generation, scheduling, insights) are fully timezone-aware using user's stored timezone preference (IANA format, e.g., "Australia/Perth").

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, PWA support for iOS.
- Customizable dashboard with persistent widgets, AI Chat Widget with history.
- Redesigned Training Page with daily-focused UX and organized sidebar navigation.
- Universal Tile Management System and swipe-based interface for meal feedback.
- Glass-morphism modal UI for Voice Chat.
- Swipe-to-Open Sidebar for mobile gesture navigation.
- Premium Theme System v2.0 - Dual-Personality Liquid Glass Design with distinct light/dark mode aesthetics, controlled via Admin Panel CMS Theme tab.
- **Dual Schedule System:** Separate schedules on Training page (training workouts, recommendations, insights) and Recovery page (recovery sessions) - maintained for user testing and will iterate based on feedback.
- **Mobile-Optimized Workout UI (Nov 2025):** Streamlined workout generation interface showing only "Accept" and "Regenerate" buttons (removed off-screen Reject button). Active workout sessions use sticky footer positioned 96px above MobileNav bottom toolbar to prevent overlap with "Finish" button, ensuring all controls remain fully accessible during workouts.

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
- **Native iOS App with HealthKit Integration v3.0:** Production-ready native iOS app with timezone-aware step counting using HKStatisticsQuery for accurate deduplication. Supports live reload for development and uses Replit backend API.
- **iOS Background Fetch System v2.0 (Nov 2025):** Native iOS background processing for automatic HealthKit sync, AI insights generation, daily workout creation, and notification updates. Intelligently scheduled by iOS based on user behavior patterns (typically 30-60min before typical app usage). Configured with UIBackgroundModes (fetch, processing, remote-notification) in Info.plist. Manual sync available via Settings page as on-demand fallback. Removed redundant app lifecycle sync to simplify architecture and rely solely on native iOS Background Fetch for optimal battery efficiency.
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
- **Daily AI Training Generator:** Standards-based AI workout generation system following ACSM/NSCA/WHO guidelines, generating personalized daily sessions via cron scheduler with on-demand fallback.
- **Muscle Group Balance + Anti-Duplication Enforcement v1.0.0:** Advanced workout generation preventing duplicates and enforcing muscle group balance.
- **Dynamic Time Budget System:** AI workout generator respects user's `preferredDuration`, dynamically adjusting exercise count and sets.
- **Comprehensive Biomarker Insights Analysis:** Daily Insights system analyzing 60+ biomarker types alongside HealthKit metrics, using clinical reference ranges and baseline deviation detection.
- **Sleep Scoring v2.0 Algorithm:** Advanced sleep analysis system processing HealthKit data with episode clustering, primary/nap detection, and 6-component scoring.
- **SmartFuel™ Precision Nutrition Guidance System v1.0:** Complete evidence-based nutrition guidance system replacing legacy Spoonacular-based meal recommendations. Analyzes biomarkers, health goals, and dietary preferences to generate personalized "what to avoid" and "what to include" guidance.
- **Symptoms Tracking System:** Comprehensive symptom monitoring system with episode-based grouping, severity scoring, trend analysis, and contextual tags.
- **AI Symptom Correlation Engine v2.0:** Intelligent analysis system combining active symptoms with comprehensive biomarkers to identify root causes and patterns.
- **Dynamic Insights Engine v1.0:** Modular insights generation architecture that discovers and analyzes all available metrics without hardcoding.
- **Automatic Timezone Synchronization v2.0:** Intelligent timezone detection system ensuring accurate scheduling and time-based features. Workout generation, daily insights, and all date-based queries now use user's local timezone (Nov 2025 update: fixed workout generation to respect user timezone via `localDayToUtcRange()` utility).
- **Exercise Template Auto-Seeding System:** Automatic database seeding system ensuring all exercise templates referenced in rules exist.
- **Template-to-Exercise Enrichment System v1.1:** Ensures workout generation properly resolves template_ids to exercise_ids during save and overrides AI-generated display_name with canonical exercise library names.
- **Cost Rollup Scheduler & Telemetry System:** Automated daily cost aggregation system for `telemetry_llm_events`.
- **Advanced Goals System v2:** Enhanced goal tracking system with automatic detection of running/cycling/swimming/walking distances from HealthKit workout sessions and manual metric update capability.
- **AI-Powered Training Plan Generation System v2.0:** Replaces hardcoded training templates with comprehensive GPT-4o-generated phased plans.
- **Native Apple Pay + Stripe Integration v1.0:** Production-ready dual-platform payment system supporting iOS native Apple Pay via Stripe iOS SDK and web Stripe Checkout Sessions.
- **Comprehensive Notifications Layer v1.0:** Event-driven notification system featuring OneSignal push notifications, local scheduled reminders, in-app notification center, deep linking, and iOS Background Fetch integration.
- **Advanced Recovery Scheduling System v1.0:** Comprehensive recovery protocol scheduling with frequency patterns (one-time, daily, weekly), AI-powered timing recommendations, and automatic filtering of scheduled protocols from recommendations. Features schema-backed validation, field-level error handling, and persistent schedule patterns.
- **Multi-Dimensional Recovery System v1.0:** Muscle-group-specific recovery tracking system using fatigue modeling with exponential decay curves. Tracks 6 muscle groups (Chest, Back, Legs, Shoulders, Arms, Core) independently with intraday timeline tracking showing how recovery changes throughout the day from workouts and recovery protocols. Hybrid scoring: 60% biometric foundation (sleep 30%, HRV 20%, RHR 10%) + 40% modeled fatigue state. Features Recovery page visualization with muscle group cards and 7-day timeline graph with event markers. **Nov 2025 Fix:** Backend workout finish endpoint now automatically applies muscle group fatigue via `recordWorkoutCompletion()`, preventing duplicate calls and ensuring recovery scores update correctly after workouts. Training page displays "Workout Load Recovery" (fatigue-based) while Recovery page shows systemic biometric score.
- **iOS Live Activities for Workout Tracking v1.0:** Real-time lock screen workout tracking with Live Activities, displaying current exercise, set progress, rest timer countdown, elapsed time, and interactive controls. Backend infrastructure complete with OneSignal APNs integration. Requires manual Xcode setup (Widget Extension, App Groups, Swift code). Documentation in docs/live-activities/.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (native HealthKit via custom @healthpilot/healthkit Capacitor plugin supporting 26 comprehensive health data types on iOS; fallback: Health Auto Export iOS app webhook for web users)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe (iOS native PaymentSheet + web Checkout Sessions)
- **Push Notifications:** OneSignal

## Important Troubleshooting Guides
- **Capacitor Plugin Not Detected on iOS:** See `docs/troubleshooting/capacitor-plugin-not-detected.md` - comprehensive guide for fixing platform detection issues, plugin registration failures, and the critical importance of `<script src="capacitor.js"></script>` in index.html. Reference this if custom plugins show "not implemented" errors or platform detection shows "web" instead of "ios".