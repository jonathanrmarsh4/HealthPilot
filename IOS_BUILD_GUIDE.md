# HealthPilot iOS Build Guide
**Complete Step-by-Step Setup for Capacitor iOS App**

---

## Overview

This guide walks you through building, running, and distributing the HealthPilot web application as a native iOS app using Capacitor 7. You will:

1. Wrap the React web app in a Capacitor iOS container
2. Configure Xcode project with signing, capabilities, and permissions
3. Set up HealthKit integration with secure Keychain storage
4. Configure deep links (custom scheme + universal links)
5. Run on iOS Simulator and physical iPhone/iPad
6. Archive and distribute via TestFlight

**App Details:**
- **App Name:** HealthPilot
- **Bundle ID:** `com.nuvitae.healthpilot`
- **iOS Min Version:** 15.0
- **Capacitor Version:** 7.x
- **Web Build Dir:** `dist/public`
- **Features:** HealthKit, Deep Links, Secure Keychain Storage

---

## Prerequisites

### A1. Install Xcode

1. Open the **App Store** on your Mac
2. Search for **"Xcode"**
3. Click **Get** / **Install** (this is ~12GB and takes 15-30 minutes)
4. Once installed, open **Xcode** from `/Applications/Xcode.app`
5. Accept the license agreement when prompted
6. Wait for "Installing Additional Components" to complete

**Expected:** Xcode opens with a welcome screen.

### A2. Install Xcode Command Line Tools

```bash
xcode-select --install
```

**Expected:** A popup appears asking to install. Click **Install** and wait ~5 minutes.

Verify:
```bash
xcode-select -p
```

**Expected output:** `/Applications/Xcode.app/Contents/Developer`

### A3. Install Node.js and npm

Check if already installed:
```bash
node -v && npm -v
```

**Expected:** Shows versions like `v20.x.x` and `10.x.x`

If not installed:
1. Go to https://nodejs.org/
2. Download the **LTS version** (20.x recommended)
3. Run the installer
4. Verify with `node -v && npm -v`

### A4. Install CocoaPods

```bash
sudo gem install cocoapods
```

Enter your macOS password when prompted.

**Expected:** Installation completes in ~2 minutes.

Verify:
```bash
pod --version
```

**Expected output:** `1.15.x` or higher

### A5. Verify Apple Developer Program Membership

1. Go to https://developer.apple.com/account
2. Sign in with your Apple ID
3. Verify you see **"Certificates, Identifiers & Profiles"** in the sidebar
4. Note your **Team ID** (10-character alphanumeric, e.g., `ABC123XYZ4`)

**Required:** Active Apple Developer Program membership ($99/year for individuals or organizations)

---

## Step-by-Step Setup

### B1. Navigate to Project Root

```bash
cd /path/to/healthpilot
```

Replace `/path/to/healthpilot` with your actual project directory.

### B2. Install Project Dependencies

```bash
npm install
```

**Expected:** Installs all dependencies from `package.json` in ~2 minutes.

### B3. Verify Capacitor is Already Configured

Check if Capacitor is initialized:
```bash
cat capacitor.config.ts
```

**Expected output:**
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nuvitae.healthpilot',
  appName: 'HealthPilot',
  webDir: 'dist/public',
  // ...
};

