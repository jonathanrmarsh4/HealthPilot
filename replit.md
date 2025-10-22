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
- **Exercise Demonstration System (ExerciseDB Integration):** Integration with ExerciseDB API for exercise demonstrations; includes Exercise Matcher Simple V1 for deterministic matching and Exercise Media Strict Binding System for zero-tolerance mismatch prevention.
- **Landing Page CMS:** Custom-built content management system for landing page content.
- **Mobile Scrolling Optimization:** Improvements for mobile/tablet scrolling in admin interfaces.
- **Unified Insights Hub:** Integration of Daily Health, AI Coach, and Trend Analysis into a single tabbed interface.
- **Baseline Mode & Feature Flag System:** Comprehensive feature flag infrastructure allowing progressive AI/ML feature rollout with a `BASELINE_MODE_ENABLED` master override. Infrastructure flags (like `EXERCISE_MEDIA_STRICT_BINDING_ENABLED`) operate independently of baseline mode for data quality/safety features.

## External Dependencies
- **Database:** PostgreSQL
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook and native HealthKit integration via Capacitor)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe
- **Exercise Database:** ExerciseDB API (via RapidAPI)