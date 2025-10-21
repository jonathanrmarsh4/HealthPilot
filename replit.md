# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## Agent Instructions (Senior Software Engineer Role)
You are my senior software engineer working in this exact stack and repo.

**Context**
- Runtime: Node.js 20 + React + Vite, TypeScript strict mode ON
- Environment: Replit (NixOS). Use only package.json scripts to run tasks
- Code style: Prettier + ESLint (no disabling rules unless requested)
- Output discipline: 
  1. First, show a short PLAN (bulleted steps)
  2. Then produce DIFF-ONLY patches using unified diff format with correct file paths
  3. Do not rename, move, or create files unless explicitly allowed in my task
  4. Do not change unrelated code

**Verification gates (must pass before you show me code)**
- Build passes
- Typecheck: no TS errors
- Lint: no new warnings/errors
- Tests: existing tests still pass; add new tests when acceptance criteria require them

**When you think**
- Think step-by-step privately. Only show the final plan, diffs, and verification notes
- If anything is ambiguous, propose 1–2 minimal options with trade-offs; pick one and proceed

**Deliverables for every task**
- PLAN (concise)
- PATCH (diff-only)
- POST-CHANGE CHECKS: commands I should run and what success looks like
- ROLLBACK NOTES: how to revert just this change

## System Architecture & Tech Stack
**Runtime Environment:**
- Node.js 20 (on NixOS via Replit)
- TypeScript 5.x (strict mode enabled)
- Package manager: npm
- Process management: npm scripts

**Frontend:**
- React 18 + TypeScript
- Build tool: Vite 5.x (with HMR)
- Router: Wouter (lightweight client-side routing)
- UI Framework: shadcn/ui + Radix UI primitives
- Styling: Tailwind CSS 3.x + PostCSS
- State Management: TanStack Query v5 (React Query)
- Forms: React Hook Form + Zod validation
- Icons: Lucide React + React Icons

**Backend:**
- Express.js + TypeScript
- API: RESTful endpoints with Zod validation
- Sessions: express-session with PostgreSQL store
- WebSocket: ws (for Voice Chat feature)
- File uploads: Multer

**Database:**
- PostgreSQL (Neon-backed, managed by Replit)
- ORM: Drizzle ORM
- Migrations: `npm run db:push` (schema sync)
- Type safety: Drizzle-Zod for runtime validation

**External Services:**
- AI: OpenAI GPT-4o + Realtime API (voice)
- Authentication: Replit Auth (OpenID Connect via openid-client)
- Payments: Stripe SDK with webhooks
- Exercise data: ExerciseDB API (via RapidAPI)
- Health data: Apple HealthKit (via Capacitor plugin)

**Mobile:**
- Framework: Capacitor 7 (iOS native app)
- Health integration: capacitor-health plugin

**Development Tools:**
- Linter: ESLint
- Formatter: Prettier
- Type checking: TypeScript compiler (tsc)
- Hot reload: Vite HMR + Express watch mode (via tsx)

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, and PWA support for iOS.
- Visualizations for biomarker trends, readiness, and health scores.
- Customizable dashboard with persistent widget visibility and order.
- AI Chat Widget with history, minimized by default, and integration for adding exercises to workouts.
- Redesigned Training Page with a daily-focused UX and organized sidebar navigation.
- Universal Tile Management System for customizable page layouts with drag-and-drop reordering.
- Swipe-based interface for meal feedback.
- Glass-morphism modal UI for the Voice Chat System.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards and goal-driven assistance. Includes full database visibility, controlled write access, and dynamic loading of system knowledge.
- **Freemium Model & Premium Features:** Subscription tier system (free/premium/enterprise) offering varied access to AI messages, biomarker types, historical data, and advanced features like biological age calculation, Apple Health sync, AI meal plans, and voice chat.
- **Data Tracking & Management:** Biomarker tracking with trends, reference ranges, unit conversion, and support for Australian blood work, HRV, and lean body mass. Smart deduplication for sleep data and comprehensive workout tracking from Apple Health. Enhanced iOS HealthKit sleep processing with intelligent bedtime detection and accurate sleep quality scoring.
- **Personalized Recommendations & Automation:** AI generates personalized meal plans with feedback, macro recommendations, and exercise recommendations with smart auto-scheduling. Automated goal updates based on biomarker data.
    - **Simplified Meal Recommendation System v1.0 (Oct 2025 - ✅ COMPLETED):** Simplified meal recommendation engine for faster shipping and easier maintenance. Removed Thompson Sampling bandit algorithm, complex 6-weight scoring system, macro portion scaling, and ingredient substitutions (deferred to v2.0). Safety-critical features preserved: allergy filtering, intolerance filtering, dietary pattern filtering (vegan, vegetarian, pescatarian), disliked meal exclusion, case-insensitive meal slot matching. SimplifiedMealRecommenderService uses Fisher-Yates shuffle for random selection from safely filtered meals. Simple like/dislike feedback storage. Benefits: 70% less code complexity, easier testing, faster deployment, all safety features intact.
    - **Simplified Nutrition Profile (Oct 2025 - ✅ COMPLETED):** Streamlined nutrition profile to only collect data used by simplified meal recommendation system. Schema changes: Removed unused fields (cuisinePreferences, dislikedFoods, calorieTarget, proteinTarget, carbsTarget, fatTarget, mealsPerDay, snacksPerDay, cookingSkillLevel, maxPrepTime). Kept only safety-critical fields: dietaryPreferences, allergies, intolerances. Frontend: Simplified NutritionProfile.tsx from 5 cards to 3 cards, removing AI macro recommendations, cuisine preferences, and daily nutrition targets. Added previously missing intolerances section. Form reduced from ~600 lines to ~340 lines (43% reduction). Benefits: Cleaner UX, only collects used data, reduced confusion, better mobile experience.
    - **Meal Library Management:** Admin interface for importing and managing meals from Spoonacular API into the database.
