import Foundation
import HealthPilotHealthKit

@objc public class ForceLoadHealthPilotHealthKit: NSObject {
    @objc public static func loadPlugin() {
        // Force the linker to include HealthPilotHealthKit
        HealthPilotHealthKitForceLoader.ping()
    }
}
