import SwiftUI
import SwiftData

struct AlarmListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: [SortDescriptor(\Alarm.hour), SortDescriptor(\Alarm.minute)])
    private var alarms: [Alarm]

    @State private var editing: Alarm?
    @State private var creatingNew = false

    var body: some View {
        NavigationStack {
            Group {
                if alarms.isEmpty {
                    ContentUnavailableView(
                        "No alarms yet",
                        systemImage: "alarm",
                        description: Text("Tap + to wake up to your favorite song.")
                    )
                } else {
                    List {
                        ForEach(alarms) { alarm in
                            AlarmRow(alarm: alarm, onToggle: { isOn in
                                alarm.isEnabled = isOn
                                Task { try? await AlarmScheduler.shared.reschedule(alarm) }
                            })
                            .contentShape(Rectangle())
                            .onTapGesture { editing = alarm }
                        }
                        .onDelete(perform: delete)
                    }
                }
            }
            .navigationTitle("Alarms")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { creatingNew = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(item: $editing) { alarm in
                AlarmEditView(alarm: alarm, isNew: false)
            }
            .sheet(isPresented: $creatingNew) {
                let new = Alarm(
                    hour: 7, minute: 0,
                    media: MediaSelection(spotifyURI: "", title: "", subtitle: "", artworkURL: nil, kind: .track)
                )
                AlarmEditView(alarm: new, isNew: true)
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            let alarm = alarms[index]
            AlarmScheduler.shared.cancel(alarm)
            modelContext.delete(alarm)
        }
    }
}

struct AlarmRow: View {
    @Bindable var alarm: Alarm
    let onToggle: (Bool) -> Void

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(timeLabel)
                    .font(.system(size: 40, weight: .light, design: .rounded))
                    .foregroundStyle(alarm.isEnabled ? .primary : .secondary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                if !alarm.media.title.isEmpty {
                    Label(alarm.media.title, systemImage: "music.note")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                        .lineLimit(1)
                }
            }
            Spacer()
            Toggle("", isOn: Binding(
                get: { alarm.isEnabled },
                set: onToggle
            ))
            .labelsHidden()
        }
        .padding(.vertical, 4)
    }

    private var timeLabel: String {
        String(format: "%d:%02d", displayHour, alarm.minute)
    }

    private var displayHour: Int {
        let h = alarm.hour % 12
        return h == 0 ? 12 : h
    }

    private var subtitle: String {
        var parts: [String] = []
        parts.append(alarm.hour < 12 ? "AM" : "PM")
        if alarm.isOneShot {
            parts.append("Once")
        } else if alarm.repeatDays == Weekday.weekdays {
            parts.append("Weekdays")
        } else if alarm.repeatDays == Weekday.weekend {
            parts.append("Weekends")
        } else {
            parts.append(alarm.repeatDays.sorted(by: { $0.rawValue < $1.rawValue }).map(\.shortLabel).joined(separator: " "))
        }
        if !alarm.label.isEmpty && alarm.label != "Alarm" { parts.append(alarm.label) }
        return parts.joined(separator: " · ")
    }
}
