# iOS Background Fetch Setup Guide

## Overview
Background Fetch allows HealthPilot to automatically sync HealthKit data, generate AI insights, create daily workouts, and update notifications—even when the app isn't active. iOS intelligently schedules these background refreshes based on user behavior patterns.

## Why Background Fetch vs Server-Side Cron?

**Server-side schedulers** (the old approach):
- ❌ Must check all users hourly to find those whose local time matches the target
- ❌ Unreliable for mobile-first apps
- ❌ Doesn't respect user's actual usage patterns
- ❌ Can't fetch HealthKit data (requires app context)

**iOS Background Fetch** (new approach):
- ✅ iOS learns when YOU typically use the app and fetches accordingly
- ✅ Optimizes for battery life and network conditions
- ✅ Can fetch HealthKit data natively
- ✅ More reliable for mobile health apps
- ✅ Triggers based on user behavior, not arbitrary times

## What Gets Synced During Background Fetch

When iOS triggers a background fetch, the app automatically:

1. **Syncs HealthKit Data** - Steps, sleep, heart rate, workouts, etc.
2. **Generates AI Insights** - Daily health insights based on latest data
3. **Creates Daily Workout** - AI-powered training session for today
4. **Updates Notifications** - Fetches latest notifications from server

## Step-by-Step Xcode Setup

### 1. Open Your Project in Xcode
- Navigate to `ios/App/`
- Double-click `App.xcworkspace` (NOT `App.xcodeproj`)

### 2. Enable Background Fetch Capability
1. Select your **App** target in the left sidebar
2. Click the **"Signing & Capabilities"** tab
3. Click **"+ Capability"** button
4. Search for **"Background Modes"**
5. Double-click to add it
6. ✅ Check the box for **"Background fetch"**

You should now see:
```
Background Modes
☑ Background fetch
```

### 3. Verify the Code
The background fetch code is already implemented in `AppDelegate.swift`. It includes:

- `application(_:performFetchWithCompletionHandler:)` - iOS calls this periodically
- `performBackgroundSync()` - Coordinates all background tasks
- `syncHealthKitData()` - Syncs HealthKit data
- `generateInsights()` - Calls backend API to generate AI insights
- `generateDailyWorkout()` - Calls backend API to create daily workout
- `updateNotifications()` - Fetches latest notifications

### 4. Build and Run
1. Connect your iPhone via USB
2. Select your device from the device menu
3. Click **▶ Run** (or press `Cmd + R`)
4. Wait for the app to install and launch

## How Background Fetch Works

### Scheduling
- iOS learns your usage patterns over ~1 week
- It predicts when you're likely to use the app next
- Fetches fresh data ~30-60 minutes BEFORE you typically open the app
- Example: If you usually check the app at 7am, iOS might fetch at 6:30am

### Frequency
- iOS controls the schedule (you can't force specific times)
- Typical frequency: Every 4-12 hours
- More frequent if battery is good and on Wi-Fi
- Less frequent if battery is low or cellular only

### Battery Impact
- Minimal (<1% daily battery usage)
- iOS optimizes based on battery level
- Won't run if battery is critically low

## Testing Background Fetch

### Method 1: Xcode Simulator (Immediate Testing)
1. Run the app in Xcode
2. While app is running, go to Xcode menu:
   - **Debug → Simulate Background Fetch**
3. Check the Xcode console logs for:
   ```
   🔄 Background fetch triggered
   📊 Performing background sync...
   ✅ HealthKit data synced
   ✅ AI insights generated
   ✅ Daily workout generated
   ✅ Notifications updated
   ```

### Method 2: Real Device (Production Testing)
1. Install the app on your iPhone
2. Use the app normally for a few days
3. iOS will learn your patterns and schedule fetches automatically
4. Check the app in the morning - data should be fresh!

## Troubleshooting

### "Background fetch not triggering on device"
- **Wait**: iOS needs ~1 week to learn your usage patterns
- **Use the app regularly**: Open it at similar times daily
- **Check Battery**: Low Power Mode disables background fetch
- **Wi-Fi helps**: Background fetch is more frequent on Wi-Fi

### "401 Unauthorized errors in logs"
- The app needs proper authentication
- Make sure you're logged in
- Check that mobile auth tokens are working

### "HealthKit sync fails"
- Ensure HealthKit permissions are granted
- Check Settings → Privacy → Health → HealthPilot

## Architecture Notes

### Authentication
The current implementation needs to retrieve the auth token from secure storage. Two options:

1. **Capacitor Preferences Plugin** (current approach)
   - Stores token in UserDefaults
   - Fast but less secure

2. **Capacitor SecureStorage Plugin** (recommended)
   - Stores token in iOS Keychain
   - More secure for production

### API Endpoints Called

Background fetch calls these backend endpoints:

- `POST /api/healthkit/ingest` - Syncs HealthKit data
- `POST /api/insights/generate` - Generates AI insights
- `POST /api/training/generate-daily-session` - Creates daily workout
- `GET /api/notifications` - Fetches notifications

### Completion Handler
iOS requires calling `completionHandler` within **30 seconds** or the app will be killed. The implementation handles this by:
- Using async/await for efficient concurrency
- Timing out individual API calls after 25 seconds
- Returning `.newData`, `.noData`, or `.failed` appropriately

## Monitoring Background Fetch

### Xcode Console Logs
When background fetch runs, you'll see:
```
🔄 Background fetch triggered
📊 Performing background sync...
✅ HealthKit data synced
✅ AI insights generated
✅ Daily workout generated
✅ Notifications updated
```

### iOS Settings
Check background activity:
- Settings → General → Background App Refresh
- Make sure HealthPilot is enabled

## Production Checklist

Before deploying to TestFlight/App Store:

- ✅ Background Modes capability enabled
- ✅ HealthKit permission descriptions in Info.plist
- ✅ Push Notifications capability enabled (for alerts)
- ✅ Proper authentication flow implemented
- ✅ Error handling for network failures
- ✅ Logging for debugging production issues

## Best Practices

1. **Keep it fast**: Background fetch has only 30 seconds
2. **Handle failures gracefully**: Network might be unavailable
3. **Don't spam the API**: Use conditional requests (check if data changed)
4. **Respect user settings**: Check if they disabled background refresh
5. **Monitor battery impact**: Test with Battery Usage in Settings

## Related Documentation

- [Push Notifications Setup](../push-notifications/)
- [HealthKit Integration](../healthkit/)
- [Live Activities](../live-activities/)

---

**Last Updated:** November 2025  
**iOS Version:** 16.0+  
**Capacitor Version:** 7.0+
