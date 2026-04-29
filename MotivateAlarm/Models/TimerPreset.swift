import Foundation
import SwiftData

@Model
final class TimerPreset {
    @Attribute(.unique) var id: UUID
    var label: String
    var durationSeconds: Int
    var mediaSelectionData: Data
    var alarmKitID: UUID?

    init(
        id: UUID = UUID(),
        label: String = "Timer",
        durationSeconds: Int,
        media: MediaSelection
    ) {
        self.id = id
        self.label = label
        self.durationSeconds = durationSeconds
        self.mediaSelectionData = (try? JSONEncoder().encode(media)) ?? Data()
        self.alarmKitID = nil
    }

    var media: MediaSelection {
        get {
            (try? JSONDecoder().decode(MediaSelection.self, from: mediaSelectionData))
                ?? MediaSelection(spotifyURI: "", title: "Unknown", subtitle: "", artworkURL: nil, kind: .track)
        }
        set { mediaSelectionData = (try? JSONEncoder().encode(newValue)) ?? Data() }
    }

    var duration: TimeInterval { TimeInterval(durationSeconds) }
}
