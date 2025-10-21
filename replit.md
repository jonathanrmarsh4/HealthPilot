# HealthPilot - AI-Powered Health Dashboard

## Overview
HealthPilot is an AI-powered health and wellness platform designed to optimize user well-being. It analyzes health records, tracks biomarkers, and provides personalized health recommendations, including AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to deliver data-driven insights and actionable advice, capitalizing on the growing market for personalized health solutions.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
HealthPilot is a full-stack application built with React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, is the primary database. OpenAI GPT-4o powers the AI capabilities.

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
    - **Simplified Meal Recommendation System:** Focuses on safety-critical features (allergy/intolerance/dietary pattern filtering) with a simplified selection process and efficient API endpoints. Adaptive learning, macro optimization, and ingredient substitutions are planned for future versions.
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

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook and native HealthKit integration via Capacitor)
- **Mobile Platform:** Capacitor 7
- **Payment Processing:** Stripe
- **Exercise Database:** ExerciseDB API via RapidAPI (ULTRA tier subscription)