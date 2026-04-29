import SwiftUI
import SwiftData

@main
struct MotivateAlarmApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @StateObject private var auth = SpotifyAuthService.shared
    @StateObject private var playback = SpotifyPlaybackService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(auth)
                .environmentObject(playback)
                .onOpenURL { url in
                    handleOpenURL(url)
                }
                .task {
                    try? await AlarmScheduler.shared.ensureAuthorized()
                }
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        consumePendingWakeUp()
                    } else if newPhase == .background {
                        playback.disconnectIfNeeded()
                    }
                }
        }
        .modelContainer(for: [Alarm.self, TimerPreset.self])
    }

    private func handleOpenURL(_ url: URL) {
        guard url.scheme == "motivatealarm" else { return }
        // Spotify uses the same redirect for both SessionManager (initial auth) and
        // AppRemote (token handoff). Dispatch to both — they ignore unrecognized URLs.
        auth.handleOpenURL(url)
        playback.handle(redirectURL: url)
    }

    private func consumePendingWakeUp() {
        guard let uri = WakeUpQueue.consume() else { return }
        playback.play(uri: uri)
    }
}