export default config;
```

If this file exists and looks correct, **skip to B4**. If not, initialize:

```bash
npx cap init HealthPilot com.nuvitae.healthpilot --web-dir=dist/public
```

### B4. Build the Web Application

```bash
npm run build
```

**Expected:** 
- Build completes in 20-60 seconds
- Creates `dist/public/` directory with `index.html`, JS/CSS bundles, assets
- Output shows: `✓ built in XXXms`

Verify:
```bash
ls -la dist/public/
```

**Expected:** See `index.html`, `assets/`, and other web files.

### B5. Add iOS Platform (If Not Already Added)

Check if iOS platform exists:
```bash
ls ios/
```

If you see `App/`, `App.xcodeproj/`, etc., **skip to B6**.

Otherwise, add iOS platform:
```bash
npx cap add ios
```

**Expected:**
- Creates `ios/` directory
- Generates Xcode project files
- Output shows: `✔ Adding iOS platform` and `✔ Creating iOS project`

### B6. Sync Capacitor to iOS

```bash
npx cap sync ios
```

**Expected:**
- Copies web assets from `dist/public/` → `ios/App/App/public/`
- Updates Capacitor plugins
- Runs `pod install` automatically
- Output shows: `✔ Copying web assets` and `✔ Updating iOS plugins`

If you see CocoaPods errors, run manually:
```bash
cd ios/App && pod install && cd ../..
```

---

## Minimal Native Bootstrap

### C1. Verify Mobile Bootstrap Exists

Check for MobileBootstrap:
```bash
cat client/src/mobile/MobileBootstrap.ts
```

**Expected:** File exists with platform detection, status bar, splash screen, keyboard, and back button handling.

If missing, this file should contain:
- `isNativePlatform()` function checking for Capacitor
- `initializeMobile()` function that:
  - Hides splash screen after app ready
  - Sets status bar style (dark content on light background)
  - Handles keyboard behavior
  - Handles Android back button

### C2. Verify Secure Storage Adapter

```bash
cat client/src/mobile/adapters/SecureStorageAdapter.ts
```

**Expected:** File exists using `@aparajita/capacitor-secure-storage` for iOS Keychain and Android Keystore.

**Critical:** This should NOT use `@capacitor/preferences` (which stores in NSUserDefaults, not Keychain).

### C3. Verify Required Plugins Installed

```bash
npm list @capacitor/core @capacitor/app @capacitor/keyboard @capacitor/status-bar @capacitor/haptics @capacitor/splash-screen @capacitor/preferences @capacitor/filesystem @capacitor/browser @capacitor/share @aparajita/capacitor-secure-storage
```

**Expected:** All 11 plugins listed with versions.

If any missing, install:
```bash
npm install @capacitor/app @capacitor/keyboard @capacitor/status-bar @capacitor/haptics @capacitor/splash-screen @capacitor/preferences @capacitor/filesystem @capacitor/browser @capacitor/share @aparajita/capacitor-secure-storage
```

Then sync:
```bash
npx cap sync ios
```

---

## iOS Configuration in Xcode

### D1. Open iOS Project in Xcode

```bash
npx cap open ios
```

**Expected:** Xcode launches and opens the `App.xcworkspace` file.

**Important:** Always open the `.xcworkspace` file, NOT the `.xcodeproj` file (because CocoaPods uses workspaces).

### D2. Set iOS Deployment Target

In Xcode:
1. Click on **App** (blue icon) in the left sidebar (Project Navigator)
2. Select the **App** target under **TARGETS**
3. Click the **General** tab
4. Under **Deployment Info** → **iOS**, set dropdown to **15.0**
5. Verify **iPhone** and **iPad** are both checked under **Supported Destinations**

**Expected:** iOS Deployment Target now shows **15.0**.

### D3. Configure Signing & Capabilities

Still in the **App** target:

1. Click the **Signing & Capabilities** tab
2. Under **Signing**:
   - Check **✓ Automatically manage signing**
   - **Team:** Select your Apple Developer Team from dropdown (shows your name or organization)
   - **Bundle Identifier:** Verify it shows `com.nuvitae.healthpilot`
   - **Provisioning Profile:** Should auto-populate to "Xcode Managed Profile"

**Expected:** 
- No red error icons
- Status shows "Successfully signed" with your team name
- If you see "No signing certificate found", click **Add Account** and sign in with your Apple ID

### D4. Set Display Name and Version

1. Still in **General** tab under **Identity**:
   - **Display Name:** `HealthPilot`
   - **Version:** `1.0.0`
   - **Build:** `1`

**Expected:** These fields are now set correctly.

---

## HealthKit Entitlements and Permissions

### E1. Add HealthKit Capability

In Xcode, with **App** target selected:

1. Go to **Signing & Capabilities** tab
2. Click **+ Capability** (top left)
3. Search for **"HealthKit"**
4. Double-click **HealthKit** to add it

**Expected:** 
- HealthKit appears in capabilities list
- Shows checkboxes for "Clinical Health Records" and "Background Delivery"
- Neither box needs to be checked for basic HealthKit

### E2. Add Privacy Strings to Info.plist

In Xcode left sidebar (Project Navigator):
1. Navigate to **App** → **App** → **Info.plist**
2. Right-click on any row and select **Add Row**
3. Add the following keys (exact spelling matters):

**Key 1:**
- **Key:** `NSHealthShareUsageDescription`
- **Type:** String
- **Value:** `HealthPilot needs access to your health data to provide personalized insights, track your fitness progress, and generate AI-powered recommendations.`

**Key 2:**
- **Key:** `NSHealthUpdateUsageDescription`
- **Type:** String
- **Value:** `HealthPilot writes workout sessions and nutrition data to your Health app to keep all your health information synchronized.`

**Expected:** Info.plist now shows both keys with your descriptions.

**Verification:** Click **App** → **App** → **Info.plist** and you should see both `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription`.

### E3. Verify HealthKit Adapter Exists

```bash
cat client/src/mobile/adapters/HealthKitAdapter.ts
```

**Expected:** File exists with:
- `isAvailable()` function
- `requestAuthorization()` function
- `queryHealthData()` function with typed metric parameters
- Platform detection (iOS only, not available on web/Android)

If file is missing, create it:

```bash
cat > client/src/mobile/adapters/HealthKitAdapter.ts << 'EOF'
/**
 * HealthKitAdapter.ts
 * 
 * Provides access to iOS HealthKit data.
 * Uses capacitor-health plugin for HealthKit integration.
 */

import { HealthKit } from 'capacitor-health';
import { isNativePlatform } from '../MobileBootstrap';

export interface HealthKitAdapter {
  isAvailable(): Promise<boolean>;
  requestAuthorization(readTypes: string[], writeTypes: string[]): Promise<boolean>;
  queryHealthData(type: string, startDate: Date, endDate: Date): Promise<any[]>;
}

class NativeHealthKit implements HealthKitAdapter {
  async isAvailable(): Promise<boolean> {
    try {
      const result = await HealthKit.isAvailable();
      return result.available;
    } catch {
      return false;
    }
  }

  async requestAuthorization(readTypes: string[], writeTypes: string[]): Promise<boolean> {
    try {
      await HealthKit.requestAuthorization({
        read: readTypes,
        write: writeTypes,
      });
      return true;
    } catch (error) {
      console.error('HealthKit authorization failed:', error);
      return false;
    }
  }

