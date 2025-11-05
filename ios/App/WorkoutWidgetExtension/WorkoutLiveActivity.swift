import ActivityKit
import WidgetKit
import SwiftUI

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

struct WorkoutLiveActivityView: View {
    let context: ActivityViewContext<WorkoutAttributes>
    
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color(red: 0.1, green: 0.1, blue: 0.15, opacity: 0.95),
                    Color(red: 0.15, green: 0.15, blue: 0.2, opacity: 0.9)
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .overlay(
                LinearGradient(
                    colors: [
                        Color.blue.opacity(0.2),
                        Color.clear
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            
            VStack(spacing: 12) {
                VStack(spacing: 4) {
                    HStack {
                        Text("🏋️ \(context.state.currentExercise.uppercased())")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(.white)
                        Spacer()
                        Text("Set \(context.state.currentSet) of \(context.state.totalSets)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    
                    HStack {
                        Text("Next: \(context.state.nextExercise)")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                        Spacer()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 12)
                
                if context.state.restTimeRemaining > 0 {
                    VStack(spacing: 8) {
                        Text("\(formatTime(context.state.restTimeRemaining))")
                            .font(.system(size: 42, weight: .bold, design: .rounded))
                            .foregroundColor(.white)
                            .shadow(color: .black.opacity(0.3), radius: 2, x: 0, y: 2)
                        
                        GeometryReader { geometry in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(Color.white.opacity(0.2))
                                    .frame(height: 4)
                                
                                RoundedRectangle(cornerRadius: 2)
                                    .fill(
                                        LinearGradient(
                                            colors: [Color.blue, Color.cyan],
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    )
                                    .frame(
                                        width: geometry.size.width * CGFloat(context.state.restTimeRemaining) / 90.0,
                                        height: 4
                                    )
                            }
                        }
                        .frame(height: 4)
                        .padding(.horizontal, 40)
                    }
                } else {
                    Text("Ready to start next set")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundColor(.green)
                        .padding(.vertical, 8)
                }
                
                HStack(spacing: 20) {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .foregroundColor(.red)
                            .font(.system(size: 12))
                        Text("\(context.state.heartRate) bpm")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                        Text("(\(context.state.heartRateZone))")
                            .font(.system(size: 11))
                            .foregroundColor(.white.opacity(0.6))
                    }
                    
                    Spacer()
                    
                    HStack(spacing: 4) {
                        Image(systemName: "clock.fill")
                            .foregroundColor(.blue.opacity(0.8))
                            .font(.system(size: 12))
                        Text(context.state.elapsedTime)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
                .padding(.horizontal, 16)
                
                HStack(spacing: 12) {
                    Button(intent: TogglePauseIntent(sessionId: context.attributes.workoutSessionId)) {
                        VStack(spacing: 4) {
                            Image(systemName: context.state.isPaused ? "play.fill" : "pause.fill")
                                .font(.system(size: 16))
                            Text(context.state.isPaused ? "Resume" : "Pause")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(8)
                        .foregroundColor(.white)
                    }
                    
                    Button(intent: CompleteSetIntent(sessionId: context.attributes.workoutSessionId)) {
                        VStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 16))
                            Text("Complete")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(
                            LinearGradient(
                                colors: [Color.green.opacity(0.6), Color.green.opacity(0.8)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .cornerRadius(8)
                        .foregroundColor(.white)
                    }
                    
                    Button(intent: SkipExerciseIntent(sessionId: context.attributes.workoutSessionId)) {
                        VStack(spacing: 4) {
                            Image(systemName: "forward.fill")
                                .font(.system(size: 16))
                            Text("Skip")
                                .font(.system(size: 10, weight: .medium))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.15))
                        .cornerRadius(8)
                        .foregroundColor(.white)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
            }
        }
        .activityBackgroundTint(Color.clear)
        .activitySystemActionForegroundColor(.white)
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        if mins > 0 {
            return String(format: "%d:%02d", mins, secs)
        } else {
            return String(format: "%ds", secs)
        }
    }
}

struct TogglePauseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Toggle Pause"
    
    @Parameter(title: "Session ID")
    var sessionId: String
    
    func perform() async throws -> some IntentResult {
        let url = URL(string: "healthpilot://workout/\(sessionId)/toggle-pause")!
        await openURL(url)
        return .result()
    }
}

struct CompleteSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Complete Set"
    
    @Parameter(title: "Session ID")
    var sessionId: String
    
    func perform() async throws -> some IntentResult {
        let url = URL(string: "healthpilot://workout/\(sessionId)/complete-set")!
        await openURL(url)
        return .result()
    }
}

struct SkipExerciseIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Skip Exercise"
    
    @Parameter(title: "Session ID")
    var sessionId: String
    
    func perform() async throws -> some IntentResult {
        let url = URL(string: "healthpilot://workout/\(sessionId)/skip")!
        await openURL(url)
        return .result()
    }
}

struct WorkoutLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutAttributes.self) { context in
            WorkoutLiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.currentExercise)
                        .font(.caption)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(formatTime(context.state.restTimeRemaining))")
                        .font(.caption.bold())
                }
                DynamicIslandExpandedRegion(.center) {
                    Text("Set \(context.state.currentSet)/\(context.state.totalSets)")
                        .font(.caption2)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Button(intent: CompleteSetIntent(sessionId: context.attributes.workoutSessionId)) {
                            Text("✓")
                        }
                        Spacer()
                        Button(intent: SkipExerciseIntent(sessionId: context.attributes.workoutSessionId)) {
                            Text("→")
                        }
                    }
                }
            } compactLeading: {
                Text("🏋️")
            } compactTrailing: {
                Text(formatTime(context.state.restTimeRemaining))
                    .font(.caption2.bold())
            } minimal: {
                Text("🏋️")
            }
        }
    }
    
    private func formatTime(_ seconds: Int) -> String {
        let mins = seconds / 60
        let secs = seconds % 60
        if mins > 0 {
            return "\(mins):\(String(format: "%02d", secs))"
        } else {
            return "\(secs)s"
        }
    }
}