- **Readiness Score System:** Multi-factor weighted scoring system incorporating sleep, HRV, RHR, and workout load, with safety-first logic and AI recovery insights.
- **Scheduling & Reminders:** AI insights scheduling and a supplement tracking/daily reminders system.
- **User Profiling & Onboarding:** Fitness profile personalization for calibrated workouts and contextual AI onboarding.
- **Security & Authentication:** Production-ready security using Replit Auth (OpenID Connect) with role-based access control, IDOR protection, privilege escalation prevention, Zod validation, and secure file uploads. Secure download endpoint for medical reports with authorization checks and audit logging.
- **Privacy & Compliance:** Full international privacy compliance (GDPR, HIPAA, PIPEDA, Australia Privacy Act) with granular consent, comprehensive audit logging, account deletion grace period, JSON data export, and Privacy Dashboard.
- **Payment Processing:** Stripe integration for subscriptions with webhook handling and a robust production-ready flow including landing page integration, success/cancel handlers, and an enhanced billing page.
- **Native iOS App:** Complete native iOS app via Capacitor 7 for code reuse and direct HealthKit integration.
- **Progressive Overload Training System:** Double progression algorithm for weight increases based on performance and RPE.
- **HealthPilot Training Operating System v1.0 (AI Guardrails):** Evidence-based guardrail system enforcing safety-first training prescription aligned with ACSM, NSCA, WHO standards, including biomarker-driven adjustments, auto-regulation, progression limits, and mandatory rest days. All AI recommendations include transparent citations.
- **AI Exercise Alternatives & Swap Feature:** AI-powered exercise alternative suggestions with a "Swap" button in workout sessions.
- **Intelligent Exercise-Specific Tracking:** Smart classification system for exercise tracking (weight_reps, bodyweight_reps, distance_duration, duration_only), dynamically rendering input fields and validating data.
- **Muscle Group Frequency Tracking System:** Tracks training frequency across 8 major muscle groups with a 14-day rolling window, providing visual heatmap feedback and informing AI workout generation.
- **Voice Chat System (Premium Feature):** WebSocket + OpenAI Realtime API for natural, human-like voice interaction with real-time transcription, enhanced VAD, conversation memory, engagement personality, and voice-specific guardrails.
- **Universal Medical Data Interpreter:** AI-powered system for ingesting and interpreting medical data (PDFs, images, FHIR, HL7) through a seven-stage pipeline with confidence gating. Supports various report types, performs biomarker auto-extraction, and enables AI correlation analysis.
- **Exercise Demonstration System (ExerciseDB Integration):** Integration with ExerciseDB API providing animated GIF demonstrations, step-by-step instructions, target muscle groups, and equipment information. Includes database storage, fuzzy name matching, and sophisticated equipment matching.
- **Landing Page CMS:** Custom-built content management system for the landing page allowing admin users to manage all content (Hero, Features, Testimonials, Social, SEO) without code changes, providing full CRUD operations.
- **Mobile Scrolling Optimization:** Comprehensive improvements for mobile/tablet scrolling across all admin interfaces, ensuring proper horizontal scrolling for wide data tables.
- **Unified Insights Hub (Oct 2025 - ✅ COMPLETED):** Integrated three insight systems (Daily Health, AI Coach, Trend Analysis) into a single tabbed interface at /insights while maintaining each system's unique capabilities. Key features: Daily Health Insights auto-generate actionable recommendations for notable+ severity deviations, linking insights to specific actions via recommendationId; tabbed navigation with URL query parameter sync using Wouter; SPA navigation throughout with /daily-insights redirecting to /insights?tab=daily; AIInsightsWidget displays "View Action" button for insights with linked recommendations; seamless integration flow from insight detection to actionable recommendation.

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook and native HealthKit integration via Capacitor)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe
- **Exercise Database:** ExerciseDB API via RapidAPI (ULTRA tier subscription)