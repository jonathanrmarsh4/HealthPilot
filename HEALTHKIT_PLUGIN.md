# HealthPilotHealthKit Plugin Documentation

## Overview

Custom Capacitor 7 plugin for comprehensive HealthKit integration in the HealthPilot iOS app. Provides native Swift bridge to access 27+ health data types from Apple Health.

**Version:** 1.0.0  
**Platform:** iOS 14.0+  
**Swift:** 5.0+  
**Capacitor:** 7.x

---

## Supported Data Types Matrix

### Activity & Fitness (5 types)

| Data Type | Swift Identifier | TypeScript Method | Unit | Read | Write |
|-----------|-----------------|-------------------|------|------|-------|
| Steps | `stepCount` | `getSteps()` | count | ✅ | ❌ |
| Distance (Walking/Running) | `distanceWalkingRunning` | `getDistance()` | meters | ✅ | ❌ |
| Active Calories | `activeEnergyBurned` | `getActiveCalories()` | kcal | ✅ | ❌ |
| Basal Calories | `basalEnergyBurned` | `getBasalCalories()` | kcal | ✅ | ❌ |
| Flights Climbed | `flightsClimbed` | `getFlightsClimbed()` | count | ✅ | ❌ |

### Heart & Vitals (7 types)

| Data Type | Swift Identifier | TypeScript Method | Unit | Read | Write |
|-----------|-----------------|-------------------|------|------|-------|
| Heart Rate | `heartRate` | `getHeartRate()` | bpm | ✅ | ❌ |
| Resting Heart Rate | `restingHeartRate` | `getRestingHeartRate()` | bpm | ✅ | ❌ |
| Heart Rate Variability (HRV) | `heartRateVariabilitySDNN` | `getHRV()` | ms | ✅ | ❌ |
| Blood Pressure (Systolic) | `bloodPressureSystolic` | `getBloodPressureSystolic()` | mmHg | ✅ | ❌ |
| Blood Pressure (Diastolic) | `bloodPressureDiastolic` | `getBloodPressureDiastolic()` | mmHg | ✅ | ❌ |
| Oxygen Saturation (SpO2) | `oxygenSaturation` | `getOxygenSaturation()` | % | ✅ | ❌ |
| Respiratory Rate | `respiratoryRate` | `getRespiratoryRate()` | breaths/min | ✅ | ❌ |
| Body Temperature | `bodyTemperature` | `getBodyTemperature()` | °C | ✅ | ❌ |

### Body Measurements (7 types)

| Data Type | Swift Identifier | TypeScript Method | Unit | Read | Write |
|-----------|-----------------|-------------------|------|------|-------|
| Weight | `bodyMass` | `getWeight()` | kg | ✅ | ❌ |
| BMI | `bodyMassIndex` | `getBMI()` | count | ✅ | ❌ |
| Lean Body Mass | `leanBodyMass` | `getLeanBodyMass()` | kg | ✅ | ❌ |
| Body Fat % | `bodyFatPercentage` | `getBodyFat()` | % | ✅ | ❌ |
| Height | `height` | `getHeight()` | m | ✅ | ❌ |
| Waist Circumference | `waistCircumference` | `getWaistCircumference()` | m | ✅ | ❌ |

### Lab Results (1 type)

| Data Type | Swift Identifier | TypeScript Method | Unit | Read | Write |
|-----------|-----------------|-------------------|------|------|-------|
| Blood Glucose | `bloodGlucose` | `getBloodGlucose()` | mg/dL | ✅ | ❌ |

### Nutrition (5 types)

| Data Type | Swift Identifier | TypeScript Method | Unit | Read | Write |
|-----------|-----------------|-------------------|------|------|-------|
| Water Intake | `dietaryWater` | `getDietaryWater()` | mL | ✅ | ❌ |
| Calories Consumed | `dietaryEnergyConsumed` | `getDietaryEnergy()` | kcal | ✅ | ❌ |
| Protein | `dietaryProtein` | `getDietaryProtein()` | g | ✅ | ❌ |
| Carbohydrates | `dietaryCarbohydrates` | `getDietaryCarbs()` | g | ✅ | ❌ |
| Fat | `dietaryFatTotal` | `getDietaryFat()` | g | ✅ | ❌ |

