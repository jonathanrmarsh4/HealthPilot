# Health Insights AI - AI-Powered Health Dashboard

An AI-powered health insights platform that analyzes health records, tracks biomarkers, and provides personalized meal plans, training schedules, and health recommendations.

## Project Overview

This is a full-stack application built with:
- **Frontend**: React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL (via Drizzle ORM)
- **AI**: Anthropic Claude API
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
- Dark mode support
- Responsive design

## Important Notes

### Authentication
**Current MVP Status**: The application uses a test user ID (`test-user-1`) for all operations to enable rapid prototyping and demonstration of core features.

**Before Production Deployment**:
1. Remove the plaintext password field from the `users` table schema
2. Implement proper authentication system with:
   - Password hashing (bcrypt or argon2)
   - Session management or JWT tokens
   - Protected API routes with user authentication middleware
   - User registration and login flows
3. Update all API routes to use authenticated user ID instead of `TEST_USER_ID`
4. Add user-specific data isolation and access controls

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

**Supported Metrics**:
- Heart Rate (Resting & Active)
- Blood Glucose
- Weight
- Steps & Active Energy (Calories)
- Blood Pressure (Systolic/Diastolic)
- Oxygen Saturation
- Body Temperature
- Sleep Analysis

**Setup Instructions**: Available at `/apple-health` route in the app

**Technical Note**: Direct HealthKit API integration is not possible in web apps due to Apple's privacy restrictions. Health Auto Export bridges this gap by allowing users to export their own data to a REST API endpoint.

## Development

```bash
npm run dev  # Starts both frontend and backend
npm run db:push  # Syncs database schema
```

## API Endpoints

- `GET /api/dashboard/stats` - Dashboard statistics
- `GET /api/health-records` - List health records
- `POST /api/health-records/upload` - Upload health document
- `DELETE /api/health-records/:id` - Delete health record
- `POST /api/health-records/analyze/:fileId` - Analyze Google Drive file
- `GET /api/google-drive/files` - List Google Drive files
- `GET /api/biomarkers` - List biomarkers
- `POST /api/biomarkers` - Create biomarker entry
- `GET /api/biomarkers/chart/:type` - Get chart data for biomarker type
- `POST /api/health-auto-export/ingest` - Webhook for Apple Health data from Health Auto Export app
- `GET /api/meal-plans` - List meal plans
- `POST /api/meal-plans/generate` - Generate AI meal plan
- `GET /api/training-schedules` - List training schedules  
- `POST /api/training-schedules/generate` - Generate AI training schedule
- `PATCH /api/training-schedules/:id/complete` - Toggle workout completion
- `GET /api/recommendations` - List active recommendations
- `POST /api/recommendations/generate` - Generate AI recommendations
- `PATCH /api/recommendations/:id/dismiss` - Dismiss recommendation

## Database Schema

Tables:
- `users` - User accounts (MVP: test user only)
- `health_records` - Uploaded health documents and AI analysis
- `biomarkers` - Health metrics (glucose, weight, heart rate, etc.)
- `meal_plans` - AI-generated meal suggestions
- `training_schedules` - AI-generated workout plans
- `recommendations` - AI health recommendations

## Environment Variables Required

- `ANTHROPIC_API_KEY` - Anthropic Claude API key
- `DATABASE_URL` - PostgreSQL connection string
- Google Drive integration credentials (managed by Replit connector)

## Future Enhancements

1. **Enhanced Apple Health Sync** - Consider premium APIs (Terra, Vital, ROOK) for automatic multi-platform sync
2. **User Authentication** - Secure user accounts with proper password hashing
3. **Multi-user Support** - User-specific data isolation
4. **Advanced Analytics** - Predictive health insights and early warning systems
5. **Export/Sharing** - Generate PDF reports for healthcare providers
6. **Native Mobile App** - iOS/Android apps with direct HealthKit/Google Fit access
7. **Additional Wearables** - Fitbit, Garmin, Whoop, Oura Ring integration
