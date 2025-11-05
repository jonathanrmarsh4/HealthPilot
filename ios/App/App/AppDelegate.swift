import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Clear WKWebView cache in development mode for live reload
        #if DEBUG
        let websiteDataTypes = Set([WKWebsiteDataTypeDiskCache, WKWebsiteDataTypeMemoryCache])
        let date = Date(timeIntervalSince1970: 0)
        WKWebsiteDataStore.default().removeData(ofTypes: websiteDataTypes, modifiedSince: date, completionHandler: {
            print("🧹 WKWebView cache cleared for live reload")
        })
        #endif
        
        // Register for background fetch
        UIApplication.shared.setMinimumBackgroundFetchInterval(UIApplication.backgroundFetchIntervalMinimum)
        print("✅ Background fetch registered")
        
        // Override point for customization after application launch.
        return true
    }
    
    // MARK: - Background Fetch
    func application(_ application: UIApplication, performFetchWithCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
        print("🔄 Background fetch triggered")
        
        // Post notification to Capacitor bridge to trigger background sync
        NotificationCenter.default.post(name: NSNotification.Name("backgroundFetch"), object: nil)
        
        // Perform background tasks
        Task {
            do {
                let success = await performBackgroundSync()
                completionHandler(success ? .newData : .noData)
            } catch {
                print("❌ Background fetch error: \(error.localizedDescription)")
                completionHandler(.failed)
            }
        }
    }
    
    private func performBackgroundSync() async -> Bool {
        print("📊 Performing background sync...")
        var hasNewData = false
        
        // 1. Sync HealthKit data
        if await syncHealthKitData() {
            hasNewData = true
            print("✅ HealthKit data synced")
        }
        
        // 2. Generate AI insights
        if await generateInsights() {
            hasNewData = true
            print("✅ AI insights generated")
        }
        
        // 3. Generate daily workout
        if await generateDailyWorkout() {
            hasNewData = true
            print("✅ Daily workout generated")
        }
        
        // 4. Update notifications
        if await updateNotifications() {
            hasNewData = true
            print("✅ Notifications updated")
        }
        
        return hasNewData
    }
    
    private func syncHealthKitData() async -> Bool {
        // Call backend API to trigger HealthKit sync
        // The mobile client will have already synced data on app lifecycle hooks
        // For background fetch, we just ensure the backend has the latest data
        guard let url = getBackendURL(path: "/api/healthkit/sync") else { return false }
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request = await addAuthHeaders(to: request)
            
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return false
            }
            return true
        } catch {
            print("❌ Failed to sync HealthKit: \(error)")
            return false
        }
    }
    
    private func generateInsights() async -> Bool {
        // Call backend API to generate insights
        guard let url = getBackendURL(path: "/api/insights/generate") else { return false }
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request = await addAuthHeaders(to: request)
            
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return false
            }
            return true
        } catch {
            print("❌ Failed to generate insights: \(error)")
            return false
        }
    }
    
    private func generateDailyWorkout() async -> Bool {
        // Call backend API to generate workout
        guard let url = getBackendURL(path: "/api/training/generate-daily-session") else { return false }
        
        do {
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request = await addAuthHeaders(to: request)
            
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return false
            }
            return true
        } catch {
            print("❌ Failed to generate workout: \(error)")
            return false
        }
    }
    
    private func updateNotifications() async -> Bool {
        // Fetch latest notifications
        guard let url = getBackendURL(path: "/api/notifications") else { return false }
        
        do {
            var request = URLRequest(url: url)
            request = await addAuthHeaders(to: request)
            
            let (_, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  (200...299).contains(httpResponse.statusCode) else {
                return false
            }
            return true
        } catch {
            print("❌ Failed to fetch notifications: \(error)")
            return false
        }
    }
    
    private func getBackendURL(path: String) -> URL? {
        // Use production URL for background fetch
        // Environment variables aren't reliable in background mode
        return URL(string: "https://healthpilot.pro" + path)
    }
    
    private func addAuthHeaders(to request: URLRequest) async -> URLRequest {
        var mutableRequest = request
        
        // Get auth token from UserDefaults (stored during login)
        if let token = UserDefaults.standard.string(forKey: "mobileAuthToken") {
            mutableRequest.setValue(token, forHTTPHeaderField: "X-Mobile-Auth-Token")
        }
        
        return mutableRequest
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
