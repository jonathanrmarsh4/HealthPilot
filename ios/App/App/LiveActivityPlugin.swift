import Foundation
import Capacitor
import ActivityKit

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {
    @available(iOS 16.1, *)
    private var currentActivity: Activity<WorkoutAttributes>?
    
    @objc func startActivity(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            guard let sessionId = call.getString("sessionId"),
                  let workoutType = call.getString("workoutType"),
                  let currentExercise = call.getString("currentExercise"),
                  let nextExercise = call.getString("nextExercise") else {
                call.reject("Missing required parameters")
                return
            }
            
            let attributes = WorkoutAttributes(
                workoutSessionId: sessionId,
                workoutType: workoutType
            )
            
            let contentState = WorkoutAttributes.ContentState(
                currentExercise: currentExercise,
                currentSet: call.getInt("currentSet") ?? 1,
                totalSets: call.getInt("totalSets") ?? 3,
                nextExercise: nextExercise,
                restTimeRemaining: call.getInt("restTimeRemaining") ?? 0,
                elapsedTime: call.getString("elapsedTime") ?? "0:00",
                heartRate: call.getInt("heartRate") ?? 0,
                heartRateZone: call.getString("heartRateZone") ?? "Z1",
                isPaused: call.getBool("isPaused") ?? false
            )
            
            do {
                let activity = try Activity.request(
                    attributes: attributes,
                    content: .init(state: contentState, staleDate: nil),
                    pushType: .token
                )
                
                self.currentActivity = activity
                
                Task {
                    for await pushToken in activity.pushTokenUpdates {
                        let tokenString = pushToken.map { String(format: "%02x", $0) }.joined()
                        call.resolve([
                            "activityId": activity.id,
                            "pushToken": tokenString
                        ])
                        return
                    }
                }
            } catch {
                call.reject("Failed to start Live Activity: \(error.localizedDescription)")
            }
        } else {
            call.reject("Live Activities require iOS 16.1 or later")
        }
    }
    
    @objc func updateActivity(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            guard let activity = currentActivity else {
                call.reject("No active Live Activity")
                return
            }
            
            guard let currentExercise = call.getString("currentExercise"),
                  let nextExercise = call.getString("nextExercise") else {
                call.reject("Missing required parameters")
                return
            }
            
            let contentState = WorkoutAttributes.ContentState(
                currentExercise: currentExercise,
                currentSet: call.getInt("currentSet") ?? 1,
                totalSets: call.getInt("totalSets") ?? 3,
                nextExercise: nextExercise,
                restTimeRemaining: call.getInt("restTimeRemaining") ?? 0,
                elapsedTime: call.getString("elapsedTime") ?? "0:00",
                heartRate: call.getInt("heartRate") ?? 0,
                heartRateZone: call.getString("heartRateZone") ?? "Z1",
                isPaused: call.getBool("isPaused") ?? false
            )
            
            Task {
                await activity.update(using: contentState)
                call.resolve()
            }
        } else {
            call.reject("Live Activities require iOS 16.1 or later")
        }
    }
    
    @objc func endActivity(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            guard let activity = currentActivity else {
                call.reject("No active Live Activity")
                return
            }
            
            let finalContent = WorkoutAttributes.ContentState(
                currentExercise: "Workout Complete",
                currentSet: 0,
                totalSets: 0,
                nextExercise: "",
                restTimeRemaining: 0,
                elapsedTime: call.getString("elapsedTime") ?? "0:00",
                heartRate: 0,
                heartRateZone: "",
                isPaused: false
            )
            
            Task {
                await activity.end(using: finalContent, dismissalPolicy: .after(.now + 5))
                self.currentActivity = nil
                call.resolve()
            }
        } else {
            call.reject("Live Activities require iOS 16.1 or later")
        }
    }
}