  async queryHealthData(type: string, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const result = await HealthKit.queryQuantitySamples({
        sampleType: type,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      return result.samples || [];
    } catch (error) {
      console.error('HealthKit query failed:', error);
      return [];
    }
  }
}

class WebHealthKit implements HealthKitAdapter {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestAuthorization(): Promise<boolean> {
    console.warn('HealthKit not available on web');
    return false;
  }

  async queryHealthData(): Promise<any[]> {
    console.warn('HealthKit not available on web');
    return [];
  }
}

export const healthKitAdapter: HealthKitAdapter = isNativePlatform() 
  ? new NativeHealthKit() 
  : new WebHealthKit();
EOF
```

Install the HealthKit plugin:
```bash
npm install capacitor-health
npx cap sync ios
```

---

## Deep Links Setup

### F1. Add URL Scheme (Custom Scheme)

In Xcode:
1. Select **App** target → **Info** tab
2. Expand **URL Types** section (or add it if missing)
3. Click **+** to add a new URL Type
4. Fill in:
   - **Identifier:** `com.nuvitae.healthpilot.url`
   - **URL Schemes:** `healthpilot`
   - **Role:** Editor

**Expected:** URL Types now shows one entry with scheme `healthpilot`.

**Test URL:** `healthpilot://open?screen=profile`

### F2. Configure Associated Domains (Universal Links)

In Xcode:
1. Select **App** target → **Signing & Capabilities** tab
2. Click **+ Capability**
3. Add **Associated Domains**
4. Click **+** under Associated Domains
5. Enter: `applinks:nuvitae.com`

**Expected:** Associated Domains capability added with `applinks:nuvitae.com` entry.

**Server Requirement:** Your server at `https://nuvitae.com/.well-known/apple-app-site-association` must serve a valid AASA file:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "<Your Team ID>.com.nuvitae.healthpilot",
        "paths": ["*"]
      }
    ]
  }
}
```

Replace `<Your Team ID>` with your actual Apple Team ID (e.g., `ABC123XYZ4.com.nuvitae.healthpilot`).

### F3. Update capacitor.config.ts

Open `capacitor.config.ts` and ensure it includes:

```typescript
const config: CapacitorConfig = {
  appId: 'com.nuvitae.healthpilot',
  appName: 'HealthPilot',
  webDir: 'dist/public',
  server: {
    hostname: 'app.healthpilot.local',
    iosScheme: 'healthpilot',
  },
  ios: {
    scheme: 'HealthPilot',
  },
};
```

Then sync:
```bash
npx cap sync ios
```

---

## Icons & Splash Screen Generation

### G1. Prepare Source Assets

Create a source icon:
- **Size:** 1024×1024 px PNG
- **Name:** `icon-1024.png`
- **Location:** `attached_assets/icon-1024.png`

Create a splash screen:
- **Size:** 2732×2732 px PNG (recommended)
- **Name:** `splash-2732.png`
- **Location:** `attached_assets/splash-2732.png`

### G2. Generate All iOS Assets

The project includes a generation script. Run:

```bash
node scripts/generate-icons-and-splash.mjs
```

**Expected:** 
- Generates all required icon sizes in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Generates splash screens in `ios/App/App/Assets.xcassets/Splash.imageset/`
- Creates `Contents.json` manifests

**Manual Alternative (if script not available):**

Use an online tool:
1. Go to https://www.appicon.co/
2. Upload your 1024×1024 icon
3. Select **iOS** only
4. Download the generated package
5. Open Xcode → **App** → **Assets.xcassets** → **AppIcon**
6. Drag and drop each icon to its corresponding slot

For splash:
1. Open Xcode → **App** → **Assets.xcassets**
2. Right-click → **New Image Set** → Name it "Splash"
3. Drag your splash image into the **Universal** slot

### G3. Verify Assets in Xcode

In Xcode:
1. Navigate to **App** → **App** → **Assets.xcassets** → **AppIcon**
2. Verify all icon slots are filled (no empty slots)
3. Navigate to **Splash**
4. Verify splash image is present

**Expected:** All icon sizes show your app icon, splash shows your splash screen.

---

## Run in Simulator

### H1. Select Simulator

In Xcode:
1. Click the device/simulator selector in the toolbar (next to "App" scheme)
2. Select any iPhone simulator (e.g., **iPhone 15 Pro**)

**Expected:** Toolbar shows "App > iPhone 15 Pro"

### H2. Build and Run

Click the **▶ Play** button in Xcode toolbar (or press **⌘R**).

**Expected (first build takes 2-5 minutes):**
1. Build progress shows in Xcode status bar
2. Simulator boots (if not already running)
3. App installs and launches
4. You see:
   - Splash screen briefly
   - Status bar appears
   - Web app loads showing HealthPilot UI

**If you see a white screen:**
- Check Console for errors (View → Debug Area → Activate Console)
- Verify `dist/public/` contains `index.html`
- Run `npx cap sync ios` again

### H3. Open Safari Web Inspector

To debug the web layer:
1. Open **Safari** on your Mac
2. Go to **Safari** menu → **Settings** → **Advanced**
3. Check **✓ Show features for web developers**
4. In Safari menu bar: **Develop** → **Simulator - iPhone 15 Pro** → **HealthPilot**
5. Web Inspector opens showing Console, Network, Elements tabs

**Expected:** You can now debug JavaScript, view network requests, inspect DOM.

### H4. Test Basic Functionality

In the simulator:
1. Navigate through the app
2. Try deep link: In Terminal, run:
   ```bash
   xcrun simctl openurl booted healthpilot://open
   ```
   **Expected:** App opens/comes to foreground

3. **HealthKit Note:** Simulator has LIMITED HealthKit support. Authorization dialogs may not appear or may auto-deny. This is normal.

---

## Run on Physical Device

### I1. Connect iPhone/iPad

1. Connect your iPhone or iPad via USB-C/Lightning cable
2. Unlock the device
3. If prompted "Trust This Computer?", tap **Trust** and enter device passcode
4. Wait 10-30 seconds for device to appear in Xcode

### I2. Select Your Device

In Xcode:
1. Click device selector in toolbar
2. Under **iOS Device** section, select your device (e.g., **Jordan's iPhone**)

**Expected:** Toolbar shows "App > [Your Device Name]"

### I3. Register Device (First Time Only)

If this is your first time running on this device:

1. Go to https://developer.apple.com/account/resources/devices/list
2. Click **+** to add device
3. Enter:
   - **Device Name:** (e.g., "Jordan's iPhone")
   - **Device ID (UDID):** Get from Xcode: Window → Devices and Simulators → select device → copy **Identifier**
4. Click **Continue** → **Register**

**Expected:** Device registered in Developer Portal.

### I4. Build and Run on Device

Click **▶ Play** button (or press **⌘R**).

**First time you'll see signing errors:**

**Error:** "Untrusted Developer"

**Fix:**
1. On your iPhone/iPad, go to **Settings** → **General** → **VPN & Device Management**
2. Under **Developer App**, tap your Apple ID
3. Tap **Trust "[Your Name]"**
4. Tap **Trust** in confirmation dialog

**Expected:** App now runs on your device.

### I5. Test HealthKit on Real Device

On your iPhone/iPad:
1. Open HealthPilot app
2. Navigate to a screen that requests HealthKit access
3. **Expected:** iOS shows HealthKit authorization dialog listing all requested data types
4. Tap **Turn On All** or select individual types → **Allow**

**Expected:** App can now read/write HealthKit data (unlike Simulator).

### I6. Test Deep Links on Device

**Custom Scheme:**
1. Open Safari on your iPhone
2. Go to `healthpilot://open`
3. **Expected:** Dialog appears "Open in HealthPilot?" → Tap **Open** → App launches

