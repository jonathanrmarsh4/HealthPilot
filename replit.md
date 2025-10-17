# Health Insights AI - AI-Powered Health Dashboard

## Overview
Health Insights AI is an AI-powered platform designed to analyze health records, track biomarkers, and deliver personalized health recommendations. It provides AI-generated meal plans, training schedules, and alternative therapy suggestions, empowering users with personalized intelligence and pattern discovery from their health data to optimize well-being. The project's vision is to optimize user well-being through data-driven insights and actionable recommendations, with market potential in personalized health and wellness.

## User Preferences
I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture
The application is a full-stack project utilizing React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by OpenAI GPT-4o.

**UI/UX Decisions:**
- Dark mode support and responsive design, optimized for mobile/tablet, including PWA support for iOS.
- Visualizations for biomarker trends, readiness score, and health score.
- User-customizable dashboard with persistent widget visibility and order preferences.
- Purple sparkly AI Chat Widget with clear chat feature that preserves history in the database.
- Redesigned Training Page with a daily-focused UX and organized sidebar navigation.
- Universal Tile Management System for customizable page layouts with drag-and-drop reordering.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards and goal-driven assistance. Includes AI expanded capabilities for full database visibility and controlled write access with comprehensive audit logging. AI chat includes immediate response enforcement and intelligent insight categorization (comment/actionable).
- **Freemium Model & Premium Features:** Subscription tier system with free/premium/enterprise tiers, offering varying levels of AI messages, biomarker types, historical data access, and advanced features like biological age calculation, Apple Health sync, AI-generated meal plans, and voice chat.
- **Data Tracking & Management:** Features biomarker tracking with trend display, reference ranges, unit conversion, and support for Australian blood work, HRV, and lean body mass. Includes smart deduplication for sleep data and comprehensive workout tracking from Apple Health.
- **Personalized Recommendations & Automation:** AI generates personalized meal plans with a feedback system, macro recommendations, and exercise recommendations with smart auto-scheduling. Automated goal auto-update system syncs progress with new biomarker data.
- **Readiness Score System:** A multi-factor weighted scoring system calculates daily readiness, incorporating sleep quality, HRV, RHR, and workout load, with safety-first logic and AI-powered recovery insights.
- **Scheduling & Reminders:** AI insights scheduling system for recommendations, and a supplement tracking and daily reminders system.
- **User Profiling & Onboarding:** A fitness profile personalization system for calibrated workouts and a contextual AI onboarding system.
- **Security & Authentication:** Production-ready security using Replit Auth (OpenID Connect) with role-based access control, IDOR protection, privilege escalation prevention, and Zod schema validation. File upload security with validation. One-time EULA acceptance system.
- **Payment Processing:** Stripe integration for premium subscription purchases with webhook handling.
- **Native iOS App:** Complete native iOS app implementation using Capacitor 7 for 100% code reuse, including direct HealthKit integration.
- **Progressive Overload Training System:** Double progression algorithm automatically suggests weight increases based on performance and RPE.
- **HealthPilot Training Operating System v1.0 (AI Guardrails):** Comprehensive evidence-based guardrail system enforcing safety-first training prescription aligned with ACSM, NSCA, and WHO standards. Includes biomarker-driven adjustments, auto-regulation triggers, progression limits, HR max caps, mandatory rest days, deload weeks, and goal-specific programming.
- **Swipe-Based Meal Interface:** Dating-app style swipe interface for meal feedback in meal plans.
- **AI Exercise Alternatives & Swap Feature:** AI-powered exercise alternative suggestions with a "Swap" button functionality in workout sessions.

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o (via Replit AI Integrations)
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health via Health Auto Export iOS app webhook (web) and native HealthKit integration via Capacitor (iOS app).
- **Mobile Platform:** Capacitor 7 for native iOS app.
- **Payment Processing:** Stripe