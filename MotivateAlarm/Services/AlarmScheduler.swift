import AlarmKit
import AppIntents
import Foundation
import SwiftUI

/// Wraps AlarmKit. Responsible for translating our `Alarm` / `TimerPreset`
/// models into AlarmKit `AlarmConfiguration`s and tracking the AlarmKit IDs
/// so we can cancel/reschedule.
///
/// API references:
///   - https://developer.apple.com/documentation/AlarmKit
///   - https://developer.apple.com/documentation/AlarmKit/scheduling-an-alarm-with-alarmkit
///   - WWDC25 session 230 ("Wake up to the AlarmKit API")
@MainActor
final class AlarmScheduler {
    static let shared = AlarmScheduler()
    private init() {}

    private var manager: AlarmManager { AlarmManager.shared }

    // MARK: Authorization

    func ensureAuthorized() async throws {
        let status = manager.authorizationState
        switch status {
        case .authorized:
            return
        case .notDetermined:
            let granted = try await manager.requestAuthorization()
            guard granted == .authorized else { throw SchedulerError.notAuthorized }
        case .denied:
            throw SchedulerError.notAuthorized
        @unknown default:
            throw SchedulerError.notAuthorized
        }
    }

    // MARK: Alarms

    func schedule(_ alarm: Alarm) async throws {
        try await ensureAuthorized()
        let alarmKitID = UUID()

        let stopIntent = PlayMediaIntent(
            spotifyURI: alarm.media.spotifyURI,
            displayTitle: alarm.media.title
        )

        let secondaryIntent = alarm.snoozeEnabled ? SnoozeAlarmIntent(
            alarmID: alarm.id,
            snoozeMinutes: alarm.snoozeMinutes,
            spotifyURI: alarm.media.spotifyURI,
            label: alarm.label
        ) : nil

        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: alarm.label),
            stopButton: .init(
                text: "Stop & Play",
                textColor: .white,
                systemImageName: "play.circle.fill"
            ),
            secondaryButton: alarm.snoozeEnabled ? .init(
                text: "Snooze",
                textColor: .white,
                systemImageName: "zzz"
            ) : nil,
            secondaryButtonBehavior: alarm.snoozeEnabled ? .custom : .none
        )

        let presentation = AlarmPresentation(alert: alert)
        let attributes = AlarmAttributes<EmptyMetadata>(
            presentation: presentation,
            tintColor: .orange
        )

        let schedule: AlarmManager.Schedule = alarm.isOneShot
            ? .fixed(alarm.nextFireDate())
            : recurringSchedule(for: alarm)

        let configuration = AlarmManager.AlarmConfiguration<EmptyMetadata>(
            schedule: schedule,
            attributes: attributes,
            stopIntent: stopIntent,
            secondaryIntent: secondaryIntent,
            sound: .named("alarm-tone")
        )

        _ = try await manager.schedule(id: alarmKitID, configuration: configuration)
        alarm.alarmKitID = alarmKitID
    }

    func cancel(_ alarm: Alarm) {
        if let id = alarm.alarmKitID {
            try? manager.cancel(id: id)
        }
        alarm.alarmKitID = nil
    }

    /// Re-schedule an alarm after toggling, time change, or media change.
    func reschedule(_ alarm: Alarm) async throws {
        cancel(alarm)
        if alarm.isEnabled {
            try await schedule(alarm)
        }
    }

    // MARK: Snooze

    func scheduleSnooze(
        originalAlarmID: UUID,
        fireDate: Date,
        spotifyURI: String,
        label: String
    ) async throws {
        try await ensureAuthorized()
        let snoozeID = UUID()

        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: "\(label) (Snoozed)"),
            stopButton: .init(text: "Stop & Play", textColor: .white, systemImageName: "play.circle.fill")
        )

        let configuration = AlarmManager.AlarmConfiguration<EmptyMetadata>(
            schedule: .fixed(fireDate),
            attributes: AlarmAttributes(presentation: AlarmPresentation(alert: alert), tintColor: .orange),
            stopIntent: PlayMediaIntent(spotifyURI: spotifyURI, displayTitle: label),
            secondaryIntent: nil,
            sound: .named("alarm-tone")
        )

        _ = try await manager.schedule(id: snoozeID, configuration: configuration)
    }

    // MARK: Timers

    func startTimer(_ timer: TimerPreset) async throws {
        try await ensureAuthorized()
        let timerID = UUID()

        let alert = AlarmPresentation.Alert(
            title: LocalizedStringResource(stringLiteral: timer.label),
            stopButton: .init(text: "Play", textColor: .white, systemImageName: "play.circle.fill")
        )

        let configuration = AlarmManager.AlarmConfiguration<EmptyMetadata>(
            schedule: .relative(.duration(timer.duration)),
            attributes: AlarmAttributes(presentation: AlarmPresentation(alert: alert), tintColor: .green),
            stopIntent: PlayMediaIntent(spotifyURI: timer.media.spotifyURI, displayTitle: timer.media.title),
            secondaryIntent: nil,
            sound: .named("alarm-tone")
        )

        _ = try await manager.schedule(id: timerID, configuration: configuration)
        timer.alarmKitID = timerID
    }

    func cancelTimer(_ timer: TimerPreset) {
        if let id = timer.alarmKitID {
            try? manager.cancel(id: id)
        }
        timer.alarmKitID = nil
    }

    // MARK: Internal helpers

    private func recurringSchedule(for alarm: Alarm) -> AlarmManager.Schedule {
        // AlarmKit's recurring schedule expects a base time + repeat pattern.
        // We use `.fixed` for the next occurrence and re-schedule on each fire
        // (handled when the app is launched via PlayMediaIntent and observes
        // the alarm completing). This keeps behavior deterministic.
        return .fixed(alarm.nextFireDate())
    }
}

enum SchedulerError: LocalizedError {
    case notAuthorized

    var errorDescription: String? {
        switch self {
        case .notAuthorized:
            return "Alarms permission is required. Enable it in Settings → Motivate Alarm."
        }
    }
}

/// Empty metadata payload — we don't need to attach extra data to the alarm UI.
struct EmptyMetadata: AlarmMetadata {
    init() {}
}
