# Clean Rebuild Guide for V3 Plugin

## 🎯 Purpose

This guide ensures you get a **truly clean build** that forces iOS to re-register the V3 plugin. Follow these steps **in exact order**.

---

## 📋 Pre-Flight Checklist

Before rebuilding, verify:

- ✅ `HealthKitStatsPluginV3.m` created in `ios/App/App/`
- ✅ `HealthKitStatsPluginV3.swift` created in `ios/App/App/`
- ✅ Frontend updated to use `'HealthPilotHKV3'` plugin ID
- ✅ Xcode is **closed**

---

## 🧹 Step 1: Clean Local Files

Run from **project root** (not ios/ directory):

```bash
# Delete all iOS build artifacts
rm -rf ios/build

# Delete DerivedData (Xcode's build cache)
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

---

## 🔄 Step 2: CocoaPods Nuclear Reset

```bash
# Navigate to iOS directory
cd ios

# Deintegrate CocoaPods completely
pod deintegrate

# Clear CocoaPods cache
pod cache clean --all

# Remove all pod files
rm -rf Pods Podfile.lock

# Go back to project root
cd ..
```

**What this does:** Removes ALL traces of CocoaPods configuration and cache.

---

## ⚡ Step 3: Capacitor Sync

```bash
# From project root
npx cap sync ios
```

**What this does:** Copies web assets and syncs Capacitor configuration to iOS project.

---

## 🔧 Step 4: Reinstall Pods

```bash
# Navigate back to iOS directory
cd ios

# Fresh pod install
pod install

# Verify success
ls -la Pods/
```

**Expected output:** You should see pod directories created.

---

## 🏗️ Step 5: Configure in Xcode

### Open Workspace (NOT Project!)

```bash
# From ios/ directory
open App/App.xcworkspace
```

**⚠️ CRITICAL:** Make sure you opened `.xcworkspace` NOT `.xcodeproj`!

### Add Files to Build Phases

1. Select **App** target (left sidebar)
2. **Build Phases** tab
3. Expand **Compile Sources**
4. Click **+** button
5. Add:
   - `HealthKitStatsPluginV3.m`
   - `HealthKitStatsPluginV3.swift`
6. **Verify both appear in the list**

### Add -ObjC Linker Flag

1. **Build Settings** tab
2. Search: **Other Linker Flags**
3. **Debug:** Add `-ObjC`
4. **Release:** Add `-ObjC`

**Verification:** Both configurations show `-ObjC` flag.

### Bump Version Numbers

1. **General** tab
2. Under **Identity**:
   - **Version:** Increment (e.g., 1.0 → 1.1)
   - **Build:** Increment (e.g., 1 → 2)

---

## 🗑️ Step 6: Delete Old App

### On Physical Device:
1. Long-press the HealthPilot app icon
2. Select "Remove App"
3. Confirm deletion

### On Simulator:
1. Long-press the HealthPilot app icon
2. Select "Delete App"
3. Or run: `xcrun simctl uninstall booted com.nuvitae.healthpilot`

**Why:** Forces iOS to completely forget the old plugin registration.

---

## 🏗️ Step 7: Clean Build in Xcode

```
1. Product → Clean Build Folder (⇧⌘K)
2. Wait for "Clean Succeeded"
3. Product → Build (⌘B)
4. Wait for "Build Succeeded"
```

**⚠️ Check for errors!** If build fails:
- Verify both V3 files are in Compile Sources
- Check `-ObjC` flag is set
- Ensure you opened `.xcworkspace`

---

## 🚀 Step 8: Fresh Install

```
1. Product → Run (⌘R)
2. Wait for app to launch
3. Watch Xcode console
```

### Expected Console Output:

```
⚡️  WebView loaded
...
🔵🔵🔵 [HK V3] Plugin loaded successfully: HealthKitStatsPluginV3
```

**✅ SUCCESS:** If you see the blue circles, V3 is registered!  
**❌ FAILURE:** If no blue circles, repeat from Step 1.

---

## 🧪 Step 9: Run Diagnostics

### In App's JavaScript Console:

```javascript
// Import diagnostic utility
import { runFullDiagnostics } from '@/debug/hk-v3-diagnostics';

