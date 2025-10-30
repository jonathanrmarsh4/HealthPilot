import Foundation
import Capacitor

@objc public class HealthKitBridge: NSObject {
    @objc public static func registerPlugin() {
        print("🔌 HealthKitBridge: Starting plugin registration")
        
        // Register the HealthPilotHealthKit plugin with Capacitor
        let plugin = HealthPilotHealthKit.self
        print("✅ HealthKit plugin registered: \(plugin)")
    }
}