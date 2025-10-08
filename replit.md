# Health Insights AI - AI-Powered Health Dashboard

An AI-powered health insights platform that analyzes health records, tracks biomarkers, and provides personalized meal plans, training schedules, and health recommendations.

## Project Overview

This is a full-stack application built with:
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude 3 Haiku
- **Integrations**: Google Drive, Apple Health (via Health Auto Export)

## Key Features

- Health record upload and AI analysis
- **Biomarker tracking** with trend visualization organized into 10 clinical subsections
  - Displays multiple data points over time (not just latest value)
  - Shows reference range status (in range, above, below) with color-coded badges
  - Compact trend line widgets with dynamic time periods
- **Localization support** - Switch between imperial (lbs, mg/dL) and metric (kg, mmol/L) units
- **Apple Health integration** via Health Auto Export app (iOS)
- AI-generated personalized meal plans
- AI-generated training schedules
- Smart health recommendations based on biomarker analysis
- **Google Drive integration** - Manual analysis (click sparkle icon to analyze files with AI)
- **Analysis status tracking** - Real-time status for health record processing (pending/processing/completed/failed)
- **Retry failed analyses** - One-click retry for failed AI analysis with exponential backoff
- Dark mode support
- Responsive design

## Important Notes

### Authentication & Security
**Current Status**: ✅ **Production-Ready Security Implementation with Custom Domain**

The application uses **Replit Auth** (OpenID Connect) with comprehensive security features and is fully deployed at **healthpilot.pro**:

**Authentication Features**:
- **Login page for unauthenticated users** - New visitors see a branded login page with "Sign in with Replit" button
- **Custom domain support** - OAuth properly configured for healthpilot.pro via REPLIT_DOMAINS environment variable
- Session-based authentication with automatic token refresh
- Secure user registration and login via Replit Auth (SSO - auto-authenticates if logged into Replit)
- Role-based access control (user/admin roles)
- Admin control panel with user management
- Protected API routes with `isAuthenticated` and `isAdmin` middleware

**Custom Domain Setup**:
- Domain: healthpilot.pro
- REPLIT_DOMAINS must include both dev domain and custom domain (comma-separated)
- OAuth callback: https://healthpilot.pro/api/callback
- Login endpoint: https://healthpilot.pro/api/login

**Security Protections**:
- ✅ **IDOR Protection**: All storage methods enforce user ownership checks (filter by both id AND userId)
- ✅ **Privilege Escalation Prevention**: Admin updates use dedicated `updateUserAdminFields` method with storage-layer whitelist
- ✅ **Data Isolation**: Users can ONLY access their own health records, biomarkers, and other resources
- ✅ **Webhook Authentication**: External services use X-Webhook-Secret header authentication
- ✅ **Input Validation**: Zod schema validation on all admin endpoints

**Admin Features**:
- View all users with search and pagination
- Update user roles (user/admin)
- Manage subscription tiers (free/premium/enterprise)
- Manage subscription status (active/inactive/cancelled/past_due)
- Platform statistics dashboard

### File Upload Security
Current file upload validation includes:
- Maximum file size: 10MB
- Allowed types: PDF, DOC, DOCX, JPG, PNG, TXT
- Mime type validation

**Production Improvements Needed**:
- Add virus/malware scanning for uploaded files
- Implement rate limiting on upload endpoints
- Add file content validation beyond mime types
- Consider using cloud storage (S3, etc.) instead of memory storage

### Google Drive Integration
The Google Drive integration is configured and functional for listing and analyzing files. The connector handles OAuth automatically through Replit's integration system.

### Apple Health Integration
**Implementation**: Uses Health Auto Export iOS app (DIY budget solution)

**How it works**:
1. User installs "Health Auto Export - JSON+CSV" from App Store (~$5-10 for Premium with REST API)
2. User configures REST API automation in the app to send data to webhook endpoint
3. App automatically exports Apple Health data (heart rate, blood glucose, weight, steps, sleep, etc.)
4. Data is received via webhook and stored in biomarkers table

**Webhook Endpoint**: `POST /api/health-auto-export/ingest`

**Webhook Authentication**:
- Uses custom webhook authentication (not session-based)
- Requires two headers:
  - `X-Webhook-Secret`: Shared secret (configured via `WEBHOOK_SECRET` env var)
  - `X-User-Id`: User ID to associate the data with
- This allows external iOS clients to send data without browser sessions

**Supported Metrics**:
- Heart Rate (Resting & Active)
- Blood Glucose
- Weight
- Steps & Active Energy (Calories)
- Blood Pressure (Systolic/Diastolic)
- Oxygen Saturation
- Body Temperature
- Sleep Analysis (uses full "in bed" duration including awake time for accurate tracking)

