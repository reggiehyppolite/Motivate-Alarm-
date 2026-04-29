import SwiftUI

struct NowPlayingView: View {
    let media: MediaSelection?
    @ObservedObject var playback: SpotifyPlaybackService

    var body: some View {
        VStack(spacing: 24) {
            Spacer()
            AsyncImage(url: media?.artworkURL) { image in
                image.resizable().aspectRatio(contentMode: .fit)
            } placeholder: {
                RoundedRectangle(cornerRadius: 16).fill(.gray.opacity(0.2))
            }
            .frame(maxWidth: 280, maxHeight: 280)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(radius: 12)

            VStack(spacing: 6) {
                Text(media?.title ?? "Playing…")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                Text(media?.subtitle ?? "")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal)

            HStack(spacing: 32) {
                Button {
                    playback.pause()
                } label: {
                    Image(systemName: "pause.circle.fill")
                        .font(.system(size: 56))
                }
                Button {
                    playback.resume()
                } label: {
                    Image(systemName: "play.circle.fill")
                        .font(.system(size: 56))
                }
            }
            .foregroundStyle(.orange)

            Spacer()
            Text(playback.isConnected ? "Connected to Spotify" : "Connecting…")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}
