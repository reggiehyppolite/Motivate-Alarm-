import AppIntents
import Foundation

/// Fires when the user taps "Stop" (or any primary alarm action). Sets a
/// pending URI for the app to consume on launch, then opens the app.
struct PlayMediaIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Play wake-up media"
    static var description = IntentDescription("Plays the song or podcast attached to this alarm.")
    static var openAppWhenRun: Bool { true }

    @Parameter(title: "Spotify URI")
    var spotifyURI: String

    @Parameter(title: "Display Title")
    var displayTitle: String

    init() {}

    init(spotifyURI: String, displayTitle: String) {
        self.spotifyURI = spotifyURI
        self.displayTitle = displayTitle
    }

    func perform() async throws -> some IntentResult {
        WakeUpQueue.pendingURI = spotifyURI
        return .result()
    }
}