### Workouts & Sleep (2 types)

| Data Type | Swift Identifier | TypeScript Method | Fields | Read | Write |
|-----------|-----------------|-------------------|--------|------|-------|
| Workouts | `HKWorkoutType` | `getWorkouts()` | type, duration, distance, energy, uuid | ✅ | ❌ |
| Sleep Analysis | `sleepAnalysis` | `getSleep()` | category (awake, REM, core, deep), startDate, endDate, uuid | ✅ | ❌ |

**Total: 27 data types**

---

## API Reference

### TypeScript Interface

```typescript
interface HealthPilotHealthKitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ success: boolean }>;
  queryHealthData(options: {
    dataType: string;
    startDate: string;
    endDate: string;
  }): Promise<{
    samples?: HealthDataSample[];
    workouts?: WorkoutSample[];
    sleepSamples?: SleepSample[];
  }>;
}
```

### Sample Response Format

```typescript
interface HealthDataSample {
  value: number;
  unit: string;
  startDate: string;  // ISO 8601
  endDate: string;    // ISO 8601
  uuid: string;       // HKSample UUID
}

interface WorkoutSample {
  workoutType: number;
  workoutTypeName: string;
  startDate: string;
  endDate: string;
  duration: number;
  distance?: number;
  distanceUnit?: string;
  energy?: number;
  energyUnit?: string;
  uuid: string;
}

interface SleepSample {
  value: number;
  category: 'asleep' | 'awake' | 'core' | 'deep' | 'rem' | 'inBed';
  startDate: string;
  endDate: string;
  uuid: string;
}
```

### Usage Example

```typescript
import { healthKitService } from '@/services/healthkit';

// Check availability
const available = await healthKitService.isHealthKitAvailable();

// Request permissions
const granted = await healthKitService.requestPermissions();

// Query specific data type
const steps = await healthKitService.getSteps(
  new Date('2025-10-24'),
  new Date('2025-10-31')
);

// Get all health data
const allData = await healthKitService.getAllHealthData(30); // last 30 days
```

---

## iOS Configuration Requirements

### 1. Entitlements (`App.entitlements`)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
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

### 2. Info.plist Usage Descriptions

```xml
<key>NSHealthShareUsageDescription</key>
<string>Health Insights AI needs access to your health data to provide personalized insights, track biomarkers, and optimize your training and nutrition recommendations.</string>

<key>NSHealthUpdateUsageDescription</key>
<string>Health Insights AI can write workout and activity data back to Apple Health to keep your health records synchronized.</string>
```

### 3. Xcode Project Settings

- **Capabilities Tab**: Enable "HealthKit"
- **Code Sign Entitlements**: Set to `App/App.entitlements`
- **Deployment Target**: iOS 14.0 or later
- **Swift Version**: 5.0+

### 4. Podspec Configuration

Located at `ios/HealthPilotHealthKit/HealthPilotHealthKit.podspec`:

```ruby
Pod::Spec.new do |s|
  s.name             = 'HealthPilotHealthKit'
  s.version          = '1.0.0'
  s.summary          = 'Comprehensive HealthKit plugin for HealthPilot'
  s.ios.deployment_target  = '14.0'
  s.swift_versions = '5.0'
  s.dependency 'Capacitor'
  s.frameworks = 'HealthKit'
end
```

---

## Deployment Prechecks

### Before Building for TestFlight/App Store

- [ ] **Entitlements File**: `App.entitlements` exists and includes HealthKit capability
- [ ] **Xcode Capability**: HealthKit capability enabled in target's Signing & Capabilities
- [ ] **Usage Descriptions**: Both `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` in Info.plist
- [ ] **Usage Description Wording**: Complies with Apple Review Guidelines (clear, specific, user-facing language)
- [ ] **Plugin Registration**: `CAP_PLUGIN` macro in `HealthPilotHealthKit.m` correctly registers all methods
- [ ] **TypeScript Types**: All Swift data types have corresponding TypeScript methods in `healthkit.ts`
- [ ] **No Mock Data**: No hardcoded test data in production code paths
- [ ] **Error Handling**: Graceful degradation when HealthKit unavailable or permissions denied

