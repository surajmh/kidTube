# Phase 3 — stream reuse and earlier Up next resolution

Implemented and installed on the connected Android phone.

- Normal resolution now populates the existing process-local stream cache. Replay
  reads retain the entry; previously only prefetch populated it and reading consumed it.
- Cache retains at most eight recently used streams, expires them after five minutes
  using a monotonic clock, and invalidates failed streams before retrying. A pending
  prefetch cannot restore an invalidated entry. URLs remain in memory only.
- Up next resolution starts once the playhead reaches ten seconds while playing,
  replacing the 80% threshold. Duplicate pending work is suppressed. Existing native
  allow-list checks and parental playback policy still apply.

## Phone results

Samsung SM-G780G / Android 13, Wi-Fi, power connected, existing media cache retained,
fresh process after installation. Open Hockey, wait 18 seconds, select Anniversary
via Up next, then return to the list and reopen Hockey three times.

| Scenario | Native start to first frame |
| --- | --- |
| Uncached initial open | 3362 ms |
| Prefetched Up next | 126 ms |
| Cached replay opens | 109, 110, 111 ms |

All five starts rendered. The trace confirms one cache miss followed by four cache
hits and no failure events. The next-video screenshot shows the expected video and
matching Up next artwork. The phone was returned to the video list after testing.

These timings exclude tap/JS scheduling and are a small sample with an already-used
media cache. Uncached first-open latency remains. This change resolves stream metadata
ahead of time; it does not preload media bytes or introduce another player.

Validation: TypeScript, 25 Jest suites / 244 tests, native cache and downloader regression
checks, and arm64 release build passed. Cache checks cover repeated reads, expiry,
invalidation and eviction; the hook check covers the prefetch threshold and paused ticks.
Matching certificate verified before updating in place; data/settings preserved.

The user reports successful reconnection recovery after disabling the network. A
controlled pause-during-outage capture, ten-minute playback, weak-network runs and the
previous live stream-fetch failure remain outside this validation.

Evidence: [structured capture](docs/phase3-startup-2026-10-07.json).
Raw capture, action timestamps, screenshot and previous APK: `/tmp/kidtube-phase3/`.
