import Foundation
import Capacitor
import SafariServices

@objc(SafariDataPlugin)
public class SafariDataPlugin: CAPPlugin {
    
    @objc func clearData(_ call: CAPPluginCall) {
        if #available(iOS 16.0, *) {
            SFSafariViewController.DataStore.default.clearWebsiteData { [weak self] in
                call.resolve([
                    "success": true,
                    "message": "SFSafariViewController data cleared"
                ])
            }
        } else {
            call.resolve([
                "success": false,
                "message": "iOS 16+ required to clear SFSafariViewController data"
            ])
        }
    }
}
