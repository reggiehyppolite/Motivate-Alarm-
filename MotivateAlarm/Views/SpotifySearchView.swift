import SwiftUI

struct SpotifySearchView: View {
    let onSelect: (MediaSelection) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var auth = SpotifyAuthService.shared
    @State private var query: String = ""
    @State private var results: [MediaSelection] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var debounceTask: Task<Void, Never>?

    private let search = SpotifySearchService()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !auth.isAuthorized {
                    notSignedIn
                } else {
                    list
                }
            }
            .searchable(text: $query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Songs, podcasts, playlists")
            .onChange(of: query) { _, newValue in
                scheduleSearch(for: newValue)
            }
            .navigationTitle("Choose media")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var notSignedIn: some View {
        VStack(spacing: 16) {
            Spacer()
            Image(systemName: "music.note.list")
                .font(.system(size: 56))
                .foregroundStyle(.secondary)
            Text("Sign in with Spotify")
                .font(.title2.bold())
            Text("Premium account required to play tracks in-app.")
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button {
                Task { _ = try? await auth.authorize() }
            } label: {
                Text("Connect Spotify")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .padding(.horizontal)
            Spacer()
        }
        .padding()
    }

    private var list: some View {
        Group {
            if isLoading {
                ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                ContentUnavailableView("Couldn't search", systemImage: "exclamationmark.triangle", description: Text(error))
            } else if results.isEmpty && !query.isEmpty {
                ContentUnavailableView.search
            } else if results.isEmpty {
                ContentUnavailableView("Search Spotify", systemImage: "magnifyingglass", description: Text("Find any song, podcast episode, or playlist."))
            } else {
                List(results) { item in
                    Button {
                        onSelect(item)
                        dismiss()
                    } label: {
                        MediaRow(item: item)
                    }
                    .buttonStyle(.plain)
                }
                .listStyle(.plain)
            }
        }
    }

    private func scheduleSearch(for q: String) {
        debounceTask?.cancel()
        let trimmed = q.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            results = []
            return
        }
        debounceTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)
            guard !Task.isCancelled else { return }
            await runSearch(trimmed)
        }
    }

    private func runSearch(_ q: String) async {
        isLoading = true
        defer { isLoading = false }
        do {
            results = try await search.search(query: q)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            results = []
        }
    }
}

struct MediaRow: View {
    let item: MediaSelection

    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: item.artworkURL) { image in
                image.resizable().aspectRatio(contentMode: .fill)
            } placeholder: {
                Color.gray.opacity(0.2)
            }
            .frame(width: 52, height: 52)
            .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text(item.title).font(.body).lineLimit(1)
                Text(item.subtitle).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                Text(item.typeChip).font(.caption2).foregroundStyle(.tertiary)
            }
            Spacer()
        }
        .padding(.vertical, 4)
    }
}
