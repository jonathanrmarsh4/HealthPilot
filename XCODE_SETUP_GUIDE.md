# Xcode Configuration Guide for HealthKit

## 📱 Pre-Flight Checklist for iOS Deployment

Follow these steps to ensure your HealthKit plugin is properly configured in Xcode before TestFlight submission.

---

## Step 1: Open the Project in Xcode

```bash
cd ios/App
open App.xcworkspace
```

**⚠️ Important:** Always open `App.xcworkspace` (not `App.xcodeproj`) since this project uses CocoaPods.

---

## Step 2: Verify HealthKit Capability

### In Xcode:

1. **Select the App target**
   - In the left sidebar, click on the blue "App" project icon
   - In the main area, ensure "App" is selected under TARGETS (not PROJECTS)

2. **Go to "Signing & Capabilities" tab**
   - Click the tab at the top of the main editor area

3. **Check for HealthKit capability**
   - You should see a "HealthKit" section
   - If not present, click "**+ Capability**" button and add "HealthKit"

4. **Verify HealthKit settings**
   - [x] HealthKit checkbox should be enabled
   - Clinical Health Records: Not needed (leave unchecked)

### Visual Check:
```
┌─────────────────────────────────────┐
│ Signing & Capabilities              │
├─────────────────────────────────────┤
│ + Capability                         │
│                                      │
│ ✓ HealthKit                          │
│   □ Clinical Health Records          │
└─────────────────────────────────────┘
```

---

## Step 3: Verify Entitlements File

### In Xcode:

1. **Locate the entitlements file**
   - In the left sidebar, navigate to: `App > App > App.entitlements`
   - If you don't see it, make sure "Show files" is selected in the navigator

2. **Open and verify contents**
   - Double-click `App.entitlements`
   - You should see:
     - `HealthKit` = YES
     - `HealthKit Background Delivery` = YES

3. **Verify it's linked to the target**
   - Select "App" target → "Build Settings" tab
   - Search for "Code Signing Entitlements"
   - Should show: `App/App.entitlements`

### Expected Entitlements File:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>com.apple.developer.healthkit</key>
    <true/>
    <key>com.apple.developer.healthkit.access</key>
    <array/>
    <key>com.apple.developer.healthkit.background-delivery</key>
    <true/>
