import Foundation
import Capacitor
import HealthKit

@objc(HealthKitStatsPlugin)
public class HealthKitStatsPlugin: CAPPlugin {
    private let healthStore = HKHealthStore()
    
    @objc func getDailySteps(_ call: CAPPluginCall) {
        guard let dateString = call.getString("date") else {
            call.reject("Date parameter required (ISO 8601 format)")
            return
        }
        
        // Parse date string to extract year/month/day components
        // This avoids timezone conversion issues when input is in UTC
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current // Use device timezone
        
        // Extract just the date part (YYYY-MM-DD) from ISO string
        let datePart = String(dateString.prefix(10))
        guard let date = formatter.date(from: datePart) else {
            call.reject("Invalid date format. Expected YYYY-MM-DD at start of string")
            return
        }
        
        let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
        
        // Use device's current timezone to define day boundaries
        let calendar = Calendar.current
        let startOfDay = calendar.startOfDay(for: date)
        guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
            call.reject("Failed to calculate end of day")
            return
        }
        
        let predicate = HKQuery.predicateForSamples(
            withStart: startOfDay,
            end: endOfDay,
            options: .strictStartDate
        )
        
        // Use HKStatisticsQuery with .cumulativeSum for automatic deduplication
        let query = HKStatisticsQuery(
            quantityType: stepType,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { [weak self] _, result, error in
            
            if let error = error {
                call.reject("HealthKit query failed: \(error.localizedDescription)")
                return
            }
            
            guard let result = result, let sum = result.sumQuantity() else {
                // No data for this day
                call.resolve([
                    "steps": 0,
                    "date": dateString,
                    "timezone": calendar.timeZone.identifier,
                    "startOfDay": ISO8601DateFormatter().string(from: startOfDay),
                    "endOfDay": ISO8601DateFormatter().string(from: endOfDay)
                ])
                return
            }
            
            let steps = Int(sum.doubleValue(for: .count()))
            
            call.resolve([
                "steps": steps,
                "date": dateString,
                "timezone": calendar.timeZone.identifier,
                "startOfDay": ISO8601DateFormatter().string(from: startOfDay),
                "endOfDay": ISO8601DateFormatter().string(from: endOfDay)
            ])
        }
        
        healthStore.execute(query)
    }
    
    @objc func getMultiDayStats(_ call: CAPPluginCall) {
        guard let dateStrings = call.getArray("dates", String.self) else {
            call.reject("dates parameter required (array of ISO 8601 dates)")
            return
        }
        
        // Use thread-safe dictionary to avoid race conditions
        var resultsDict: [String: [String: Any]] = [:]
        let dictLock = NSLock()
        let group = DispatchGroup()
        
        // Date formatter for parsing
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone.current
        
        for dateString in dateStrings {
            group.enter()
            
            // Extract date part (YYYY-MM-DD) to avoid UTC conversion issues
            let datePart = String(dateString.prefix(10))
            guard let date = formatter.date(from: datePart) else {
                group.leave()
                continue
            }
            
            let stepType = HKQuantityType.quantityType(forIdentifier: .stepCount)!
            let calendar = Calendar.current
            let startOfDay = calendar.startOfDay(for: date)
            guard let endOfDay = calendar.date(byAdding: .day, value: 1, to: startOfDay) else {
                group.leave()
                continue
            }
            
            let predicate = HKQuery.predicateForSamples(
                withStart: startOfDay,
                end: endOfDay,
                options: .strictStartDate
            )
            
            let query = HKStatisticsQuery(
                quantityType: stepType,
                quantitySamplePredicate: predicate,
                options: .cumulativeSum
            ) { [weak self] _, result, error in
                defer { group.leave() }
                
                if error != nil { return }
                
                let steps = result?.sumQuantity()?.doubleValue(for: .count()) ?? 0
                
                // Thread-safe dictionary insert
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
            // Return results in same order as input dates
            let sortedResults = dateStrings.compactMap { resultsDict[$0] }
            call.resolve(["results": sortedResults])
        }
    }
}
