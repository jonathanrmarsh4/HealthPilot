#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(HealthKitBackgroundSyncPlugin, "HealthKitBackgroundSyncPlugin",
    CAP_PLUGIN_METHOD(enableBackgroundSync, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disableBackgroundSync, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(isBackgroundSyncEnabled, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(drainBackgroundQueue, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getBackgroundQueueStats, CAPPluginReturnPromise);
)
