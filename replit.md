# Health Insights AI - AI-Powered Health Dashboard

## Overview

Health Insights AI is an AI-powered health insights platform designed to analyze health records, track biomarkers, and deliver personalized health recommendations. It provides AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to empower users with personalized intelligence, pattern discovery, and correlations from their health data to optimize their well-being.

## User Preferences

I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file.

**Primary Devices:** I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices. Test on smaller screens and ensure UI elements don't overflow or become hidden.

## System Architecture

The application is a full-stack project utilizing React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by Anthropic Claude 3 Haiku.

**UI/UX Decisions:**
- Dark mode support
- Responsive design
- Biomarker trend visualization with color-coded badges and compact trend line widgets.
- Purple sparkly AI Chat Widget - small animated icon in bottom-right corner that opens to a semi-transparent chat window with purple gradient header and responsive mobile design.
- Dashboard Widget Persistence - User-customizable dashboard with widget visibility and order preferences that persist to database, syncing across devices and surviving cookie clearing.
- Clear Chat Feature - Timestamp-based UI clearing that hides old messages while preserving full conversation history in database for AI context. Synchronized across both FloatingChat widget and Health Coach page via localStorage.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, enhanced multi-metric recommendations, and alternative therapy suggestions.
  - **Weight Assessment Safeguards:** AI will NOT suggest weight loss based solely on raw weight numbers. It requires body fat percentage data (>25% men, >32% women), clear health markers (elevated glucose/cholesterol/BP), or explicit user request before making weight-related recommendations. Respects that athletic/fit individuals often have "high" weight due to muscle mass.
  - **Goal-Driven AI Assistance:** AI actively helps users achieve their health goals by integrating active goals into all AI-powered features:
    - **Training Plans:** AI creates goal-aligned workouts with specific exercises that support target achievement. Each training schedule includes a description explaining how it supports user goals.
    - **Meal Plans:** AI generates nutrition plans designed to help reach specific targets (weight loss, muscle gain, etc.) based on active goals.
    - **AI Chat:** Proactively suggests plan adjustments and provides goal-specific recommendations when progress indicates changes are needed.
    - **Daily Insights:** Generates goal progress tracking insights with actionable next steps. Includes "goal_progress" insight type that monitors trends and provides specific actions to accelerate progress.
- **Biomarker Tracking:** Displays multiple data points over time, shows reference range status, and supports localization for imperial/metric units. Supports body fat percentage tracking.
- **Authentication:** Production-ready security implementation using Replit Auth (OpenID Connect) with custom domain support and role-based access control.
- **Security Protections:** Includes IDOR protection, privilege escalation prevention, data isolation, webhook authentication, and Zod schema validation.
- **File Upload Security:** Validation for file size, types (PDF, DOC, DOCX, JPG, PNG, TXT), and mime types.
- **Sleep Data Implementation:** Uses `inBedStart` and `inBedEnd` for sleep session duration, includes awake time, and performs smart deduplication. Custom sleep score calculation is implemented as Apple's native score is not exportable.
- **Workout Tracking:** Comprehensive exercise data import from Apple Health via webhook. Automatically creates workout sessions with duration, calories, heart rate, and distance. Smart matching algorithm links completed workouts to training schedules by day and type, marking schedules as completed. Supports strength training exercise logs with sets, reps, and weight tracking.
- **Recovery Session Integration:** Optional sauna and cold plunge sessions (3-4x/week) included in AI-generated training plans with smart post-workout scheduling recommendations. Features include:
  - **AI Training Plan Enhancement:** Claude generates recovery sessions alongside workouts, marked as optional with appropriate session types (sauna/cold_plunge)
  - **Day Scheduling:** Users can schedule optional recovery sessions for specific days with visual calendar badges
  - **Ad-Hoc Logging:** Quick-log dialog for recording sauna/cold plunge sessions not in the plan, with duration and notes tracking
  - **Visual Distinctions:** Recovery sessions display with dashed borders, fire/snowflake icons, and purple "Recovery" badges for easy identification
  - **Session Detail View:** Clickable workout cards in Workouts tab open detail dialog showing complete session information including notes, duration, calories, heart rate, and source - fully mobile-responsive
- **Training Analytics:** Phase 3 backend implementation provides:
  - **Training Load Calculation:** Weekly and monthly training load tracking using duration and heart rate intensity (when available). Calculates total training hours per week.
  - **Workout Statistics:** Aggregates workout data by type (e.g., Cardio, Strength, Yoga) with total duration, calories burned, and workout counts.
  - **Workout-Biomarker Correlations:** Analyzes impact of exercise on sleep quality and resting heart rate, comparing workout days vs. non-workout days to measure improvements.
  - **AI-Powered Recovery Insights:** Claude AI analyzes training load, workout statistics, and biomarker correlations to generate personalized recovery recommendations. Features severity-based insights (excellent/good/caution/warning) with specific actionable recommendations. Defensive null handling ensures stable AI prompts even with empty datasets.
