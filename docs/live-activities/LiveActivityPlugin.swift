import Foundation
import Capacitor
import ActivityKit

// This file goes in ios/App/App/ directory (same level as AppDelegate.swift)

@objc(LiveActivityPlugin)
public class LiveActivityPlugin: CAPPlugin {
    private var currentActivity: Activity<WorkoutAttributes>?
    
    @objc func startActivity(_ call: CAPPluginCall) {
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
            
            // Return the push token for backend to send updates
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
    }
    
    @objc func updateActivity(_ call: CAPPluginCall) {
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
    }
    
    @objc func endActivity(_ call: CAPPluginCall) {
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
    }
}
