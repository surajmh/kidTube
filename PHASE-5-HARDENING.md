# Phase 5 — Production hardening

Covers all twelve sections of the Phase 5 brief. No new features; nothing from Phases 1–4 was
rebuilt. Section numbers below match the brief.

## 0. Build fixes (blocking)

Three defects meant the native module had never actually been compiled in this project:

1. `modules/nestling-youtube-player/android/build.gradle` had no publication coordinates, so Gradle
   configuration failed with `'android.defaultConfig.versionName' is not defined`
   (`expo.modules.plugin.applyPublishing` reads `android.defaultConfig.versionName` for every module
   that does not opt out of publishing). **Every** Gradle invocation failed, so the Android app could
   not be built at all. The module now declares `group`, `version` and `defaultConfig { versionCode versionName }`.
2. `YouTubePlayerView` set `focusable = true`. `View.getFocusable()` returns an int, so Kotlin
   resolves that property to the deprecated int setter and the assignment does not compile. It is now
   `isFocusable = true` (the boolean D-pad/TV focusability flag).
3. The controller is constructed by the view, so the trailing lambda bound to the constructor's last
   parameter instead of `emit`; the `emit` argument is now passed by name.

## 1. Playback reliability

Recovery loop (native, `ExoPlayerController`):

```text
playback error
     ↓
classify (network / expired stream / terminal)
     ↓
bounded retry with backoff  (1s → 2s → 4s, max 3 attempts)
     ↓
refresh playback information (resolver)
     ↓
new MediaSource, resume from the last known position
```

- `PlaybackRetryPolicy` owns the budget: recoverable codes only, exponential backoff with a cap,
  `maxAttempts = 3` per playback session.
- The budget is restored **only** by a user-initiated `play`/`resume`. Recovery chains never reset
  it, so a flapping stream can never retry forever.
- The JS layer adds one more bounded attempt (`playbackRecovery.ts`, 2s backoff) after the native
  layer gives up, then shows a child-friendly message plus an explicit "Try again".
- Media3 failures are mapped to codes (`network_error`, `stream_expired`, `video_unavailable`,
  `unsupported_format`, `playback_failure`), so a deleted or private video is terminal and stops
  immediately instead of retrying: `normalizePlayerError()` marks each code `recoverable` or not.
- `onRetry` events tell the UI that a recovery attempt is running (shown as "Trying again (2 of 3)…").
- Buffering, backgrounding, foregrounding (with a fresh policy check before resuming), orientation
  changes, TV suspend/resume and wake-lock behaviour are all covered: `setWakeMode(WAKE_MODE_LOCAL)`
  keeps playback alive on tablets/TV, `OnActivityEntersBackground` pauses, and the resume decision
  stays in `PlaybackPolicy` so the native player can never bypass it.

## 2. Stream expiration

- Short-lived stream URLs live only inside the current `MediaSource`. They are never written to
  storage; only the video id (`ApprovedVideo.youtubeVideoId`) and the playback position
  (`WatchHistory.progress`) survive.
- On `stream_expired`/`network_error` the controller re-resolves playback information, builds a new
  `MediaSource` and resumes with `setMediaItem(mediaItem, resumePositionMs)`.
- The resume position is tracked from the playhead on every progress tick and on pause, and is reset
  on `STATE_ENDED`.

## 3. Player lifecycle

```text
attach      → bind exactly one controller to the PlayerView
play/pause  → update position / keep the progress loop single
detach      → PlayerView.player = null, controller released
destroyed   → resolver executor shut down, wake lock and fullscreen state restored
```

- Exactly one `ExoPlayer` and one progress loop per view: `startProgressTicking()` is idempotent, so
  a re-attach cannot produce a second `onProgress` stream (which previously would have double-counted
  watch time).
- `YouTubePlayerView` recreates its controller when the old one is released (= player recreation),
  and releases it on `onDetachedFromWindow`; `OnViewDestroys` also releases, so RN view recycling or
  Activity recreation cannot leave a player, SurfaceView reference or Activity context behind.
- The module registers the mounted view in `OnViewDidUpdateProps` as well as the `videoId` prop
  setter: props are not re-sent when unchanged, so commands previously could throw
  "view is not mounted" after a re-mount.
