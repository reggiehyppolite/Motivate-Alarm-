import SwiftUI
import SwiftData

struct AlarmEditView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    @Bindable var alarm: Alarm
    let isNew: Bool

    @State private var showSearch = false
    @State private var showError: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Time") {
                    DatePicker(
                        "Time",
                        selection: Binding(
                            get: { dateFromHourMinute(alarm.hour, alarm.minute) },
                            set: { newValue in
                                let comps = Calendar.current.dateComponents([.hour, .minute], from: newValue)
                                alarm.hour = comps.hour ?? 7
                                alarm.minute = comps.minute ?? 0
                            }
                        ),
                        displayedComponents: .hourAndMinute
                    )
                    .datePickerStyle(.wheel)
                }

                Section("Repeat") {
                    WeekdayPicker(selection: Binding(
                        get: { alarm.repeatDays },
                        set: { alarm.repeatDays = $0 }
                    ))
                }

                Section("Wake-up media") {
                    Button {
                        showSearch = true
                    } label: {
                        if alarm.media.spotifyURI.isEmpty {
                            Label("Choose song or podcast", systemImage: "music.note")
                        } else {
                            HStack(spacing: 12) {
                                AsyncImage(url: alarm.media.artworkURL) { image in
                                    image.resizable().aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Color.gray.opacity(0.2)
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                                VStack(alignment: .leading) {
                                    Text(alarm.media.title).font(.body).foregroundStyle(.primary)
                                    Text(alarm.media.subtitle).font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                            }
                        }
                    }
                }

                Section("Snooze") {
                    Toggle("Allow snooze", isOn: $alarm.snoozeEnabled)
                    if alarm.snoozeEnabled {
                        Stepper("Snooze \(alarm.snoozeMinutes) min", value: $alarm.snoozeMinutes, in: 1...30)
                    }
                }

                Section("Label") {
                    TextField("Alarm name", text: $alarm.label)
                }
            }
            .navigationTitle(isNew ? "New Alarm" : "Edit Alarm")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if isNew { modelContext.delete(alarm) }
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(alarm.media.spotifyURI.isEmpty)
                }
            }
            .sheet(isPresented: $showSearch) {
                SpotifySearchView { selection in
                    alarm.media = selection
                }
            }
            .alert("Couldn't save", isPresented: Binding(
                get: { showError != nil },
                set: { if !$0 { showError = nil } }
            )) {
                Button("OK") { showError = nil }
            } message: {
                Text(showError ?? "")
            }
        }
    }

    private func save() {
        Task {
            do {
                if isNew { modelContext.insert(alarm) }
                try modelContext.save()
                try await AlarmScheduler.shared.reschedule(alarm)
                dismiss()
            } catch {
                showError = error.localizedDescription
            }
        }
    }

    private func dateFromHourMinute(_ hour: Int, _ minute: Int) -> Date {
        Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: Date()) ?? Date()
    }
}

struct WeekdayPicker: View {
    @Binding var selection: Set<Weekday>

    var body: some View {
        HStack {
            ForEach(Weekday.allCases) { day in
                Button {
                    if selection.contains(day) { selection.remove(day) } else { selection.insert(day) }
                } label: {
                    Text(day.shortLabel)
                        .font(.caption.bold())
                        .frame(width: 36, height: 36)
                        .background(selection.contains(day) ? Color.orange : Color.gray.opacity(0.15))
                        .foregroundStyle(selection.contains(day) ? .white : .primary)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
