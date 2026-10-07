# Phase 2 — first playback fixes

Implemented and installed on the connected Samsung SM-G780G, Android 13.

- Shared thumbnails derive their source from the current video. Fallback is scoped
  to the failed URL, and `expo-image` clears the old bitmap when that URL changes.
- Superseded stream-resolution futures are cancelled. Queued work checks generation
  before extraction, and interrupted extraction stops before its next HTTP request.
  Existing completion guards remain; an already-running HTTP call may still finish.

## Phone comparison

On Wi-Fi with power connected and existing app/media cache retained, open Listening
Ears and tap Up next four times approximately 0.7 seconds apart. The exact approved
video sequence matches the Phase 1 rapid-switch trace.

| Final selection | Native start to first frame |
| --- | --- |
| Baseline, one run | 9543 ms |
| Candidate, run 1 | 2693 ms |
| Candidate, run 2 | 2358 ms |
| Candidate, run 3 | 2338 ms |

All three final selections rendered and played the intended video. The nine
intermediate starts were intentionally superseded; none reached preparation.
No failure events or dropped-frame callbacks were recorded. The final screenshot
shows Counting artwork matching the Counting title, resolving the stale-image repro.

These are native timings, excluding tap/JS scheduling. One baseline versus three
candidate repetitions is encouraging evidence, not a randomized performance study.
Uncached resolution still takes roughly two seconds. Startup caching/prefetch,
pause-during-recovery behavior, weak networks and sustained playback remain separate work.

Validation: TypeScript passed; 24 Jest suites / 242 tests passed; the native interrupted
downloader regression test passed; arm64 release APK built. The matching signing
certificate was checked before installing in place. App data and parent settings
were preserved; diagnostic logging was restored after capture.

Saved measurements: [structured comparison](docs/playback-fixes-2026-10-07.json).
Raw events/actions and screenshots: `/tmp/kidtube-phase2/rapid-switch-02/` and
`/tmp/kidtube-phase2/device-setup/switch-3.png`. Preserve these before OS cleanup.
The earlier empty capture `rapid-switch-01` is excluded: it contained no playback starts.
