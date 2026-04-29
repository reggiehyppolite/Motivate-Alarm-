import Foundation
import SpotifyiOS
import UIKit

/// Plays a Spotify URI by handing off to the Spotify app via SPTAppRemote.
/// Requires the Spotify app installed and a Premium account on the device.
@MainActor
final class SpotifyPlaybackService: NSObject, ObservableObject {
    static let shared = SpotifyPlaybackService()

    enum PlaybackError: LocalizedError {
        case spotifyNotInstalled
        case notAuthorized
        case connectionFailed(String)

        var errorDescription: String? {
            switch self {
            case .spotifyNotInstalled:
                return "Spotify isn't installed on this device. Install it from the App Store and try again."
            case .notAuthorized:
                return "Sign in with Spotify first (Premium required)."
            case .connectionFailed(let detail):
                return "Couldn't connect to Spotify: \(detail)"
            }
        }
    }

    @Published private(set) var isConnected: Bool = false
    @Published private(set) var currentlyPlayingURI: String?

    private lazy var appRemote: SPTAppRemote = {
        let configuration = SPTConfiguration(
            clientID: Configuration.spotifyClientID,
            redirectURL: Configuration.spotifyRedirectURL
        )
        let remote = SPTAppRemote(configuration: configuration, logLevel: .debug)
        remote.delegate = self
        return remote
    }()

    private var pendingURI: String?

    /// Plays the given Spotify URI. If the AppRemote isn't connected yet, this
    /// queues the URI and starts playback as soon as the connection is up.
    func play(uri: String) {
        currentlyPlayingURI = uri
        if isConnected {
            appRemote.playerAPI?.play(uri, callback: { _, error in
                if let error {
                    print("[Spotify] play error: \(error.localizedDescription)")
                }
            })
        } else {
            pendingURI = uri
            connect(playingURI: uri)
        }
    }

    func pause() {
        appRemote.playerAPI?.pause(nil)
    }

    func resume() {
        appRemote.playerAPI?.resume(nil)
    }

    /// Initiates the AppRemote connection. iOS requires a non-empty `playURI`
    /// to wake the Spotify app from a suspended state.
    func connect(playingURI: String? = nil) {
        if !UIApplication.shared.canOpenURL(URL(string: "spotify:")!) {
            // Spotify not installed; let the caller handle the error.
            print("[Spotify] not installed")
            return
        }
        if let token = SpotifyAuthService.shared.session?.accessToken {
            appRemote.connectionParameters.accessToken = token
        }
        appRemote.authorizeAndPlayURI(playingURI ?? "")
    }

    /// Called from `MotivateAlarmApp.onOpenURL` when Spotify hands the access
    /// token back via the redirect URL.
    func handle(redirectURL url: URL) {
        let parameters = appRemote.authorizationParameters(from: url)
        if let token = parameters?[SPTAppRemoteAccessTokenKey] {
            appRemote.connectionParameters.accessToken = token
            appRemote.connect()
        } else if let error = parameters?[SPTAppRemoteErrorDescriptionKey] {
            print("[Spotify] auth error: \(error)")
        }
    }

    func disconnectIfNeeded() {
        if appRemote.isConnected {
            appRemote.disconnect()
        }
    }
}

extension SpotifyPlaybackService: SPTAppRemoteDelegate {
    nonisolated func appRemoteDidEstablishConnection(_ appRemote: SPTAppRemote) {
        Task { @MainActor in
            self.isConnected = true
            if let uri = self.pendingURI {
                self.appRemote.playerAPI?.play(uri, callback: nil)
                self.pendingURI = nil
            }
        }
    }

    nonisolated func appRemote(_ appRemote: SPTAppRemote, didFailConnectionAttemptWithError error: Error?) {
        Task { @MainActor in
            self.isConnected = false
            print("[Spotify] connection failed: \(error?.localizedDescription ?? "unknown")")
        }
    }

    nonisolated func appRemote(_ appRemote: SPTAppRemote, didDisconnectWithError error: Error?) {
        Task { @MainActor in
            self.isConnected = false
        }
    }
}