### Apple Review Compliance

1. **Privacy**: Clearly explain why each health data type is needed
2. **Minimal Data**: Only request read access for data types actively used
3. **User Control**: Respect user's permission choices; handle denials gracefully
4. **Data Security**: Health data must be encrypted in transit and at rest
5. **No Sale**: Never sell or share health data with third parties

---

## Testing Strategy

### 1. Availability Testing

```typescript
const available = await healthKitService.isHealthKitAvailable();
// Should return true on iOS, false on Android/Web
```

### 2. Permission Testing

```typescript
const granted = await healthKitService.requestPermissions();
// Test both granted and denied scenarios
```

### 3. Data Type Coverage Testing

Use the HealthKit Diagnostics page (`/healthkit-diagnostics`) to test all 27 data types:

1. Navigate to `/healthkit-diagnostics`
2. Click "Check" to verify availability
3. Click "Request" to grant permissions
4. Click "Test All" to query all data types
5. Verify success/error status for each type
6. Review sample data for correctness (values, units, timestamps, UUIDs)

### 4. Edge Case Testing

- **No HealthKit**: Test on simulator (returns unavailable)
- **Permissions Denied**: Deny access and verify graceful error handling
- **No Data**: Test with empty Health app
- **Large Datasets**: Test with years of historical data
- **Date Ranges**: Test various start/end date combinations

### 5. Integration Testing

- Verify all data types flow correctly to backend API
- Confirm data persistence and deduplication
- Test sync after app kill/restart
- Validate timezone handling for timestamps

---

## Known Limitations

1. **iOS Only**: Plugin is not available on Android or Web platforms
2. **Read-Only**: Currently configured for read-only access (no write operations)
3. **No Background Sync**: Background delivery enabled but not yet implemented
4. **No Anchored Queries**: Full data pull on each query (no incremental sync)
5. **Permission Opacity**: iOS doesn't expose permission status (unknown if granted/denied)

---

## Future Enhancements

- [ ] Implement anchored queries for incremental sync
- [ ] Add background delivery observers for real-time updates
- [ ] Implement write operations for workout logging
- [ ] Add pagination for large result sets
- [ ] Implement caching layer to reduce HealthKit queries
- [ ] Add more data types (VO2 Max, electrocardiogram, etc.)
- [ ] Create automated Swift XCTest suite
- [ ] Add TypeScript contract tests against mocked Capacitor bridge

---

## Troubleshooting

### "Plugin not found" error

1. Ensure Capacitor is synced: `npx cap sync ios`
2. Verify podspec is correctly referenced in Podfile
3. Check that plugin is registered in `ios/App/App/HealthPilotHealthKit.m`
4. Clean build folder and rebuild in Xcode

### "HealthKit not available" on device

1. Verify device is physical (not simulator - HealthKit requires real hardware for most types)
2. Check that HealthKit capability is enabled in Xcode
3. Ensure entitlements file is properly configured
4. Verify bundle ID matches provisioning profile with HealthKit entitlement

### Permissions not prompting

1. iOS only shows permission dialog once per data type
2. Check Settings > Privacy > Health to manually grant access
3. Uninstall and reinstall app to reset permissions

### Empty data returned

1. Verify Health app has data for the requested type and date range
2. Check that permissions were actually granted
3. Ensure date range is correct (start < end)
4. Review console logs for error messages

---

## Support

For plugin-specific issues:
- Review Swift implementation: `ios/HealthPilotHealthKit/Sources/HealthPilotHealthKit.swift`
- Check TypeScript service: `client/src/services/healthkit.ts`
- Use diagnostics page: Navigate to `/healthkit-diagnostics` in app

For Apple HealthKit documentation:
- [HealthKit Framework Reference](https://developer.apple.com/documentation/healthkit)
- [App Store Review Guidelines - HealthKit](https://developer.apple.com/app-store/review/guidelines/#healthkit)
