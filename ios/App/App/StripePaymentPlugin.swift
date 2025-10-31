dimport Foundation
import Capacitor
import StripePaymentSheet

@objc(StripePaymentPlugin)
public class StripePaymentPlugin: CAPPlugin {
    
    @objc func presentPaymentSheet(_ call: CAPPluginCall) {
        guard let clientSecret = call.getString("clientSecret"),
              let merchantDisplayName = call.getString("merchantDisplayName"),
              let customerId = call.getString("customerId"),
              let ephemeralKey = call.getString("ephemeralKey") else {
            call.reject("Missing required parameters: clientSecret, merchantDisplayName, customerId, or ephemeralKey")
            return
        }
        
        // Configure payment sheet
        var configuration = PaymentSheet.Configuration()
        configuration.merchantDisplayName = merchantDisplayName
        configuration.customer = .init(id: customerId, ephemeralKeySecret: ephemeralKey)
        configuration.allowsDelayedPaymentMethods = true
        configuration.applePay = .init(merchantId: "merchant.com.nuvitae.healthpilot", merchantCountryCode: "US")
        
        // Initialize PaymentSheet
        PaymentSheet.FlowController.create(
            paymentIntentClientSecret: clientSecret,
            configuration: configuration
        ) { [weak self] result in
            switch result {
            case .failure(let error):
                call.reject("Failed to initialize payment sheet: \(error.localizedDescription)")
            case .success(let flowController):
                DispatchQueue.main.async {
                    self?.presentPaymentOptions(flowController: flowController, call: call)
                }
            }
        }
    }
    
    private func presentPaymentOptions(flowController: PaymentSheet.FlowController, call: CAPPluginCall) {
        guard let viewController = self.bridge?.viewController else {
            call.reject("Unable to get view controller")
            return
        }
        
        // Present payment sheet
        flowController.presentPaymentOptions(from: viewController) { [weak self] in
            // User selected payment method, now confirm payment
            self?.confirmPayment(flowController: flowController, call: call)
        }
    }
    
    private func confirmPayment(flowController: PaymentSheet.FlowController, call: CAPPluginCall) {
        guard let viewController = self.bridge?.viewController else {
            call.reject("Unable to get view controller")
            return
        }
        
        flowController.confirm(from: viewController) { paymentResult in
            switch paymentResult {
            case .completed:
                call.resolve([
                    "success": true,
                    "message": "Payment completed successfully"
                ])
            case .canceled:
                call.reject("Payment was cancelled by user")
            case .failed(let error):
                call.reject("Payment failed: \(error.localizedDescription)")
            }
        }
    }
    
    @objc func canMakeApplePayPayments(_ call: CAPPluginCall) {
        let canMakePayments = PaymentSheet.isApplePayAvailable()
        call.resolve([
            "available": canMakePayments
        ])
    }
}