**Universal Link:**
1. Ensure AASA file is live at `https://nuvitae.com/.well-known/apple-app-site-association`
2. Open Safari on iPhone
3. Go to `https://nuvitae.com/some-path`
4. **Expected:** Banner appears "Open in HealthPilot" → Tap → App opens

---

## Archive & TestFlight Distribution

### J1. Increment Version and Build Number

In Xcode:
1. Select **App** target → **General** tab
2. Under **Identity**:
   - **Version:** `1.0.0` (or increment for updates: `1.0.1`, `1.1.0`, etc.)
   - **Build:** `1` (increment for each submission: `1`, `2`, `3`, etc.)

**Required:** Each TestFlight upload must have a unique **Build** number (even if **Version** stays the same).

### J2. Select Generic iOS Device

In Xcode:
1. Click device selector
2. Select **Any iOS Device (arm64)**

**Expected:** Toolbar shows "App > Any iOS Device (arm64)"

**Do NOT select a specific device or simulator for archiving.**

### J3. Set Build Configuration to Release

In Xcode menu bar:
1. **Product** → **Scheme** → **Edit Scheme...**
2. Select **Run** in left sidebar
3. **Build Configuration:** Change from **Debug** to **Release**
4. Click **Close**

**Expected:** Scheme now uses Release configuration.

**Optional:** Revert to Debug for daily development:
- Repeat above steps and set back to **Debug**

### J4. Create Archive

In Xcode menu bar:
1. **Product** → **Clean Build Folder** (⌘⇧K)
2. Wait for "Clean Finished"
3. **Product** → **Archive**

**Expected:**
- Build starts (takes 1-3 minutes)
- Progress shows "Archiving App..."
- On success, **Organizer** window opens showing your archive

**If archive fails:**
- Check **Report Navigator** (View → Navigators → Show Report Navigator)
- Look for red errors in build log
- Common issues: Code signing, missing entitlements, build errors in native code

### J5. Validate Archive

In the **Organizer** window:
1. Select your archive (should be highlighted)
2. Click **Validate App** button on right
3. **App Store Connect** dialog appears:
   - **Distribute:** App Store Connect
   - Click **Next**
4. **Destination:** Upload
   - Click **Next**
5. **App Store Distribution Options:**
   - ✓ Upload your app's symbols
   - ✓ Manage Version and Build Number (optional)
   - Click **Next**
6. **Signing:**
   - ○ Automatically manage signing (recommended)
   - Click **Next**
7. Review summary → Click **Validate**

**Expected:**
- Validation runs 30-90 seconds
- Shows green checkmark: "App successfully validated"
- Click **Done**

**If validation fails:**
- Read error message carefully
- Common issues: Missing icons, invalid entitlements, export compliance

### J6. Upload to App Store Connect

In **Organizer** (still open):
1. Click **Distribute App** button
2. Follow same wizard as validation (steps 3-6 above)
3. On final screen, click **Upload**

