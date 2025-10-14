# Health Insights AI - AI-Powered Health Dashboard

## Overview

Health Insights AI is an AI-powered health insights platform designed to analyze health records, track biomarkers, and deliver personalized health recommendations. It provides AI-generated meal plans, training schedules, and alternative therapy suggestions, empowering users with personalized intelligence and pattern discovery from their health data to optimize well-being.

## User Preferences

I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture

The application is a full-stack project utilizing React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by OpenAI GPT-4o.

**UI/UX Decisions:**
- Dark mode support and responsive design.
- Biomarker trend visualization with color-coded badges and compact trend line widgets.
- Purple sparkly AI Chat Widget with a semi-transparent chat window and responsive mobile design.
- User-customizable dashboard with widget visibility and order preferences that persist.
- Clear Chat Feature with timestamp-based UI clearing, preserving full conversation history in the database.
- PWA support for iOS home screen installation with custom icon and theme.
- **Enhanced Dashboard Widgets (October 2025):**
  - Health Score Widget: Three-segment recharts donut chart (Sleep blue, Activity green, Vitals purple) with centered score, quality badge, and animated progress bars below
  - Biological Age Widget: Improved title sizing and "View Full Analysis" button spacing for better visual balance
  - Goals Summary Widget: Animated progress bars with complementary colors (emerald, cyan, violet), fixed decrease goal calculation logic using useMemo to prevent infinite loops
  - Data Insights Widget: Top 4 insights display with expandable "Show More" button, fills vertical space with h-full and flex-1

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions. Includes safeguards for weight assessment (requires body fat percentage or health markers) and goal-driven assistance for training plans, meal plans, chat, and daily insights.
- **Biomarker Tracking:** Displays data over time, shows reference range status, supports imperial/metric units, and includes comprehensive Australian blood work support with unit-aware reference ranges. **Now includes HRV (Heart Rate Variability) tracking** from Apple HealthKit with proper unit conversion (ms) and reference ranges (40-100ms optimal for active individuals).
- **Authentication:** Production-ready security implementation using Replit Auth (OpenID Connect) with custom domain support and role-based access control.
- **Security Protections:** Includes IDOR protection, privilege escalation prevention, data isolation, webhook authentication, and Zod schema validation.
- **File Upload Security:** Validation for file size and types (PDF, DOC, DOCX, JPG, PNG, TXT).
- **Sleep Data Implementation:** Uses `inBedStart` and `inBedEnd` for duration, includes awake time, smart deduplication, and custom sleep score calculation.
- **Workout Tracking:** Comprehensive exercise data import from Apple Health via webhook, automatic creation of workout sessions, and smart matching algorithm for training schedules. Supports strength training logs.
- **Recovery Session Integration:** Optional sauna and cold plunge sessions included in AI-generated training plans with smart post-workout scheduling.
- **Training Analytics:** Provides training load calculation, workout statistics by type, workout-biomarker correlations, and AI-powered recovery insights with severity-based recommendations.
- **Readiness Score System (October 2025):** Daily readiness calculation using multi-factor analysis:
  - **Phase 1 - Core Algorithm:** Weighted scoring system - Sleep Quality (40%), HRV (30%), Resting Heart Rate (15%), Workout Load Recovery (15%)
  - **Safety-First Logic:** Automatic rest recommendations when critical recovery markers are low (poor sleep <40, very low HRV <30, elevated RHR)
  - **Smart Caching:** Daily scores stored in database to avoid recalculation, with historical tracking
  - **Dashboard Widget:** Fuel gauge visualization with semicircle chart showing readiness score (0-100), color-coded recommendation badges (green=ready, yellow=caution, red=rest), quality labels (excellent/good/fair/poor), and component breakdown (Sleep, HRV, Resting HR, Recovery)
  - **Workout Load Analysis:** Considers both acute (24h) and chronic (7d) training load with intensity estimation from heart rate data when available
  - **Timezone Fix (Oct 14, 2025):** Extended date filter to `addDays(targetDate, 1)` to properly handle sleep sessions crossing midnight in positive UTC offset timezones (e.g., Australia/Perth UTC+8). Previously, timezone conversion caused sessions to be excluded from readiness calculation, defaulting sleep score to 50/100.
  - **Phase 2 - Customization (Oct 14, 2025):** User-configurable readiness factors with personalized insights:
    - **Custom Factor Weights:** Interactive settings page with sliders to adjust Sleep/HRV/RestingHR/Workload weights (auto-redistributes to maintain 100% total), real-time preview of score impact
    - **Training Intensity Auto-Adjustment:** AI automatically reduces workout intensity/duration when readiness is caution/rest, displays visible explanation of what was adjusted and why
    - **Recovery Time Prediction:** 3-day trend analysis using linear regression to estimate days until readiness ≥65, shows trend direction (improving/declining/stable) and confidence level (high/medium/low)
    - **Readiness Alerts:** Configurable threshold-based alerts with visual warning banner on Training page when score drops below user's threshold, toggle to enable/disable alerts
    - **Backend Storage:** user_readiness_settings table stores custom weights (default 40/30/15/15), alert threshold (default 50), alerts enabled flag, persists via POST /api/training/readiness/settings with cache invalidation
  - **Phase 3 - Advanced Recovery Protocols (Oct 14, 2025):** AI-powered recovery protocol library with user preference learning:
    - **Protocol Library:** 13 pre-seeded recovery protocols across 6 categories (mobility, mindfulness, nutrition, cold_therapy, heat_therapy, breathing) with detailed benefits, instructions, and target factors
    - **Smart Recommendations:** Personalized protocol suggestions based on low readiness factors (sleep, HRV, resting HR, workload), filtered by user preferences, limited to top 3
    - **Voting System:** Users can upvote/downvote protocols; clicking active vote again resets to neutral state for flexible preference management
    - **AI Integration:** Chat service respects user preferences—downvoted protocols are permanently excluded from all AI suggestions across the platform
    - **Database Schema:** recovery_protocols table (protocol metadata), user_protocol_preferences table (user votes), with API endpoints for recommendations and voting
    - **UI Component:** Training page displays protocol cards with expandable details, category badges, and voting buttons with visual feedback (default variant for upvote, destructive for downvote, outline for neutral)
  - **User Override & Training Schedule Display (Oct 14, 2025):** Enhanced user autonomy and visibility:
    - **AI Override Capability:** Users can explicitly request rigorous/intense training plans despite low readiness scores. AI respects user autonomy when they use phrases like "override", "I want a hard workout anyway", or "give me a rigorous plan"
    - **Training Schedule Section:** Added "Your Training Schedule" card to Training page displaying all saved workout plans from AI chat using TrainingScheduleCard component
    - **Complete Visibility:** Training plans created via chat (including override plans) now properly appear on Training page, fixing previous issue where plans were saved but not visible
    - **Data Flow:** Chat saves plans via SAVE_TRAINING_PLAN markers → backend stores in training_schedules table → Training page fetches and displays via `/api/training-schedules` endpoint

