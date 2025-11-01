import Foundation

@objc public class HealthPilotHealthKitForceLoader: NSObject {
    @objc public static func ping() {
        // This method forces the linker to include this module
        // and ensures the CAP_PLUGIN registration code runs
    }
}
