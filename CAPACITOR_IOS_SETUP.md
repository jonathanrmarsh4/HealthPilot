# Capacitor iOS Setup Guide

## 📱 Building Your iOS App with HealthKit Integration

This guide will walk you through opening the iOS project in Xcode, configuring HealthKit, building, and testing your Health Insights AI app on your iPhone/iPad.

---

## Prerequisites

- ✅ **Mac computer** with macOS (Ventura or later recommended)
- ✅ **Xcode 16+** installed from the App Store
- ✅ **iOS device** (iPhone or iPad running iOS 14+)
- ✅ **Apple Developer Account** ($99/year for App Store submission)
- ✅ **USB cable** to connect your device to Mac

---

## Step 1: Download Project to Your Mac

1. Download the entire Replit project to your Mac
2. Extract the files if needed
3. Open Terminal and navigate to the project folder:
   ```bash
   cd path/to/health-insights-ai
   ```

---

## Step 2: Install Dependencies (if not already done)

```bash
# Install Node.js dependencies
npm install

# Build the app
npm run build

# Sync to iOS (this copies the web assets to the iOS project)
npx cap sync ios
```

---

## Step 3: Open Project in Xcode

```bash
# Open the iOS project in Xcode
npx cap open ios
```

Or manually:
1. Navigate to `ios/App/` folder
2. Double-click `App.xcworkspace` (NOT App.xcodeproj)

---

## Step 4: Configure HealthKit Capability

### Enable HealthKit in Xcode:

1. **Select the App target**
   - In the left sidebar, click on `App` (the blue project icon)
   - Make sure `App` is selected under TARGETS

2. **Add HealthKit Capability**
   - Click the `Signing & Capabilities` tab
   - Click `+ Capability` button
   - Search for and add `HealthKit`

3. **Verify Info.plist** (should already be configured)
   - Click on `App` folder in left sidebar
   - Click on `Info.plist`
   - Verify these keys exist:
     - `NSHealthShareUsageDescription`
     - `NSHealthUpdateUsageDescription`

---

## Step 5: Configure Signing & Team

1. **Select your Team**
   - In `Signing & Capabilities` tab
   - Under `Signing`, select your Apple Developer Team
   - Xcode will automatically create a provisioning profile

2. **Update Bundle Identifier** (if needed)
   - The current bundle ID is: `com.healthinsights.ai`
   - You can change it to something unique for your Apple Developer account
   - Format: `com.yourcompany.healthinsightsai`

---

## Step 6: Connect Your iPhone/iPad

1. **Connect device via USB**
   - Plug your iPhone/iPad into your Mac

2. **Trust computer on device**
   - On your iOS device, tap "Trust This Computer"

3. **Enable Developer Mode** (iOS 16+)
   - On your device: Settings → Privacy & Security → Developer Mode
   - Toggle Developer Mode ON and restart device

4. **Select your device in Xcode**
   - At the top of Xcode, click the device dropdown
   - Select your connected iPhone/iPad

---

## Step 7: Build and Run

1. **Click the Play button** (▶️) in Xcode toolbar
   - Or press `Cmd + R`

2. **Wait for build to complete**
   - First build may take a few minutes
   - Xcode will install the app on your device

3. **Trust the developer on your device**
   - On your iOS device: Settings → General → VPN & Device Management
   - Tap your Apple Developer account
   - Tap "Trust"

---

## Step 8: Test HealthKit Integration

1. **Open the app** on your device

2. **Navigate to Biomarkers**
   - Use the sidebar menu

3. **Find the "Apple Health Sync" card**
   - It should appear below the manual data input form

4. **Tap "Sync Health Data"**
   - First time: iOS will ask for HealthKit permissions
   - Grant permissions for all requested data types
   - The app will sync last 30 days of data

5. **Verify data appears**
   - Check biomarker widgets for new data points
   - Data source should show "ios-healthkit"

---

## Troubleshooting

### ❌ Build Failed: "Signing for 'App' requires a development team"
**Solution:** Select your Apple Developer Team in Signing & Capabilities

