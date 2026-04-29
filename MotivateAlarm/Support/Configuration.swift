import Foundation

enum Configuration {
    /// Reads SpotifyClientID from Info.plist (injected via SPOTIFY_CLIENT_ID build setting).
    static var spotifyClientID: String {
        Bundle.main.object(forInfoDictionaryKey: "SpotifyClientID") as? String ?? ""
    }

    static var spotifyRedirectURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "SpotifyRedirectURL") as? String
            ?? "motivatealarm://spotify-callback"
        return URL(string: raw)!
    }
}