</dict>
</plist>
```

---

## Step 4: Verify Info.plist Usage Descriptions

### In Xcode:

1. **Open Info.plist**
   - Navigate to: `App > App > Info.plist`
   - Double-click to open

2. **Verify these keys exist:**

| Key | Current Value | Status |
|-----|---------------|--------|
| `NSHealthShareUsageDescription` | "Health Insights AI needs access to your health data to provide personalized insights, track biomarkers, and optimize your training and nutrition recommendations." | ✅ Present |
| `NSHealthUpdateUsageDescription` | "Health Insights AI can write workout and activity data back to Apple Health to keep your health records synchronized." | ✅ Present |

**✅ Already configured!** Your Info.plist has the required descriptions.

---

## Step 5: Verify Plugin Integration

### Check CocoaPods Integration:

1. **Open Terminal** in the `ios/App` directory:
```bash
cd ios/App
pod install
```

2. **Verify plugin is listed:**
```bash
cat Podfile
```

Look for:
```ruby
pod 'HealthPilotHealthKit', :path => '../../HealthPilotHealthKit'
```

3. **Check installed pods:**
```bash
cat Pods/Pods.xcconfig | grep HealthPilot
```

### Verify in Xcode:

1. In the left sidebar, expand **Pods** project (below your App project)
2. Expand **Development Pods**
3. You should see **HealthPilotHealthKit** listed
4. Expand it to verify the Swift files are present

---

## Step 6: Configure Signing

### In Xcode:

1. **Select App target** → "Signing & Capabilities" tab
2. **Team**: Select your Apple Developer Team
3. **Bundle Identifier**: Should be `com.nuvitae.healthpilot` (or your custom ID)
4. **Signing Certificate**: 
   - For device testing: "Apple Development"
   - For TestFlight: "Apple Distribution"

### Provisioning Profile Check:

**⚠️ Critical:** Your provisioning profile MUST include HealthKit entitlement

1. Go to [developer.apple.com](https://developer.apple.com/account)
2. Navigate to: Certificates, Identifiers & Profiles
3. Click **Identifiers** → Select your app's Bundle ID
4. Scroll to **App Services** section
5. Verify **HealthKit** checkbox is enabled
6. If not enabled:
   - Enable HealthKit
   - Click "Save"
   - Regenerate your provisioning profiles
   - Download and install new profiles in Xcode

---

## Step 7: Build Settings Verification

### In Xcode:

1. **Select App target** → "Build Settings" tab
2. **Search for these settings:**

| Setting | Expected Value |
|---------|----------------|
| iOS Deployment Target | 14.0 or later |
| Swift Language Version | 5.0 |
| Code Signing Entitlements | `App/App.entitlements` |

---

## Step 8: Test Build for Device

### Connect a Physical iPhone:

**⚠️ Important:** HealthKit requires a physical device (simulator won't work for most data types)

1. **Connect iPhone** via USB
2. **Trust the computer** on the iPhone if prompted
3. **Select device** in Xcode's device dropdown (top toolbar)
4. **Build** (⌘B) to verify no compilation errors
5. **Run** (⌘R) to install on device

### Expected Build Output:
```
Build Succeeded
▸ Installing...
▸ Launching Health Insights AI...
```

---

## Step 9: Test HealthKit Diagnostics Page

### On the Device:

1. **Open the app** on your iPhone
2. **Navigate to:** `/healthkit-diagnostics`
   - You can access this directly or add a link in your app's UI

3. **Run the diagnostic tests:**
   - Tap "Check Availability" → Should show "✓ Available"
   - Tap "Request Permissions" → iOS permission dialog appears
   - Grant access to all requested health data
   - Tap "Test All Data Types" → Should see green checkmarks for types with data

4. **Verify sample data:**
   - Scroll through each data type section
   - Verify values have correct units (steps: count, weight: kg, etc.)
   - Check timestamps are reasonable
   - Confirm UUIDs are present for each sample

### Troubleshooting:

| Issue | Solution |
|-------|----------|
| "HealthKit not available" | Verify you're on a physical device, not simulator |
| Permission dialog doesn't appear | Check Info.plist has usage descriptions |
| Empty results for all types | Add data to Health app first, then re-test |
| "Plugin not found" error | Run `npx cap sync ios` and rebuild |

---

## Step 10: Prepare for TestFlight

### Final Checklist:

- [ ] All 27 data types tested successfully on device
- [ ] HealthKit capability enabled in Xcode
- [ ] Entitlements file correctly configured
- [ ] Info.plist usage descriptions present
- [ ] Provisioning profile includes HealthKit entitlement
- [ ] App builds without errors for physical device
- [ ] No mock/test data in production code paths
- [ ] Privacy policy mentions HealthKit data usage

### Create Archive for TestFlight:

1. **Select "Any iOS Device"** (not a specific device) in device dropdown
2. **Product** → **Archive** from menu bar
3. Wait for archive to complete
4. In Organizer window:
   - Select your archive
   - Click "Distribute App"
   - Choose "App Store Connect"
   - Follow prompts to upload

### Post-Upload:

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app
3. Go to TestFlight tab
4. Wait for processing (10-30 minutes)
5. Add internal testers
6. Invite testers to test HealthKit integration

---

## Common Issues & Solutions

### Issue: "App-specific password required"
**Solution:** Generate app-specific password at appleid.apple.com

### Issue: "Invalid Provisioning Profile"
**Solution:** Ensure profile includes HealthKit entitlement; regenerate if needed

### Issue: "HealthKit framework not found"
**Solution:** 
```bash
cd ios/App
pod deintegrate
pod install
```

### Issue: "Code signing identity not found"
**Solution:** Add your Apple Developer account in Xcode Preferences → Accounts

### Issue: Diagnostics page shows "unavailable" on device
**Solution:** Check that device is running iOS 14.0+, verify in Settings → Privacy → Health that app has permissions

---

## Quick Reference Commands

```bash
# Sync Capacitor plugins
npx cap sync ios

# Open Xcode workspace
cd ios/App && open App.xcworkspace

# Reinstall pods
cd ios/App
pod deintegrate
pod install

# Clean Xcode build
# In Xcode: Product → Clean Build Folder (⇧⌘K)

# View entitlements in terminal
plutil -p ios/App/App/App.entitlements

# Check Info.plist
plutil -p ios/App/App/Info.plist | grep -i health
```

---

## Support Resources

- **Apple HealthKit Documentation:** https://developer.apple.com/documentation/healthkit
- **App Store Review Guidelines:** https://developer.apple.com/app-store/review/guidelines/#healthkit
- **Your Plugin Docs:** See `HEALTHKIT_PLUGIN.md` in project root
- **Diagnostics Page:** Navigate to `/healthkit-diagnostics` in app

---

## Next Steps After Device Testing

1. ✅ Validate all 27 data types return correct units/values
2. ✅ Test with various date ranges (1 day, 7 days, 30 days)
3. ✅ Test with empty Health app vs. populated data
4. ✅ Document any edge cases or limitations discovered
5. ✅ Create TestFlight build and invite testers
6. 📋 Schedule automated contract tests (post-MVP)
7. 📋 Add telemetry for HealthKit query performance

---

**Ready for deployment!** 🚀

Once you've completed Steps 1-9, you're ready to create a TestFlight build and begin testing with real users.
