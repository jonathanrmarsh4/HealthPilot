# Health Insights AI - AI-Powered Health Dashboard

## Overview

Health Insights AI is an AI-powered platform designed to analyze health records, track biomarkers, and deliver personalized health recommendations. It provides AI-generated meal plans, training schedules, and alternative therapy suggestions, empowering users with personalized intelligence and pattern discovery from their health data to optimize well-being. The project's vision is to optimize user well-being through data-driven insights and actionable recommendations, with market potential in personalized health and wellness.

## User Preferences

I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file. I primarily use iPad and iPhone for my work. All features must be fully functional and properly responsive on mobile/tablet devices.

## System Architecture

The application is a full-stack project utilizing React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by OpenAI GPT-4o.

**UI/UX Decisions:**
- Dark mode support and responsive design, optimized for mobile/tablet, including PWA support for iOS.
- Visualizations for biomarker trends, readiness score (semicircle gauge), and health score (three-segment donut chart).
- User-customizable dashboard with persistent widget visibility and order preferences.
- Purple sparkly AI Chat Widget with clear chat feature that preserves history in the database.
- Redesigned Training Page with a daily-focused UX and organized sidebar navigation.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, multi-metric recommendations, and alternative therapy suggestions with safeguards and goal-driven assistance. Includes AI expanded capabilities for full database visibility and controlled write access (e.g., updating goals, biomarkers, user profiles) with comprehensive audit logging. AI chat now includes immediate response enforcement - all user data is pre-loaded in context, preventing "I'll check and come back" deferral responses.
- **Data Tracking & Management:** Features biomarker tracking with trend display, reference ranges, unit conversion, and specific support for Australian blood work, HRV, and lean body mass. Includes smart deduplication for sleep data and comprehensive workout tracking from Apple Health.
- **Personalized Recommendations & Automation:** AI generates personalized meal plans with feedback system, macro recommendations, and exercise recommendations with smart auto-scheduling. An automated goal auto-update system syncs progress with new biomarker data.
- **Readiness Score System:** A multi-factor weighted scoring system calculates daily readiness, incorporating sleep quality, HRV, RHR, and workout load. It includes safety-first logic, user-configurable factors, and AI-powered recovery insights, with advanced personal baseline tuning for accurate scoring.
- **Scheduling & Reminders:** AI insights scheduling system for recommendations, and a supplement tracking and daily reminders system that leverages AI for recommendations and tracks streaks.
- **User Profiling & Onboarding:** A fitness profile personalization system allows AI to generate calibrated workouts based on user data. A contextual AI onboarding system collects basic user info and provides page-specific setup prompts.
- **Security & Authentication:** Production-ready security using Replit Auth (OpenID Connect) with role-based access control, IDOR protection, privilege escalation prevention, and Zod schema validation. File upload security with validation for size and types.
- **Native iOS App:** Complete native iOS app implementation using Capacitor 7 for 100% code reuse, including direct HealthKit integration for native health data access and syncing.

**Feature Specifications:**
- Health record upload and AI analysis.
- Weekly AI-generated personalized meal planning system with a 4-day rolling window.
- Contextual chat opening questions tailored to the current page.
- Clean dashboard defaults for new users with core widgets and easy customization.
- Data & Insights Dashboard with AI trend predictions and goal setting.
- Biological Age calculation using the PhenoAge algorithm (premium feature).

## External Dependencies

- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** OpenAI GPT-4o (via Replit AI Integrations)
- **Authentication:** Replit Auth (OpenID Connect)
- **Health Data Integration:** Apple Health via Health Auto Export iOS app webhook (web) and native HealthKit integration via Capacitor (iOS app).
- **Mobile Platform:** Capacitor 7 for native iOS app.