import Foundation
import Capacitor
import HealthKit

@objc(HealthKitBackgroundSyncPlugin)
public class HealthKitBackgroundSyncPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()
    private var observers: [HKObserverQuery] = []
    private var isMonitoringEnabled = false
    
    // Local queue for storing background samples
    private var backgroundQueue: [String: [[String: Any]]] = [:]
    private let queueKey = "healthkit_background_queue"
    
    override public func load() {
        // Load persisted queue from UserDefaults
        if let saved = UserDefaults.standard.dictionary(forKey: queueKey) as? [String: [[String: Any]]] {
            backgroundQueue = saved
        }
    }
    
    @objc func enableBackgroundSync(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        // Data types to monitor
        let dataTypes: [HKSampleType] = [
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]
        
        // Create observer queries for each data type
        for dataType in dataTypes {
            let query = HKObserverQuery(sampleType: dataType, predicate: nil) { [weak self] (query, completionHandler, error) in
                guard let self = self else {
                    completionHandler()
                    return
                }
                
                if error != nil {
                    completionHandler()
                    return
                }
                
                // Fetch new samples and add to queue
                self.fetchAndQueueNewSamples(for: dataType)
                
                // Call completion handler
                completionHandler()
            }
            
            healthStore.execute(query)
            observers.append(query)
        }
        
        // Enable background delivery for each type
        for dataType in dataTypes {
            healthStore.enableBackgroundDelivery(for: dataType, frequency: .immediate) { success, error in
                if !success {
                    print("[BackgroundSync] Failed to enable background delivery for \(dataType): \(error?.localizedDescription ?? "unknown")")
                }
            }
        }
        
        isMonitoringEnabled = true
        UserDefaults.standard.set(true, forKey: "background_sync_enabled")
        
        call.resolve(["success": true])
    }
    
    @objc func disableBackgroundSync(_ call: CAPPluginCall) {
        // Stop all observer queries
        for query in observers {
            healthStore.stop(query)
        }
        observers.removeAll()
        
        // Disable background delivery
        let dataTypes: [HKSampleType] = [
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]
        
        for dataType in dataTypes {
            healthStore.disableBackgroundDelivery(for: dataType) { _, _ in }
        }
        
        isMonitoringEnabled = false
        UserDefaults.standard.set(false, forKey: "background_sync_enabled")
        
        call.resolve(["success": true])
    }
    
    @objc func isBackgroundSyncEnabled(_ call: CAPPluginCall) {
        let enabled = UserDefaults.standard.bool(forKey: "background_sync_enabled")
        call.resolve(["enabled": enabled])
    }
    
    @objc func drainBackgroundQueue(_ call: CAPPluginCall) {
        let queueData = backgroundQueue
        
        // Clear the queue after draining
        backgroundQueue = [:]
        UserDefaults.standard.removeObject(forKey: queueKey)
        
        call.resolve(["data": queueData])
    }
    
    @objc func getBackgroundQueueStats(_ call: CAPPluginCall) {
        var stats: [String: Int] = [:]
        
        for (dataType, samples) in backgroundQueue {
            stats[dataType] = samples.count
        }
        
        call.resolve(["stats": stats])
    }
    
    // MARK: - Private Methods
    
    private func fetchAndQueueNewSamples(for dataType: HKSampleType) {
        // Get samples from the last hour
        let now = Date()
        let oneHourAgo = Calendar.current.date(byAdding: .hour, value: -1, to: now)!
        
        let predicate = HKQuery.predicateForSamples(
            withStart: oneHourAgo,
            end: now,
            options: .strictStartDate
        )
        
        let query = HKSampleQuery(
            sampleType: dataType,
            predicate: predicate,
            limit: HKObjectQueryNoLimit,
            sortDescriptors: [NSSortDescriptor(key: HKSampleSortIdentifierStartDate, ascending: false)]
        ) { [weak self] (query, samples, error) in
            guard let self = self, let samples = samples, !samples.isEmpty else {
                return
            }
            
            // Convert samples to dictionaries
            var sampleDicts: [[String: Any]] = []
            
            for sample in samples {
                var sampleDict: [String: Any] = [
                    "uuid": sample.uuid.uuidString,
                    "startDate": ISO8601DateFormatter().string(from: sample.startDate),
                    "endDate": ISO8601DateFormatter().string(from: sample.endDate),
                    "sourceName": sample.sourceRevision.source.name,
                    "sourceId": sample.sourceRevision.source.bundleIdentifier,
                ]
                
                // Handle quantity samples
                if let quantitySample = sample as? HKQuantitySample {
                    let identifier = quantitySample.quantityType.identifier
                    
                    let unit: HKUnit
                    switch identifier {
                    case HKQuantityTypeIdentifier.stepCount.rawValue:
                        unit = .count()
                    case HKQuantityTypeIdentifier.heartRate.rawValue:
                        unit = HKUnit.count().unitDivided(by: .minute())
                    case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
                        unit = .meter()
                    case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                        unit = .kilocalorie()
                    default:
                        unit = .count()
                    }
                    
                    sampleDict["value"] = quantitySample.quantity.doubleValue(for: unit)
                    sampleDict["unit"] = unit.unitString
                }
                
                // Handle category samples (sleep)
                if let categorySample = sample as? HKCategorySample {
                    sampleDict["value"] = categorySample.value
                }
                
                sampleDicts.append(sampleDict)
            }
            
            // Add to queue
            let dataTypeKey = self.getDataTypeKey(for: dataType)
            if self.backgroundQueue[dataTypeKey] == nil {
                self.backgroundQueue[dataTypeKey] = []
            }
            self.backgroundQueue[dataTypeKey]?.append(contentsOf: sampleDicts)
            
            // Persist to UserDefaults
            UserDefaults.standard.set(self.backgroundQueue, forKey: self.queueKey)
        }
        
        healthStore.execute(query)
    }
    
    private func getDataTypeKey(for sampleType: HKSampleType) -> String {
        if let quantityType = sampleType as? HKQuantityType {
            switch quantityType.identifier {
            case HKQuantityTypeIdentifier.stepCount.rawValue:
                return "steps"
            case HKQuantityTypeIdentifier.heartRate.rawValue:
                return "heartRate"
            case HKQuantityTypeIdentifier.distanceWalkingRunning.rawValue:
                return "distance"
            case HKQuantityTypeIdentifier.activeEnergyBurned.rawValue:
                return "calories"
            default:
                return quantityType.identifier
            }
        } else if let categoryType = sampleType as? HKCategoryType {
            if categoryType.identifier == HKCategoryTypeIdentifier.sleepAnalysis.rawValue {
                return "sleepAnalysis"
            }
        }
        return sampleType.identifier
    }
}
