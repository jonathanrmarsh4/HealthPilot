import Capacitor
import HealthPilotHealthKit

@objc public class CapacitorPlugins: NSObject {
    @objc public static func load() {
        // Register custom HealthPilotHealthKit plugin
        CAPBridge.registerPlugin(HealthPilotHealthKit.self)
    }
}
