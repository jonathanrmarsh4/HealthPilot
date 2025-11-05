# Live Activities Setup Guide for HealthPilot

## Overview
This guide will walk you through setting up Live Activities for the workout tracking feature. Live Activities display on the iPhone lock screen and allow users to see their workout progress and interact without unlocking.

## Prerequisites
- Xcode 14.1+ installed
- iOS 16.1+ target device for testing
- Apple Developer account
- HealthPilot iOS project open in Xcode

## Part 1: Create Widget Extension in Xcode

### Step 1: Add Widget Extension Target

1. Open `ios/App/App.xcodeproj` in Xcode
2. Click **File → New → Target**
3. In the template chooser:
   - Select **iOS** tab
   - Scroll to **Widget Extension**
   - Click **Next**
4. Configure the extension:
   - Product Name: `WorkoutWidgetExtension`
   - Team: Select your team
   - Language: **Swift**
   - **UNCHECK** "Include Configuration Intent" (we don't need it)
   - Click **Finish**
5. When prompted "Activate WorkoutWidgetExtension scheme?", click **Activate**

### Step 2: Configure App Groups

App Groups allow data sharing between the main app and the widget.

**For Main App:**
1. Select the **App** target in Xcode
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **App Groups**
5. Click **+** and create: `group.com.healthpilot.workout`
6. Check the checkbox next to it

**For Widget Extension:**
1. Select the **WorkoutWidgetExtension** target
2. Go to **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **App Groups**
5. Click **+** and add the SAME group: `group.com.healthpilot.workout`
6. Check the checkbox

### Step 3: Add Push Notifications Capability

**For Widget Extension:**
1. Still on **WorkoutWidgetExtension** target
2. **Signing & Capabilities** tab
3. Click **+ Capability**
4. Add **Push Notifications**

### Step 4: Replace Widget Code

Xcode created a default widget file. We'll replace it with our workout Live Activity.

1. In Project Navigator, expand **WorkoutWidgetExtension** folder
2. Delete the file `WorkoutWidgetExtension.swift` (Move to Trash)
3. Right-click **WorkoutWidgetExtension** folder → **New File**
4. Choose **Swift File** → **Next**
5. Name it: `WorkoutLiveActivity.swift`
6. Make sure **Target Membership** includes **WorkoutWidgetExtension** (checked)
7. Click **Create**

Now paste this code into `WorkoutLiveActivity.swift`:

```swift
// See WorkoutLiveActivity.swift file in this directory
```

### Step 5: Create Widget Bundle File

1. Right-click **WorkoutWidgetExtension** folder → **New File**
2. Choose **Swift File** → **Next**
3. Name it: `WorkoutWidgetBundle.swift`
4. Paste this code:

```swift
// See WorkoutWidgetBundle.swift file in this directory
```

### Step 6: Update Info.plist

1. In **WorkoutWidgetExtension** folder, find `Info.plist`
2. Right-click → **Open As** → **Source Code**
3. Find the `<dict>` section under `NSExtension`
4. Add this key:

```xml
<key>NSExtensionPrincipalClass</key>
<string>$(PRODUCT_MODULE_NAME).WorkoutWidgetBundle</string>
```

## Part 2: Backend Integration

The backend code has been automatically created for you in:
- `/server/routes.ts` - API endpoints for Live Activity management
- `/server/services/liveActivities.ts` - APNs push notification service

No manual backend work needed!

## Part 3: React/Capacitor Integration

The Capacitor plugin integration has been created in:
- `/client/src/lib/liveActivity.ts` - TypeScript wrapper
- `/ios/App/App/LiveActivityPlugin.swift` - Native bridge

The WorkoutSession component has been updated to automatically start/update/end Live Activities.

## Part 4: APNs Configuration

### Step 1: Generate APNs Authentication Key

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/authkeys/list)
2. Click **+** to create a new key
3. Name: "HealthPilot APNs Key"
4. Check **Apple Push Notifications service (APNs)**
5. Click **Continue** → **Register**
6. **Download the .p8 file** (you can only download once!)
7. Note the **Key ID** shown

### Step 2: Get Team ID

1. Still in Apple Developer Portal
2. Click your account name (top right) → **View Membership**
3. Note your **Team ID**

### Step 3: Configure OneSignal

1. Log into [OneSignal Dashboard](https://app.onesignal.com/)
2. Select your HealthPilot app
3. Go to **Settings** → **Platforms**
4. Find **Apple iOS (APNs)** section
5. Upload your `.p8` file
6. Enter your **Key ID**
7. Enter your **Team ID**
8. Enter Bundle ID: `com.healthpilot.app` (or your actual bundle ID)
9. Click **Save**

## Part 5: Testing

### Build and Run

1. In Xcode, select your physical iOS device (Simulator won't work for Live Activities)
2. Select **App** scheme (not WorkoutWidgetExtension)
3. Click **Run** (▶️)
4. App should build and install

### Test the Live Activity

1. On your iPhone, open HealthPilot
2. Navigate to Training → Start a workout
3. Complete your first set
4. **Lock your iPhone** (press power button)
5. You should see the Live Activity appear on lock screen showing:
   - Current exercise and set
   - Rest timer counting down
   - Next exercise preview
   - Interactive buttons

### Interact from Lock Screen

1. Tap **Complete Set** button → marks set complete, updates UI
2. Tap **Skip** button → moves to next exercise
3. Tap **End Workout** button → finishes workout, dismisses Live Activity

## Troubleshooting

### Live Activity doesn't appear
- Make sure you're on iOS 16.1+ physical device (not Simulator)
- Check that App Groups match exactly between targets
- Check Xcode console for errors
- Verify APNs is configured in OneSignal

### "Push Notifications not authorized"
- Make sure you granted push notification permission in the app
- Check Push Notifications capability is enabled

### Timer doesn't update
- Check that APNs key is properly uploaded to OneSignal
- Check server logs for push notification errors
- Verify Team ID and Key ID are correct

### Build errors
- Clean build folder: Product → Clean Build Folder
- Delete DerivedData: Xcode → Preferences → Locations → Derived Data → Delete
- Restart Xcode

## Next Steps

Once Live Activities are working, you can customize:
- Widget UI colors/styling in `WorkoutLiveActivity.swift`
- Update frequency (currently updates every 15 seconds during rest)
- Action button behaviors in `WorkoutSession.tsx`

Congratulations! Your users can now track workouts from the lock screen! 🎉
