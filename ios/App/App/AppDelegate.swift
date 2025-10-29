import UIKit
import Capacitor
import HealthKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}

// MARK: - HealthKit Plugin
@objc(HealthPilotHealthKit)
public class HealthPilotHealthKit: CAPPlugin {
    private let healthStore = HKHealthStore()
    
    @objc func isAvailable(_ call: CAPPluginCall) {
        let available = HKHealthStore.isHealthDataAvailable()
        call.resolve(["available": available])
    }
    
    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is not available on this device")
            return
        }
        
        let readTypes: Set<HKObjectType> = [
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .restingHeartRate)!,
            HKQuantityType.quantityType(forIdentifier: .heartRateVariabilitySDNN)!,
            HKQuantityType.quantityType(forIdentifier: .bodyMass)!,
            HKQuantityType.quantityType(forIdentifier: .leanBodyMass)!,
            HKQuantityType.quantityType(forIdentifier: .bodyFatPercentage)!,
            HKQuantityType.quantityType(forIdentifier: .bloodPressureSystolic)!,
            HKQuantityType.quantityType(forIdentifier: .bloodPressureDiastolic)!,
            HKQuantityType.quantityType(forIdentifier: .bloodGlucose)!,
            HKObjectType.workoutType(),
            HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]
        
        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            if let error = error {
                call.reject("Authorization failed: \(error.localizedDescription)")
            } else {
                call.resolve(["success": success])
            }
        }
    }
    
    @objc func queryHealthData(_ call: CAPPluginCall) {
        guard let dataType = call.getString("dataType"),
              let startDateString = call.getString("startDate"),
              let endDateString = call.getString("endDate") else {
            call.reject("Missing required parameters")
            return
        }
        
        let dateFormatter = ISO8601DateFormatter()
        guard let startDate = dateFormatter.date(from: startDateString),
              let endDate = dateFormatter.date(from: endDateString) else {
            call.reject("Invalid date format")
            return
        }
        
        switch dataType {
        case "steps", "distance", "activeCalories", "heartRate", "restingHeartRate", "hrv",
             "weight", "leanBodyMass", "bodyFat", "bloodPressureSystolic", "bloodPressureDiastolic", "bloodGlucose":
            queryQuantityType(call: call, dataType: dataType, startDate: startDate, endDate: endDate)
        case "workouts":
            queryWorkouts(call: call, startDate: startDate, endDate: endDate)
        case "sleep":
            querySleep(call: call, startDate: startDate, endDate: endDate)
        default:
            call.reject("Unsupported data type")
        }
    }
    
    private func queryQuantityType(call: CAPPluginCall, dataType: String, startDate: Date, endDate: Date) {
        guard let quantityType = mapToQuantityType(dataType) else {
            call.reject("Invalid quantity type")
            return
        }
        
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: quantityType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
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
    
    private func queryWorkouts(call: CAPPluginCall, startDate: Date, endDate: Date) {
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: .workoutType(), predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
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
                    "workoutTypeName": "Workout",
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
    
    private func querySleep(call: CAPPluginCall, startDate: Date, endDate: Date) {
        let sleepType = HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!
        let predicate = HKQuery.predicateForSamples(withStart: startDate, end: endDate, options: .strictStartDate)
        let query = HKSampleQuery(sampleType: sleepType, predicate: predicate, limit: HKObjectQueryNoLimit, sortDescriptors: nil) { _, samples, error in
            if let error = error {
                call.reject("Query failed: \(error.localizedDescription)")
                return
            }
            
            guard let sleepSamples = samples as? [HKCategorySample] else {
                call.resolve(["sleepSamples": []])
                return
            }
            
            let results = sleepSamples.map { sample -> [String: Any] in
                return [
                    "value": sample.value,
                    "category": sample.value == HKCategoryValueSleepAnalysis.asleep.rawValue ? "asleep" : "inBed",
                    "startDate": ISO8601DateFormatter().string(from: sample.startDate),
                    "endDate": ISO8601DateFormatter().string(from: sample.endDate),
                    "uuid": sample.uuid.uuidString
                ]
            }
            call.resolve(["sleepSamples": results])
        }
        healthStore.execute(query)
    }
    
    private func mapToQuantityType(_ identifier: String) -> HKQuantityType? {
        let mapping: [String: HKQuantityTypeIdentifier] = [
            "steps": .stepCount,
            "distance": .distanceWalkingRunning,
            "activeCalories": .activeEnergyBurned,
            "heartRate": .heartRate,
            "restingHeartRate": .restingHeartRate,
            "hrv": .heartRateVariabilitySDNN,
            "weight": .bodyMass,
            "leanBodyMass": .leanBodyMass,
            "bodyFat": .bodyFatPercentage,
            "bloodPressureSystolic": .bloodPressureSystolic,
            "bloodPressureDiastolic": .bloodPressureDiastolic,
            "bloodGlucose": .bloodGlucose
        ]
        guard let typeIdentifier = mapping[identifier] else { return nil }
        return HKQuantityType.quantityType(forIdentifier: typeIdentifier)
    }
    
    private func getUnit(for quantityType: HKQuantityType) -> HKUnit {
        switch quantityType.identifier {
        case HKQuantityTypeIdentifier.stepCount.rawValue:
            return .count()
        case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
            return .meter()
        case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
            return .kilocalorie()
        case HKQuantityTypeIdentifier.heartRate.rawValue, HKQuantityTypeIdentifier.restingHeartRate.rawValue:
            return HKUnit.count().unitDivided(by: .minute())
        case HKQuantityTypeIdentifier.heartRateVariabilitySDNN.rawValue:
            return .secondUnit(with: .milli)
        case HKQuantityTypeIdentifier.bodyMass.rawValue, HKQuantityTypeIdentifier.leanBodyMass.rawValue:
            return .gramUnit(with: .kilo)
        case HKQuantityTypeIdentifier.bodyFatPercentage.rawValue:
            return .percent()
        case HKQuantityTypeIdentifier.bloodPressureSystolic.rawValue, HKQuantityTypeIdentifier.bloodPressureDiastolic.rawValue:
            return .millimeterOfMercury()
        case HKQuantityTypeIdentifier.bloodGlucose.rawValue:
            return HKUnit.gramUnit(with: .milli).unitDivided(by: .literUnit(with: .deci))
        default:
            return .count()
        }
    }
}
