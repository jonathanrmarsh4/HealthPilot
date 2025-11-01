# HealthPilot HealthKit Plugin

Extended from `@capgo/capacitor-health` v7.2.8

## Overview

This is a custom fork of the Capgo Capacitor Health plugin, extended to support additional cardiovascular health metrics for the HealthPilot iOS application.

## Supported Data Types

### Original (Capgo Health v7.2.8)
- `steps` - Step count
- `distance` - Walking/running distance  
- `calories` - Active energy burned
- `heartRate` - Heart rate
- `weight` - Body mass

### Extended (Batch 1: Cardiovascular Metrics)
- `hrv` - Heart Rate Variability (HRV SDNN in milliseconds)
- `restingHeartRate` - Resting heart rate (bpm)
- `bloodPressureSystolic` - Systolic blood pressure (mmHg)
- `bloodPressureDiastolic` - Diastolic blood pressure (mmHg)
- `oxygenSaturation` - Blood oxygen saturation (SpO2 as percentage)
- `respiratoryRate` - Respiratory rate (breaths per minute)

## Implementation Details

### Swift Side (Health.swift)
- Extended `HealthDataType` enum with 6 new cardiovascular cases
- Mapped each to appropriate `HKQuantityTypeIdentifier`
- Defined default units for each metric
- Added unit identifier strings for API consistency

### TypeScript Side (healthkit.ts)
- Updated `requestPermissions()` to request access to all 11 data types
- Extended `queryData()` type signature to include new types
- Updated getter methods to query native HealthKit instead of returning empty arrays

### Integration
- Backend already supports all cardiovascular metrics via biomarker system
- HealthKitSync component automatically sends all data to `/api/apple-health/sync`
- No changes needed to sync flow - works out of the box

## Version

**7.2.8-healthpilot.1**

## Installation

The plugin is installed as a local pod in the iOS app:

```ruby
pod 'HealthPilotHealthKit', :path => './HealthPilotHealthKit'
```

## Future Batches

Planned extensions:
- Batch 2: Activity metrics (flights climbed, basal calories)
- Batch 3: Body composition (BMI, body fat, lean body mass)  
- Batch 4: Nutrition (dietary water, protein, carbs, fat)
- Batch 5: Sleep and workouts

## Rollback

To rollback to original Capgo Health plugin:

1. Edit `ios/App/Podfile`
2. Comment out: `pod 'HealthPilotHealthKit', :path => './HealthPilotHealthKit'`
3. Uncomment: `pod 'CapgoCapacitorHealth', :path => '../../node_modules/@capgo/capacitor-health'`
4. Run `pod install`
5. Rebuild app in Xcode
