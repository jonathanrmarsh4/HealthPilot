#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Unique class + pluginId to avoid collisions with any old CAP_PLUGIN blocks
CAP_PLUGIN(HealthKitStatsPluginV3, "HealthPilotHKV3",
    CAP_PLUGIN_METHOD(getDailySteps, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getMultiDayStats, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(enableBackgroundDelivery, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(disableBackgroundDelivery, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getSyncStatus, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(triggerBackgroundSyncNow, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(drainBackgroundQueue, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getBackgroundQueueStats, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(resetAnchors, CAPPluginReturnPromise);
)