- **PWA Configuration:** Progressive Web App support for iOS home screen installation with custom icon. Manifest.json located at client/public/ with app metadata (name: "Health Insights AI", short_name: "HealthPilot"). iOS-specific meta tags in index.html enable standalone app mode with custom icon matching the HealthPilot logo. Theme color set to purple (#9333ea) for brand consistency.

**Feature Specifications:**
- Health record upload and AI analysis with status tracking and retry functionality.
- **Weekly Meal Planning System:** AI-generated personalized meal plans with 4-day rolling window. Features include:
  - **Automatic Date Assignment:** Each meal assigned a specific scheduledDate from today/tomorrow forward for 4 days (16 meals total: breakfast, lunch, dinner, snack per day)
  - **Smart Cleanup Logic:** Automatically deletes past meals (scheduledDate < today) and enforces 4-day cap using deletePastMealPlans() and deleteFutureMealsBeyondDate()
  - **Weekly Calendar View:** Groups meals by date, sorts chronologically, displays "Today" indicator, responsive grid layout (4 cols desktop → 2 tablet → 1 mobile)
  - **Detailed Recipe Modal:** Mobile-first drawer component shows:
    - **Meal Photos:** High-quality food images fetched from Foodish API (free food image service)
    - **Ingredients List:** Bulleted list with measurements (e.g., "1 cup oats", "200g chicken")
    - **Step-by-Step Instructions:** Detailed recipe with numbered cooking steps
    - **Macros & Info:** Calories, protein, carbs, fat, prep time, servings, dietary tags
  - **Meal Card Photos:** Each meal card displays thumbnail photo with hover effects for visual appeal
  - **Batch AI Generation:** Splits meal generation into 2 batches (Days 1-2, Days 3-4) to stay within Claude Haiku's 4096 token output limit, preventing JSON truncation errors
  - **Goal-Aligned Generation:** AI incorporates active health goals into meal planning with explicit descriptions of how each meal supports user's targets
  - **Schema Enhancement:** Added `imageUrl` (varchar), `ingredients` (text array), `detailedRecipe` (text) fields to meal_plans table
  - **Mobile-Optimized:** Fully responsive on iPad/iPhone with touch-friendly interactions
- AI-powered alternative therapy recommendations (sauna, cold plunge, red light therapy, etc.) based on biomarker analysis.
- Admin control panel for user and subscription management.
- **Auto-Save Training Plans from Chat:** When the AI creates a training plan through conversation and the user confirms it, the plan is automatically saved to the database and appears on the Training page. The user receives a success notification with a link to view their new plan.
- **AI-Guided Onboarding:** New users receive a structured 5-step guided onboarding experience that auto-launches on first login via the FloatingChat widget. The AI health coach walks users through: (1) Welcome introduction, (2) Apple Health integration setup, (3) Health records upload, (4) Personalized training plan creation, and (5) Meal plan generation. Features include visual progress tracking, ability to skip steps, auto-save of created plans, and persistent state that prevents auto-reopen after manual close. Step progression auto-advances during conversation and syncs seamlessly with existing features.
- **Data & Insights Dashboard:**
  - **AI Trend Predictions:** Claude AI analyzes biomarker patterns and time-series data to forecast future health metrics. Provides predictions for weight, heart rate, sleep quality, and other biomarkers based on historical trends. Shows confidence levels and actionable insights.
  - **Period Comparison:** Side-by-side comparison of health metrics across different time periods. Users can compare any two timeframes (e.g., "Last 30 Days" vs "Previous 30 Days") to identify improvements or declines. Shows percentage changes and visual indicators for quick assessment.
  - **Goal Setting & Tracking:** Comprehensive goal management system for health metrics. Supports both increase goals (steps, sleep hours) and decrease goals (weight loss, cholesterol reduction). Features smart progress calculation that handles zero baselines, automatic unit derivation from metric types, and visual progress bars with percentage tracking. Goals display status badges (active, achieved, overdue), deadline tracking, and edit/delete functionality. Progress formula automatically adjusts for goal type: increase goals use (current-start)/(target-start), decrease goals use (start-current)/(start-target). Edge case handled for startValue equals targetValue (returns 100% progress).
- **Biological Age (Premium Feature):** Science-based biological age calculation using the PhenoAge algorithm (Levine et al. 2018). Requires 9 blood biomarkers: albumin, creatinine, glucose, CRP, lymphocyte%, MCV, RDW, ALP, WBC from standard CBC and CMP panels. Features dedicated `/biological-age` page with biomarker checklist showing collected/missing markers, visual age comparison (biological vs chronological), and dashboard widget displaying age difference with trend indicators. AI extraction enhanced to prioritize PhenoAge biomarkers from uploaded health records. Calculation uses corrected mortality formula (1 - 0.988^(exp(xb))) with accurate coefficient signs (+0.00188 for ALP). Future monetization as Stripe paid feature planned.

## External Dependencies

- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** Anthropic Claude 3 Haiku
- **Authentication:** Replit Auth (OpenID Connect)
- **File Storage:** 
  - Local file upload with secure validation (PDF, DOC, DOCX, JPG, PNG, TXT)
  - **Google Drive:** Currently uses workspace-level connection (shared). File browsing is disabled for security to prevent cross-user file visibility. Users can upload files locally. Future: Implement per-user Google Drive OAuth.
- **Health Data Integration:** 
  - **Current (Development):** Apple Health via Health Auto Export iOS app webhook to `POST /api/health-auto-export/ingest`
  - **Future (Production):** Plan to migrate to enterprise data aggregator like Journey for multi-device support and reliability
  - **Exploration Complete:** Junction.com (Vital) evaluated as alternative - supports 300+ devices but requires paid service. Documentation available in JUNCTION_COMPARISON.md for future reference.