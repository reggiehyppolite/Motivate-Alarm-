import Foundation

/// Hands a Spotify URI from a fired AlarmKit AppIntent into the running app.
/// The intent runs in a separate execution context; we persist the URI to
/// UserDefaults so the app's `scenePhase == .active` handler can read it on
/// launch and tell SpotifyPlaybackService to start playing.
enum WakeUpQueue {
    private static let key = "pendingWakeUpURI"
    private static let timestampKey = "pendingWakeUpTimestamp"

    static var pendingURI: String? {
        get { UserDefaults.standard.string(forKey: key) }
        set {
            if let value = newValue {
                UserDefaults.standard.set(value, forKey: key)
                UserDefaults.standard.set(Date(), forKey: timestampKey)
            } else {
                UserDefaults.standard.removeObject(forKey: key)
                UserDefaults.standard.removeObject(forKey: timestampKey)
            }
        }
    }

    /// Returns the pending URI only if it was set within the last 5 minutes —
    /// avoids replaying a stale wake-up if the app is opened hours later.
    static func consume() -> String? {
        guard let uri = pendingURI,
              let ts = UserDefaults.standard.object(forKey: timestampKey) as? Date,
              Date().timeIntervalSince(ts) < 300
        else {
            pendingURI = nil
            return nil
        }
        pendingURI = nil
        return uri
    }
}
