# HealthPilot iOS Operations Guide

Complete guide for building, running, signing, and deploying the HealthPilot native iOS app.

**Target Time**: A new engineer should be able to build and run the app within 15 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **macOS** (Ventura 13.0 or later recommended)
- ✅ **Xcode 15+** (download from App Store)
- ✅ **Node.js 18+** and npm
- ✅ **iOS Device or Simulator** (iOS 15.0+)
- ✅ **Apple Developer Account** (free for simulator, $99/year for device)

---

## Quick Start (15-Minute Setup)

### Step 1: Clone and Install Dependencies (5 min)

```bash
# Clone the repository
git clone <repo-url>
cd healthpilot

# Install dependencies
npm install

# Verify Capacitor is installed
npx cap --version
```

### Step 2: Build the Web App (3 min)

```bash
# Build the production web app
npm run build

# This creates dist/public/ with all web assets
```

### Step 3: Sync to iOS (2 min)

```bash
# Sync web assets and native code to iOS
npx cap sync ios

# This copies dist/public/ to ios/App/App/public/
```

### Step 4: Open in Xcode (1 min)

```bash
# Open the iOS project in Xcode
npx cap open ios
```

**OR manually:**
1. Navigate to `ios/App/`
2. Double-click `App.xcworkspace` (NOT App.xcodeproj)

### Step 5: Configure Signing (2 min)

In Xcode:

1. Select the **App** target in the left sidebar
2. Go to **Signing & Capabilities** tab
3. Under **Signing**, select your **Team** (Apple Developer account)
4. Xcode will automatically generate a provisioning profile
5. If needed, update the **Bundle Identifier** to something unique

**Note**: For simulator testing, a free Apple ID works. For device deployment, you need a paid Apple Developer account.

### Step 6: Build and Run (2 min)

1. Select a **destination** (simulator or your connected device) from the toolbar
2. Click the **Play** button (▶️) or press **Cmd+R**
3. Wait for build to complete
4. App launches on simulator/device

**Expected Result**: HealthPilot app opens with splash screen, then shows the dashboard.

---

## Development Workflow

### Making Code Changes

```bash
# 1. Make changes to client/src/ or server/ files
npm run dev  # Run dev server for testing

# 2. Build the web app
npm run build

# 3. Sync changes to iOS
npx cap sync ios

# 4. Rebuild in Xcode (Cmd+B) or just run (Cmd+R)
```

### Live Reload (Development)

For faster development without rebuilding:

```bash
# Start the dev server
npm run dev

# In Xcode, change capacitor.config.ts server URL temporarily:
# server: {
#   url: 'http://localhost:5000',
#   cleartext: true
# }

# Now changes are live-reloaded on device/simulator
```

**Important**: Revert the server URL before building for production.

### Debugging

**Web Inspector (Safari):**
1. Open Safari on Mac
2. Go to **Develop** > **Simulator** > **localhost**
3. Inspect elements, view console logs, debug JavaScript

**Xcode Console:**
- View native logs in Xcode's debug console
- Shows Capacitor bridge messages, plugin calls, native errors

**Native Diagnostics:**
- Navigate to `/mobile-diagnostics` in the app
- Tests all native capabilities (secure storage, HealthKit, haptics, etc.)

---

## HealthKit Configuration

### Enable HealthKit Capability

1. In Xcode, select the **App** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **HealthKit**

### Verify Privacy Strings

The `Info.plist` should already contain:

```xml
<key>NSHealthShareUsageDescription</key>
<string>HealthPilot needs access to your health data to provide personalized insights...</string>

<key>NSHealthUpdateUsageDescription</key>
<string>HealthPilot can write workout and activity data back to Apple Health...</string>
```

These strings are shown to users when requesting HealthKit permissions.

### Test HealthKit Integration

1. Run the app on a physical device or simulator
2. Navigate to `/mobile-diagnostics`
3. Tap "Request HealthKit Permissions"
4. Grant permissions when prompted
5. Verify "HealthKit available and functional" status

---

## Signing & Provisioning

### Development Signing (Simulator + Device Testing)

**Automatic Signing** (recommended):
1. Xcode > **Signing & Capabilities**
2. Enable "Automatically manage signing"
3. Select your Team
4. Xcode handles provisioning profiles

**Manual Signing** (advanced):
1. Create provisioning profiles in Apple Developer portal
2. Download and install profiles
3. Select profiles in Xcode

### Distribution Signing (App Store / TestFlight)

1. Create an **App Store** provisioning profile in Apple Developer portal
2. In Xcode, select **Archive** from the **Product** menu
3. In the Organizer, click **Distribute App**
4. Follow the wizard to upload to App Store Connect

