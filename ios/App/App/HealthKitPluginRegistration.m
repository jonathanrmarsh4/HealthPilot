#import <Foundation/Foundation.h>

// Force link the HealthPilotHealthKit Swift class
__attribute__((constructor))
static void ForceHealthKitLink(void) {
    // This ensures the Swift HealthKit plugin is linked
    NSLog(@"HealthKit Plugin Registration: Forcing link");
}