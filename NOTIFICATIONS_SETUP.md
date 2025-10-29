# HealthPilot Notifications System - Setup & Testing Guide

## Overview

The HealthPilot notification system provides a comprehensive layer for:
- **Push Notifications** via OneSignal (iOS/Android)
- **Local Notifications** for scheduled reminders
- **In-App Notification Center** with read/dismiss tracking
- **Deep Linking** (custom scheme `healthpilot://` and universal links `links.healthpilot.pro`)
- **Event-Driven Architecture** integrating with AI insights, biomarker alerts, and reminders

---

## Setup Status

### ✅ Already Implemented
- Database schema (3 tables: notifications, notification_channels, scheduled_reminders)
- Backend services (EventBus, NotificationOrchestrator, ReminderScheduler, OneSignal integration)
- Frontend services (OneSignal client, push/local notification handlers, deep link routing)
- UI components (Notification Center, Settings page with channel controls, reminder management)
- Custom URL scheme deep linking (`healthpilot://`) - **ready to use**
- API routes (notifications, channels, reminders)

### ⚠️ Requires Configuration Tomorrow
1. **OneSignal API Keys**: Add `ONESIGNAL_APP_ID` and `ONESIGNAL_API_KEY` to environment variables
2. **Capacitor config updates**:
   - Add PushNotifications plugin configuration
   - (Optional) Add server block for universal links
3. **iOS Xcode setup**:
   - Enable Push Notifications capability
   - Enable Background Modes → Remote notifications
   - (Optional) Add Associated Domains for universal links
4. **Build and test on physical iOS device**

### ℹ️ Optional Enhancements
- Universal links setup (requires AASA file hosting at `links.healthpilot.pro`)
- OneSignal user segments for targeted messaging
- Custom notification templates in OneSignal dashboard

---

## Architecture

### Event-Driven Design
The notification system uses an **EventBus** to decouple from existing features:
- AI insight generators emit `insight:generated` events
- Biomarker service emits `biomarker:alert` events
- Reminder scheduler emits `reminder:scheduled` events
- **NotificationOrchestrator** listens to events and creates notifications

This ensures the notification layer can be disabled via feature flags without breaking existing functionality.

### Feature Flags
All notification features can be toggled in `shared/config/flags.ts`:
- `NOTIFICATIONS_LAYER_ENABLED`: Master flag (default: true)
- `PUSH_NOTIFICATIONS_ENABLED`: OneSignal push (default: true)
- `LOCAL_NOTIFICATIONS_ENABLED`: Scheduled reminders (default: true)
- `NOTIFICATION_INBOX_ENABLED`: In-app inbox UI (default: true)

---

## OneSignal Setup (iOS)

### 1. Prerequisites
- OneSignal account: https://onesignal.com/
- Apple Developer account with push notification capability
- iOS provisioning profile with push notifications enabled
- APNs authentication key or certificate

### 2. OneSignal Dashboard Configuration

