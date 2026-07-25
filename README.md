# Motivate Alarm

A native iOS app that wakes you up (or counts down a timer) and plays any song, podcast, or playlist you choose from Spotify.

> **Status:** v0.1 — source complete, alarm tone bundled, CI wired. Every push builds an `.ipa` on a GitHub-hosted Mac runner — no local Mac required.

---

## Features

- Multiple saved alarms with per-alarm Spotify track / podcast / playlist
- Recurring alarms (per weekday) and one-shot alarms
- Snooze (configurable minutes)
- Countdown timer that ends with your chosen audio
- In-app Spotify catalog search (tracks, podcast episodes, shows, playlists)
- Built on Apple's **AlarmKit** (iOS 26): rings through Silent + Focus modes, full-screen lock-screen UI

## How wake-up actually works

AlarmKit (the only Apple API that lets a third-party app fire a real alarm at an exact time, even when the app is killed) plays a *bundled* alarm sound — it cannot stream a Spotify track *as* the tone. So the flow is:

1. At your set time, AlarmKit fires: full-screen alarm UI, bundled beep tone, plays through Silent / Focus modes.
2. When you tap **Stop & Play**, AlarmKit runs `PlayMediaIntent` (`openAppWhenRun = true`).
3. The app launches, reads the queued Spotify URI, and tells the Spotify app (via `SPTAppRemote`) to play your chosen track.
4. The alarm tone stops; your song/podcast continues in Spotify in the background.

Snooze is a second AppIntent — it silently re-schedules the same alarm for `now + N minutes`.

## Getting it onto your phone

You have **three paths**, from easiest-with-a-Mac to hardest-without.

### Path A — You (or a friend) has a Mac (~15 min, free)

The fastest, cheapest install. Even a free Apple ID works (builds expire every 7 days and you refresh from Xcode).

```bash
git clone https://github.com/reggiehyppolite/motivate-alarm-.git
cd motivate-alarm-
git checkout claude/custom-alarm-with-music-SvhgE
brew install xcodegen
xcodegen
open MotivateAlarm.xcodeproj
```

In Xcode: target → **Signing & Capabilities** → pick your Apple ID team. Plug in your iPhone, select it as the run destination, hit **⌘R**. Done.

Set `SPOTIFY_CLIENT_ID` first (see "What only you can do" below).

### Path B — TestFlight via GitHub Actions (Mac-free, $99/yr)

Every push already builds an unsigned `.ipa` in the cloud (see `.github/workflows/ios-build.yml`). You can download it from **Actions → latest run → Artifacts** but it won't install on iOS without signing.

To get a **signed build that installs on your phone via TestFlight**, add these repo secrets (Settings → Secrets and variables → Actions):

| Secret | What it is |
| --- | --- |
| `SPOTIFY_CLIENT_ID` | From developer.spotify.com (see below) |
| `APPLE_TEAM_ID` | 10-char Team ID from developer.apple.com/account |
| `APP_STORE_CONNECT_KEY_ID` | Key ID from App Store Connect → Users and Access → Keys |
| `APP_STORE_CONNECT_ISSUER_ID` | Issuer ID from the same page |
| `APP_STORE_CONNECT_API_KEY_P8` | The `.p8` file contents (paste the whole thing including `-----BEGIN…END-----`) |
| `IOS_DISTRIBUTION_CERT_P12` | base64 of your `.p12` distribution cert (`base64 -i cert.p12`) |
| `IOS_DISTRIBUTION_CERT_PASSWORD` | The password you set when exporting the .p12 |
| `IOS_PROVISIONING_PROFILE` | base64 of your `.mobileprovision` |

Then trigger the workflow: **Actions → Build iOS app → Run workflow → check "Also upload to TestFlight"**. When it finishes, open TestFlight on your phone → the build appears. Install. Done.

This path needs the **paid Apple Developer Program** ($99/yr) so you can create the distribution cert and upload to TestFlight.

### Path C — Windows / Linux only, no Mac, no $99 (~1 hour, fiddly)

Rent a cloud Mac for an hour (~$1–2 at MacinCloud, MacStadium, or Scaleway), then follow Path A over VNC. It's genuinely the least-friction option if you want to avoid the yearly Apple fee.

---

## What only you can do

I've automated everything I can. Three items still require your login credentials:

### 1. Spotify Developer app (2 min, free)

1. Go to <https://developer.spotify.com/dashboard> → **Create app**.
2. **Redirect URI:** `motivatealarm://spotify-callback`
3. Copy the **Client ID**.
4. Under **Users and Access**, add the Spotify email of the account you'll use on the device (until you request Extended Quota Mode, only listed users can log in — this is normal for personal apps).
5. Paste the Client ID either into GitHub Actions secret `SPOTIFY_CLIENT_ID`, or into local file `Secrets.xcconfig` (copy from `.example`), or as a build setting in Xcode.

### 2. Apple ID / Developer account

- **Path A (local Mac):** a free Apple ID works.
- **Path B (TestFlight):** paid Apple Developer Program ($99/yr) is required.
- **Path C (cloud Mac):** same as Path A.

### 3. On the phone

- Install the **Spotify app** and sign into a **Premium** account.
- On first launch, tap **Allow** for the AlarmKit permission prompt.

---

## Cloud build workflow

Located at `.github/workflows/ios-build.yml`. Two jobs:

| Job | Runs | Produces |
| --- | --- | --- |
| `build` | Every push and PR | `MotivateAlarm-unsigned.ipa` artifact (can't install as-is, but proves the code compiles on Apple's toolchain) |
| `release` | Manual trigger only, with the `release` input set to `true` | Signed IPA uploaded to TestFlight — needs all the signing secrets above |

The `build` job runs unsigned so it works even without any secrets configured. First time you push, watch **Actions** to catch any AlarmKit API-name drift — the AlarmKit surface may have shifted slightly since I wrote the wrappers; if the build fails, the log tells you exactly what to rename in `AlarmScheduler.swift`.

## Project layout

```
MotivateAlarm/
├── App/MotivateAlarmApp.swift          # @main, scene phase, URL handling
├── Models/                              # SwiftData @Models + MediaSelection
├── Services/
│   ├── AlarmScheduler.swift            # Wraps AlarmManager / AlarmKit
│   ├── SpotifyAuthService.swift        # SPTSessionManager + Keychain
│   ├── SpotifyPlaybackService.swift    # SPTAppRemote
│   └── SpotifySearchService.swift      # Spotify Web API /v1/search
├── Intents/
│   ├── PlayMediaIntent.swift           # Stop button → opens app + plays URI
│   └── SnoozeAlarmIntent.swift         # Snooze button → reschedules silently
├── Views/                               # SwiftUI: alarms, timer, search, now playing
├── Support/                             # Configuration, Keychain, WakeUpQueue, plist
└── Resources/
    └── alarm-tone.wav                   # Bundled 22s looping beep tone
```

## Known limitations

- **Spotify only.** Apple Music / YouTube / local files each need their own playback service.
- **Premium required** (SPTAppRemote limitation).
- **No volume fade-in.** Spotify SDK doesn't reliably expose device volume.
- **Recurring alarms re-schedule per-fire** — scheduler picks the next matching weekday each time. Native AlarmKit recurrence is available if you want to swap it in.

## License

TBD.