**Required**:
- Paid Apple Developer account ($99/year)
- App Store listing in App Store Connect
- Privacy policy URL
- App screenshots and metadata

---

## Testing

### Simulator Testing

```bash
# List available simulators
xcrun simctl list devices

# Boot a specific simulator
xcrun simctl boot "iPhone 15 Pro"

# Run tests
npx cap run ios
```

### Device Testing

1. Connect iPhone/iPad via USB
2. Trust the computer on the device
3. Select device in Xcode
4. Click Run (▶️)

**First Time Setup**:
- Go to **Settings > General > VPN & Device Management**
- Trust your developer certificate

### Automated Testing

Run the validation suite:

```bash
node scripts/validate-mobile-readiness.mjs
```

This checks:
- ✅ Capacitor config valid
- ✅ All required plugins installed
- ✅ iOS platform exists
- ✅ Privacy keys in Info.plist
- ✅ Mobile bootstrap implemented
- ✅ Adapters present
- ✅ TypeScript compilation passes

---

## Performance Optimization

### Bundle Size

Check bundle size:
```bash
npm run build
du -sh dist/public
```

**Target**: < 5MB gzipped for fast first load

**Optimization tips**:
- Enable tree-shaking (already configured in Vite)
- Lazy-load routes and heavy components
- Optimize images (use WebP, compress PNGs)
- Remove unused dependencies

### Cold Start Time

**Target**: < 2.5s on iPhone 12 or newer

**Measure**:
1. Force quit app
2. Launch app
3. Time from tap to first meaningful paint

**Optimize**:
- Minimize MobileBootstrap operations
- Defer non-critical initialization
- Use splash screen to hide loading
- Preload critical assets

---

## Troubleshooting

### Build Fails with "Command PhaseScriptExecution failed"

**Solution**: Clean build folder
```bash
# In Xcode: Product > Clean Build Folder (Cmd+Shift+K)
# Or terminal:
cd ios/App
xcodebuild clean
```

### "No provisioning profiles found"

**Solution**: 
1. Add your Apple ID in Xcode > Preferences > Accounts
2. Download manual provisioning profiles
3. Or enable automatic signing

### "App opens to blank white screen"

**Solution**:
1. Check that `npx cap sync ios` was run after building
2. Verify `dist/public/` exists and contains index.html
3. Check Xcode console for errors
4. Clear derived data: `rm -rf ~/Library/Developer/Xcode/DerivedData`

### HealthKit permissions not working

**Solution**:
1. Verify HealthKit capability is enabled in Xcode
2. Check Info.plist has privacy strings
3. Test on a real device (simulator has limited HealthKit)
4. Reset permissions: Settings > General > Reset > Reset Location & Privacy

### "Module not found" errors in Xcode

**Solution**:
1. Run `npx cap sync ios` again
2. Clean build folder
3. Restart Xcode
4. Pod update: `cd ios/App && pod update`

---

## Deep Links & Universal Links

### Custom URL Scheme (healthpilot://)

Already configured in capacitor.config.ts:

```typescript
ios: {
  scheme: 'healthpilot'
}
```

**Test**:
```bash
# On device or simulator
xcrun simctl openurl booted healthpilot://open
```

### Universal Links (https://healthpilot.pro)

**Setup** (production only):
1. Add Associated Domains capability in Xcode
2. Add domain: `applinks:healthpilot.pro`
3. Upload apple-app-site-association file to web server
4. Test: Open https://healthpilot.pro links in Safari

---

## Deployment Checklist

Before releasing:

- [ ] Run validation script: `node scripts/validate-mobile-readiness.mjs`
- [ ] Test on physical iOS device
- [ ] Test HealthKit integration end-to-end
- [ ] Verify all privacy permissions work
- [ ] Test deep links and universal links
- [ ] Check bundle size (< 5MB)
- [ ] Measure cold start time (< 2.5s)
- [ ] Test on iOS 15, 16, 17
- [ ] Test on iPhone and iPad
- [ ] Archive and upload to TestFlight
- [ ] Conduct beta testing
- [ ] Submit for App Store review

---

## Getting Help

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Apple Developer**: https://developer.apple.com/documentation/
- **HealthKit**: https://developer.apple.com/documentation/healthkit

**Common Issues**: Check `TROUBLESHOOTING.md` (if exists) or create GitHub issues.

---

**Summary**: This guide enables a new engineer to clone, build, and run HealthPilot on iOS in ~15 minutes, with comprehensive debugging, testing, and deployment workflows.
