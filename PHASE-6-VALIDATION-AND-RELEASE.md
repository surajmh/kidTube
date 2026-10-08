# Phase 6 — Tune, validate and release

Status: local release candidate built, tested and installed on 8 October 2026. Full sign-off remains pending controlled weak-bandwidth testing (deferred at the user's request) and physical parental-control boundary checks. This is the performance roadmap's Phase 6; `PHASE-6-CHANNEL-DISCOVERY.md` records older channel-discovery work.

## Matched comparison

The original Phase 1 APK was recovered and verified by SHA-256 (`64f25b8b74f658f39ba7cb96b16f9ecacdc8c5062ca839fc2e3d74caccb48875`). Both builds were run sequentially on the same Samsung SM-G780G / Android 13, on Wi-Fi with USB power, retained app data and media cache, and the same already-approved Hockey video (`LuJe0ad1Ygk`). Each run opens it five times, waits eight seconds, returns to the list and waits two seconds. Cold runs force-stop only kidTube, launch and wait three seconds before the tap.

| Native start-to-first-frame | Phase 1 rerun | Candidate | Rendered starts |
| --- | --- | --- | --- |
| Warm open / replay median | 2,711 ms | 115 ms | 5/5 each |
| Process-cold open median | 3,510 ms | 3,719 ms | 5/5 each |
| First uncached open in warm run | 3,553 ms | 3,705 ms | 1/1 each |

Warm replay improved by approximately 96%. Cold startup was approximately 6% slower (209 ms) in this small sample. Median cold resolution was 3,340 vs 3,410 ms; prepare-to-frame was 188 vs 316 ms. The latter is consistent with the Phase 5 URI-key cache fetching bytes for fresh URLs, but these traces do not directly measure cache hits or HTTP latency. The cache-integrity fix remains in the candidate.

Final captures are `phase1-warm-v3`, `candidate-warm-v2`, `phase1-cold-v2` and `candidate-cold-v2`. Earlier preliminary captures remain archived. Baseline warm v2 missed its first start event at capture initialization; it was excluded and repeated with an explicit capture-ready handshake.

These are native timings, excluding the tap and JavaScript dispatch. Both builds had zero reported failures and dropped-frame events across these twenty starts. Live network conditions and cache histories vary in a sequential run; historical Phase 1 battery/temperature conditions cannot be reproduced exactly. The original report's 2,504 ms warm and 3,311 ms cold medians are historical context, not the paired comparison above.

## Tuning decision

No startup, buffer, retry or quality thresholds changed in Phase 6. The replay data supports the existing Phase 3 stream reuse. It does not support reducing buffer thresholds to improve uncached startup. Captured sources were progressive; selected resolution and adaptive ladder behavior were not measured. The existing 120-second buffer ceiling and Media3 startup/rebuffer constants remain.

## Reliability issue found during validation

The first sustained attempt stopped moving at 297,384 ms: the phone entered Dozing at its unchanged 300,000 ms screen timeout, and activity backgrounding paused playback. Media3's CPU wake mode had not kept the display awake. The failed/interrupted capture is preserved as `candidate-long`.

The controller now sets `PlayerView.keepScreenOn` from `isPlaying`, initialises it on attach and clears it on detach. Pause, failure/recovery and release therefore let the display sleep normally. This uses the [Android screen-on mechanism](https://developer.android.com/develop/background-work/background-tasks/awake/screen-on), with no changed device timeout or new dependency. The arm64 release and native regressions passed after this fix. The repeat sustained capture, `candidate-long-v2`, passed with 22 minutes 23.546 seconds of continuous native playback, exceeding the planned ten-minute check. No seeks, failures, reported dropped frames or post-startup rebuffering occurred; playback stopped only at the final Back action. The screen remained awake beyond five minutes with the original device timeout. Display wake locks were absent after pause and after leaving playback.

PSS snapshots during the successful run were 198,888 KiB at start, 185,658 KiB at 300 seconds and 178,516 KiB at 601 seconds. These snapshots do not establish a long-term leak bound. Capture execution exceeded its nominal script interval; the duration above uses native playback events.

## Checks

- `npm run typecheck`: passed.
- Jest: 260 tests in 27 suites passed.
- Native `ResolvedStreamCacheTest` and `NewPipeDownloaderTest`: passed. The live-network extraction spike is separate from these deterministic regressions.
- Release arm64 APK: built successfully.
- Capture parser regression: passed.

Thirteen new player checks use the real playback policy for bedtime and screen-time exhaustion at progress, late playback events, foreground return, automatic retry and manual resume. Every case verifies stop, blocked resume, the policy message and blocked subsequent autoplay. A separate check verifies that seeks, paused samples and recovery do not earn watched time. Blocked-start component checks also confirm the native player is never mounted. They run against a mocked native adapter; phone bedtime and screen-time boundary verification remains separate, with existing family settings retained.

## Device matrix

| Device check | Result and evidence |
| --- | --- |
| Sustained playback | Passed after the display-awake fix; 22:23 continuous playback in `candidate-long-v2`. |
| Short outage | Wi-Fi and mobile data disabled for five seconds; automatically resumed at 2,342,800 ms against saved target 2,342,778 ms (22 ms difference). `candidate-short-outage`. |
| Retry exhaustion | A 25-second outage exhausted the bounded retry budget and showed Try again. Explicit retry resumed at 1,889,082 ms against target 1,889,071 ms (11 ms difference). `candidate-retry-exhaustion`. Automatic recovery is not claimed after the budget expires. |
| Pause during outage | Stayed paused after reconnect and foreground return; explicit resume retained 2,590,255 ms. `candidate-outage`. |
| Seeking | Uncached forward seeks exercised outage recovery; online backward seek resumed within 21 ms of the requested position. `candidate-outage`. |
| Home / foreground interruption | Paused playback stayed paused; active playback resumed within 10 ms of its saved position. `candidate-outage`. |
| Browsing | Same catalog, 20 alternating swipes: Phase 1 935 frames / 2 janky (0.21%); candidate 938 / 2 (0.21%). End PSS 272,549 → 188,061 KiB, about 31% lower. `phase1-scroll`, `candidate-scroll`. |
| Bedtime / screen-time | Deterministic policy and blocked-start checks passed; physical phone boundary checks remain pending. |
| Weak bandwidth | Pending, explicitly deferred. Full outages do not substitute for throttling. |

Outage captures contain deliberately induced errors; these are retained as evidence. Both network settings were restored to their original enabled values. The phone's 300,000 ms display timeout and family settings were retained. Browsing PSS is an end snapshot with existing catalog/image caches, not peak memory, a large-library stress test or measured tap latency. Hardware calls/audio-focus interruptions were not exercised.

## Local release and rollback

Artifacts are retained in `build/releases/2026-10-08/` rather than a temporary directory:

- `candidate.apk`: Phase 5 reliability fixes plus the Phase 6 display-awake fix; no tuning changes.
- `rollback.apk`: APK installed before this validation run. It is the installed Phase 5 build, before the display-awake fix.
- `candidate-pre-screen-fix.apk`: the build used for the initial paired timing runs.
- `pre-reliability.apk`: the previous Phase 4 APK, retained as an additional fallback.
- `phase1.apk`: the verified baseline used in the comparison.
- `apk-identities.json`, build/Jest logs, source patch and capture directories record provenance.

The final installed APK was read back by SHA-256 and matches `candidate.apk`: `444ba06a45f5ba62ef10c4146d49b0f73b43ba22fe801a6e845a3344bf241f09`. All APK signing certificates match the existing installation. Updates use `adb install -r` and retain app data. No store or external distribution has been published. To restore the APK installed before Phase 6 locally:

```sh
adb -s RF8R50ZEHDE install -r build/releases/2026-10-08/rollback.apk
```

[Structured results](docs/phase6-validation-2026-10-08.json) contain the raw summaries. Reliability fixes are packaged independently of tuning; no threshold optimizations were added without evidence. The replay and memory measurements improved, but cold startup remains 6% slower. Full Phase 6 sign-off remains pending weak-bandwidth and physical bedtime/screen-time boundary validation. This is an installed local release candidate, not a published store release.
