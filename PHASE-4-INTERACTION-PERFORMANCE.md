# Phase 4 — Kid Mode interaction performance

Implemented and installed on the connected Android phone.

- Feed, channel videos, search videos and recent videos share one top-level `FlatList`.
  It renders a window of rows rather than retaining every revealed video. The feed
  now scrolls through available videos without a Show more button. Headers, notices,
  empty states and the eight-item Keep watching shelf remain in the same scroll surface.
- List position resets for profile, tab, category and channel changes. New search
  results scroll to the top; clearing search hides old results immediately. A result
  accepts the first tap while the keyboard is open.
- Up next receives the existing stable callback, so progress ticks no longer defeat
  the shared card's memoization. Thumbnail images use `contentFit` instead of the
  deprecated `resizeMode` compatibility prop.

The list uses variable row measurements and preserves existing accessible labels and
focusable controls. Implementation reference: [React Native 0.81 FlatList](https://reactnative.dev/docs/0.81/flatlist).

## Phone comparison

Samsung SM-G780G, Android 13, Wi-Fi, power connected, existing app/image caches retained.
For each build, open the already-approved 300-video channel, wait three seconds, then
issue twenty alternating 350 ms swipes with 300 ms gaps during a thirty-second capture.

| Measurement | Previous build | Candidate |
| --- | --- | --- |
| UI frames rendered | 114 | 937 |
| Janky UI frames | 95 (83.33%) | 2 (0.21%) |
| End-of-run app PSS | 969698 KiB (~947 MiB) | 180320 KiB (~176 MiB) |

This is one sequential comparison. The earlier run warmed image caches for the
candidate, and process histories differ; it is not a randomized, cache-cold benchmark.
PSS is a final snapshot, not peak usage or leak evidence. `gfxinfo` measures UI frames,
not decoded video. The two builds received the same gestures, not the same frame count.

Additional phone checks: twelve upward swipes loaded later channel rows without a
Show more action; one tap on Listening Ears from search with the keyboard open reached
the intended player. The app was returned to the video list afterward. The previous
APK was backed up and its signing certificate matched before installing in place.
Parent settings and approved library contents were preserved.

Validation: TypeScript, all 26 Jest suites / 245 tests, and release build passed.
After the final search-clear guard, TypeScript and the affected screen regression
passed again. The screen regression supplies 1,000 videos, verifies fewer than fifty
cards mount initially, and checks category/channel/recent/search routing and presses.
The phone's actual 300-video library supplied the device workload; no test content
was added to it.

Scope: Kid Mode video rows and the existing Up next card. Parent Mode paging, long
channel/request headers, TV remote focus, sustained playback and weak-network testing
remain separate work. This report does not claim the whole app is fully optimized.

Evidence: [structured comparison](docs/phase4-interaction-2026-10-07.json).
Raw captures, actions, UI checks and previous APK: `/tmp/kidtube-phase4/`.