**Feature Specifications:**
- Health record upload and AI analysis with status tracking.
- **Weekly Meal Planning System:** AI-generated personalized meal plans with a 4-day rolling window, automatic date assignment, smart cleanup logic, weekly calendar view, detailed recipe modal with photos, ingredients, instructions, macros, and batch AI generation.
- AI-powered alternative therapy recommendations based on biomarker analysis.
- Admin control panel for user and subscription management.
- **Auto-Save Training Plans from Chat:** AI-generated training plans confirmed by the user are automatically saved.
- **AI-Guided Onboarding:** A 5-step guided onboarding experience via the FloatingChat widget for new users, covering welcome, Apple Health integration, health records upload, training plan creation, and meal plan generation.
- **Data & Insights Dashboard:** Includes AI trend predictions, period comparison of health metrics, and a comprehensive goal setting & tracking system.
- **Biological Age (Premium Feature):** Science-based biological age calculation using the PhenoAge algorithm, requiring 9 blood biomarkers, with a dedicated page and dashboard widget.

## External Dependencies

- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o (via Replit AI Integrations)
- **Authentication:** Replit Auth (OpenID Connect)
- **File Storage:** Local file upload with secure validation, and a shared Google Drive connection for uploads (file browsing disabled).
- **Health Data Integration:** Apple Health via Health Auto Export iOS app webhook.