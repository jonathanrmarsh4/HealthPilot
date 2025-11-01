// Force import to prevent linker from stripping development pods
import HealthPilotHealthKit

// This file is no longer needed in Capacitor 7+ for auto-registration
// But the import above forces the linker to include development pods
// Plugins are auto-registered via their .m files using CAP_PLUGIN macro

// No-op reference to prevent unused module warning
private func _forceHealthPilotHealthKitLink() {
    // This ensures the module stays linked
    _ = HealthPilotHealthKit.self
}
