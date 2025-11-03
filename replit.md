OK# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions and enhancing user health through data.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
**Frontend:** React 18, Vite 5.x, Wouter, shadcn/ui + Radix UI, Tailwind CSS, TanStack Query v5, React Hook Form + Zod, Lucide React + React Icons.
**Backend:** Express.js, RESTful APIs with Zod validation, express-session, WebSocket (for Voice Chat), Multer.
**Database:** PostgreSQL (Neon-backed), Drizzle ORM, Drizzle-Zod.
**Mobile:** Capacitor 7 (iOS native app), @capgo/capacitor-health plugin for HealthKit integration.

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, PWA support for iOS.
- Customizable dashboard with persistent widgets, AI Chat Widget with history.
- Redesigned Training Page with daily-focused UX and organized sidebar navigation.
- Universal Tile Management System and swipe-based interface for meal feedback.
- Glass-morphism modal UI for Voice Chat.
- Swipe-to-Open Sidebar: Mobile gesture navigation allowing users to open the sidebar with a left-to-right swipe from the screen's left edge (50px threshold, 80px minimum distance, 30° maximum angle from horizontal).

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
- **Native iOS App with HealthKit Integration v3.0 (Nov 2025):** Production-ready native iOS app with timezone-aware step counting using HKStatisticsQuery for accurate deduplication. Uses @capgo/capacitor-health plugin + custom HealthKitStatsPlugin for deduplicated daily step totals. **Development Mode:** Live reload enabled - iOS app loads frontend directly from Replit dev server (configured in capacitor.config.ts) for instant updates without rebuild cycles. **Production Mode:** Disable live reload before TestFlight/App Store builds by commenting out the server block in capacitor.config.ts. Architecture uses Replit backend API connectivity for all data operations.
- **HealthKit Automatic Sync v2.0 (Nov 2025) - ✅ PRODUCTION:** Fully functional automatic sync system using app lifecycle hooks with authenticated mobile API requests. Triggers on app launch and when app returns to foreground with smart 5-minute cooldown to prevent excessive API calls and battery drain. Implemented via Capacitor App plugin in MobileBootstrap.ts with proper Bearer token authentication from SecureStorage. Platform detection enabled via capacitor.js script in index.html. iOS-only feature. Maintains full backward compatibility with manual sync button. Git workflow established for code synchronization between Replit and local Mac development.
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
- **Premium Theme System v1.0 - Liquid Glass Design (Nov 2025):** Admin-controlled visual theme featuring coral-to-turquoise gradient design (#FF7C77 → #E58AC9 → #00CFCF) with Apple-inspired Liquid Glass aesthetic. Complete design system includes: (1) CSS variables for brand colors, glass effects, shadows, and SF Pro typography, (2) Full-page animated gradient backgrounds on html/body, (3) Liquid Glass component (.hp-glass) with frosted blur and dual-border system (::before for outer hairline, ::after for inner sheen), (4) Premium buttons (.hp-btn-primary, .hp-btn-ghost) with gradient backgrounds and hover lift effects, (5) Glass cards, tiles, and chips with proper pseudo-element layering, (6) Fluid responsive typography (.h1, .h2) using clamp() sizing, (7) Dark mode color palette. Theme persists across all pages using premium-theme class on html/body elements. Controlled via Admin Panel CMS Theme tab with real-time toggle. Architecture: landing_page_content.premium_theme_enabled database field, GET/PUT API endpoints, PremiumThemeProvider component applying premium-theme class, explicit utility classes (.hp-*) scoped to .premium-theme namespace.

## iOS Development Workflow

**IMPORTANT: Xcode builds use bundled files, NOT live reload** (Nov 2025)
- When building from Xcode Play button, app loads from `capacitor://localhost` (bundled files)
- The `server.url` config in `capacitor.config.ts` is ignored by direct Xcode builds
- Live reload only works when using Capacitor CLI (`npx cap run ios`)

**iOS Build Workflow (Required for Frontend Changes):**
1. **On Replit:** `npm run build && npx cap sync ios`
2. **In Xcode:** Delete app from device → Clean Build (`⇧⌘K`) → Build and Run (`⌘R`)
3. This bundles fresh frontend code and syncs it to `ios/App/App/public`

**Recommended Development Strategy:**
- **Frontend development:** Use web browser (live reload works perfectly, API calls identical to iOS)
- **iOS-specific testing:** Build and sync when testing HealthKit, native plugins, or iOS-specific features
- **Quick iterations:** Web browser >> iOS rebuilds

**Build Pipeline:**
1. Development: Bundle and sync workflow (see above)
2. Production/TestFlight: Same workflow, ensure `server` block is commented out in `capacitor.config.ts`

**Important Notes:**
- Backend API calls always go to Replit (works from both web and iOS)
- Bundled files must be rebuilt after any frontend changes to appear on iOS
- Web browser is faster for iterating on UI/UX changes

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (primary: native HealthKit via @capgo/capacitor-health plugin on iOS; fallback: Health Auto Export iOS app webhook for web users)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe (iOS native PaymentSheet + web Checkout Sessions)
- **Push Notifications:** OneSignal (iOS/Android push notifications with deep linking)