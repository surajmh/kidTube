# Phase 1 — Android mobile performance baseline

Status: initial Wi-Fi baseline captured on the primary Android phone. The extended
network, long-playback and library-size matrix remains pending. Code hypotheses are
kept separate from reproduced symptoms.

## Build and capture

```sh
cd android
./gradlew :app:assembleRelease -PreactNativeArchitectures=arm64-v8a
cd ..
adb devices -l
```

Install the exact release APK on the primary phone using `adb -s SERIAL install -r APK`.
Verify its signing certificate matches the existing installation before updating. If it
does not, preserve the installed app and resolve the signing mismatch; do not uninstall
or clear data. Record the APK hash, device, Android version and library size. This release
build includes small diagnostic hooks but keeps existing playback behavior and settings.

```sh
python3 tools/playback_baseline.py --serial SERIAL \
  --scenario warm-open --network 'Wi-Fi, stable' --seconds 60 \
  --apk android/app/build/outputs/apk/release/app-release.apk \
  --output /tmp/kidtube-baseline/warm-open-01
```

The output directory must be new. The script temporarily enables `KidTubePerf` logs and
restores the previous setting, resets only UI frame statistics, and captures local player
logs, UI frame statistics, a final memory snapshot, thermal state and build metadata.
It does not install, launch, tap, clear media caches, or change network settings.
Perform the named scenario manually during the capture. Ctrl-C saves a partial capture.
If the capture is killed forcibly, restore the recorded log property manually.
Video IDs are local diagnostic data; no profile IDs, stream URLs or tokens are logged.

## Repeatable workload

Use three already-approved videos: a short frequently replayed video, a longer video,
and an HD video. Record their IDs, duration and the current profile/settings locally.
Use the same phone, videos, APK, playback positions and network for later comparisons.
Run at least five repetitions of each short scenario, with a new capture directory per run.
Keep Wi-Fi and mobile-data runs separate. Note battery level, temperature, charging state,
cache history, video quality and background apps. A process-cold start is not a media-cache-cold start.

| Scenario | Steps | Evidence to record |
| --- | --- | --- |
| Process-cold open | Force-stop only kidTube, launch, open a chosen approved video | Launch-to-interactive and tap-to-picture from external recording; native start-to-frame |
| Warm open | With the app already running, open each chosen video | First-frame samples, resolution/prepare events, correct thumbnail/picture |
| Replay | Replay the same video at the same position | Compare with first run; mark cache as previously used |
| Next video | Play past 80%, select the next approved video | Transition delay and whether prefetch ran; avoid mixing with non-prefetched runs |
| Rapid switching | Switch approved videos repeatedly, including during loading | Wrong-video playback, stale thumbnail, retry and error events |
| Pause during recovery | Interrupt connectivity while playing, pause during retry, restore connectivity | Any unwanted restart; position before/after; network action timestamps |
| Background/foreground | While playing, press Home, wait 10 seconds, return; repeat while paused | Correct play intent, surface, resume position and policy enforcement |
| Sustained playback | Play an HD video for 10 minutes on stable Wi-Fi; repeat on weaker/mobile connection | Buffering, failure events, reported dropped frames, temperature and final memory |
| Large library browsing | Use a recorded library size, scroll and reveal more items for 60 seconds | gfxinfo frame statistics, visible stutters, memory snapshot and touch response |

Use external video recording for tap-to-visible-picture and touch response, so device
screen recording does not add decoding/encoding load to the main benchmark. Keep any
screen-recorded reproduction runs separate and label them. Do not enlarge the child's
approved library or relax limits to run a benchmark.

## What the metrics mean

- `nativeStartToFrameMs`: native `play()` handling to Media3's actual rendered first-frame
  timestamp, using the monotonic Android clock. It includes resolution/preparation/retries
  within that native play session. It excludes the initial tap, JS scheduling and native
  command queue delay, and does not prove the loading overlay has disappeared.
- `state` 2 means BUFFERING, 3 READY, 4 ENDED, 1 IDLE. Buffering spells include startup,
  seeking and paused loading. Use the scenario, commands and play intent to classify
  actual rebuffers; a pending spell is incomplete, not zero duration.
- Every native `play()` has a separate session. JavaScript recovery can create another
  session for the same video. Do not treat that as another independent user tap.
- Failed and incomplete sessions remain in the report, with null first-frame timing.
  Report success count/total alongside medians; never exclude failures silently.
- Dropped-frame totals reflect Media3 callbacks received, not a complete frame-loss rate.
  Late renderer callbacks around switches need review against the raw events.
- `gfxinfo` describes Android UI rendering, not decoded video frames or every React Native
  scheduling delay. Memory is an end-of-run snapshot, not peak allocation or leak evidence.
- The first-frame callback rejects events for another video ID, but repeated same-video
  opens can still have late callbacks. Confirm ambiguous rapid-switch runs visually.
- Native session timing excludes React Native tap latency; record both separately.

