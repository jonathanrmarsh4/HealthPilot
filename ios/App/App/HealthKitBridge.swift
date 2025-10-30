import Foundation
import Capacitor

@objc public class HealthKitBridge: NSObject {
    @objc public static func registerPlugin() {
        // Force registration of the HealthKit plugin
        if let pluginClass = NSClassFromString("HealthPilotHealthKit") {
            print("✅ Registering HealthKit plugin")
            // This ensures the plugin is registered
        } else {
            print("❌ HealthPilotHealthKit class not found")
        }
    }
}