#### Create App
1. Log in to OneSignal dashboard
2. Click "New App/Website"
3. Select "Apple iOS (APNs)"
4. Upload your APNs authentication key or certificate
5. Note your **App ID** (looks like `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### Get API Key
1. In OneSignal dashboard, go to Settings → Keys & IDs
2. Copy your **REST API Key**
3. You now have both required credentials:
   - `ONESIGNAL_APP_ID`: Your App ID
   - `ONESIGNAL_API_KEY`: Your REST API Key

### 3. Add Environment Variables

Add to your Replit Secrets (or `.env` file for local development):

```bash
ONESIGNAL_APP_ID=your-app-id-here
ONESIGNAL_API_KEY=your-rest-api-key-here
```

**Frontend environment variables** (for web/iOS client):
```bash
VITE_ONESIGNAL_APP_ID=your-app-id-here
```

### 4. iOS Project Configuration

#### Current Capacitor Configuration

In `capacitor.config.ts`, the following is already configured:

```typescript
{
  appId: "com.nuvitae.healthpilot",
  appName: "HealthPilot",
  ios: {
    contentInset: "always",
    scheme: "healthpilot"  // Custom URL scheme for deep linking
  },
  plugins: {
    App: {
      deepLinkingEnabled: true,
      customURLScheme: "healthpilot"
    }
  }
}
```

**What you need to add:**

Add the PushNotifications plugin configuration to the `plugins` section:

```typescript
plugins: {
  PushNotifications: {
    presentationOptions: ["badge", "sound", "alert"]
  },
  App: {
    deepLinkingEnabled: true,
    customURLScheme: "healthpilot"
  },
  // ... existing SplashScreen, StatusBar, Keyboard config
}
```

This tells Capacitor to show notifications even when the app is in the foreground.

### 5. Build iOS App

```bash
# Install Capacitor dependencies (if not already done)
npm install

# Sync Capacitor with latest web build
npx cap sync ios

# Open Xcode project
npx cap open ios
```

In Xcode:
1. Enable "Push Notifications" capability
2. Enable "Background Modes" → "Remote notifications"
3. Configure signing with your provisioning profile
4. Build and run on device (push notifications don't work in simulator)

---

## Deep Linking Setup (iOS)

### Universal Links (links.healthpilot.pro)

**IMPORTANT: Universal links require additional configuration in `capacitor.config.ts`.**

Add the `server` block to enable universal links (currently not configured):

```typescript
{
  appId: "com.nuvitae.healthpilot",
  appName: "HealthPilot",
  webDir: "dist/public",
  server: {
    hostname: "links.healthpilot.pro",
    iosScheme: "https",       // Use https for universal links
    androidScheme: "https"
  },
  ios: {
    contentInset: "always",
    scheme: "healthpilot"      // Custom scheme still works
  }
  // ... rest of config
}
```

**Note:** The custom scheme `healthpilot://` works without this configuration. Universal links are optional but recommended for a better user experience.

#### Configure Apple App Site Association (AASA)

Host this file at `https://links.healthpilot.pro/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAMID.com.nuvitae.healthpilot",
        "paths": ["*"]
      }
    ]
  }
}
```

Replace `TEAMID` with your Apple Team ID (found in Apple Developer account).

**In Xcode:**
1. Add "Associated Domains" capability
2. Add domain: `applinks:links.healthpilot.pro`

### Custom URL Scheme (healthpilot://)

**Already configured** - no additional setup needed. The app handles:
- `healthpilot://notifications`
- `healthpilot://settings`
- `healthpilot://notifications/:id`
- `healthpilot://training`
- `healthpilot://biomarkers`

---

## Database Schema

The notification system uses three tables:

### 1. `notifications`
Stores all notifications (push, local, in-app):
```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  channel VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body TEXT NOT NULL,
  payload JSONB,
  deep_link VARCHAR,
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  read_at TIMESTAMP,
  provider_message_id VARCHAR,
  status VARCHAR DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_notifications_user_id` - Fast user notification queries
- `idx_notifications_status` - Scheduler queries
- `idx_notifications_scheduled_at` - Scheduled notification lookups
- `idx_notifications_user_status` - Composite for filtered user queries
- `idx_notifications_sent_at` - Performance optimization for sent notifications

### 2. `notification_channels`
User preferences for notification channels:
```sql
CREATE TABLE notification_channels (
  user_id VARCHAR NOT NULL,
  channel VARCHAR NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  quiet_hours VARCHAR DEFAULT '22:00-07:00',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, channel)
);
```

**Channels:**
- `health_alert` - Critical health alerts
- `insight` - AI-generated insights
- `training_ready` - Workout reminders
- `recovery_alert` - Recovery status updates
- `supplement_reminder` - Supplement schedule
- `workout_reminder` - Workout schedule
- `marketing` - Marketing messages

**Default behavior:** All channels enabled (opt-out model)

### 3. `scheduled_reminders`
User-created recurring reminders:
```sql
CREATE TABLE scheduled_reminders (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  type VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  body TEXT,
  schedule VARCHAR NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMP,
  next_scheduled_at TIMESTAMP,
  days_of_week INTEGER[],
  times_of_day VARCHAR[],
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
- `idx_scheduled_reminders_user_id`
- `idx_scheduled_reminders_enabled_next`
- `idx_scheduled_reminders_type`

---

## API Endpoints

### Notifications
- `GET /api/notifications` - Get user notifications (returns `{ notifications: [], total: N }`)
- `POST /api/notifications/:id/read` - Mark notification as read
- `POST /api/notifications/read-all` - Mark all notifications as read
- `DELETE /api/notifications/:id` - Delete notification

**Note:** Notifications are created internally by the NotificationOrchestrator via the EventBus system, not via direct API calls. The system listens to events like `insight:generated`, `biomarker:alert`, and `reminder:scheduled`.

### Channel Preferences
- `GET /api/notifications/channels` - Get user's channel preferences (returns `{ channels: [] }`)
- `POST /api/notifications/channels` - Update channel (body: `{ channel, enabled?, quietHours? }`)

### Scheduled Reminders
- `GET /api/reminders` - Get user reminders
- `POST /api/reminders` - Create reminder
- `PATCH /api/reminders/:id` - Update reminder
- `DELETE /api/reminders/:id` - Delete reminder

---

## Manual Testing Guide

### 1. Web Testing (Development)

#### Test Notification Inbox
1. Navigate to `/notifications`
2. Verify empty state shows "No notifications yet"
3. Create test notification via database:
   ```sql
   INSERT INTO notifications (id, user_id, channel, title, body, status, created_at)
   VALUES (
     gen_random_uuid()::varchar,
     'your-user-id',  -- Replace with your actual user ID from session
     'insight',
     'Test Notification',
     'This is a test notification',
     'sent',
     NOW()
   );
   ```
   **Alternative:** Trigger an AI insight or biomarker alert to create notifications via the EventBus
4. Refresh page - notification should appear with "New" badge
5. Click "Mark all as read" - badge disappears
6. Click dismiss (trash icon) - notification removed

#### Test Settings Page
1. Navigate to `/settings`
2. Scroll to "Notification Preferences"
3. Toggle channel switches - verify state updates
4. Update quiet hours (e.g., "22:00" to "06:00")
5. Click "Save Changes" - verify success toast
6. Refresh page - settings persist

#### Test Scheduled Reminders
1. Navigate to `/settings`
2. Scroll to "Scheduled Reminders"
3. Click "Add Reminder"
4. Fill form:
   - Title: "Take Vitamins"
   - Time: "09:00"
   - Days: Mon, Wed, Fri
5. Save - reminder appears in list
6. Toggle reminder off/on - verify enabled state
7. Delete reminder - confirm removal

### 2. iOS Native Testing

#### Prerequisites
- Physical iOS device (push notifications don't work in simulator)
- OneSignal API keys configured
- App installed via Xcode or TestFlight

#### Test Push Notifications
1. Open app and grant notification permissions when prompted
2. Trigger notification via one of these methods:
   
   **Method A: Via AI System (Recommended)**
   - Trigger a daily AI insight (runs hourly via cron)
   - Or manually run insight generation in backend code
   - System emits `insight:generated` event → NotificationOrchestrator creates push notification
   
   **Method B: Via Database Insert**
   ```sql
   INSERT INTO notifications (id, user_id, channel, title, body, deep_link, status, created_at)
   VALUES (
     gen_random_uuid()::varchar,
     'your-user-id',  -- Your actual user ID
     'health_alert',
     'Health Alert',
     'Your glucose levels are elevated',
     'healthpilot://biomarkers',
     'pending',  -- NotificationOrchestrator will process and send
     NOW()
   );
   ```
   The NotificationOrchestrator checks for `pending` notifications every minute and sends them via OneSignal.

3. Verify push notification appears on lock screen
4. Tap notification - app opens to biomarkers page
5. Check notification inbox - notification appears there too

#### Test Local Notifications
1. Create supplement reminder in Settings (time = 2 minutes from now)
2. Close app or background it
3. Wait for scheduled time
4. Verify local notification appears
5. Tap notification - app opens to settings/reminders

#### Test Deep Links

**Custom Scheme:**
1. Send yourself an SMS: `healthpilot://notifications`
2. Tap link in Messages
3. App opens to notifications page

**Universal Links:**
1. Send yourself: `https://links.healthpilot.pro/settings`
2. Tap link
3. App opens to settings page (not Safari)

#### Test Quiet Hours
1. Set quiet hours to current time ± 1 hour
2. Trigger notification during quiet hours
3. Verify notification is queued (doesn't send immediately)
4. Wait until after quiet hours
5. Notification sends automatically

---

## Troubleshooting

### Push Notifications Not Appearing

**Check OneSignal Integration:**
```bash
# Verify environment variables
echo $ONESIGNAL_APP_ID
echo $ONESIGNAL_API_KEY

# Check backend logs for OneSignal errors
# Look for "OneSignal API error" or "Failed to send notification"
```

**Common Issues:**
- ✅ API keys not set → Set in Replit Secrets
- ✅ APNs certificate expired → Renew in Apple Developer portal
- ✅ App not registered with OneSignal → Check OneSignal dashboard
- ✅ Device token not subscribed → Check OneSignal All Users list

### Deep Links Not Working

**iOS Universal Links:**
- Verify AASA file hosted at `https://links.healthpilot.pro/.well-known/apple-app-site-association`
- Check file is served with `Content-Type: application/json`
- Verify "Associated Domains" capability in Xcode
- Links only work from external apps (Safari, Messages), not from Safari address bar

**Custom Scheme:**
- Verify `iosScheme: "healthpilot"` in capacitor.config.ts
- Run `npx cap sync ios` after changes
- Custom schemes always work (no domain verification needed)

### Local Notifications Not Firing

**Check Permissions:**
```typescript
// In browser console or native debugging
import { LocalNotifications } from '@capacitor/local-notifications';
const result = await LocalNotifications.checkPermissions();
console.log(result); // Should be "granted"
```

**Common Issues:**
- ✅ Permissions denied → Re-request in Settings
- ✅ Reminder disabled → Check enabled toggle
- ✅ Scheduler not running → Check backend logs for "ReminderScheduler"
- ✅ Wrong timezone → Verify user profile timezone (defaults to UTC)

### Notifications Not Respecting Quiet Hours

**Verify Quiet Hours Configuration:**
1. Check user settings: `GET /api/notifications/channels`
2. Verify format: `"22:00-07:00"` (HH:MM-HH:MM)
3. Check user timezone in profile (quiet hours use user's timezone)

**Debug:**
```typescript
// In NotificationOrchestrator.shouldSendNow()
// Logs timezone-aware quiet hours check
console.log('Current time:', new Date());
console.log('User timezone:', userTimezone);
console.log('Quiet hours:', quietHours);
```

---

## Testing Checklist

### Backend
- [ ] OneSignal service initializes without errors
- [ ] NotificationOrchestrator registers event handlers
- [ ] ReminderScheduler starts and logs check times
- [ ] API routes respond correctly (use Postman/curl)
- [ ] Database tables created with correct schema
- [ ] Channel preferences default to enabled

### Frontend (Web)
- [ ] Notification inbox loads and displays notifications
- [ ] "Mark all as read" works
- [ ] Dismiss removes notification
- [ ] Settings page loads channel preferences
- [ ] Channel toggles update state
- [ ] Quiet hours save and persist
- [ ] Reminder creation/edit/delete works
- [ ] Deep link handler registered (no console errors)

### Native (iOS)
- [ ] App requests notification permissions on first launch
- [ ] Push notifications appear on lock screen
- [ ] Tapping push notification opens correct deep link
- [ ] Local notifications fire at scheduled time
- [ ] Custom scheme deep links work (healthpilot://)
- [ ] Universal links work (links.healthpilot.pro)
- [ ] Quiet hours prevent notifications during configured times
- [ ] Badge counter updates on app icon

---

## Development Notes

### Multi-Time Reminders
Reminders with multiple times (e.g., "09:00,14:00,20:00") fire multiple times per day:
- `lastSentAt` tracked down to HH:MM to prevent duplicates
- Example: Reminder at 09:00 fires, sets `lastSentAt` to "2025-01-15 09:00"
- Same reminder at 14:00 checks `lastSentAt` (09:00) ≠ current slot (14:00), fires again

### Event-Driven Integration
Existing systems emit events without modification:
- `server/services/dailyInsights.ts` → emits `insight:generated`
- `server/services/biomarkerService.ts` → emits `biomarker:alert`
- `server/services/reminderScheduler.ts` → emits `reminder:scheduled`

NotificationOrchestrator listens and creates notifications **after** existing logic completes.

### Opt-Out Model
Users receive all notifications by default:
- New users have no `notification_channels` records
- `NotificationOrchestrator.shouldSendNow()` treats missing records as "enabled"
- Users must explicitly opt out in Settings

### Deep Link Routes
Centralized in `client/src/lib/notifications/deeplink.ts`:
```typescript
const DEEP_LINK_ROUTES: Record<string, string> = {
  '/notifications': '/notifications',
  '/settings': '/settings',
  '/training': '/training',
  '/biomarkers': '/biomarkers'
  // Add new routes here
};
```

---

## Next Steps (Post-API Key Setup)

1. **Add OneSignal credentials** to Replit Secrets tomorrow
2. **Test push notifications** on physical iOS device
3. **Verify deep linking** from push notification tap
4. **Monitor OneSignal dashboard** for delivery stats
5. **Set up user segments** in OneSignal (optional)
6. **Configure notification templates** for consistent branding

---

## Support & Resources

- **OneSignal Docs**: https://documentation.onesignal.com/
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Deep Linking Guide**: https://capacitorjs.com/docs/guides/deep-links
- **Push Notification Guide**: https://capacitorjs.com/docs/guides/push-notifications-firebase

---

**System Status**: ✅ Fully implemented and ready for API key configuration
**Last Updated**: October 29, 2025
