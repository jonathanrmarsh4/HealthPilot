import Foundation
import HealthKit
import Capacitor

@objc(HealthPilotHealthKit)
public class HealthPilotHealthKit: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HealthPilotHealthKit"
    public let jsName = "HealthPilotHealthKit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "queryHealthData", returnType: CAPPluginReturnPromise)
    ]
    
    private let healthStore = HKHealthStore()
    
    override public func load() {
        print("🏥 HealthPilotHealthKit plugin loaded successfully!")
    }
    
    // Check if HealthKit is available
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        
        // Debug: Check why it might be unavailable
        print("🏥 [HealthKit] isAvailable called")
        print("🏥 [HealthKit] Device: \(UIDevice.current.model)")
        print("🏥 [HealthKit] System: \(UIDevice.current.systemName) \(UIDevice.current.systemVersion)")
        print("🏥 [HealthKit] isHealthDataAvailable: \(available)")
        
        // Force true for testing if we know we're on a real device
        let deviceModel = UIDevice.current.model.lowercased()
        if deviceModel.contains("iphone") || deviceModel.contains("ipad") {
            print("⚠️ [HealthKit] Detected physical iOS device, overriding to true for testing")
            call.resolve(["available": true])
        } else {
            call.resolve(["available": available])
        }
    }
    
    // Request authorization for all supported health data types
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        print("🔐 [HealthKit] requestAuthorization called")
        guard HKHealthStore.isHealthDataAvailable() else {
            print("❌ [HealthKit] HealthKit not available on this device")
            call.reject("HealthKit is not available on this device")
            return
        }
        
        // Define all read types we need
        let readTypes: Set<HKObjectType> = [
            // Activity & Fitness
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .basalEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .flightsClimbed)!,
            
            // Heart & Vitals
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .restingHeartRate)!,
            HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic)!,
            HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic)!,
            HKQuantityType.quantityType(forIdentifier: .oxygenSaturation)!,
            HKQuantityType.quantityType(forIdentifier: .respiratoryRate)!,
            HKQuantityType.quantityType(forIdentifier: .bodyTemperature)!,
            
            // Body Measurements
            HKQuantityType.quantityType(forIdentifier: .bodyMass)!,
            HKQuantityType.quantityType(forIdentifier: .bodyMassIndex)!,
            HKQuantityType.quantityType(forIdentifier: .leanBodyMass)!,
            HKQuantityType.quantityType(forIdentifier: .bodyFatPercentage)!,
            HKQuantityType.quantityType(forIdentifier: .height)!,
            HKQuantityType.quantityType(forIdentifier: .waistCircumference)!,
            
            // Lab Results & Blood
            HKQuantityType.quantityType(forIdentifier: .bloodGlucose)!,
            
            // Workouts & Sleep
            HKObjectType.workoutType(),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
            
            // Nutrition
            HKQuantityType.quantityType(forIdentifier: .dietaryWater)!,
            HKQuantityType.quantityType(forIdentifier: .dietaryEnergyConsumed)!,
            HKQuantityType.quantityType(forIdentifier: .dietaryProtein)!,
            HKQuantityType.quantityType(forIdentifier: .dietaryCarbohydrates)!,
            HKQuantityType.quantityType(forIdentifier: .dietaryFatTotal)!,
        ]
        
        print("📋 [HealthKit] Requesting authorization for \(readTypes.count) data types")
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            if let error = error {
                print("❌ [HealthKit] Authorization failed: \(error.localizedDescription)")
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                print("✅ [HealthKit] Authorization completed, success: \(success)")
                call.resolve(["success": success])
            }
        }
    }
    
    // Query health data for specified type and date range
    @objc func queryHealthData(_ call: CAPPluginCall) {
        guard let dataType = call.getString("dataType"),
              let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            print("❌ [HealthKit] Missing required parameters")
            call.reject("Missing required parameters: dataType, startDate, endDate")
            return
        }
        
        print("📊 [HealthKit] queryHealthData called for type: \(dataType)")
        print("📅 [HealthKit] Date range: \(startDateString) to \(endDateString)")
        
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let startDate = dateFormatter.date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) else {
            print("❌ [HealthKit] Invalid date format")
            call.reject("Invalid date format. Use ISO 8601.")
            return
        }
        
        print("📅 [HealthKit] Parsed dates - Start: \(startDate), End: \(endDate)")
        
        // Route to appropriate query method based on data type
        switch dataType {
        case "steps", "distance", "activeCalories", "basalCalories", "flights",
             "heartRate", "restingHeartRate", "hrv", "bloodPressureSystolic", "bloodPressureDiastolic",
             "oxygenSaturation", "respiratoryRate", "bodyTemperature",
             "weight", "bmi", "leanBodyMass", "bodyFat", "height", "waist",
             "bloodGlucose", "dietaryWater", "dietaryEnergy", "dietaryProtein", "dietaryCarbs", "dietaryFat":
            queryQuantityType(call: call, dataType: dataType, startDate: startDate, endDate: endDate)
            
        case "workouts":
            queryWorkouts(call: call, startDate: startDate, endDate: endDate)
            
        case "sleep":
            querySleep(call: call, startDate: startDate, endDate: endDate)
            
        default:
            call.reject("Unsupported data type: \(dataType)")
        }
    }
    
    // Query quantity type data (steps, heart rate, weight, etc.)
    private func queryQuantityType(call: CAPPluginCall, dataType: String, startDate: Date, endDate: Date) {
        guard let quantityType = mapToQuantityType(dataType) else {
            print("❌ [HealthKit] Invalid quantity type: \(dataType)")
            call.reject("Invalid quantity type: \(dataType)")
            return
        }
        
        print("🔍 [HealthKit] Querying \(dataType)...")
        
        let authStatus = healthStore.authorizationStatus(for: quantityType)
        print("🔐 [HealthKit] Authorization status for \(dataType): \(self.authStatusString(authStatus))")
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ [HealthKit] Query failed for \(dataType): \(error.localizedDescription)")
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let samples = samples as? [HKQuantitySample] else {
                print("⚠️ [HealthKit] No samples returned for \(dataType) (or wrong type)")
                call.resolve(["samples": []])
                return
            }
            
            print("✅ [HealthKit] Found \(samples.count) samples for \(dataType)")
            
            if samples.count > 0 {
                let unit = self.getUnit(for: quantityType)
                let firstValue = samples[0].quantity.doubleValue(for: unit)
                print("📈 [HealthKit] First sample: \(firstValue) \(unit.unitString) at \(samples[0].startDate)")
            }
            
            let unit = self.getUnit(for: quantityType)
            let results = samples.map { sample -> [String: Any] in
                return [
                    "value": sample.quantity.doubleValue(for: unit),
                    "unit": unit.unitString,
                    "startDate": ISO8601DateFormatter().string(from: sample.startDate),
                    "endDate": ISO8601DateFormatter().string(from: sample.endDate),
                    "uuid": sample.uuid.uuidString
                ]
            }
            
            call.resolve(["samples": results])
        }
        
        healthStore.execute(query)
    }
    
    // Query workouts
    private func queryWorkouts(call: CAPPluginCall, startDate: Date, endDate: Date) {
        print("🔍 [HealthKit] Querying workouts...")
        
        let authStatus = healthStore.authorizationStatus(for: .workoutType())
        print("🔐 [HealthKit] Authorization status for workouts: \(self.authStatusString(authStatus))")
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ [HealthKit] Workouts query failed: \(error.localizedDescription)")
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let workouts = samples as? [HKWorkout] else {
                print("⚠️ [HealthKit] No workouts returned")
                call.resolve(["workouts": []])
                return
            }
            
            print("✅ [HealthKit] Found \(workouts.count) workouts")
            
            if workouts.count > 0 {
                print("🏃 [HealthKit] First workout: \(self.workoutTypeName(workouts[0].workoutActivityType)) at \(workouts[0].startDate)")
            }
            
            let results = workouts.map { workout -> [String: Any] in
                var result: [String: Any] = [
                    "workoutType": workout.workoutActivityType.rawValue,
                    "workoutTypeName": self.workoutTypeName(workout.workoutActivityType),
                    "startDate": ISO8601DateFormatter().string(from: workout.startDate),
                    "endDate": ISO8601DateFormatter().string(from: workout.endDate),
                    "duration": workout.duration,
                    "uuid": workout.uuid.uuidString
                ]
                
                if let totalDistance = workout.totalDistance {
                    result["distance"] = totalDistance.doubleValue(for: .meter())
                    result["distanceUnit"] = "m"
                }
                
                if let totalEnergy = workout.totalEnergyBurned {
                    result["energy"] = totalEnergy.doubleValue(for: .kilocalorie())
                    result["energyUnit"] = "kcal"
                }
                
                return result
            }
            
            call.resolve(["workouts": results])
        }
        
        healthStore.execute(query)
    }
    
    // Query sleep data
    private func querySleep(call: CAPPluginCall, startDate: Date, endDate: Date) {
        print("🔍 [HealthKit] Querying sleep...")
        
        let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!
        
        let authStatus = healthStore.authorizationStatus(for: sleepType)
        print("🔐 [HealthKit] Authorization status for sleep: \(self.authStatusString(authStatus))")
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                print("❌ [HealthKit] Sleep query failed: \(error.localizedDescription)")
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let sleepSamples = samples as? [HKCategorySample] else {
                print("⚠️ [HealthKit] No sleep samples returned")
                call.resolve(["sleepSamples": []])
                return
            }
            
            print("✅ [HealthKit] Found \(sleepSamples.count) sleep samples")
            
            if sleepSamples.count > 0 {
                print("😴 [HealthKit] First sleep sample at \(sleepSamples[0].startDate)")
            }
            
            let results = sleepSamples.map { sample -> [String: Any] in
                var categoryName = "unknown"
                if #available(iOS 16.0, *) {
                    switch sample.value {
                    case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue:
                        categoryName = "asleep"
                    case HKCategoryValueSleepAnalysis.awake.rawValue:
                        categoryName = "awake"
                    case HKCategoryValueSleepAnalysis.asleepCore.rawValue:
                        categoryName = "core"
                    case HKCategoryValueSleepAnalysis.asleepDeep.rawValue:
                        categoryName = "deep"
                    case HKCategoryValueSleepAnalysis.asleepREM.rawValue:
                        categoryName = "rem"
                    default:
                        categoryName = "inBed"
                    }
                } else {
                    categoryName = sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue ? "asleep" : "inBed"
                }
                
                return [
                    "value": sample.value,
                    "category": categoryName,
                    "startDate": ISO8601DateFormatter().string(from: sample.startDate),
                    "endDate": ISO8601DateFormatter().string(from: sample.endDate),
                    "uuid": sample.uuid.uuidString
                ]
            }
            
            call.resolve(["sleepSamples": results])
        }
        
        healthStore.execute(query)
    }
    
    // Map string identifier to HKQuantityType
    private func mapToQuantityType(_ identifier: String) -> HKQuantityType? {
        let mapping: [String: HKQuantityTypeIdentifier] = [
            "steps": .stepCount,
            "distance": .distanceWalkingRunning,
            "activeCalories": .activeEnergyBurned,
            "basalCalories": .basalEnergyBurned,
            "flights": .flightsClimbed,
            "heartRate": .heartRate,
            "restingHeartRate": .restingHeartRate,
            "hrv": .heartRateVariabilitySDNN,
            "bloodPressureSystolic": .bloodPressureSystolic,
            "bloodPressureDiastolic": .bloodPressureDiastolic,
            "oxygenSaturation": .oxygenSaturation,
            "respiratoryRate": .respiratoryRate,
            "bodyTemperature": .bodyTemperature,
            "weight": .bodyMass,
            "bmi": .bodyMassIndex,
            "leanBodyMass": .leanBodyMass,
            "bodyFat": .bodyFatPercentage,
            "height": .height,
            "waist": .waistCircumference,
            "bloodGlucose": .bloodGlucose,
            "dietaryWater": .dietaryWater,
            "dietaryEnergy": .dietaryEnergyConsumed,
            "dietaryProtein": .dietaryProtein,
            "dietaryCarbs": .dietaryCarbohydrates,
            "dietaryFat": .dietaryFatTotal
        ]
        
        guard let typeIdentifier = mapping[identifier] else {
            return nil
        }
        
        return HKQuantityType.quantityType(forIdentifier: typeIdentifier)
    }
    
    // Get appropriate unit for quantity type
    private func getUnit(for quantityType: HKQuantityType) -> HKUnit {
        switch quantityType.identifier {
        case HKQuantityTypeIdentifier.stepCount.rawValue,
             HKQuantityTypeIdentifier.flightsClimbed.rawValue:
            return .count()
        case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue,
             HKQuantityTypeIdentifier.height.rawValue,
             HKQuantityTypeIdentifier.waistCircumference.rawValue:
            return .meter()
        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue,
             HKQuantityTypeIdentifier.basalEnergyBurned.rawValue,
             HKQuantityTypeIdentifier.dietaryEnergyConsumed.rawValue:
            return .kilocalorie()
        case HKQuantityTypeIdentifier.heartRate.rawValue,
             HKQuantityTypeIdentifier.restingHeartRate.rawValue:
            return HKUnit.count().unitDivided(by: .minute())
        case HKQuantityTypeIdentifier.heartRateVariabilitySDNN.rawValue:
            return .secondUnit(with: .milli)
        case HKQuantityTypeIdentifier.bloodPressureSystolic.rawValue,
             HKQuantityTypeIdentifier.bloodPressureDiastolic.rawValue:
            return .millimeterOfMercury()
        case HKQuantityTypeIdentifier.oxygenSaturation.rawValue,
             HKQuantityTypeIdentifier.bodyFatPercentage.rawValue:
            return .percent()
        case HKQuantityTypeIdentifier.respiratoryRate.rawValue:
            return HKUnit.count().unitDivided(by: .minute())
        case HKQuantityTypeIdentifier.bodyTemperature.rawValue:
            return .degreeCelsius()
        case HKQuantityTypeIdentifier.bodyMass.rawValue,
             HKQuantityTypeIdentifier.leanBodyMass.rawValue:
            return .gramUnit(with: .kilo)
        case HKQuantityTypeIdentifier.bodyMassIndex.rawValue:
            return .count()
        case HKQuantityTypeIdentifier.bloodGlucose.rawValue:
            return HKUnit.gramUnit(with: .milli).unitDivided(by: .literUnit(with: .deci))
        case HKQuantityTypeIdentifier.dietaryWater.rawValue:
            return .literUnit(with: .milli)
        case HKQuantityTypeIdentifier.dietaryProtein.rawValue,
             HKQuantityTypeIdentifier.dietaryCarbohydrates.rawValue,
             HKQuantityTypeIdentifier.dietaryFatTotal.rawValue:
            return .gram()
        default:
            return .count()
        }
    }
    
    // Get workout type name
    private func workoutTypeName(_ type: HKWorkoutActivityType) -> String {
        switch type {
        case .running: return "Running"
        case .cycling: return "Cycling"
        case .walking: return "Walking"
        case .swimming: return "Swimming"
        case .yoga: return "Yoga"
        case .functionalStrengthTraining: return "Strength Training"
        case .traditionalStrengthTraining: return "Traditional Strength Training"
        case .hiking: return "Hiking"
        case .elliptical: return "Elliptical"
        case .rowing: return "Rowing"
        case .stairClimbing: return "Stair Climbing"
        case .dance: return "Dance"
        case .basketball: return "Basketball"
        case .soccer: return "Soccer"
        case .tennis: return "Tennis"
        case .golf: return "Golf"
        default: return "Other"
        }
    }
    
    // Convert authorization status to readable string
    private func authStatusString(_ status: HKAuthorizationStatus) -> String {
        switch status {
        case .notDetermined:
            return "notDetermined (user hasn't been asked yet)"
        case .sharingDenied:
            return "sharingDenied (user denied permission)"
        case .sharingAuthorized:
            return "sharingAuthorized (permission granted)"
        @unknown default:
            return "unknown"
        }
    }
}
