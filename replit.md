# Health Insights AI - AI-Powered Health Dashboard

## Overview

Health Insights AI is an AI-powered health insights platform designed to analyze health records, track biomarkers, and deliver personalized health recommendations. It provides AI-generated meal plans, training schedules, and alternative therapy suggestions. The platform aims to empower users with personalized intelligence, pattern discovery, and correlations from their health data to optimize their well-being.

## User Preferences

I prefer simple language and clear explanations. I want iterative development where I can provide feedback at each stage. Ask before making major changes to the project structure or core functionalities. Do not make changes to the `replit.nix` file.

## System Architecture

The application is a full-stack project utilizing React, TypeScript, Tailwind CSS, and shadcn/ui for the frontend, and Express.js with TypeScript for the backend. PostgreSQL, accessed via Drizzle ORM, serves as the primary database. AI capabilities are powered by Anthropic Claude 3 Haiku.

**UI/UX Decisions:**
- Dark mode support
- Responsive design
- Biomarker trend visualization with color-coded badges and compact trend line widgets.
- Purple sparkly AI Chat Widget - small animated icon in bottom-right corner that opens to a semi-transparent chat window with purple gradient header and responsive mobile design.

**Technical Implementations:**
- **AI Intelligence Layer:** Provides daily personalized insights, context-aware chat, enhanced multi-metric recommendations, and alternative therapy suggestions.
- **Biomarker Tracking:** Displays multiple data points over time, shows reference range status, and supports localization for imperial/metric units.
- **Authentication:** Production-ready security implementation using Replit Auth (OpenID Connect) with custom domain support and role-based access control.
- **Security Protections:** Includes IDOR protection, privilege escalation prevention, data isolation, webhook authentication, and Zod schema validation.
- **File Upload Security:** Validation for file size, types (PDF, DOC, DOCX, JPG, PNG, TXT), and mime types.
- **Sleep Data Implementation:** Uses `inBedStart` and `inBedEnd` for sleep session duration, includes awake time, and performs smart deduplication. Custom sleep score calculation is implemented as Apple's native score is not exportable.

**Feature Specifications:**
- Health record upload and AI analysis with status tracking and retry functionality.
- AI-generated personalized meal plans and training schedules.
- AI-powered alternative therapy recommendations (sauna, cold plunge, red light therapy, etc.) based on biomarker analysis.
- Admin control panel for user and subscription management.

## External Dependencies

- **Database:** PostgreSQL (via Drizzle ORM)
- **AI:** Anthropic Claude 3 Haiku
- **Authentication:** Replit Auth (OpenID Connect)
- **File Storage:** Google Drive (for manual analysis of files)
- **Health Data Integration:** Apple Health (via Health Auto Export iOS app webhook to `POST /api/health-auto-export/ingest`)