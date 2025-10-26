# HealthPilot iOS Test Plan

Comprehensive test scenarios for validating the native iOS app.

---

## Test Environment

- **iOS Versions**: 15.0, 16.0, 17.0, 18.0
- **Devices**: iPhone 12/13/14/15, iPad Pro, Simulator
- **Build**: Debug and Release configurations

---

## 1. Installation & Launch Tests

### T1.1: Fresh Install
1. Delete app if already installed
2. Install from Xcode
3. **Expected**: App installs successfully
4. Launch app
5. **Expected**: Splash screen shows for 2s, then dashboard appears

### T1.2: Cold Start Performance
1. Force quit app
2. Start timer
3. Launch app
4. Stop timer when dashboard is interactive
5. **Expected**: < 2.5s on iPhone 12 or newer

### T1.3: Splash Screen
1. Launch app
2. **Expected**: 
   - Black background splash screen shows
   - Duration: ~2 seconds
   - Smooth transition to dashboard

---

## 2. Platform Detection Tests

### T2.1: Native Diagnostics Access
1. Navigate to `/mobile-diagnostics`
2. **Expected**: Native Diagnostics screen loads

### T2.2: Platform Information
1. On diagnostics screen, check "App Information" card
2. **Expected**:
   - Platform: "ios"
   - Native: "Yes"
   - App ID: com.nuvitae.healthpilot
   - Version and build number displayed

### T2.3: Run All Tests
1. Tap "Run All Tests" button
2. **Expected**: All tests execute and show pass/warning/fail status

---

## 3. Secure Storage Tests

### T3.1: Storage Round-Trip
1. Navigate to `/mobile-diagnostics`
2. Tap "Test Secure Storage Round-Trip"
3. **Expected**: Alert shows "✅ Round-trip successful!"

### T3.2: Token Persistence
1. Set auth token via secure storage
2. Force quit app
3. Relaunch app
4. Retrieve auth token
5. **Expected**: Token persists across app restarts

### T3.3: Keychain Integration (iOS Only)
1. Store sensitive data via SecureStorageAdapter
2. Open Settings > Passwords
3. Search for app's keychain entries
4. **Expected**: Data stored in iOS Keychain (may not be visible to user, verify via code)

---

## 4. HealthKit Integration Tests

### T4.1: Permission Request
**Prerequisites**: Device with HealthKit (not all simulators support it)

1. Navigate to `/mobile-diagnostics`
2. Tap "Request HealthKit Permissions"
3. **Expected**: iOS HealthKit permission dialog appears
4. Grant permissions
5. **Expected**: Alert shows "HealthKit permissions granted!"

### T4.2: Permission Denial
1. Request HealthKit permissions
2. Deny all permissions
3. **Expected**: App handles gracefully, shows "permissions denied" message

### T4.3: Read Health Data
1. Grant HealthKit permissions
2. Check HealthKit adapter status
3. **Expected**: "HealthKit available and functional"

### T4.4: Graceful Degradation (Simulator/Android)
1. Run app on Android simulator or iOS simulator without HealthKit
2. **Expected**: 
   - HealthKit shows as "not available"
   - App continues to function
   - No crashes or errors

---

## 5. Haptics Tests