- `OnActivityDestroys` releases the player to prevent Activity leaks.
- Fullscreen/orientation state is restored on release.
- No `Player.Listener`, `Handler` callback, resolver task or key listener outlives the controller.

## 4. Player lifecycle, screen mount/unmount and switching videos

Measured against the checklist in the brief (creation, release, mount/unmount, background/foreground,
orientation, Activity recreation, switching videos):

- Switching videos unmounts the native view (`YouTubePlayer`'s effect cleanup calls `stop()`), and the
  view releases its controller on detach, so the previous video's player cannot survive a switch.
- `PlayerScreen` resets its per-video state (progress, duration, recovery budget, skip state) on
  `video.youtubeVideoId` change, so a new video is always a fresh playback session.
- Only one `PlayerScreen` exists at a time: rendering is `screen === 'player' && selectedVideo`, and
  the Kid Mode screen is unmounted while it is shown.
- `PlayerAdapter` is a module-level singleton (`playerAdapterInstance.ts`) bound to the native module,
  which keeps a `WeakReference` to the view — no strong Activity reference is held between mounts.

## 5. Screen-time accuracy

- Watch time is credited from the **playhead**, not from wall-clock time
  (`screenTimeAccounting.ts`). Paused, buffering, recovering and backgrounded states credit nothing;
  a delayed progress tick no longer loses time (the old code clamped every tick to 1.5s); forward and
  backward seeks are discontinuities and are never counted as watching.
- Parent Mode and browsing accrue nothing: only the player credits time, and only while the playhead
  advances.
- Day changes are handled by keying usage on a local `YYYY-MM-DD` day (`localDayKey`), so a session
  spanning midnight lands in the correct day's record.
- Double counting is prevented by the single progress loop per player (see §3) plus an accounting
  queue in the player that serialises credits.
- Storage writes are debounced (`screenTimeService`, 10s) instead of writing all records on every
  500ms tick, and are flushed on background, on leaving the player, and on unmount, so an app kill
  loses at most one debounce window. Records and watch history are bounded (30 days / 500 entries).

## 6. Playback policy security

Every playback entry point was audited, and there is now a native-side gate as well as the JS one.

- UI entry points all funnel through `playbackDecision()` → `PlaybackPolicy.canPlay()`: opening a
  video, autoplay to the next video, and the child's "watch again" list. `PlayerScreen` refuses to
  mount the native player at all when the decision is not `allowed`.
- Runtime re-checks use `canContinuePlayback()` (foreground resume, play-from-pause, the periodic
  tick), so screen time, allowed hours, bedtime and parent override are re-evaluated during playback.
- **Native bridge hardening (new):** `NestlingYouTubePlayer` now requires an allow list. JS pushes the
  active profile's approved+category-allowed video ids (`setAllowedVideoIds`) and the module refuses
  `play`/`resume` for anything else with `accepted: false, code: 'policy_blocked'`. The list starts
  empty, so the player fails closed. The adapter turns a rejection into a `POLICY_BLOCKED` error
  instead of a silent no-op, and the child sees only "This video isn't available for your profile."
- Deep links: `app.json` declares the `nestling` scheme (Expo dev-client requirement) and the Android
  manifest has the matching `VIEW` intent filter, but the app registers **no** `Linking` handler, so a
  URL can only launch the app into Kid Mode — it cannot select content, start playback, or open Parent
  Mode. Nothing parses a URL for content except `parentContentSearchService`, which is parent-only.

## 7. Parent PIN security

`src/services/auth/parentPinService.ts` + `pinHash.ts`:

- The raw PIN is never stored and never returned. It is kept as a salted PBKDF2-HMAC-SHA256 digest
  (`{ version, salt, iterations, hash }`, 25 000 iterations) in the OS keystore. The hashing is ~100
  lines of pure TypeScript (validated against the standard SHA-256 and RFC 6070 PBKDF2 vectors) rather
  than another native dependency.
- Comparison is length-independent (constant time), and the salt is regenerated on every change, so
  two devices with the same PIN do not share a digest.
- Legacy installs that stored the plaintext PIN are migrated: it verifies once, is immediately
  replaced by a digest, and the plaintext slot is deleted.
- Failed attempts are counted and persisted: five failures lock PIN entry, and each further failure
  escalates the lockout (1 min → 5 min → 15 min → 60 min). The lockout survives an app restart, and a
  *correct* PIN is also refused while locked.
- `hasPin()` is the only startup read — the UI layer never sees the digest or the PIN.
- Nothing logs the PIN, the digest, the salt or the attempt state.
- Security boundary: the parent session is memory-only, so an app restart, process death or fresh
  Activity requires the PIN again. Within a session it also expires after 30 minutes idle, and the
  parent override sheet ends its session as soon as it closes.
- Recovery: a forgotten PIN cannot be recovered (there is no account or server), only reset. Reset is
  offered **only** while locked out, requires typing `RESET PARENT PIN`, and destroys the PIN together
  with the whole parent configuration (library, approvals, categories, per-child rules, policies,
  schedules, overrides, watch history), returning the app to first-run setup. It therefore cannot be
  used to *reach* an existing setup.

## 8. Kid Mode isolation

- Parent surfaces are unreachable without a live session: `ParentShell` renders only when
  `parentSession` exists (a second, independent guard on top of the service-layer `require()` calls
  in every parent-only mutation), and the parent PIN modal is the only door to Parent Mode.
- Android Back is handled centrally: player → Kid Mode, Parent Mode → Kid Mode (and it ends the
  session), nested kid screens → Kid Mode home. A child can never use Back to walk into a parent
  screen.
- There is no navigation stack to escape: the app is a state machine (`kid | parent | player`) with no
  router and no links, so "deep navigation" cannot reach a parent screen.
- Restart/process recreation starts in `kid` with `screen`/`parentSession` as fresh in-memory state;
  the setup step is derived from whether a PIN and a profile exist, so a half-configured app cannot
  land in Parent Mode.
- The player cannot be reached for content that is not approved (see §6), and playback completion only
  consumes a "once" approval — it never grants new access.
- Kid Mode UI exposes no comments, likes, subscriptions, search, external links, video URLs or
  channel browsing beyond the approved library; "Ask a Parent" accepts only saved candidates or free
  text, never an arbitrary URL.
- TV remote/D-pad: every interactive element is a `FocusablePressable` with a visible focus ring, the
  PIN uses a D-pad keypad, and the long lists render in bounded windows (§11) so focus order stays
  predictable.

## 9. Persistence

- Everything is local (`AsyncStorage` for data, `expo-secure-store` for the PIN), and hydration is
  re-read from storage on every launch, so data survives app restart, device restart, process
  recreation, orientation change and player recreation.
- Deleting a profile removes that profile's requests, approvals, overrides, content rules, per-child
  policy, watch history and screen-time records in one pass (`profileLifecycleService`). Family-wide
  approvals (`profileId === null`) are intentionally kept: they are not that child's data.
- Sequential writes are issued before React state is updated, so a crash mid-delete cannot leave
  in-memory state ahead of storage.

## 10. Data integrity

`contentValidation.ts` (write/parse time) and `dataIntegrityService.ts` (one repair pass on load):

- YouTube ids are validated strictly (video = 11 URL-safe chars, channel = 24 chars starting `UC`),
  and `parseYouTubeLink` normalizes every common form to the same id: `youtu.be`, `watch?v=`,
  `/shorts/`, `/embed/`, `/live/`, `m.`/`music.`/`nocookie` hosts, bare ids, scheme-less input, extra
  query parameters and fragments. A non-YouTube host is rejected outright, so an unrelated 11-character
  path segment (`example.com/not-a-video`) can no longer be mistaken for a video id.
- Duplicate videos/channels are collapsed by id, invalid rows dropped, and manual parent adds use the
  same parser (pasting a channel URL now yields the same id as typing it).
- The startup repair pass drops orphaned records (requests/approvals/overrides/rules/policies/history
  for missing profiles), expired approvals and expired overrides, prunes category assignments pointing
  at deleted categories, clamps negative or impossible screen-time values, drops malformed usage rows,
  clamps schedules to a day and validates settings. Whatever it changed is written back and reported to
  the parent as a notice in Parent Mode.
- Approvals that expire or whose play budget is used up are never resurrected; expired records are
  pruned on load instead of being left to accumulate.

## 11. Performance

- High-frequency playback progress stays in `PlayerScreen`'s own state; it is never lifted into global
  React state. The only consumer of usage is the parent dashboard, so `syncUsageIntoState()` updates
  App state when the *rounded minute* changes (and forcibly when leaving the player) instead of on
  every accounting tick.
- The access services are re-hydrated only when the array they read actually changed (identity check),
  instead of rebuilding six maps on every render.
- The long library lists render through `PagedGrid`, which renders a bounded window (24 items, 12 for
  channel tiles) and grows on demand with a D-pad-focusable "Show more" tile. A `FlatList` is not used
  because these lists live inside a page `ScrollView` (the whole screen scrolls as one surface for TV
  remotes), where a nested virtualized list would disable virtualization anyway and warn at runtime.
- Storage writes are debounced (`screenTimeService` 10s, history 5s) and history/screen-time records
  are capped, keeping the bridge and storage traffic flat during playback.

## 12. Startup

```text
app launch
   ↓
phase 1 (essential): read PIN presence + child profiles
   ↓
show the right mode  (setup | kid | parent-N/A)
   ↓
phase 2 (background): load library, screen time, categories, approvals, rules, overrides, settings
   ↓
repair once, hydrate the services, publish the native allow list
```

- Phase 1 is two `SecureStore`/`AsyncStorage` reads, so the first paint does not wait for the library.
  Until phase 2 hydrates it, `PlaybackPolicy` fails closed (`isHydrated()` is false → not allowed), so
  a fast tap cannot start playback with an unvalidated library.
- The repair pass and the storage write-back only happen when a repair was actually needed.

## Verification

- `npx tsc --noEmit` clean, including `--noUnusedLocals`.
- `./gradlew :nestling-youtube-player:compileDebugKotlin` → **BUILD SUCCESSFUL** (Media3 was
  downloaded into the Gradle cache for this). Only the pre-existing `systemUiVisibility` deprecation
  warnings remain.
- Pure logic verified by a temporary compiled check that ran the **real** modules against stubbed
  keystore/storage: **71 assertions, all passing** — SHA-256/HMAC/PBKDF2 standard vectors, PIN record
  round-trip and rejection, lockout escalation and lockout persistence, legacy plaintext migration,
  URL normalization for every form plus malformed rejection, duplicate/invalid library cleanup,
  negative and impossible screen-time values, schedule clamping, playhead accounting (pause, seek,
  delayed tick, re-anchor), retention windows, the full repair pass, and end-to-end agreement between
  `ContentAccessService`, `PlaybackPolicy.canPlay` and the Kid Mode library (approval, child rules,
  blocked categories, unknown profile, screen time, parent override, bedtime, allowed hours, no-limit,
  and fail-closed-when-unhydrated). The scratch directory was removed afterwards.

### Known remaining gaps

1. `systemUiVisibility` / `SYSTEM_UI_FLAG_*` in `setFullscreen` are deprecated and ignored on Android
   15+ with `targetSdk 36`, so immersive fullscreen will not hide the system bars there. It needs
   `WindowInsetsControllerCompat`; left untouched because it is outside the brief.
2. A full `assembleDebug` / `npx expo run:android` has not been run (it needs the React Native and
   Hermes artifacts downloaded), so the end-to-end app build is unverified.
3. No on-device testing has happened: the D-pad focus order, TV suspend/resume, Android Back
   behaviour, lockout UI and the new native allow list are verified by inspection and by compiled
   logic checks, not on hardware.
4. The watch-history and screen-time caps (500 / 30 days) are chosen, not measured; a very long
   session on a low-end TV device has not been profiled.

## Still out of scope

Unrestricted browsing, recommendations, comments, likes, subscriptions, casting, downloads, iOS,
payments and any new playback engine. The resolver remains an authorized-source boundary: it fails
closed and performs no stream extraction.
