import Foundation

struct MediaSelection: Codable, Hashable, Identifiable {
    enum Kind: String, Codable, Hashable {
        case track, episode, show, playlist
    }

    var id: String { spotifyURI }
    var spotifyURI: String
    var title: String
    var subtitle: String
    var artworkURL: URL?
    var kind: Kind

    var typeChip: String {
        switch kind {
        case .track: return "Track"
        case .episode: return "Episode"
        case .show: return "Podcast"
        case .playlist: return "Playlist"
        }
    }
}
