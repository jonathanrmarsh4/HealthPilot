import Foundation
import HealthKit
import Capacitor

@objc(HealthPilotHealthKit)
public class HealthPilotHealthKit: CAPPlugin {
    private let healthStore = HKHealthStore()
    
    // Check if HealthKit is available
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve(["available": available])
    }
    
    // Request authorization for all supported health data types
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }
        
        // Build read types safely without force-unwrapping
        var readTypes = Set<HKObjectType>()
        
        // Activity & Fitness
        let activityTypes: [HKQuantityTypeIdentifier] = [
            .stepCount, .distanceWalkingRunning, .activeEnergyBurned,
            .basalEnergyBurned, .flightsClimbed
        ]
        
        // Heart & Vitals
        let vitalTypes: [HKQuantityTypeIdentifier] = [
            .heartRate, .restingHeartRate, .heartRateVariabilitySDNN,
            .bloodPressureSystolic, .bloodPressureDiastolic, .oxygenSaturation,
            .respiratoryRate, .bodyTemperature
        ]
        
        // Body Measurements
        let bodyTypes: [HKQuantityTypeIdentifier] = [
            .bodyMass, .bodyMassIndex, .leanBodyMass, .bodyFatPercentage,
            .height, .waistCircumference
        ]
        
        // Lab Results
        let labTypes: [HKQuantityTypeIdentifier] = [.bloodGlucose]
        
        // Nutrition
        let nutritionTypes: [HKQuantityTypeIdentifier] = [
            .dietaryWater, .dietaryEnergyConsumed, .dietaryProtein,
            .dietaryCarbohydrates, .dietaryFatTotal
        ]
        
        // Add all quantity types safely
        for identifier in activityTypes + vitalTypes + bodyTypes + labTypes + nutritionTypes {
            if let type = HKQuantityType.quantityType(forIdentifier: identifier) {
                readTypes.insert(type)
            }
        }
        
        // Add workout type
        readTypes.insert(HKObjectType.workoutType())
        
        // Add sleep analysis safely
        if let sleepType = HKObjectType.categoryType(forIdentifier: .sleepAnalysis) {
            readTypes.insert(sleepType)
        }
        
        // Request authorization on main thread (required for UI)
        DispatchQueue.main.async {
            self.healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
                if let error = error {
                    call.reject("Authorization failed: \(error.localizedDescription)")
                } else {
                    call.resolve(["success": success])
                }
            }
        }
    }
    
    // Query health data for specified type and date range
    @objc func queryHealthData(_ call: CAPPluginCall) {
        guard let dataType = call.getString("dataType"),
              let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing required parameters: dataType, startDate, endDate")
            return
        }
        
        let dateFormatter = ISO8601DateFormatter()
        guard let startDate = dateFormatter.date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) else {
            call.reject("Invalid date format. Use ISO 8601.")
            return
        }
        
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
            call.reject("Invalid quantity type: \(dataType)")
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        
        let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: 5000, sortDescriptors: [sortDescriptor]) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let samples = samples as? [HKQuantitySample] else {
                call.resolve(["samples": []])
                return
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
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        
        let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: 5000, sortDescriptors: [sortDescriptor]) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let workouts = samples as? [HKWorkout] else {
                call.resolve(["workouts": []])
                return
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
        guard let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis) else {
            call.reject("Sleep analysis not available on this device")
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let sortDescriptor = NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: true)
        
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: 5000, sortDescriptors: [sortDescriptor]) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let sleepSamples = samples as? [HKCategorySample] else {
                call.resolve(["sleepSamples": []])
                return
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
            return .milligramsPerDeciliter()
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
}
