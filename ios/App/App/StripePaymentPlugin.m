#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(StripePaymentPlugin, "StripePayment",
    CAP_PLUGIN_METHOD(presentPaymentSheet, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(canMakeApplePayPayments, CAPPluginReturnPromise);
)
