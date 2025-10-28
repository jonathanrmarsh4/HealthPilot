#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(SafariDataPlugin, "SafariDataPlugin",
  CAP_PLUGIN_METHOD(clearData, CAPPluginReturnPromise);
)
