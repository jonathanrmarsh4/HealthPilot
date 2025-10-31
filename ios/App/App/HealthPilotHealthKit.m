#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(HealthPilotHealthKit, "HealthPilotHealthKit",
  CAP_PLUGIN_METHOD(isAvailable, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(requestAuthorization, CAPPluginReturnPromise);
  CAP_PLUGIN_METHOD(queryHealthData, CAPPluginReturnPromise);
)
