# Xcode Setup for HealthKit Plugin V3

## Critical Manual Changes Required

This document outlines the **manual changes you MUST make in Xcode** for the V3 plugin to work.

---

## ✅ Step 1: Add V3 Plugin Files to Build Phases

**In Xcode:**

1. Open **ios/App/App.xcworkspace** (NOT .xcodeproj!)
2. Select the **App** target in the left sidebar
3. Go to **Build Phases** tab
4. Expand **Compile Sources**
5. Click the **+** button
6. Add these two files:
   - `HealthKitStatsPluginV3.m`
   - `HealthKitStatsPluginV3.swift`

**Verification:** Both files should appear in the Compile Sources list.

---

## ✅ Step 2: Add -ObjC Linker Flag (CRITICAL!)

**Why:** Without this flag, the CAP_PLUGIN registration macro can be stripped at link time, causing UNIMPLEMENTED errors.

**In Xcode:**

1. Select the **App** target
2. Go to **Build Settings** tab
3. Search for: **Other Linker Flags**
4. For **Debug**:
   - Double-click the value
   - Click **+**
   - Add: `-ObjC`
5. For **Release**:
   - Double-click the value
   - Click **+**
   - Add: `-ObjC`

**Verification:** Both Debug and Release should show `-ObjC` in the flags list.

---

## ✅ Step 3: Bump App Version (Forces Fresh Install)

**Why:** iOS can cache plugin registrations between builds. A new version number forces a clean install.

**In Xcode:**

1. Select the **App** target
2. Go to **General** tab
3. Under **Identity**:
   - **Version**: Increment (e.g., 1.0 → 1.1)
   - **Build**: Increment (e.g., 1 → 2)

**Or edit Info.plist:**
- `CFBundleShortVersionString`: "1.1"
- `CFBundleVersion`: "2"

---

## ✅ Step 4: Verify HealthKit Entitlements

**In Xcode:**

1. Select the **App** target
2. Go to **Signing & Capabilities** tab
3. Verify these capabilities exist:
   - ☑️ **HealthKit**
   - ☑️ **Background Modes** (if using background delivery)

**In App.entitlements file:**
```xml
<key>com.apple.developer.healthkit</key>
<true/>
<key>com.apple.developer.healthkit.background-delivery</key>
<true/>
```

---

## 🧹 Step 5: Clean Build (Nuclear Option)

**Execute in this exact order:**

### In Xcode:
1. **Product → Clean Build Folder** (⇧⌘K)
2. **Close Xcode completely**

### In Terminal (from project root):
```bash
# Delete DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Delete iOS build artifacts
rm -rf ios/build

# Deintegrate CocoaPods completely
cd ios
pod deintegrate
pod cache clean --all
rm -rf Pods Podfile.lock

# Resync Capacitor
cd ..
npx cap sync ios

# Reinstall pods
cd ios
pod install
```

### Back in Xcode:
1. **Open ios/App/App.xcworkspace** (NOT .xcodeproj!)
2. **Delete the app from your device/simulator**
3. **Product → Build** (⌘B)
4. **Product → Run** (⌘R)

---

## 🔍 Verification Checklist

After rebuilding and installing, open the app and check the **Xcode Console**:

### 1. Plugin Load Log
Look for:
```
🔵🔵🔵 [HK V3] Plugin loaded successfully: HealthKitStatsPluginV3
```

**✅ If you see this:** Plugin is registered!  
**❌ If missing:** Go back to Step 1 and verify files are in Compile Sources

### 2. Test Method Call
In the app, run diagnostics (see below) and check console for:
```
🔵🔵🔵 [HK V3] getSyncStatus called
```

**✅ If you see this:** Methods are callable!  
**❌ If you see "UNIMPLEMENTED":** Go back to Step 2 (-ObjC flag)

---

## 🧪 Testing the Plugin

### In the App (JavaScript Console):

```javascript
// Import the diagnostic utility
import { runFullDiagnostics } from '@/debug/hk-v3-diagnostics';

// Run all diagnostics
await runFullDiagnostics();
```

**Expected Output:**
```
🔍 [HK V3 Diagnostics] Plugin Registration Check
✅ HealthPilotHKV3 plugin FOUND!
🔧 Available methods: [getDailySteps, getMultiDayStats, ...]
```

### Test Foreground Sync:

```javascript
import { testForegroundSync } from '@/debug/hk-v3-diagnostics';

// This will test the sync logic without background delivery
await testForegroundSync();
```

**Expected Xcode Console:**
```
🔵🔵🔵 [HK V3] triggerBackgroundSyncNow called (foreground test)
[HK V3] Foreground sync completed. Fetched 5 data types.
```

---

## 🚨 Troubleshooting

### Problem: UNIMPLEMENTED Error

**Symptoms:** Methods return `{code: "UNIMPLEMENTED"}` error

**Solutions (in order):**
1. ✅ Verify `-ObjC` flag is set (Step 2)
2. ✅ Verify both .m and .swift files are in Compile Sources (Step 1)
3. ✅ Delete app, clean build, fresh install (Step 5)
4. ✅ Check you opened `.xcworkspace` not `.xcodeproj`

### Problem: No 🔵🔵🔵 Logs

**Symptoms:** No blue circles in Xcode console when methods are called

**Solutions:**
1. ✅ Plugin didn't load - check Step 1
2. ✅ Wrong plugin ID - verify JavaScript uses `'HealthPilotHKV3'`
3. ✅ Old app version still running - bump version and reinstall (Step 3)

### Problem: Old Plugin Still Active

**Symptoms:** `HealthKitStatsPlugin` or `HealthKitBackgroundSyncPlugin` found instead of V3

**Solutions:**
1. Delete the old plugin files from Xcode project
2. Remove them from Compile Sources
3. Clean build and reinstall

---

## 📊 Success Criteria

You'll know everything works when:

1. ✅ Xcode console shows: `🔵🔵🔵 [HK V3] Plugin loaded`
2. ✅ JavaScript console shows: `HealthPilotHKV3 plugin FOUND!`
3. ✅ All 9 methods are listed in diagnostics
4. ✅ `getSyncStatus()` resolves without UNIMPLEMENTED error
5. ✅ `triggerBackgroundSyncNow()` logs blue circles in Xcode

---

## 🎯 Next Steps After Verification

Once V3 is working:

1. **Remove old plugins:**
   - Delete `HealthKitStatsPlugin.m/.swift`
   - Delete `HealthKitBackgroundSyncPlugin.m/.swift`
   - Remove from Compile Sources

2. **Enable background delivery:**
   ```javascript
   const result = await HealthKitStats.enableBackgroundDelivery();
   console.log('Background delivery enabled:', result);
   ```

3. **Test background sync:**
   - Enable background delivery
   - Add test data to Health app
   - Background app
   - Foreground app
   - Check queue stats

---

## 💡 Pro Tips

- **Always use `.xcworkspace`** - Never open `.xcodeproj` directly
- **Keep blue circle logging** - It's invaluable for debugging
- **Test foreground first** - `triggerBackgroundSyncNow()` tests the logic without background complexity
- **Check Xcode console** - JavaScript errors won't tell you if Swift method wasn't called
- **Version bump is key** - Don't skip Step 3!
