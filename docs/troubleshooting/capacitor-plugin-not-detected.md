# Capacitor Plugin Not Detected on iOS - Troubleshooting Guide

## Problem Summary

**Symptoms:**
- iOS native app shows "iOS App Required" message instead of native features
- Console logs show: `"Health" plugin is not implemented on ios`
- Platform detection shows `platform: "web"` instead of `platform: "ios"`
- Custom Capacitor plugins don't register even though CocoaPods installs them

**Root Cause:**
Missing `<script src="capacitor.js"></script>` in `client/index.html` prevents Capacitor's native bridge from initializing, causing the app to run in web mode even when built as a native iOS app.

---

## The Complete Fix (Step-by-Step)

### 1. Add Capacitor.js Script to index.html

**File:** `client/index.html`

Add the Capacitor script **BEFORE** your main app script:

```html
<body>
  <div id="root"></div>
  <!-- Capacitor native bridge (loaded BEFORE app code) -->
  <script src="capacitor.js"></script>
  <script type="module" src="/src/main.tsx"></script>
</body>
```

**Why this matters:** Without this script, Capacitor's native bridge never initializes, so `Capacitor.getPlatform()` always returns `"web"` and plugins are never registered.

---

### 2. Ensure Custom Plugin Has Correct Structure

For custom local plugins (like `@healthpilot/healthkit`):

**Required Files:**
```
ios/HealthKitPlugin/
├── package.json              # Must have "capacitor" config
├── HealthpilotHealthkit.podspec  # Name must match package naming
├── src/
│   └── index.ts             # TypeScript plugin interface
└── ios/
    └── Plugin/
        ├── Health.swift
        ├── HealthPlugin.swift
        └── BackgroundSyncManager.swift
```

**package.json must include:**
```json
{
  "name": "@healthpilot/healthkit",
  "version": "1.0.0",
  "capacitor": {
    "ios": {
      "src": "ios"
    }
  },
  "files": [
    "ios/",
    "src/",
    "HealthpilotHealthkit.podspec"
  ]
}
```

**Podspec naming convention:**
- Package name: `@healthpilot/healthkit` → Podspec name: `HealthpilotHealthkit`
- Format: Convert `@scope/name` to `ScopeName` (PascalCase, no special chars)

---

### 3. Install Plugin as NPM Package

**On your Mac (from project root):**
```bash
npm install file:./ios/HealthKitPlugin
```

This adds the plugin to `package.json` dependencies so Capacitor can auto-discover it.

---

### 4. Sync and Build

**On your Mac:**
```bash
# Rebuild web assets with updated index.html
npm run build

# Sync to iOS (copies dist/public → ios/App/App/public)
npx cap sync ios

# Verify plugin is detected - should show in list
```

**Expected output:**
```
[info] Found 13 Capacitor plugins for ios:
       ...
       @healthpilot/healthkit@1.0.0
```

**In Xcode:**
```bash
# Clean build folder
Product → Clean Build Folder (Cmd+Shift+K)

# Build and run
Product → Build (Cmd+B)
Product → Run (Cmd+R)
```

---

### 5. Enable HealthKit Capability (First Time Only)

**In Xcode:**
1. Select **App** target
2. **Signing & Capabilities** tab
3. Click **"+ Capability"**
4. Add **"HealthKit"**
5. Ensure checkbox is checked

**Add Privacy String:**
1. Open **App/Info.plist**
2. Add row: `NSHealthShareUsageDescription`
3. Value: `"HealthPilot needs access to read your health data to provide personalized insights and recommendations"`

---

## Verification Steps

### 1. Check Platform Detection

**In Xcode Console after app launch:**
```
[MobileBootstrap] Platform Detection: {"platform":"ios","isNative":true}
```

✅ **Good:** `platform: "ios"`, `isNative: true`  
❌ **Bad:** `platform: "web"`, `isNative: false`

### 2. Check Plugin Registration

**Look for this in logs:**
```
To Native -> Health isAvailable
```

If you see native calls to your plugin, it's registered correctly.

### 3. Test in App