// Run all tests
await runFullDiagnostics();
```

### Expected Output:

```
🔍 [HK V3 Diagnostics] Plugin Registration Check
✅ Total Capacitor plugins registered: 15
✅ HealthPilotHKV3 plugin FOUND!
🔧 Available methods: [getDailySteps, getMultiDayStats, enableBackgroundDelivery, ...]
```

### In Xcode Console:

```
🔵🔵🔵 [HK V3] getSyncStatus called
🔵🔵🔵 [HK V3] getBackgroundQueueStats called
```

---

## ✅ Verification Checklist

Mark each as you verify:

- [ ] Blue circles appear in Xcode console on app launch
- [ ] JavaScript diagnostics find `HealthPilotHKV3`
- [ ] All 9 methods are listed
- [ ] `getSyncStatus()` resolves without error
- [ ] No "UNIMPLEMENTED" errors

---

## 🔧 If It Still Doesn't Work

### Check 1: Verify Plugin Files

```bash
# From project root
ls -la ios/App/App/HealthKitStatsPluginV3.*
```

**Expected:** Both `.m` and `.swift` files exist.

### Check 2: Grep for Plugin ID

```bash
# Search for V3 registration
grep -r "HealthPilotHKV3" ios/

# Should show:
# ios/App/App/HealthKitStatsPluginV3.m:CAP_PLUGIN(HealthKitStatsPluginV3, "HealthPilotHKV3",
```

### Check 3: Verify JavaScript

```bash
# Search frontend for old plugin ID
grep -r "HealthKitStatsPluginV2" client/src/

# Should return NO results (or only in old files)
```

### Check 4: Xcodes Build Log

In Xcode:
1. **View → Navigators → Show Report Navigator** (⌘9)
2. Select latest build
3. Search for "HealthKitStatsPluginV3"
4. **Verify both files were compiled**

---

## 🎯 Success Criteria

You know the rebuild worked when:

1. ✅ App launches without errors
2. ✅ Xcode shows: `🔵🔵🔵 [HK V3] Plugin loaded`
3. ✅ Diagnostics show HealthPilotHKV3 registered
4. ✅ All methods callable (no UNIMPLEMENTED)
5. ✅ `triggerBackgroundSyncNow()` logs appear in Xcode

---

## 🚨 Common Mistakes

### ❌ Opened .xcodeproj instead of .xcworkspace
**Fix:** Close Xcode, run `open ios/App/App.xcworkspace`

### ❌ Forgot to add files to Compile Sources
**Fix:** Go to Build Phases → Compile Sources → Add both V3 files

### ❌ Didn't delete old app before running
**Fix:** Delete app from device/simulator, then Product → Run

### ❌ Forgot -ObjC linker flag
**Fix:** Build Settings → Other Linker Flags → Add `-ObjC` to both Debug and Release

### ❌ Frontend still using old plugin ID
**Fix:** Verify `client/src/mobile/plugins/HealthKitStatsPlugin.ts` uses `'HealthPilotHKV3'`

---

## 🔄 Quick Reset Commands

Save these for future clean rebuilds:

```bash
# From project root - one-liner clean rebuild
rm -rf ios/build ~/Library/Developer/Xcode/DerivedData/* && \
cd ios && pod deintegrate && pod cache clean --all && \
rm -rf Pods Podfile.lock && cd .. && \
npx cap sync ios && cd ios && pod install && \
open App/App.xcworkspace
```

Then in Xcode:
1. Clean Build Folder
2. Delete app from device
3. Bump version
4. Build & Run

---

## 💡 Pro Tips

- **Always clean between plugin changes** - iOS caches aggressively
- **Version bump is mandatory** - Don't skip it!
- **Watch Xcode console closely** - Blue circles = success
- **Test with diagnostics first** - Before testing real features
- **Keep old plugins around** - Until V3 is fully verified

---

Need help? Check:
1. `ios/XCODE_SETUP_V3.md` - Detailed Xcode configuration
2. `client/src/debug/hk-v3-diagnostics.ts` - Diagnostic utilities
3. Xcode console logs - Look for blue circles and error messages
