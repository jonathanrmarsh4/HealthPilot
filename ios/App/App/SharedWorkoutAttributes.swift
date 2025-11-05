import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct WorkoutAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var currentExercise: String
        var currentSet: Int
        var totalSets: Int
        var nextExercise: String
        var restTimeRemaining: Int
        var elapsedTime: String
        var heartRate: Int
        var heartRateZone: String
        var isPaused: Bool
    }
    
    var workoutSessionId: String
    var workoutType: String
}
