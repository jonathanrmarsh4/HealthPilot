import Foundation
import Capacitor
import HealthKit

@objc(HealthKitStatsPluginV3)
public class HealthKitStatsPluginV3: CAPPlugin {
    private let healthStore = HKHealthStore()
    private var observers: [HKObserverQuery] = []
    
    // Local queue for storing background samples
    private var backgroundQueue: [String: [[String: Any]]] = [:]
    private let queueKey = "healthkit_background_queue_v3"
    private let syncEnabledKey = "background_sync_enabled_v3"
    
    public override func load() {
        super.load()
        NSLog("🔵🔵🔵 [HK V3] Plugin loaded successfully: \(String(describing: type(of: self)))")
        
        // Load persisted queue from UserDefaults
        if let saved = UserDefaults.standard.dictionary(forKey: queueKey) as? [String: [[String: Any]]] {
            backgroundQueue = saved
            NSLog("[HK V3] Loaded \(saved.count) queued data types from persistence")
        }
    }
    
    // MARK: - Stats Methods (Working methods from V2)
    
    @objc public func getDailySteps(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] getDailySteps called")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Step count type not available")
            return
        }
        
        // Get target date from parameter (or default to today)
        let calendar = Calendar.current
        let timezone = calendar.timeZone
        let targetDate: Date
        
        if let dateString = call.getString("date") {
            // Parse the provided date string
            if let parsed = parseISO8601Date(dateString) {
                targetDate = parsed
            } else {
                call.reject("Invalid date format. Expected ISO 8601 format.")
                return
            }
        } else {
            // No date provided, use today
            targetDate = Date()
        }
        
        let startOfDay = calendar.startOfDay(for: targetDate)
        let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: endOfDay,
            options: .strictStartDate
        )
        
        let query = HKStatisticsQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, statistics, error in
            if let error = error {
                call.reject("Failed to fetch steps: \(error.localizedDescription)")
                return
            }
            
            let steps = statistics?.sumQuantity()?.doubleValue(for: .count()) ?? 0
            
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.timeZone = timezone
            
            call.resolve([
                "steps": Int(steps),
                "date": self.dateString(for: targetDate, timezone: timezone),
                "timezone": timezone.identifier,
                "startOfDay": dateFormatter.string(from: startOfDay),
                "endOfDay": dateFormatter.string(from: endOfDay)
            ])
        }
        
        healthStore.execute(query)
    }
    
    @objc public func getMultiDayStats(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] getMultiDayStats called")
        
        guard let dateStrings = call.getArray("dates", String.self) else {
            call.reject("Missing dates parameter")
            return
        }
        
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }
        
        guard let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount) else {
            call.reject("Step count type not available")
            return
        }
        
        let calendar = Calendar.current
        let group = DispatchGroup()
        let dictLock = NSLock()
        var resultsDict: [String: [String: Any]] = [:]
        
        for dateString in dateStrings {
            guard let date = parseDate(dateString) else { continue }
            
            group.enter()
            
            let startOfDay = calendar.startOfDay(for: date)
            let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay)!
            
            let predicate = HKQuery.predicateForSamples(
                withStart: startOfDay,
                end: endOfDay,
                options: .strictStartDate
            )
            
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { _, statistics, _ in
                defer { group.leave() }
                
                let steps = statistics?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                
                dictLock.lock()
                resultsDict[dateString] = [
                    "steps": Int(steps),
                    "date": dateString,
                    "timezone": calendar.timeZone.identifier
                ]
                dictLock.unlock()
            }
            
            healthStore.execute(query)
        }
        
        group.notify(queue: .main) {
            let sortedResults = dateStrings.compactMap { resultsDict[$0] }
            call.resolve(["results": sortedResults])
        }
    }
    
    // MARK: - Background Sync Methods
    
    @objc public func enableBackgroundDelivery(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] enableBackgroundDelivery called")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available on this device")
            return
        }
        
        let dataTypes: [HKSampleType] = [
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]
        
        // Request authorization first
        let typesToRead = Set(dataTypes as [HKObjectType])
        healthStore.requestAuthorization(toShare: nil, read: typesToRead) { [weak self] success, error in
            guard let self = self else { return }
            
            if let error = error {
                NSLog("[HK V3] Authorization error: \(error.localizedDescription)")
                call.reject("Failed to request authorization: \(error.localizedDescription)")
                return
            }
            
            if !success {
                call.reject("HealthKit authorization denied")
                return
            }
            
            NSLog("[HK V3] Authorization granted, setting up observers...")
            self.setupBackgroundObservers(for: dataTypes, call: call)
        }
    }
    
    @objc public func disableBackgroundDelivery(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] disableBackgroundDelivery called")
        
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
        
        UserDefaults.standard.set(false, forKey: syncEnabledKey)
        NSLog("[HK V3] Background delivery disabled")
        
        call.resolve(["success": true])
    }
    
    @objc public func getSyncStatus(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] getSyncStatus called")
        
        let enabled = UserDefaults.standard.bool(forKey: syncEnabledKey)
        let queueCount = backgroundQueue.values.reduce(0) { $0 + $1.count }
        
        call.resolve([
            "enabled": enabled,
            "queuedSamples": queueCount,
            "observersActive": observers.count
        ])
    }
    
    @objc public func triggerBackgroundSyncNow(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] triggerBackgroundSyncNow called (foreground test)")
        
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit not available")
            return
        }
        
        // Fetch recent samples for all monitored types (last 24 hours)
        let dataTypes: [HKSampleType] = [
            HKQuantityType.quantityType(forIdentifier: .stepCount)!,
            HKQuantityType.quantityType(forIdentifier: .heartRate)!,
            HKQuantityType.quantityType(forIdentifier: .distanceWalkingRunning)!,
            HKQuantityType.quantityType(forIdentifier: .activeEnergyBurned)!,
            HKCategoryType.categoryType(forIdentifier: .sleepAnalysis)!,
        ]
        
        var fetchedCount = 0
        let group = DispatchGroup()
        
        for dataType in dataTypes {
            group.enter()
            fetchAndQueueNewSamples(for: dataType) {
                fetchedCount += 1
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            NSLog("[HK V3] Foreground sync completed. Fetched \(fetchedCount) data types.")
            let totalSamples = self.backgroundQueue.values.reduce(0) { $0 + $1.count }
            call.resolve([
                "success": true,
                "dataTypesFetched": fetchedCount,
                "totalQueuedSamples": totalSamples
            ])
        }
    }
    
    @objc public func drainBackgroundQueue(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] drainBackgroundQueue called")
        
        let queueData = backgroundQueue
        
        // Clear the queue after draining
        backgroundQueue = [:]
        UserDefaults.standard.removeObject(forKey: queueKey)
        
        NSLog("[HK V3] Drained \(queueData.values.reduce(0) { $0 + $1.count }) samples")
        call.resolve(["data": queueData])
    }
    
    @objc public func getBackgroundQueueStats(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] getBackgroundQueueStats called")
        
        var stats: [String: Int] = [:]
        
        for (dataType, samples) in backgroundQueue {
            stats[dataType] = samples.count
        }
        
        call.resolve(["stats": stats])
    }
    
    @objc public func resetAnchors(_ call: CAPPluginCall) {
        NSLog("🔵🔵🔵 [HK V3] resetAnchors called")
        
        // Clear all persisted anchors for all data types
        let dataTypes = ["steps", "heartRate", "distance", "calories", "sleepAnalysis"]
        for dataType in dataTypes {
            clearAnchor(for: dataType)
        }
        
        // Also clear the background queue
        backgroundQueue = [:]
        UserDefaults.standard.removeObject(forKey: queueKey)
        
        NSLog("[HK V3] Cleared anchors for \(dataTypes.count) data types and background queue")
        call.resolve(["success": true])
    }
    
    // MARK: - Private Methods
    
    private func setupBackgroundObservers(for dataTypes: [HKSampleType], call: CAPPluginCall) {
        // Create observer queries for each data type
        for dataType in dataTypes {
            let query = HKObserverQuery(sampleType: dataType, predicate: nil) { [weak self] (query, completionHandler, error) in
                guard let self = self else {
                    completionHandler()
                    return
                }
                
                if let error = error {
                    NSLog("[HK V3] Observer query error: \(error.localizedDescription)")
                    completionHandler()
                    return
                }
                
                // Fetch new samples and add to queue
                self.fetchAndQueueNewSamples(for: dataType) {
                    completionHandler()
                }
            }
            
            healthStore.execute(query)
            observers.append(query)
        }
        
        // Enable background delivery for each type
        var deliveryCount = 0
        let group = DispatchGroup()
        
        for dataType in dataTypes {
            group.enter()
            healthStore.enableBackgroundDelivery(for: dataType, frequency: .immediate) { success, error in
                if success {
                    deliveryCount += 1
                } else {
                    NSLog("[HK V3] Failed to enable background delivery for \(dataType): \(error?.localizedDescription ?? "unknown")")
                }
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            UserDefaults.standard.set(true, forKey: self.syncEnabledKey)
            NSLog("[HK V3] Background sync enabled. \(deliveryCount)/\(dataTypes.count) delivery types active.")
            call.resolve(["success": true, "deliveryTypesEnabled": deliveryCount])
        }
    }
    
    private func fetchAndQueueNewSamples(for dataType: HKSampleType, completion: @escaping () -> Void) {
        // Get samples from the last 24 hours
        let now = Date()
        let oneDayAgo = Calendar.current.date(byAdding: .hour, value: -24, to: now)!
        
        let predicate = HKQuery.predicateForSamples(
            withStart: oneDayAgo,
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
                completion()
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
            
            NSLog("[HK V3] Queued \(sampleDicts.count) samples for \(dataTypeKey)")
            completion()
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
    
    private func dateString(for date: Date, timezone: TimeZone) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = timezone
        return formatter.string(from: date)
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.date(from: dateString)
    }
    
    private func parseISO8601Date(_ dateString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        return formatter.date(from: dateString)
    }
    
    // MARK: - Anchor Persistence
    
    private func saveAnchor(_ anchor: HKQueryAnchor, for dataTypeKey: String) {
        do {
            let data = try NSKeyedArchiver.archivedData(withRootObject: anchor, requiringSecureCoding: true)
            UserDefaults.standard.set(data, forKey: "anchor_\(dataTypeKey)")
        } catch {
            NSLog("[HK V3] Failed to save anchor for \(dataTypeKey): \(error.localizedDescription)")
        }
    }
    
    private func loadAnchor(for dataTypeKey: String) -> HKQueryAnchor? {
        guard let data = UserDefaults.standard.data(forKey: "anchor_\(dataTypeKey)") else {
            return nil
        }
        
        do {
            if let anchor = try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: data) {
                return anchor
            }
        } catch {
            NSLog("[HK V3] Failed to load anchor for \(dataTypeKey): \(error.localizedDescription)")
        }
        
        return nil
    }
    
    private func clearAnchor(for dataTypeKey: String) {
        UserDefaults.standard.removeObject(forKey: "anchor_\(dataTypeKey)")
    }
}
