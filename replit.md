# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions and enhancing user health through data.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
**Frontend:** React 18, Vite 5.x, Wouter, shadcn/ui + Radix UI, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Lucide React + React Icons.
**Backend:** Express.js, RESTful APIs with Zod validation, express-session, WebSocket (for Voice Chat), Multer.
**Database:** PostgreSQL (Neon-backed), Drizzle ORM, Drizzle-Zod.
**Mobile:** Capacitor 7 (iOS native app), custom HealthPilotHealthKit plugin.

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
- **Universal HealthKit Ingest System v1.0:** Append-only raw data warehouse for HealthKit events with idempotent ingestion, type registry, and automatic unit normalization.
- **Personalized Recommendations & Automation:** AI-generated meal plans, macro, and exercise recommendations with auto-scheduling.
- **Readiness Score System:** Multi-factor weighted scoring.
- **Scheduling & Reminders:** AI insights scheduling, supplement tracking, daily reminders.
- **User Profiling & Onboarding:** Fitness profile personalization, contextual AI onboarding.
- **Security & Authentication:** Replit Auth (OpenID Connect), role-based access control, IDOR protection, Zod validation, secure file uploads.
- **Privacy & Compliance:** International privacy compliance (GDPR, HIPAA), granular consent, audit logging, account deletion, JSON data export, Privacy Dashboard.
- **Native iOS App with Comprehensive HealthKit Integration v1.0:** Production-ready native iOS app deployed to physical iPhone devices with custom HealthPilotHealthKit Capacitor plugin supporting all HealthKit data types. Architecture uses local bundle loading from capacitor://localhost for instant UI with Replit backend API connectivity.
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
- **SmartFuel™ Precision Nutrition Guidance System v1.0:** Complete evidence-based nutrition guidance system replacing legacy Spoonacular-based meal recommendations. Analyzes biomarkers, health goals, and dietary preferences to generate personalized "what to avoid" and "what to include" guidance. Built on YAML-based clinical rule packs and a JSON food ontology.
- **Symptoms Tracking System:** Comprehensive symptom monitoring system allowing users to track symptoms with episode-based grouping, severity scoring, trend analysis, and contextual tags.
- **AI Symptom Correlation Engine v2.0 - Holistic Assessment with Medical-Grade Diagnostics:** Intelligent analysis system that combines all active symptoms into a single AI query with comprehensive biomarkers to identify root causes and patterns.
- **Dynamic Insights Engine v1.0:** Modular insights generation architecture that discovers and analyzes all available metrics without hardcoding.
- **Automatic Timezone Synchronization:** Intelligent timezone detection system ensuring accurate scheduling and time-based features.
- **Exercise Template Auto-Seeding System:** Automatic database seeding system ensuring all exercise templates referenced in rules exist.
- **Template-to-Exercise Enrichment System v1.0:** Ensures workout generation properly resolves template_ids to exercise_ids during save, preventing exercise mismatch bugs.
- **Cost Rollup Scheduler & Telemetry System:** Automated daily cost aggregation system to aggregate telemetry_llm_events for the admin Cost Control Dashboard.
- **Advanced Goals System v2 - Workout-Based Metric Detection & Manual Updates:** Enhanced goal tracking system with automatic detection of running/cycling/swimming/walking distances from HealthKit workout sessions and manual metric update capability.
- **AI-Powered Training Plan Generation System v2.0:** Replaces hardcoded training templates with comprehensive GPT-4o-generated phased plans that work for any goal type.
- **Native Apple Pay + Stripe Integration v1.0:** Production-ready dual-platform payment system supporting iOS native Apple Pay via Stripe iOS SDK and web Stripe Checkout Sessions.
- **Comprehensive Notifications Layer v1.0:** Event-driven notification system featuring OneSignal push notifications, local scheduled reminders, in-app notification center, and deep linking (healthpilot:// custom scheme + links.healthpilot.pro universal links). Integrates with AI insights, biomarker alerts, and scheduled reminders via EventBus architecture. Supports timezone-aware quiet hours, per-channel preferences, and multi-time daily reminders.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (primary: native HealthKit via custom Capacitor plugin on iOS; fallback: Health Auto Export iOS app webhook for web users)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe (iOS native PaymentSheet + web Checkout Sessions)
- **Push Notifications:** OneSignal (iOS/Android push notifications with deep linking)

## CRITICAL ISSUE - HealthKit Plugin Broken After Stripe Integration (Oct 30, 2024)

**Status:** UNRESOLVED - Taking break, resuming tomorrow

**Problem:**
Custom HealthPilotHealthKit Capacitor plugin worked perfectly until Stripe iOS SDK (StripePaymentSheet) was added via CocoaPods. After running `pod install` for Stripe, the HealthKit plugin fails with:
```
"HealthPilotHealthKit" plugin is not implemented on ios
Error code: UNIMPLEMENTED
```

**Root Cause (Identified by Architect):**
After Stripe's `pod install`, the App target lost the `-ObjC` linker flag that's required for Capacitor's Objective-C category-based plugin registration system. The CAP_PLUGIN macro in `HealthPilotHealthKit.m` generates an Objective-C category to register the plugin, but without `-ObjC`, the linker strips these categories at build time.

**What We Tried (All Failed):**
1. ✅ Verified `HealthPilotHealthKit.m` and `.swift` are in App target's Compile Sources
2. ✅ Re-added `.m` file to Build Phases → Compile Sources (was missing after pod install)
3. ✅ Added `$(inherited) -ObjC` to Other Linker Flags in Build Settings
4. ✅ Manually registered plugin in AppDelegate.swift:
   ```swift
   CAPBridge.registerPlugin("HealthPilotHealthKit", pluginClass: HealthPilotHealthKit.self)
   ```
5. ✅ Ran `npx cap sync ios` multiple times
6. ✅ Clean build (Cmd+Shift+K) and fresh installs
7. ✅ Deleted app from device and reinstalled
8. ✅ Closed/reopened Xcode
9. ✅ Plugin is in `capacitor.config.json` packageClassList

**Files Modified During Troubleshooting:**
- `ios/App/Podfile` - Added StripePaymentSheet pod
- `ios/App/App/AppDelegate.swift` - Added manual plugin registration
- `client/src/services/healthkit.ts` - Improved error logging
- Xcode Build Settings: Other Linker Flags set to `$(inherited) -ObjC`

**Current State:**
- Stripe SDK successfully installed and working
- HealthKit plugin files exist and compile without errors
- Manual registration code compiles but plugin still not discovered by Capacitor
- Suggests deeper Xcode project corruption from pod install regenerating workspace

**Remaining Options to Try Tomorrow:**
1. **Option A (Recommended):** Git rollback to before Stripe changes, then carefully re-add Stripe while preserving HealthKit
2. **Option B:** Nuclear fix - Delete `ios/App` folder and regenerate with `npx cap add ios`, manually re-add both plugins
3. **Option C:** Investigate if there's a Podfile configuration that can declare local plugins alongside CocoaPods dependencies
4. **Option D:** Check `project.pbxproj` for corruption/duplicate entries that might prevent .m compilation

**Important Notes:**
- HealthKit integration was fully functional before this issue
- Incremental sync system (7 day initial, 1 day subsequent) was working perfectly
- This is a build configuration issue, not a code logic issue
- The manual registration approach SHOULD work but isn't - suggests something is preventing the Swift class from being accessible to CAPBridge