**Sleep Data Implementation**:
- Uses `inBedStart` and `inBedEnd` timestamps for complete sleep session duration
- Includes awake time within the session for accurate total sleep tracking
- Smart deduplication prevents duplicate entries (matches sessions within ±6 hours)
- Automatic cleanup of duplicate entries when new data arrives

**Setup Instructions**: Available at `/apple-health` route in the app

**Technical Note**: Direct HealthKit API integration is not possible in web apps due to Apple's privacy restrictions. Health Auto Export bridges this gap by allowing users to export their own data to a REST API endpoint.

## Development

```bash
npm run dev  # Starts both frontend and backend
npm run db:push  # Syncs database schema
```

## API Endpoints

### Authentication Endpoints
- `GET /api/login` - Initiate Replit Auth login flow
- `GET /api/callback` - OAuth callback handler
- `GET /api/logout` - Logout and clear session
- `GET /api/auth/user` - Get current authenticated user

### Admin Endpoints (requires admin role)
- `GET /api/admin/users` - List all users with search/pagination
- `GET /api/admin/users/:id` - Get user details
- `PATCH /api/admin/users/:id` - Update user (role, subscription tier/status only)
- `GET /api/admin/stats` - Platform statistics

### User Endpoints (requires authentication)
- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/health-records` - List health records
- `POST /api/health-records/upload` - Upload health document
- `DELETE /api/health-records/:id` - Delete health record
- `POST /api/health-records/analyze/:fileId` - Analyze Google Drive file
- `POST /api/health-records/:id/retry` - Retry failed AI analysis
- `GET /api/google-drive/files` - List Google Drive files
- `GET /api/biomarkers` - List biomarkers
- `POST /api/biomarkers` - Create biomarker entry
- `GET /api/biomarkers/chart/:type` - Get chart data for biomarker type
- `GET /api/meal-plans` - List meal plans
- `POST /api/meal-plans/generate` - Generate AI meal plan
- `GET /api/training-schedules` - List training schedules  
- `POST /api/training-schedules/generate` - Generate AI training schedule
- `PATCH /api/training-schedules/:id/complete` - Toggle workout completion
- `GET /api/recommendations` - List active recommendations
- `POST /api/recommendations/generate` - Generate AI recommendations
- `PATCH /api/recommendations/:id/dismiss` - Dismiss recommendation

### Webhook Endpoints (requires webhook authentication)
- `POST /api/health-auto-export/ingest` - Webhook for Apple Health data (requires X-Webhook-Secret and X-User-Id headers)

## Database Schema

Tables:
- `users` - User accounts with role-based access control
  - Roles: user, admin
  - Subscription tiers: free, premium, enterprise
  - Subscription status: active, inactive, cancelled, past_due
- `sessions` - Session storage for Replit Auth
- `health_records` - Uploaded health documents and AI analysis (status: pending/processing/completed/failed)
- `biomarkers` - Health metrics (glucose, weight, heart rate, etc.)
- `sleep_sessions` - Sleep tracking data from Apple Health
- `meal_plans` - AI-generated meal suggestions
- `training_schedules` - AI-generated workout plans
- `recommendations` - AI health recommendations

## Environment Variables Required

- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for session encryption
- `REPL_ID` - Replit app ID (auto-provided)
- `REPLIT_DOMAINS` - Comma-separated list of domains (auto-provided)
- `ISSUER_URL` - OIDC issuer URL (default: https://replit.com/oidc)
- `WEBHOOK_SECRET` - Shared secret for webhook authentication (optional, defaults to "dev-webhook-secret-12345")
- Google Drive integration credentials (managed by Replit connector)

## Security Best Practices

For production deployment, consider:
1. **Rotate Secrets**: Change `WEBHOOK_SECRET` and `SESSION_SECRET` regularly
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Audit Logging**: Log admin actions for compliance
4. **File Scanning**: Add virus/malware scanning for uploaded files
5. **HTTPS Only**: Ensure all connections use HTTPS
6. **Regular Updates**: Keep dependencies up to date
7. **Monitoring**: Set up alerts for suspicious activity

## Future Enhancements

1. **Enhanced Apple Health Sync** - Consider premium APIs (Terra, Vital, ROOK) for automatic multi-platform sync
2. **Stripe Integration** - Billing and subscription management
3. **Advanced Analytics** - Predictive health insights and early warning systems
4. **Export/Sharing** - Generate PDF reports for healthcare providers
5. **Native Mobile App** - iOS/Android apps with direct HealthKit/Google Fit access
6. **Additional Wearables** - Fitbit, Garmin, Whoop, Oura Ring integration
7. **Email Notifications** - Health alerts and recommendations via email