### ❌ "Untrusted Developer" error on device
**Solution:** Settings → General → VPN & Device Management → Trust your developer account

### ❌ HealthKit permissions not showing
**Solution:** 
1. Check Info.plist has usage descriptions
2. Verify HealthKit capability is enabled
3. Rebuild the app

### ❌ No data syncing from HealthKit
**Solution:**
1. Ensure you granted permissions in the iOS dialog
2. Check you have health data in Apple Health app
3. Try syncing again
4. Check Xcode console logs for errors

### ❌ App crashes on launch
**Solution:**
1. Check Xcode console for crash logs
2. Verify all dependencies are installed
3. Clean build folder: Product → Clean Build Folder
4. Rebuild: Cmd + B

---

## App Store Submission (When Ready)

1. **Create App Store listing**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Create new app with your bundle identifier

2. **Archive the app**
   - In Xcode: Product → Archive
   - Wait for archive to complete

3. **Upload to App Store**
   - In Organizer window, click "Distribute App"
   - Choose "App Store Connect"
   - Follow the upload wizard

4. **Submit for Review**
   - In App Store Connect, configure app details
   - Add screenshots, description, etc.
   - Submit for Apple review

---

## Configuration Files

### Key Files Modified:
- `capacitor.config.ts` - Capacitor configuration
- `ios/App/App/Info.plist` - iOS permissions & settings
- `client/src/services/healthkit.ts` - HealthKit service
- `client/src/components/HealthKitSync.tsx` - Sync UI
- `server/routes.ts` - Backend sync endpoint

### Important Settings:
- **App ID:** `com.healthinsights.ai`
- **App Name:** Health Insights AI
- **HealthKit Permissions:** Read access to health data

---

## Development Workflow

### Making Changes:

1. **Edit code in Replit** or your local editor
2. **Build the app:**
   ```bash
   npm run build
   ```
3. **Sync to iOS:**
   ```bash
   npx cap sync ios
   ```
4. **Rebuild in Xcode:**
   - Press `Cmd + R` or click Play button

### Debugging:

- **View logs in Xcode:**
  - Open Console app (bottom right in Xcode)
  - Look for HealthKit-related console.log messages

- **Check network requests:**
  - Use Safari Web Inspector for debugging web views
  - Connect to your device via Safari → Develop menu

---

## Need Help?

- **Apple Developer Documentation:** https://developer.apple.com/healthkit/
- **Capacitor Docs:** https://capacitorjs.com/docs
- **HealthKit Plugin:** https://github.com/mley/capacitor-health

---

## Cost Summary

- **Capacitor:** FREE ✅
- **HealthKit Plugin:** FREE ✅
- **App Store Fees:** $99/year (Apple Developer Program)
- **Development:** FREE (Xcode is free)

**Total Year 1:** $99 (just Apple Developer account)

---

## Technical Details: Platform Detection

The app automatically detects if it's running in the native iOS app vs web browser and shows the appropriate UI:

- **Native iOS App**: Shows HealthKit sync UI with direct integration
- **Web Browser (iOS Safari)**: Shows fallback message with webhook instructions

### How It Works:

1. **Plugin Availability Check**: Uses `Health.isAvailable()` to verify actual HealthKit plugin availability
2. **Cached Result**: Availability check result is cached for performance
3. **Graceful Fallback**: If plugin is unavailable (web browser), shows web-based sync instructions

This ensures:
- ✅ iOS Safari correctly shows the web fallback (plugin not available)
- ✅ Native iOS app shows HealthKit sync UI (plugin is available)
- ✅ No runtime errors from trying to use unavailable plugins

---

## What's Next?

Once your app is running on your device:

1. ✅ Test all HealthKit data types syncing
2. ✅ Verify biomarker widgets update with new data
3. ✅ Test AI insights generation with synced data
4. ✅ Add app icons and splash screens (optional)
5. ✅ Submit to App Store when ready

Good luck! 🚀
