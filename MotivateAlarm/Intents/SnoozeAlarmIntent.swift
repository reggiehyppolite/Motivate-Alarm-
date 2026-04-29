import AppIntents
import Foundation

/// Fires when the user taps "Snooze" on an active alarm. Reschedules the same
/// alarm for `now + snoozeMinutes` without opening the app.
struct SnoozeAlarmIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Snooze alarm"
    static var openAppWhenRun: Bool { false }

    @Parameter(title: "Alarm ID")
    var alarmID: String

    @Parameter(title: "Snooze Minutes")
    var snoozeMinutes: Int

    @Parameter(title: "Spotify URI")
    var spotifyURI: String

    @Parameter(title: "Label")
    var label: String

    init() {}

    init(alarmID: UUID, snoozeMinutes: Int, spotifyURI: String, label: String) {
        self.alarmID = alarmID.uuidString
        self.snoozeMinutes = snoozeMinutes
        self.spotifyURI = spotifyURI
        self.label = label
    }

    func perform() async throws -> some IntentResult {
        let fireDate = Date().addingTimeInterval(TimeInterval(snoozeMinutes * 60))
        try await AlarmScheduler.shared.scheduleSnooze(
            originalAlarmID: UUID(uuidString: alarmID) ?? UUID(),
            fireDate: fireDate,
            spotifyURI: spotifyURI,
            label: label
        )
        return .result()
    }
}