API references: [Media3 analytics callbacks](https://developer.android.com/reference/androidx/media3/exoplayer/analytics/AnalyticsListener)
and [Android dumpsys](https://developer.android.com/tools/dumpsys).

## Results and completion gate

Measured on Samsung SM-G780G, Android 13, release arm64 APK, validated Wi-Fi, connected
to power, existing app data/media cache retained. The installed APK hash and matching
signing certificate were verified. Battery started at 94%, 31.2°C; thermal status was 0
at an early check. The initial Activity cold launch was 1459 ms; that is not time to
fully interactive app or video picture.

Saved evidence: [structured baseline](docs/performance-baseline-2026-10-07.json).
Raw captures, screenshots, action timestamps and the previous installed APK are in
`/tmp/kidtube-baseline/`. These local raw files should be preserved before OS cleanup.

Native timings below start at `play()` handling; external tap-to-picture was not measured.

| Scenario / network | Successful starts / attempts | Native first frame median | Tap-to-picture median | Rebuffers / total duration | Reported frame drops | UI jank | Reproduction notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Warm open/replay, Wi-Fi | 5/5 | 2504 ms | Unmeasured | Startup buffering only in this sample | 0 reported | Mixed navigation/playback, not scroll score | Median resolution 2351 ms; first run 4446 ms |
| Process-cold open, Wi-Fi | 5/5 | 3311 ms | Unmeasured | Startup buffering only in this sample | 0 reported | Last process only; not aggregated | Median resolution 3134 ms; all five succeeded |
| Switch + playing foreground cycles, Wi-Fi | 1/1 new start | 2951 ms | Unmeasured | No extra BUFFERING in captured foreground cycles | 6 reported | Mixed scenario | Two playing returns preserved position |
| Current-library scroll, Wi-Fi | Not playback | — | Unmeasured | — | — | 3/1386 UI frames (0.22%) | 20 alternating swipes; no large-library guarantee |
| Rapid next taps, Wi-Fi | 2 rendered / 5 native starts | Report separately | Unmeasured | Three starts intentionally superseded | See saved trace | Mixed scenario | Initial visible card 2331 ms; final selected video 9543 ms |

For each reproduced bug, save exact steps, expected/actual behavior, capture directory,
video, network and whether the issue repeats. Candidate cases from code review are stale
retries after switches, position loss on JS recovery, pause ignored during recovery,
progressive fallback starvation, stale thumbnails and growing list rendering cost.

Phase 1 is complete only after real-phone captures, comparable saved measurements and
reproducible reports exist. Do not tune buffers, change recovery, or claim speed gains here.

Tool check: `python3 -m unittest discover -s tools -p 'test_playback_baseline.py'`.

Setup validation (7 October 2026): TypeScript passed; 23 Jest suites / 241 tests passed;
one stdlib parser regression check passed; arm64 release APK built successfully.
APK SHA-256: `64f25b8b74f658f39ba7cb96b16f9ecacdc8c5062ca839fc2e3d74caccb48875`.
Device captures now exist; extended testing remains pending. These are baseline measurements, not performance improvements.

## Reproduced observations and Phase 2 priorities

1. **Stale Up next thumbnail.** Open `LuJe0ad1Ygk` (Hockey), then tap its Up next card
   `GzIObE7uR8Q` (Anniversary songs). The next card's title/duration updates to Listening
   Ears, while its image still depicts Anniversary songs. It remains wrong after playback
   starts. Evidence: `device-setup/switch-cover.png` and `device-setup/current.png`.
   The rapid-switch run independently shows a Classroom image under a Counting title.
   Shared `Thumbnail` state initializes from its first video and does not follow prop changes.

2. **Slow final selection after rapid switches.** Start an approved video and tap the
   visible Up next card four times about 0.7 seconds apart. Native generations advance
   1 → 4 → 7 → 10 → 13; three intermediate starts are superseded. Final `YaFSwBg1qvg`
   takes 9543 ms to first frame; resolve-start to resolve-end is 9064 ms. No final failure
   occurs. Evidence: `third-video-rapid-switch-01/events.jsonl`, `actions.json` and
   `device-setup/rapid-switch-settled.png`. The controller's single resolver executor
   executes obsolete tasks before checking generation on the main-thread completion;
   queueing is a likely contributor. This one sequence is not a controlled comparison
   against ordinary opens of the same video.

3. **Stream resolution dominates measured ordinary starts.** Warm resolution median is
   2351 ms and cold resolution median 3134 ms; prepare-to-first-frame medians are only
   178 ms and 187 ms respectively. Every prepared source in these captures is progressive,
   despite adaptive preference. This establishes the source used, not its quality, the
   reason HLS was absent, or a claim that progressive playback always fails.

4. **Foreground smoke checks passed.** Two captured playing returns resume at 14354 ms
   and 31745 ms, close to their respective background positions (14351/31739 ms).
   Explicitly pausing with the visible transport button, backgrounding for 10 seconds,
   and returning leaves the same 1:50 frame and Play control. The latter was verified
   with `paused-before-home.png` / `paused-after-home.png` outside the timed capture.
   Earlier attempts to hit an auto-hidden Pause control were inconclusive and excluded.

The capture tool's empty Android-shell argument handling was corrected after the first
capture exposed a log-property restoration error. That property was restored manually;
subsequent captures completed and restored it successfully. No player fixes or tuning
were made during this baseline run. The phone was returned to the library.

Remaining before the full Phase 1 matrix is complete: external tap/interaction timing,
10-minute playback, weak/mobile-network recovery, pause during actual retry, repeated
rapid-switch sequences with controlled videos, native selected-format evidence and a
recorded library count/expanded-list stress test. Existing screen-time and content policy
must remain enforced during all testing.
