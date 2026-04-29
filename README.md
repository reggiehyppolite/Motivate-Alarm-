# Motivate Alarm

A native iOS app that wakes you up (or counts down a timer) and plays any song, podcast, or playlist you choose from Spotify.

> **Status:** v0.1 — source code complete, project not yet built. You'll need a Mac with Xcode 17+ to generate the `.xcodeproj`, build, and install on a real iPhone.

---

## Features

- Multiple saved alarms with per-alarm Spotify track / podcast / playlist
- Recurring alarms (per weekday) and one-shot alarms
- Snooze (configurable minutes)
- Countdown timer that ends with your chosen audio
- In-app Spotify catalog search (tracks, podcast episodes, shows, playlists)
- Powered by Apple's **AlarmKit** (iOS 26): rings through Silent + Focus modes, full-screen lock-screen UI

## How wake-up actually works

AlarmKit (the only Apple API that lets a third-party app fire a real alarm at an exact time, even when the app is killed) plays a *bundled* alarm sound — it cannot stream a Spotify track *as* the tone. So the flow is:

1. At your set time, AlarmKit fires: full-screen alarm UI, default short alarm tone, plays through Silent / Focus modes.
2. When you tap **Stop & Play**, AlarmKit runs `PlayMediaIntent` (`openAppWhenRun = true`).
3. The app launches, reads the queued Spotify URI, and tells the Spotify app (via `SPTAppRemote`) to play your chosen track.
4. The system alarm tone stops; your song/podcast continues in Spotify in the background.

Snooze is also an AppIntent — it silently re-schedules the same alarm for `now + N minutes`.

## Requirements

- iPhone running **iOS 26** or later (real device — AlarmKit and the Spotify SDK don't fully work in the simulator)
- **Spotify Premium** account
- **Spotify** app installed on the device
- Mac with **Xcode 17+** and an Apple Developer account (free tier is fine for personal sideloading)

## Setup

### 1. Clone

```bash
git clone https://github.com/reggiehyppolite/motivate-alarm-.git
cd motivate-alarm-
git checkout claude/custom-alarm-with-music-SvhgE
```

### 2. Generate the Xcode project

The repo ships with `project.yml` for [XcodeGen](https://github.com/yonaskolb/XcodeGen) instead of a checked-in `.xcodeproj` (cleaner diffs). Install once:

```bash
brew install xcodegen
```

Then in the repo root:

```bash
xcodegen
open MotivateAlarm.xcodeproj
```

### 3. Get a Spotify Client ID

1. Go to <https://developer.spotify.com/dashboard> and create a new app.
2. In your app settings, add this redirect URI:
   `motivatealarm://spotify-callback`
3. Copy your **Client ID**.
4. Add the device's Spotify account email under "Users and Access" (until your Spotify app is in Extended Quota mode, only listed users can sign in).

### 4. Configure the Client ID

Easiest path: in Xcode, edit the `MotivateAlarm` target → Build Settings → add a **User-Defined Setting** called `SPOTIFY_CLIENT_ID` with your client ID as the value. Re-run `xcodegen` if you change it via `Secrets.xcconfig` instead.

Or copy `Secrets.xcconfig.example` → `Secrets.xcconfig` (gitignored) and fill it in.

### 5. Drop in an alarm tone

AlarmKit needs a bundled alarm sound. Place a short audio file at:

```
MotivateAlarm/Resources/alarm-tone.caf
```

Apple recommends Core Audio Format. Convert any `.wav` or `.mp3` with:

```bash
afconvert -f caff -d ima4 input.wav MotivateAlarm/Resources/alarm-tone.caf
```

Keep it ≤ 30 seconds; AlarmKit loops it.

### 6. Build & run

1. Plug in your iPhone, select it as the run target in Xcode.
2. Set your Apple Developer team in the target's Signing & Capabilities pane.
3. ⌘R to build and install.

### 7. First-launch checklist on the device

- Tap **Allow** when iOS asks about alarm permissions.
- Tap **Connect Spotify** the first time you open the search screen → completes OAuth via the Spotify app.
- Make sure the Spotify app is signed in to your **Premium** account.

## Project layout

```
MotivateAlarm/
├── App/MotivateAlarmApp.swift          # @main, scene phase, URL handling
├── Models/
│   ├── Alarm.swift                     # SwiftData @Model
│   ├── TimerPreset.swift               # SwiftData @Model
│   ├── MediaSelection.swift            # Codable struct (Spotify URI + display)
│   └── Weekday.swift
├── Services/
│   ├── AlarmScheduler.swift            # Wraps AlarmManager / AlarmKit
│   ├── SpotifyAuthService.swift        # SPTSessionManager + Keychain
│   ├── SpotifyPlaybackService.swift    # SPTAppRemote
│   └── SpotifySearchService.swift      # Spotify Web API /v1/search
├── Intents/
│   ├── PlayMediaIntent.swift           # Stop button → opens app + plays URI
│   └── SnoozeAlarmIntent.swift         # Snooze button → reschedules silently
├── Views/
│   ├── RootView.swift                  # TabView: Alarms / Timer
│   ├── AlarmListView.swift
│   ├── AlarmEditView.swift
│   ├── TimerView.swift
│   ├── SpotifySearchView.swift
│   └── NowPlayingView.swift
├── Support/
│   ├── Configuration.swift             # Reads Info.plist values
│   ├── KeychainStore.swift             # Tiny wrapper over Security.framework
│   ├── WakeUpQueue.swift               # Hands URI from intent → app launch
│   ├── Info.plist                      # Merged with project.yml properties
│   └── MotivateAlarm.entitlements      # com.apple.developer.alarmkit
└── Resources/
    └── alarm-tone.caf                  # ⚠️  You must add this file
```

## Test plan

Once installed on a real device with Spotify signed in:

1. **Auth** — open the app, tap **+**, **Choose song**, **Connect Spotify**. Should bounce to Spotify and back.
2. **Search** — type "Eye of the Tiger" → tap a result → returns to the alarm with track preview.
3. **One-shot alarm** — set for `now + 2 min`, save, lock the phone, wait. Verify the alarm fires through Silent. Tap **Stop & Play** → app opens, song starts in Spotify within ~2s.
4. **Snooze** — set another alarm, tap **Snooze** when it fires. App stays closed; alarm re-fires after `snoozeMinutes`.
5. **Recurring** — set for tomorrow 7 AM, weekdays only. Verify it shows in the list with "Weekdays".
6. **Multiple alarms** — add 3, toggle one off, confirm the toggled one is canceled (check `AlarmManager.shared.alarms` in the debugger).
7. **Timer** — start a 30s timer with a podcast. Verify timer fires and podcast plays.
8. **Edge cases** — uninstall Spotify and try to play → friendly error. Sign out of Spotify → playback service shows "not authorized".

## Known limitations

- **Spotify only** in v1. Apple Music / YouTube / local files would each need their own playback service.
- **Premium required.** Free Spotify accounts can't drive playback via SPTAppRemote.
- **No fade-in / volume ramp.** Spotify SDK doesn't reliably expose device volume; iOS doesn't let third-party apps adjust system volume.
- **Recurring re-scheduling** uses one-shot scheduling per fire (the scheduler picks the next valid weekday). If you want native AlarmKit recurrence, swap in `Schedule.relative(.recurring(...))` once you've confirmed the exact API surface against the WWDC25 sample.

## License

TBD.