Navigate to feature requiring plugin (e.g., Biomarkers page) - should show native UI, not "iOS App Required" message.

---

## Common Pitfalls & Solutions

### ❌ Plugin shows in pod install but not in Capacitor sync

**Problem:** Podspec name doesn't match package name convention.

**Solution:** 
- Package: `@healthpilot/healthkit`
- Podspec must be: `HealthpilotHealthkit.podspec`
- Podspec `s.name` must be: `'HealthpilotHealthkit'`

### ❌ Platform still shows "web" after adding capacitor.js

**Problem:** iOS app is using stale bundled assets.

**Solution:**
```bash
npm run build           # Rebuild with new index.html
npx cap sync ios        # Copy fresh assets to iOS
# Clean + rebuild in Xcode
```

### ❌ Plugin compiles but crashes on call

**Problem:** Plugin Swift code has compilation errors or missing HealthKit capability.

**Solution:**
1. Check **Xcode Issue Navigator (Cmd+5)** for build warnings/errors
2. Ensure HealthKit capability is enabled
3. Check Swift files are in **Build Phases → Compile Sources**

### ❌ "No podspec found for X in ../HealthKitPlugin"

**Problem:** Podspec filename doesn't match what Capacitor expects.

**Solution:** Rename podspec to match the format `ScopeNamePackagename.podspec` (e.g., `HealthpilotHealthkit.podspec`)

### ❌ Merge conflicts on Podfile after git pull

**Problem:** Local uncommitted changes conflict with remote.

**Solution:**
```bash
git stash              # Save local changes
git pull               # Get latest
ls ios/HealthKitPlugin/*.podspec  # Verify podspec exists
npx cap sync ios       # Sync
```

---

## Quick Checklist

Use this to diagnose issues:

- [ ] `capacitor.js` script exists in `client/index.html` (before main app script)
- [ ] Plugin installed via `npm install file:./ios/HealthKitPlugin`
- [ ] `npx cap sync ios` shows plugin in list (13 plugins, includes `@healthpilot/healthkit`)
- [ ] Podspec name matches package name convention
- [ ] Web assets rebuilt: `npm run build`
- [ ] Xcode cleaned and rebuilt: Clean Build Folder → Build
- [ ] HealthKit capability enabled in Xcode (if using HealthKit)
- [ ] Platform detection logs show `"platform":"ios","isNative":true`

---

## Technical Deep Dive

### Why capacitor.js is Critical

When a Capacitor app starts:

1. **Native iOS WebView loads** → Loads `ios/App/App/public/index.html`
2. **`capacitor.js` executes first** → Initializes bridge, registers plugins
3. **App code loads** → Can now call `Capacitor.getPlatform()` and use plugins

**Without capacitor.js:**
- Bridge never initializes
- `Capacitor.getPlatform()` returns `"web"` (fallback)
- `registerPlugin()` calls create dummy implementations
- Plugins appear to exist but do nothing

### Plugin Auto-Discovery

Capacitor automatically discovers plugins that:
1. Are in `package.json` dependencies
2. Have `"capacitor"` field in their `package.json`
3. Have a matching podspec in the specified directory

**During `npx cap sync ios`:**
1. Reads `package.json` dependencies
2. Checks each for `"capacitor"` field
3. Generates pod references in Podfile
4. Runs `pod install`
5. Copies web assets to iOS bundle

---

## Related Issues

- **Live reload not working:** Same root cause - capacitor.js missing
- **Push notifications not received:** Check if native bridge initialized
- **File system access fails:** Platform detection likely showing "web"

---

## Git Workflow for Fixes

When making these fixes:

**On Replit:**
```bash
git add client/index.html ios/HealthKitPlugin/
git commit -m "Fix Capacitor plugin detection on iOS"
git push $GIT_URL main
```

**On Mac:**
```bash
git pull
npm run build
npm install file:./ios/HealthKitPlugin  # If plugin updated
npx cap sync ios
# Clean + rebuild in Xcode
```

---

## Last Updated
November 2025 - Successfully resolved after full-day debugging session