**Expected:**
- Upload takes 2-5 minutes (depends on app size and internet speed)
- Shows progress: "Uploading package..."
- On success: "Upload Successful"
- Click **Done**

### J7. Wait for Processing

1. Go to https://appstoreconnect.apple.com/
2. Sign in with your Apple ID
3. Click **My Apps** → **HealthPilot** (or create app if first time)
4. Go to **TestFlight** tab
5. Under **iOS Builds**, you'll see your build with status:
   - **Processing** (takes 5-15 minutes)
   - When ready, status changes to **Ready to Submit** / **Missing Compliance**

**Expected:** After processing, build shows version `1.0.0 (1)` with yellow warning icon.

### J8. Provide Export Compliance

Still in **TestFlight** → **iOS Builds**:
1. Click on your build
2. Click **Provide Export Compliance Information**
3. Questions:
   - **Is your app designed to use cryptography or does it contain or incorporate cryptography?**
     - Select **No** if you only use HTTPS and standard encryption
     - Select **Yes** if using additional encryption (rare)
   - Follow prompts
4. Click **Start Internal Testing**

**Expected:** Build status changes to **Ready to Test**.

### J9. Add Internal Testers

In **TestFlight** tab:
1. Click **Internal Testing** in left sidebar (or create group if missing)
2. If no group exists:
   - Click **+** → **Create Group**
   - **Group Name:** "Internal Testers"
   - Click **Create**
3. Click **Add Build** → Select your build `1.0.0 (1)` → **Add**
4. Under **Testers**, click **+**
5. Select testers (or add new tester with email) → **Add**

**Expected:** 
- Testers receive email with TestFlight invitation
- They can install TestFlight app from App Store and install HealthPilot

### J10. Configure App Privacy

In **App Store Connect** → **My Apps** → **HealthPilot**:
1. Go to **App Privacy** in left sidebar
2. Click **Get Started**
3. Answer questions about data collection:
   - **Health and Fitness:** YES (you collect HealthKit data)
   - **Contact Info:** (if collecting email, name)
   - **Usage Data:** (if collecting analytics)
4. For each data type, specify:
   - **Linked to user:** Yes/No
   - **Used for tracking:** No (recommended)
   - **Purposes:** Health, Fitness, App Functionality
5. Click **Save**

**Expected:** App Privacy status shows "Privacy Policy Approved" or "In Review".

---

## Debugging & Logs

### K1. Xcode Console Logs

To view native iOS logs:
1. In Xcode, run app on device/simulator
2. Open **Debug Area**: View → Debug Area → Activate Console (⌘⇧Y)
3. See logs in bottom panel

**Filter logs:**
- Type `healthpilot` in search field to filter your app's logs only

**Useful log patterns:**
```
[Capacitor] Loading app at...
[HealthKit] Requesting authorization...
[SecureStorage] Writing to Keychain...
```

### K2. Safari Web Inspector for WKWebView

To debug JavaScript/web layer:
1. Run app on device or simulator
2. Open **Safari** → **Develop** → **[Device/Simulator Name]** → **HealthPilot**
3. Web Inspector opens with:
   - **Console:** JavaScript logs, errors
   - **Network:** HTTP requests
   - **Elements:** DOM inspection
   - **Sources:** JavaScript debugging with breakpoints

### K3. Crash Logs

If app crashes on device:
1. In Xcode: **Window** → **Devices and Simulators**
2. Select your device
3. Click **View Device Logs**
4. Find most recent crash report for **HealthPilot**
5. Right-click → **Export** to save

**Expected:** Crash report shows stack trace pointing to issue.

### K4. Disable Verbose Logs for Release

Before submitting to App Store:
1. Open `client/src/mobile/MobileBootstrap.ts`
2. Remove or comment out `console.log()` statements
3. Rebuild and re-archive

**Production apps should minimize console output.**

---

## Troubleshooting

### L1. CocoaPods Issues

**Error:** `pod install` fails or shows outdated specs

**Fix:**
```bash
# Update CocoaPods repository
pod repo update

# Clear CocoaPods cache
pod cache clean --all

# Reinstall pods
cd ios/App
rm -rf Pods/ Podfile.lock
pod install
cd ../..
```

Then sync:
```bash
npx cap sync ios
```

---

### L2. Code Signing Failures

**Error:** "Signing for 'App' requires a development team"

**Fix:**
1. In Xcode → **App** target → **Signing & Capabilities**
2. Select your **Team** from dropdown
3. If no team appears: **Add Account** → Sign in with Apple ID
4. If still failing: Ensure Apple Developer Program membership is active

---

**Error:** "Provisioning profile doesn't include signing certificate"

**Fix:**
1. Go to https://developer.apple.com/account/resources/profiles
2. Delete all profiles for `com.nuvitae.healthpilot`
3. In Xcode, uncheck then re-check **Automatically manage signing**
4. Xcode regenerates profiles

---

### L3. HealthKit Authorization Issues

**Error:** "HealthKit authorization request not showing"

**Fix:**
1. **On Simulator:** HealthKit dialogs often don't appear. **Test on real device.**
2. **Check Info.plist:** Ensure `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` exist
3. **Check Capability:** Ensure HealthKit capability is added in Xcode
4. **Reset Permissions:** On device, Settings → HealthPilot → Reset Location & Privacy → Delete App → Reinstall

---

**Error:** "HealthKit unavailable"

**Cause:** Android or web browser (HealthKit is iOS-only)

