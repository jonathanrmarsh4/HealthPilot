# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform by Nuvitae Labs (nuvitaelabs.com). It analyzes health records, tracks biomarkers, and provides personalized health recommendations including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to optimize user well-being through data-driven insights and actionable recommendations, tapping into the market potential of personalized health and wellness.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
The application is a full-stack project using React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by OpenAI GPT-4o.

**UI/UX Decisions:**
- Dark mode, responsive design optimized for mobile/tablet, and PWA support for iOS.
- Visualizations for biomarker trends, readiness, and health scores.
- Customizable dashboard with persistent widget visibility and order.
- AI Chat Widget with history, minimized by default, and integration for adding exercises to workouts.
- Redesigned Training Page with a daily-focused UX and organized sidebar navigation.
- Universal Tile Management System for customizable page layouts with drag-and-drop reordering.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards and goal-driven assistance. Includes full database visibility, controlled write access with audit logging, and dynamic loading of system knowledge (privacy compliance, subscription tiers, data handling) from `healthpilot-system-knowledge.json`.
- **Freemium Model & Premium Features:** Subscription tier system (free/premium/enterprise) offering varied access to AI messages, biomarker types, historical data, and advanced features like biological age calculation, Apple Health sync, AI meal plans, and voice chat.
- **Data Tracking & Management:** Biomarker tracking with trends, reference ranges, unit conversion, and support for Australian blood work, HRV, and lean body mass. Smart deduplication for sleep data and comprehensive workout tracking from Apple Health. Enhanced iOS HealthKit sleep processing with intelligent bedtime detection and accurate sleep quality scoring.
- **Personalized Recommendations & Automation:** AI generates personalized meal plans with feedback, macro recommendations, and exercise recommendations with smart auto-scheduling. Automated goal updates based on biomarker data. **AI-Driven Meal Curation (Oct 2025):** Enhanced meal generation creates 30-50 curated options per meal type from 472-meal library (when populated) or Spoonacular API fallback. Each meal includes AI reasoning explaining health benefits based on biomarkers, goals, and nutrition profile. Fixed dislike filter to properly exclude all feedback types. Smart filtering by dietary preferences, allergens, macros, and disliked meals with intelligent ranking.
- **Readiness Score System:** Multi-factor weighted scoring system incorporating sleep, HRV, RHR, and workout load, with safety-first logic and AI recovery insights.
- **Scheduling & Reminders:** AI insights scheduling and a supplement tracking/daily reminders system.
- **User Profiling & Onboarding:** Fitness profile personalization for calibrated workouts and contextual AI onboarding.
- **Security & Authentication:** Production-ready security using Replit Auth (OpenID Connect) with role-based access control, IDOR protection, privilege escalation prevention, Zod validation, and secure file uploads.
- **Privacy & Compliance:** Full international privacy compliance (GDPR, HIPAA, PIPEDA, Australia Privacy Act) with granular consent, comprehensive audit logging, account deletion grace period, JSON data export, and Privacy Dashboard.
- **Payment Processing:** Stripe integration for subscriptions with webhook handling.
- **Native iOS App:** Complete native iOS app via Capacitor 7 for code reuse and direct HealthKit integration.
- **Progressive Overload Training System:** Double progression algorithm for weight increases based on performance and RPE.
- **HealthPilot Training Operating System v1.0 (AI Guardrails):** Evidence-based guardrail system enforcing safety-first training prescription aligned with ACSM, NSCA, WHO standards, including biomarker-driven adjustments, auto-regulation, progression limits, and mandatory rest days. All AI recommendations include transparent citations. Unified guardrails enforcement across text and voice chat.
- **Swipe-Based Meal Interface:** Dating-app style swipe interface for meal feedback.
- **AI Exercise Alternatives & Swap Feature:** AI-powered exercise alternative suggestions with a "Swap" button in workout sessions.
- **Intelligent Exercise-Specific Tracking:** Smart classification system for exercise tracking (weight_reps, bodyweight_reps, distance_duration, duration_only), dynamically rendering input fields and validating data.
- **Muscle Group Frequency Tracking System:** Tracks training frequency across 8 major muscle groups with a 14-day rolling window, providing visual heatmap feedback (undertrained/optimal/overtrained). AI workout generation uses this data to prioritize undertrained groups. Exercise cards display color-coded muscle group badges.
- **Voice Chat System (Premium Feature):** Glass-morphism modal UI with WebSocket + OpenAI Realtime API for natural, human-like voice interaction. Includes real-time transcription, auto-greeting, tiered access, chat feedback, and safety guardrails with real-time keyword detection and escalation. Strict data privacy with data minimization. **Enhanced VAD & Conversation Memory (Oct 2025):** Improved Voice Activity Detection with threshold 0.7 and silence_duration 1000ms to reduce false activations from background noise. JSON-structured conversation history (last 10 messages) properly formatted for guardrails parsing. Enhanced engagement personality with name usage, enthusiasm, and follow-up questions. Voice-specific guardrails section with readiness checks, training limits, and evidence citations. Memory management instructions for referencing past conversations and saving new context.
- **Universal Medical Data Interpreter:** AI-powered system for ingesting and interpreting medical data (PDFs, images, FHIR, HL7) through a seven-stage pipeline (OCR→Classify→Extract→Normalize→Validate→Interpret→Finalize) with confidence gating. Supports various report types including lab results and imaging reports (calcium scores, cardiac CT), performs biomarker auto-extraction, and enables AI correlation analysis. All medical documents are processed through the unified interpreter pipeline and stored in the medical_reports table. Includes premium tier limits for uploads and robust file security.
- **Exercise Demonstration System (ExerciseDB Integration):** Integration with ExerciseDB API providing animated GIF demonstrations, step-by-step instructions, target muscle groups, and equipment information. **Database Storage Migration (Oct 2024):** Migrated from in-memory cache to persistent PostgreSQL storage for improved reliability and performance. Features fuzzy name matching (60% confidence threshold), automatic sync on startup if database empty or stale (>30 days), and manual sync endpoint. Info buttons on all exercise cards in both training schedules and active workout sessions. Accessible via modal dialogs showing proper form and technique guidance. **Current State:** Database storage and auto-sync working correctly, but RapidAPI still returning BASIC tier data (10 exercises) despite ULTRA subscription - tier upgrade may need additional time to propagate or API key regeneration.

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o (via Replit AI Integrations)
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health via Health Auto Export iOS app webhook (web) and native HealthKit integration via Capacitor (iOS app).
- **Mobile Platform:** Capacitor 7 for native iOS app.
- **Payment Processing:** Stripe
- **Exercise Database:** ExerciseDB API via RapidAPI (ULTRA tier subscription - $17.99/mo)
  - **Database Storage:** PostgreSQL-backed persistent storage with auto-sync on startup
  - **Sync Status:** Currently receiving 10 exercises (BASIC tier data) - ULTRA tier upgrade pending API propagation
  - **Features:** Fuzzy name matching (60% threshold), database persistence, auto-sync (30-day refresh), authenticated 1080p GIF proxy
  - **Action Required:** Verify ULTRA tier activation on RapidAPI dashboard, regenerate API key if needed, then manually trigger sync via `/api/exercisedb/sync` endpoint