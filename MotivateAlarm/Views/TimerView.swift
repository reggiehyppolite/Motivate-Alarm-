import SwiftUI
import SwiftData

struct TimerView: View {
    @Environment(\.modelContext) private var modelContext

    @State private var hours: Int = 0
    @State private var minutes: Int = 5
    @State private var seconds: Int = 0
    @State private var media: MediaSelection?
    @State private var label: String = "Timer"
    @State private var showSearch = false
    @State private var activeTimer: TimerPreset?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Duration") {
                    HStack(spacing: 0) {
                        wheel(value: $hours, range: 0...23, label: "h")
                        wheel(value: $minutes, range: 0...59, label: "m")
                        wheel(value: $seconds, range: 0...59, label: "s")
                    }
                    .frame(height: 150)
                }

                Section("Play when finished") {
                    Button {
                        showSearch = true
                    } label: {
                        if let media {
                            HStack(spacing: 12) {
                                AsyncImage(url: media.artworkURL) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: { Color.gray.opacity(0.2) }
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                                VStack(alignment: .leading) {
                                    Text(media.title).foregroundStyle(.primary)
                                    Text(media.subtitle).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                            }
                        } else {
                            Label("Choose song or podcast", systemImage: "music.note")
                        }
                    }
                }

                Section("Label") {
                    TextField("Timer name", text: $label)
                }

                Section {
                    Button {
                        startTimer()
                    } label: {
                        Text(activeTimer == nil ? "Start" : "Restart")
                            .frame(maxWidth: .infinity)
                            .font(.body.bold())
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(media == nil || totalSeconds == 0)

                    if let activeTimer {
                        Button(role: .destructive) {
                            AlarmScheduler.shared.cancelTimer(activeTimer)
                            modelContext.delete(activeTimer)
                            self.activeTimer = nil
                        } label: {
                            Text("Cancel timer").frame(maxWidth: .infinity)
                        }
                    }
                }
            }
            .navigationTitle("Timer")
            .sheet(isPresented: $showSearch) {
                SpotifySearchView { media = $0 }
            }
            .alert("Couldn't start timer", isPresented: Binding(
                get: { errorMessage != nil },
                set: { if !$0 { errorMessage = nil } }
            )) {
                Button("OK") { errorMessage = nil }
            } message: {
                Text(errorMessage ?? "")
            }
        }
    }

    private var totalSeconds: Int { hours * 3600 + minutes * 60 + seconds }

    private func wheel(value: Binding<Int>, range: ClosedRange<Int>, label: String) -> some View {
        VStack {
            Picker("", selection: value) {
                ForEach(range, id: \.self) { Text("\($0)").tag($0) }
            }
            .pickerStyle(.wheel)
            .frame(maxWidth: .infinity)
            Text(label).font(.caption).foregroundStyle(.secondary)
        }
    }

    private func startTimer() {
        guard let media else { return }
        Task {
            do {
                let preset = TimerPreset(label: label, durationSeconds: totalSeconds, media: media)
                modelContext.insert(preset)
                try modelContext.save()
                try await AlarmScheduler.shared.startTimer(preset)
                activeTimer = preset
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
