import Foundation
import SpotifyiOS
import UIKit

/// Owns the Spotify session: authorization, token refresh, and Keychain persistence
/// of the refresh token. Wraps SPTSessionManager.
@MainActor
final class SpotifyAuthService: NSObject, ObservableObject {
    static let shared = SpotifyAuthService()

    @Published private(set) var isAuthorized: Bool = false
    @Published private(set) var session: SPTSession?

    private let configuration: SPTConfiguration
    private lazy var sessionManager: SPTSessionManager = {
        SPTSessionManager(configuration: configuration, delegate: self)
    }()

    private static let refreshTokenKey = "refresh_token"
    private var pendingAuthContinuation: CheckedContinuation<SPTSession, Error>?

    private override init() {
        self.configuration = SPTConfiguration(
            clientID: Configuration.spotifyClientID,
            redirectURL: Configuration.spotifyRedirectURL
        )
        super.init()
        // Restore previous session if we have a refresh token.
        if KeychainStore.get(Self.refreshTokenKey) != nil {
            isAuthorized = true
        }
    }

    private static let scopes: SPTScope = [
        .appRemoteControl,
        .userReadPlaybackState,
        .userModifyPlaybackState,
        .userReadPrivate,
        .streaming,
    ]

    /// Kick off the OAuth flow (redirects to Spotify app or web). Returns once we have a session.
    func authorize() async throws -> SPTSession {
        try await withCheckedThrowingContinuation { continuation in
            self.pendingAuthContinuation = continuation
            sessionManager.initiateSession(with: Self.scopes, options: .clientOnly, campaign: nil)
        }
    }

    /// Hand off to the SDK so it can complete the OAuth callback.
    @discardableResult
    func handleOpenURL(_ url: URL) -> Bool {
        sessionManager.application(UIApplication.shared, open: url, options: [:])
    }

    /// Returns a valid access token, refreshing if needed.
    func currentAccessToken() async throws -> String {
        if let session, session.expirationDate > Date().addingTimeInterval(60) {
            return session.accessToken
        }
        if let session {
            return try await renew(session: session)
        }
        let new = try await authorize()
        return new.accessToken
    }

    private func renew(session: SPTSession) async throws -> String {
        try await withCheckedThrowingContinuation { continuation in
            sessionManager.renewSession()
            // The delegate will fire `didRenew:` with the refreshed session;
            // we resolve the continuation there. To keep this simple we just
            // wait on the next session update.
            self.pendingRenewContinuation = continuation
        }
    }

    private var pendingRenewContinuation: CheckedContinuation<String, Error>?

    func signOut() {
        KeychainStore.delete(Self.refreshTokenKey)
        session = nil
        isAuthorized = false
    }
}

extension SpotifyAuthService: SPTSessionManagerDelegate {
    nonisolated func sessionManager(manager: SPTSessionManager, didInitiate session: SPTSession) {
        Task { @MainActor in
            self.session = session
            self.isAuthorized = true
            KeychainStore.set(session.refreshToken, for: Self.refreshTokenKey)
            self.pendingAuthContinuation?.resume(returning: session)
            self.pendingAuthContinuation = nil
        }
    }

    nonisolated func sessionManager(manager: SPTSessionManager, didFailWith error: Error) {
        Task { @MainActor in
            self.pendingAuthContinuation?.resume(throwing: error)
            self.pendingAuthContinuation = nil
            self.pendingRenewContinuation?.resume(throwing: error)
            self.pendingRenewContinuation = nil
        }
    }

    nonisolated func sessionManager(manager: SPTSessionManager, didRenew session: SPTSession) {
        Task { @MainActor in
            self.session = session
            KeychainStore.set(session.refreshToken, for: Self.refreshTokenKey)
            self.pendingRenewContinuation?.resume(returning: session.accessToken)
            self.pendingRenewContinuation = nil
        }
    }
}
