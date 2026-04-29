import Foundation
import SwiftData

@Model
final class Alarm {
    @Attribute(.unique) var id: UUID
    var hour: Int
    var minute: Int
    var repeatDaysRaw: [Int]
    var snoozeEnabled: Bool
    var snoozeMinutes: Int
    var label: String
    var isEnabled: Bool
    var alarmKitID: UUID?
    var mediaSelectionData: Data

    init(
        id: UUID = UUID(),
        hour: Int,
        minute: Int,
        repeatDays: Set<Weekday> = [],
        media: MediaSelection,
        snoozeEnabled: Bool = true,
        snoozeMinutes: Int = 9,
        label: String = "Alarm",
        isEnabled: Bool = true
    ) {
        self.id = id
        self.hour = hour
        self.minute = minute
        self.repeatDaysRaw = repeatDays.map(\.rawValue).sorted()
        self.snoozeEnabled = snoozeEnabled
        self.snoozeMinutes = snoozeMinutes
        self.label = label
        self.isEnabled = isEnabled
        self.alarmKitID = nil
        self.mediaSelectionData = (try? JSONEncoder().encode(media)) ?? Data()
    }

    var repeatDays: Set<Weekday> {
        get { Set(repeatDaysRaw.compactMap(Weekday.init(rawValue:))) }
        set { repeatDaysRaw = newValue.map(\.rawValue).sorted() }
    }

    var media: MediaSelection {
        get {
            (try? JSONDecoder().decode(MediaSelection.self, from: mediaSelectionData))
                ?? MediaSelection(spotifyURI: "", title: "Unknown", subtitle: "", artworkURL: nil, kind: .track)
        }
        set { mediaSelectionData = (try? JSONEncoder().encode(newValue)) ?? Data() }
    }

    var isOneShot: Bool { repeatDays.isEmpty }

    /// Returns the next absolute fire date for this alarm relative to `from`.
    func nextFireDate(from: Date = .now, calendar: Calendar = .current) -> Date {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        components.second = 0

        if isOneShot {
            return calendar.nextDate(
                after: from,
                matching: components,
                matchingPolicy: .nextTime
            ) ?? from.addingTimeInterval(60)
        }

        // Recurring: find soonest matching weekday at hour:minute.
        var candidate = from
        for _ in 0..<8 {
            guard let next = calendar.nextDate(
                after: candidate,
                matching: components,
                matchingPolicy: .nextTime
            ) else { break }
            let weekdayInt = calendar.component(.weekday, from: next)
            if let weekday = Weekday(rawValue: weekdayInt), repeatDays.contains(weekday) {
                return next
            }
            candidate = next
        }
        return from.addingTimeInterval(60)
    }
}
