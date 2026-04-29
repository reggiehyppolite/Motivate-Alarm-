import Foundation

/// Hits the Spotify Web API's `/v1/search` endpoint and maps results to MediaSelection.
struct SpotifySearchService {
    enum SearchType: String {
        case track, episode, show, playlist
    }

    private let session: URLSession = .shared
    private let auth: SpotifyAuthService

    init(auth: SpotifyAuthService = .shared) {
        self.auth = auth
    }

    func search(
        query: String,
        types: [SearchType] = [.track, .episode, .show],
        limit: Int = 20
    ) async throws -> [MediaSelection] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { return [] }
        let token = try await auth.currentAccessToken()

        var components = URLComponents(string: "https://api.spotify.com/v1/search")!
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "type", value: types.map(\.rawValue).joined(separator: ",")),
            URLQueryItem(name: "limit", value: String(limit)),
        ]

        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(SearchResponse.self, from: data)
        return decoded.flatten()
    }
}

// MARK: - Response decoding

private struct SearchResponse: Decodable {
    var tracks: Page<Track>?
    var episodes: Page<Episode>?
    var shows: Page<Show>?
    var playlists: Page<Playlist>?

    func flatten() -> [MediaSelection] {
        var out: [MediaSelection] = []
        out.append(contentsOf: tracks?.items.map(\.asSelection) ?? [])
        out.append(contentsOf: episodes?.items.map(\.asSelection) ?? [])
        out.append(contentsOf: shows?.items.map(\.asSelection) ?? [])
        out.append(contentsOf: playlists?.items.map(\.asSelection) ?? [])
        return out
    }
}

private struct Page<Item: Decodable>: Decodable {
    var items: [Item]
}

private struct Image: Decodable {
    var url: String
}

private struct Track: Decodable {
    var uri: String
    var name: String
    var artists: [Artist]
    var album: Album

    var asSelection: MediaSelection {
        MediaSelection(
            spotifyURI: uri,
            title: name,
            subtitle: artists.map(\.name).joined(separator: ", "),
            artworkURL: album.images.first.flatMap { URL(string: $0.url) },
            kind: .track
        )
    }
}

private struct Artist: Decodable { var name: String }

private struct Album: Decodable {
    var images: [Image]
}

private struct Episode: Decodable {
    var uri: String
    var name: String
    var description: String
    var images: [Image]

    var asSelection: MediaSelection {
        MediaSelection(
            spotifyURI: uri,
            title: name,
            subtitle: description,
            artworkURL: images.first.flatMap { URL(string: $0.url) },
            kind: .episode
        )
    }
}

private struct Show: Decodable {
    var uri: String
    var name: String
    var publisher: String
    var images: [Image]

    var asSelection: MediaSelection {
        MediaSelection(
            spotifyURI: uri,
            title: name,
            subtitle: publisher,
            artworkURL: images.first.flatMap { URL(string: $0.url) },
            kind: .show
        )
    }
}

private struct Playlist: Decodable {
    var uri: String
    var name: String
    var owner: Owner
    var images: [Image]

    struct Owner: Decodable { var display_name: String? }

    var asSelection: MediaSelection {
        MediaSelection(
            spotifyURI: uri,
            title: name,
            subtitle: owner.display_name ?? "Playlist",
            artworkURL: images.first.flatMap { URL(string: $0.url) },
            kind: .playlist
        )
    }
}