**Fix:** 
- Ensure `HealthKitAdapter` checks `isNativePlatform()` and returns graceful fallback on web

---

### L4. Deep Links Not Working

**Error:** Custom scheme `healthpilot://` doesn't open app

**Fix:**
1. Verify URL Type added in Xcode Info → URL Types
2. Check scheme is lowercase: `healthpilot` (not `HealthPilot`)
3. Test with command:
   ```bash
   xcrun simctl openurl booted healthpilot://test
   ```

---

**Error:** Universal links `https://nuvitae.com/...` open in Safari instead of app

**Fix:**
1. Verify AASA file exists at `https://nuvitae.com/.well-known/apple-app-site-association`
2. Check AASA file format (must be valid JSON, no `.json` extension)
3. Verify `appID` format: `<TeamID>.com.nuvitae.healthpilot`
4. Check Associated Domains in Xcode: must be `applinks:nuvitae.com` (no https://)
5. Test with command:
   ```bash
   xcrun simctl openurl booted https://nuvitae.com/test
   ```
6. **CDN Caching:** If AASA file was just uploaded, wait 15 minutes or clear CDN cache

---

### L5. White Screen at Launch

**Error:** App launches but shows blank white screen

**Fix:**
1. **Check web build exists:**
   ```bash
   ls -la dist/public/index.html
   ```
   If missing, run `npm run build`

2. **Re-sync Capacitor:**
   ```bash
   npx cap sync ios
   ```

3. **Check base href in index.html:**
   - Open `dist/public/index.html`
   - Ensure `<base href="/">` or no base tag (Capacitor uses relative paths)

4. **Check Safari Web Inspector:**
   - Open Web Inspector (see K2)
   - Look for 404 errors on JavaScript bundles
   - Look for CORS errors

5. **Check Capacitor config:**
   - Ensure `webDir: 'dist/public'` in `capacitor.config.ts`
   - Ensure `iosScheme` is set

---

### L6. Build Errors in Xcode

**Error:** Swift compiler errors in native plugins

**Fix:**
1. Clean build folder: **Product** → **Clean Build Folder** (⌘⇧K)
2. Close Xcode
3. Delete derived data:
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   ```
4. Reopen Xcode and rebuild

---

**Error:** "Framework not found Capacitor"

**Fix:**
```bash
cd ios/App
pod deintegrate
pod install
cd ../..
npx cap sync ios
```

---

### L7. TestFlight Upload Fails

**Error:** "Invalid Bundle" or "Missing required icon"

**Fix:**
1. Ensure all icon sizes are filled in Assets.xcassets → AppIcon
2. Run validation before upload (see J5)
3. Check for missing entitlements

---

**Error:** "Asset validation failed"

**Fix:**
- Increment **Build** number (must be unique for each upload)
- Ensure **Version** format is `X.Y.Z` (e.g., `1.0.0`)

---

## Validation Checklist

Use this checklist before submitting to TestFlight:

- [ ] **Capacitor Sync:** Run `npx cap sync ios` with no errors
- [ ] **Web Build:** `dist/public/` contains `index.html` and assets
- [ ] **Simulator Boot:** App launches in simulator without white screen
- [ ] **Physical Device Boot:** App launches on real iPhone/iPad
- [ ] **HealthKit Authorization:** Permission dialog shows on device (not required on simulator)
- [ ] **HealthKit Handles Denial:** App doesn't crash if user denies HealthKit
- [ ] **Custom Scheme Deep Link:** `healthpilot://open` opens app
- [ ] **Universal Link (if configured):** `https://nuvitae.com/path` opens app
- [ ] **App Icons:** All icon sizes present in Assets.xcassets
- [ ] **Splash Screen:** Displays correctly on launch
- [ ] **Status Bar:** Shows correctly (not overlapping content)
- [ ] **No Console Spam:** Minimal logs in Release build
- [ ] **Secure Storage:** Auth tokens persist after app restart (test login)
- [ ] **Archive Success:** Archive builds without errors
- [ ] **Validation Pass:** Archive validates in Organizer
- [ ] **TestFlight Upload:** Upload completes successfully
- [ ] **TestFlight Processing:** Build shows "Ready to Test" status
- [ ] **TestFlight Install:** Testers can install via TestFlight app

---

## M. Stripe Payment Integration (Apple Pay + Credit Cards)

### M1. Overview

The iOS app includes a native Stripe Payment plugin that enables:
- **Apple Pay** (iOS native, seamless checkout)
- **Credit/Debit Cards** (via Stripe Payment Sheet)
- **Premium Subscription** ($19.99/month or $191.88/year)
- **Enterprise Subscription** ($99.99/month or $959.88/year)

**Key Files:**
- `ios/App/App/StripePaymentPlugin.swift` - Native Stripe SDK integration
- `ios/App/App/StripePaymentPlugin.m` - Capacitor plugin registration
- `client/src/services/stripe-payment.ts` - TypeScript plugin interface
- `client/src/services/payment.ts` - Unified payment service (iOS + web)

### M2. Configure Stripe API Keys

#### Add Keys to AppDelegate

Edit `ios/App/App/AppDelegate.swift` and add Stripe initialization:

```swift
import UIKit
import Capacitor
import StripePaymentSheet

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    
    var window: UIWindow?
    
    func application(_ application: UIApplication, 
                    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        
        // Initialize Stripe SDK with publishable key
        StripeAPI.defaultPublishableKey = "YOUR_STRIPE_PUBLISHABLE_KEY_HERE"
        
        return true
    }
    
    // ... rest of existing methods ...
}
```

**Get Your Stripe Keys:**
1. Go to https://dashboard.stripe.com/apikeys
2. Sign in (or create account)
3. Copy **Publishable key** (starts with `pk_test_` for test mode)
4. For production, use **live keys** (`pk_live_`)

**Current Keys in Replit:**
- `STRIPE_SECRET_KEY` - Backend only (server-side)
- `STRIPE_PUBLISHABLE_KEY` - Frontend/iOS (safe to embed)

Replace `YOUR_STRIPE_PUBLISHABLE_KEY_HERE` with actual key from Replit Secrets.

#### Verify Podfile Includes Stripe

Check `ios/App/Podfile` has:

```ruby
# Stripe SDK for iOS native payments
pod 'StripePaymentSheet', '~> 23.0'
```

This is already configured in your project.

#### Install Stripe SDK

```bash
cd ios/App
pod install
cd ../..
```

This downloads the Stripe iOS SDK (~15MB).

### M3. Configure Apple Pay Merchant ID

#### Create Merchant ID in Apple Developer Portal

1. Go to https://developer.apple.com/account/resources/identifiers/list/merchant
2. Click **+** to add new Merchant ID
3. **Description:** HealthPilot Payments
4. **Identifier:** `merchant.com.nuvitae.healthpilot`
5. Click **Continue** → **Register**

#### Add Merchant ID to Xcode

1. Open `ios/App/App.xcworkspace` in Xcode
2. Select **App** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability** → **Apple Pay**
5. Click **+** under Merchant IDs
6. Select `merchant.com.nuvitae.healthpilot`
7. Build the project (⌘B) to verify

**Note:** The merchant ID `merchant.com.nuvitae.healthpilot` is already configured in `StripePaymentPlugin.swift` line 22.

### M4. How iOS Payment Flow Works

#### User Journey
```
1. User opens Subscription page in iOS app
2. Selects Premium ($19.99/month)
3. Taps "Upgrade to Premium"
4. Native payment sheet appears with:
   - Apple Pay (if configured)
   - Add Credit/Debit Card
5. User completes payment
6. App confirms subscription
7. Premium features unlocked
```

#### Technical Flow
```typescript
// Step 1: Create payment intent on backend
POST /api/payments/create-intent
Request: { tier: 'premium', billingCycle: 'monthly' }
Response: {
  clientSecret: 'pi_xxx_secret_yyy',
  ephemeralKey: 'ek_xxx',
  customerId: 'cus_xxx',
  amount: 1999,
  currency: 'usd'
}

// Step 2: Present native Stripe Payment Sheet (iOS)
StripePaymentPlugin.presentPaymentSheet({
  clientSecret,
  merchantDisplayName: 'HealthPilot',
  customerId,
  ephemeralKey
})

// Step 3: User completes payment
// Payment Sheet handles:
// - Apple Pay authentication (Face ID/Touch ID)
// - Credit card 3D Secure validation
// - Payment confirmation

// Step 4: Confirm subscription on backend
POST /api/payments/confirm-subscription
Request: { paymentIntentId: 'pi_xxx' }
Response: {
  success: true,
  subscriptionId: 'sub_xxx',
  tier: 'premium'
}

// Step 5: Update user in database
UPDATE users SET subscription_tier = 'premium' WHERE id = 'xxx'
```

### M5. Testing Payments

#### Test in Simulator (Cards Only)
**Note:** Apple Pay doesn't work in simulator, only on physical device.

1. Build and run in simulator (⌘R)
2. Navigate to Subscription page
3. Tap "Upgrade to Premium"
4. Select "Add Card"
5. Use Stripe test card:
   - **Card Number:** `4242 4242 4242 4242`
   - **Expiry:** Any future date (e.g., `12/28`)
   - **CVC:** Any 3 digits (e.g., `123`)
   - **ZIP:** Any 5 digits (e.g., `12345`)
6. Complete payment
7. Verify Premium badge appears

**Other Test Cards:**
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- Full list: https://stripe.com/docs/testing#cards

#### Test Apple Pay on Physical Device

**Prerequisites:**
1. Physical iPhone (iOS 15+)
2. Wallet app configured with test card
3. App deployed to device

**Steps:**
1. Connect iPhone via USB
2. Build and run to device (⌘R)
3. Navigate to Subscription page
4. Tap "Upgrade to Premium"
5. Verify Apple Pay appears as first option
6. Tap Apple Pay
7. Authenticate with Face ID/Touch ID
8. Complete payment
9. Verify subscription activated

**Add Test Card to Wallet:**
1. Open Wallet app on iPhone
2. Tap **+** to add card
3. Add Stripe test card: `4242 4242 4242 4242`
4. Use for Apple Pay testing

### M6. Production Deployment

#### Switch to Live Stripe Keys

**Before submitting to App Store:**

1. Get live Stripe keys from https://dashboard.stripe.com/apikeys
2. Update `AppDelegate.swift`:
   ```swift
   StripeAPI.defaultPublishableKey = "pk_live_YOUR_LIVE_KEY"
   ```
3. Update Replit Secrets with live `STRIPE_SECRET_KEY`
4. Rebuild iOS app
5. Test with real card (small amount)
6. Archive and upload to TestFlight

**Important:** Never commit API keys to git. Use environment variables or Info.plist with build configurations.

### M7. Troubleshooting

#### "Stripe not found" Error
**Solution:** Make sure you opened `App.xcworkspace` (not `App.xcodeproj`)

#### Payment Sheet Doesn't Appear
**Check:**
1. `StripeAPI.defaultPublishableKey` is set in AppDelegate
2. Stripe pod installed: `cd ios/App && pod install`
3. Backend returns valid `clientSecret`
4. Check Xcode console for errors

#### Apple Pay Not Showing
**Requirements:**
- Physical device (not simulator)
- Wallet app has at least one card
- Merchant ID configured in Capabilities
- `merchant.com.nuvitae.healthpilot` matches code

#### Payment Intent Creation Fails
**Check backend logs:**
```bash
# In Replit
grep "Error creating payment intent" /tmp/logs/Start_application*.log
```

**Common issues:**
- Invalid Stripe API version (should be `2025-09-30.clover`)
- Missing API keys
- Network connectivity

#### Subscription Not Activating
**Debug flow:**
1. Check payment completed in Stripe Dashboard
2. Verify `/api/payments/confirm-subscription` called
3. Check database: `SELECT subscription_tier FROM users WHERE id = 'xxx'`
4. Clear app data and re-login

### M8. Stripe Dashboard Monitoring

**View Transactions:**
1. Go to https://dashboard.stripe.com/payments
2. See all payment attempts (successful + failed)
3. Click payment to see full details

**View Customers:**
1. Go to https://dashboard.stripe.com/customers
2. See all users with payment methods
3. View subscription history

**Set Up Webhooks (Optional):**
For production, handle:
- `payment_intent.succeeded` - Payment completed
- `payment_intent.payment_failed` - Payment declined
- `customer.subscription.updated` - Subscription changed
- `customer.subscription.deleted` - Subscription cancelled

**Webhook Endpoint:** `https://yourdomain.com/api/stripe/webhook`

### M9. Backend API Reference

#### Create Payment Intent
```http
POST /api/payments/create-intent
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "tier": "premium",
  "billingCycle": "monthly",
  "promoCode": "SAVE20" // optional
}
```

**Response:**
```json
{
  "clientSecret": "pi_xxx_secret_yyy",
  "ephemeralKey": "ek_xxx",
  "customerId": "cus_xxx",
  "amount": 1999,
  "currency": "usd",
  "discountApplied": false,
  "discountAmount": 0
}
```

#### Confirm Subscription
```http
POST /api/payments/confirm-subscription
Content-Type: application/json
Authorization: Bearer <user_token>

{
  "paymentIntentId": "pi_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "subscriptionId": "sub_xxx",
  "tier": "premium"
}
```

---

## Quick Command Reference

### Daily Development
```bash
# Build web app
npm run build

# Sync to iOS
npx cap sync ios

# Open in Xcode
npx cap open ios

# Build and run (Xcode: ⌘R or CLI below)
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 15 Pro'
```

### Capacitor Management
```bash
# Add iOS platform (first time only)
npx cap add ios

# Sync web assets and plugins
npx cap sync ios

# Update Capacitor
npm install @capacitor/cli@latest @capacitor/core@latest @capacitor/ios@latest
npx cap sync ios
```

### CocoaPods
```bash
# Install/update pods
cd ios/App && pod install && cd ../..

# Update pod repo
pod repo update

# Clean and reinstall
cd ios/App
rm -rf Pods/ Podfile.lock
pod install
cd ../..
```

### Deep Link Testing
```bash
# Custom scheme (simulator)
xcrun simctl openurl booted healthpilot://open?screen=profile

# Universal link (simulator)
xcrun simctl openurl booted https://nuvitae.com/profile

# Custom scheme (device via Terminal)
# Install 'libimobiledevice': brew install libimobiledevice
idevice-url "healthpilot://open"
```

### Xcode CLI Commands
```bash
# Build for simulator
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator

# Archive for distribution
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Release archive -archivePath ./build/App.xcarchive

# List available simulators
xcrun simctl list devices available

# Boot specific simulator
xcrun simctl boot "iPhone 15 Pro"
```

### Debugging
```bash
# View iOS simulator logs
xcrun simctl spawn booted log stream --predicate 'subsystem contains "com.nuvitae.healthpilot"'

# View device logs (requires Xcode)
# Use: Xcode → Window → Devices and Simulators → Select device → Open Console
```

---

## Final Notes

**Before First TestFlight Submission:**
1. Complete App Store Connect listing (screenshots, description, keywords)
2. Add Privacy Policy URL in App Store Connect
3. Complete App Privacy section (see J10)
4. Set age rating
5. Add test user accounts if app requires login
6. Provide demo video if app has complex features

**TestFlight Limitations:**
- Max 10,000 external testers
- Max 100 internal testers (team members)
- Builds expire after 90 days
- Must provide export compliance info for each build

**Production Submission:**
After testing via TestFlight, submit for App Store Review:
1. In App Store Connect → **HealthPilot** → **App Store** tab
2. Click **+** to add new version
3. Fill out all required metadata
4. Select your TestFlight build
5. Submit for Review

**Review time:** 1-3 days typically

---

**You now have a complete, executable guide to build, run, and distribute HealthPilot on iOS!**