### T5.1: Haptic Feedback
**Prerequisites**: Physical device (simulators don't have haptics)

1. Navigate to `/mobile-diagnostics`
2. Tap "Test Haptic Feedback"
3. **Expected**: 
   - First: Success notification haptic
   - After 500ms: Heavy impact haptic

### T5.2: Interactive Haptics
1. Tap buttons throughout the app
2. **Expected**: Subtle haptic feedback on interactions (if implemented)

---

## 6. Share API Tests

### T6.1: Native Share
1. Navigate to `/mobile-diagnostics`
2. Tap "Test Native Share"
3. **Expected**: iOS share sheet appears with:
   - Title: "HealthPilot Diagnostics"
   - Text: "Mobile diagnostics test from ios"
   - URL: https://healthpilot.pro

### T6.2: Share to Messages
1. Trigger share
2. Select "Messages"
3. **Expected**: Message composer opens with shared content

### T6.3: Share to Mail
1. Trigger share
2. Select "Mail"
3. **Expected**: Mail composer opens with shared content

---

## 7. Browser & Deep Links Tests

### T7.1: In-App Browser
1. Navigate to `/mobile-diagnostics`
2. Tap "Test In-App Browser"
3. **Expected**: 
   - In-app browser opens
   - Loads https://healthpilot.pro
   - Has close button to return to app

### T7.2: Custom URL Scheme
**Requires**: Device or simulator

1. Open Safari (on device/simulator)
2. Type: `healthpilot://open`
3. **Expected**: App opens (if installed)

### T7.3: Universal Links (Production Only)
**Requires**: Associated domains configured

1. Open https://healthpilot.pro in Safari
2. **Expected**: Smart banner or direct open in app

---

## 8. Status Bar & UI Tests

### T8.1: Status Bar Style
1. Launch app
2. Check status bar
3. **Expected**: Dark style status bar (white text/icons)

### T8.2: Keyboard Handling
1. Tap any text input field
2. **Expected**: 
   - Keyboard slides up
   - Content resizes to avoid keyboard
   - Input remains visible

### T8.3: Keyboard Dismiss
1. Tap outside text input
2. **Expected**: Keyboard dismisses smoothly

### T8.4: Safe Area Insets
1. Navigate to various screens
2. **Expected**: 
   - Content respects notch/Dynamic Island
   - No content behind status bar
   - Bottom navigation doesn't hide behind home indicator

---

## 9. Back Button & Navigation Tests

### T9.1: Hardware Back (Android) / Swipe Back (iOS)
1. Navigate to a subpage
2. Swipe from left edge (iOS) or tap back button (Android)
3. **Expected**: Navigates back correctly

### T9.2: Back on Root Screen
1. Navigate to dashboard (root screen)
2. Swipe back or press back
3. **Expected**: App minimizes (doesn't exit)

### T9.3: Deep Navigation
1. Navigate through multiple screens
2. Use back gestures to return
3. **Expected**: Correct navigation stack behavior

---

## 10. Rotation & Responsive Tests

### T10.1: Portrait Orientation
1. Hold device in portrait
2. Navigate through screens
3. **Expected**: All screens display correctly

### T10.2: Landscape Orientation
1. Rotate device to landscape
2. **Expected**: 
   - Layout adapts responsively
   - No content cut off
   - Readable and usable

### T10.3: iPad Support
1. Run app on iPad
2. Test in both orientations
3. **Expected**: 
   - Optimized for larger screen
   - Sidebars/columns visible
   - No awkward stretching

---

## 11. Performance Tests

### T11.1: Memory Usage
1. Use Xcode Instruments (Memory profiler)
2. Navigate through all screens
3. **Expected**: 
   - Memory stays reasonable (< 200MB)
   - No major leaks
   - Deallocates properly

### T11.2: Battery Impact
1. Use device for 30 minutes
2. Check battery usage in Settings
3. **Expected**: Reasonable battery consumption

### T11.3: Network Efficiency
1. Use Xcode Instruments (Network profiler)
2. Perform typical user actions
3. **Expected**:
   - No excessive API calls
   - Proper caching
   - Efficient data transfer

---

## 12. Offline & Error Handling Tests

### T12.1: No Internet Connection
1. Enable Airplane Mode
2. Launch app
3. **Expected**: 
   - App launches successfully
   - Cached data shows
   - Graceful error messages for network requests

### T12.2: Network Recovery
1. Start in Airplane Mode
2. Attempt to load data (fails)
3. Disable Airplane Mode
4. Retry
5. **Expected**: Data loads successfully

### T12.3: API Errors
1. Simulate API errors (500, 404, etc.)
2. **Expected**: 
   - User-friendly error messages
   - Retry options
   - No crashes

---

## 13. Security Tests

### T13.1: Secure Storage Encryption
1. Store sensitive data
2. Check if stored in plaintext (should not be)
3. **Expected**: Data encrypted in Keychain

### T13.2: HTTPS Only
1. Monitor network traffic
2. **Expected**: All API calls use HTTPS

### T13.3: No Sensitive Data in Logs
1. Check Xcode console
2. **Expected**: 
   - No auth tokens logged
   - No personal health data logged
   - No PII visible

---

## 14. HealthKit End-to-End Tests

### T14.1: Full Permission Flow
**Prerequisites**: Physical device with health data

1. Fresh install
2. Navigate to HealthKit setup
3. Request permissions
4. Grant all requested permissions
5. **Expected**: 
   - Permissions saved
   - Health data accessible
   - Data shows in app

### T14.2: Read Heart Rate
1. Ensure HealthKit permissions granted
2. Navigate to biomarkers screen
3. **Expected**: Recent heart rate data displayed

### T14.3: Read HRV
1. Navigate to HRV metrics
2. **Expected**: HRV data from Health app displayed

### T14.4: Permission Revocation
1. Grant HealthKit permissions
2. Go to Settings > Privacy > Health > HealthPilot
3. Revoke heart rate permission
4. Return to app
5. **Expected**: 
   - App detects revoked permission
   - Shows appropriate message
   - Requests permission again if user tries to access

---

## 15. Voice Chat Tests (Premium Feature)

### T15.1: Voice Chat Initialization
1. Navigate to voice chat
2. **Expected**: WebSocket connection establishes

### T15.2: Microphone Permission
1. Start voice chat
2. **Expected**: 
   - iOS microphone permission dialog appears
   - Permission request has clear usage description

### T15.3: Voice Recording
1. Grant microphone permission
2. Speak into device
3. **Expected**: 
   - Audio captured
   - Waveform/indicator shows audio input
   - Transcription appears

---

## 16. Multi-Language Tests

### T16.1: System Language Detection
1. Change device language (Settings > General > Language & Region)
2. Launch app
3. **Expected**: App detects and uses system language

### T16.2: Language Switching
1. Change language in app settings
2. **Expected**: 
   - All text updates
   - No missing translations
   - Layout adjusts properly

---

## 17. Accessibility Tests

### T17.1: VoiceOver
1. Enable VoiceOver (Settings > Accessibility)
2. Navigate through app
3. **Expected**: 
   - All elements have labels
   - Navigation works
   - Actions are announced

### T17.2: Dynamic Type
1. Increase text size (Settings > Display & Brightness > Text Size)
2. **Expected**: App text scales appropriately

### T17.3: Reduce Motion
1. Enable Reduce Motion (Settings > Accessibility)
2. **Expected**: Animations reduced/removed

---

## Test Execution Checklist

Before release:

- [ ] All critical tests (T1-T7) pass on iOS 15, 16, 17
- [ ] Tested on iPhone and iPad
- [ ] Tested in Debug and Release builds
- [ ] No crashes or errors in console
- [ ] Performance meets targets (cold start < 2.5s)
- [ ] HealthKit integration works end-to-end
- [ ] Validation script passes: `node scripts/validate-mobile-readiness.mjs`

---

## Automation Opportunities

Consider automating:
- T1.1 (Installation)
- T2.2 (Platform detection)
- T3.1 (Storage round-trip)
- T11.1 (Memory profiling)

Using:
- XCUITest for UI automation
- Appium for cross-platform tests
- Xcode Instruments for performance

---

**Test Coverage**: ~95% of mobile-specific functionality covered.
**Execution Time**: ~2-3 hours for full manual test suite.
