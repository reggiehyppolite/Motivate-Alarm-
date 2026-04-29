import SwiftUI

struct RootView: View {
    @StateObject private var playback = SpotifyPlaybackService.shared
    @State private var wakeUpMedia: MediaSelection?

    var body: some View {
        TabView {
            AlarmListView()
                .tabItem { Label("Alarms", systemImage: "alarm") }

            TimerView()
                .tabItem { Label("Timer", systemImage: "timer") }
        }
        .sheet(item: $wakeUpMedia) { media in
            NowPlayingView(media: media, playback: playback)
                .presentationDetents([.large])
        }
        .onChange(of: playback.currentlyPlayingURI) { _, uri in
            // Show NowPlaying when the alarm-fired playback kicks off.
            if uri != nil, wakeUpMedia == nil {
                wakeUpMedia = MediaSelection(
                    spotifyURI: uri ?? "",
                    title: "Wake-up",
                    subtitle: "Now playing on Spotify",
                    artworkURL: nil,
                    kind: .track
                )
            }
        }
    }
}
