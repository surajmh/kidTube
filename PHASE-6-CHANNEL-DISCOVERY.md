# Phase 6 — Approved Channel Video Discovery

Fixes: an approved channel showed `1 saved · From <channel> · 0 videos`, because
Phase 4 stored channel metadata but never fetched the channel's uploads.

```
Parent approves a channel
        ↓
resolve to a canonical channel id          (§3)
        ↓
fetch channel metadata + uploads playlist  (§2, §4)
        ↓
fetch one page of uploads                  (§4, §6)
        ↓
merge into the local video library         (§5)
        ↓
channel page shows the videos              (§9, §10)
        ↓
child taps one → PlaybackPolicy → PlayerAdapter → Media3   (§15)
```

## The security model did not move

The feature adds rows to the library. It does **not** add an approval path:

- Fetched videos are stored `approved: false, candidate: false, syncedFromChannel: true`.
  They are eligible **only** because their channel is approved, which is the rule
  that already existed in `WhitelistService.isVideoAllowed`.
- Individual video approval still works exactly as before, including for videos
  from channels that were never approved (§16).
- `ContentAccessService` — and therefore `PlaybackPolicy` and the Kid library —
  remains the single gate. Both read the same decision, so Kid Mode cannot be
  shown something playback would refuse.
- `search.list` is never called. There is no YouTube browsing, no recommendations,
  no login, and nothing new for a child to reach (§14, out-of-scope).

Two defences were added rather than assumed:

1. **A provider cannot choose which channel a video belongs to.** A fetched row is
   pinned to the channel the parent approved, so a mislabelled or hostile response
   cannot attach a video to a *different* approved channel and inherit its access.
2. **Kid Mode issues no API calls at all.** Refresh and Load more exist only in
   Parent Mode, so a child can never spend the family's YouTube quota, and only
   approved content is ever requested (the app only asks about channels it stored).

## The provider boundary (§1, §11)

`YouTubeContentProvider` (`src/services/content/youtubeContentProvider.ts`) is
metadata-only and swappable:

```ts
interface YouTubeContentProvider {
  resolveChannelId(reference: string): Promise<string>;
  getChannel(channelId: string): Promise<YouTubeChannel>;
  getChannelVideos(channelId, options?): Promise<YouTubeVideoPage>;
}
```

Implementations: `RemoteYouTubeContentProvider` (HTTP),
`UnconfiguredContentProvider` (always refuses), and a `FakeProvider` in tests.

**The API key is never on the device.** The client holds only the endpoint URL and
an optional *proxy* token. The key lives in `server/youtube-proxy`, a Cloudflare
Worker you deploy yourself — see `server/youtube-proxy/README.md`. The URL is
entered in Parent Mode → Playback → *Metadata provider*, and validated (`https`
only, real host, no embedded credentials).

## Resolving a channel (§3)

`normalizeChannelInput` accepts `UC…`, `/channel/UC…`, `/@handle`, `/c/Name`,
`/user/Name`, a bare handle, or a bare custom name. A handle is **never** treated
as an identifier — it comes back as a `handle` so the provider must resolve it to
the canonical `UC…` id. Two channels can share a display name; only a validated
`UC…` id is ever stored as the channel's identity.

Names that merely *look* like an id (`UC` + a truncated string) are rejected as
mistyped ids rather than silently looked up as handles.

## Uploads, pagination and cache (§4, §6, §7, §12)

Uploads come from `channels.list` → `contentDetails.relatedPlaylists.uploads` →
`playlistItems.list`, then one `videos.list` for titles and durations. That is
2–3 quota units per page; `search.list` would cost 100.

| Situation | Behaviour |
| --- | --- |
| First time a channel is opened | fetch page 1 (30 videos) |
| Reopened inside the 6-hour TTL | cached rows, no request |
| **Refresh** | force page 1 |
| **Load more** | next page only, appended |
| Last attempt failed < 1 min ago | no automatic retry (backoff) |

Approving a channel syncs it immediately, so the channel page is populated
without a second tap. Connecting a provider syncs the already-approved channels
too. `Load more` without a token is treated as a refresh rather than silently
re-fetching page one.

A whole channel history is never downloaded automatically.

## Failures (§13)

A failed fetch returns the videos it was given, unchanged — the cached library is
never trimmed by a bad response. Only the sync state records the error, and the
UI says so:

```
Couldn't load videos right now.
The YouTube data quota for today is used up. Try again tomorrow.   [Try Again]
```

An approved channel is never unapproved because a refresh failed, and a channel
that has never been fetched is labelled *Videos not loaded*, never `0 videos`.
The child only ever sees `Couldn't load videos right now.` plus a nudge to ask a
grown-up — provider wording, codes and host names never reach Kid Mode.

## Persistence and integrity

- `ApprovedVideo` gained `publishedAt` and `syncedFromChannel`; nothing existing
  changed shape, so old installs load identically.
- New storage key `@nestling/channel-sync` holds per-channel fetch state
  (uploads playlist, page token, cache timestamps, last error).
- `repairLocalData` now drops sync-owned videos whose channel is gone, and sync
  state for channels that no longer exist — no orphaned records (§9).
- Removing a channel drops the videos its sync created, but keeps a video a parent
  approved by hand or saved as an "ask a parent" item. The destructive PIN reset
  clears sync state and the provider URL too.
- Fetching is keyed by video id, so a refresh can never duplicate a row.

## One bug this feature exposed

`App.tsx` built the native player's allow list with
`.filter(video => video.approved !== false && !video.candidate)`. Fetched videos
are intentionally not individually approved, so **every** discovered video would
have been silently refused by the native bridge gate even though the policy
allowed it. The filter is gone: the list now trusts `contentAccessService.evaluate`
alone, which already decides approval, candidates and child rules.

## Verification

```bash
npm test            # 84 assertions, real modules, no network
npm run typecheck
npm run test:worker # the proxy's own typecheck
```

`tests/` covers, against the real implementations with a fake provider and a fake
`fetch`:

| Area | What is asserted |
| --- | --- |
| Channel (§17) | every accepted input form; handles stay references; other sites and malformed ids rejected; canonical-id rule |
| Videos (§17) | metadata loaded; valid channel → videos; refresh updates the library; duplicates collapse within a page and across refreshes; parent-approved rows keep their id, categories and approval; pagination tokens; a shorter page never loses videos |
| Security (§17) | approved channel → allowed; unapproved channel → blocked; individually approved video → allowed; per-child blocks and category rules still win; the Kid library agrees with the policy for every row it returns; a provider cannot reassign a video's channel |
| Failure (§17) | provider unavailable → every cached video still returned and still visible; quota error recorded with the count preserved; terminal errors marked non-retryable; malformed payload → error, not a half-written library |
| Transport (§11) | only the request and an optional proxy token leave the device; no `key=` ever appears; status→code mapping incl. 403 quota; timeout and network classification; endpoint validation |

Not verified: nothing has been run on a device or against the live YouTube API.
`npx expo run:android` and a real deployed Worker are still needed to confirm
end-to-end. No change was made to the native player, `PlayerAdapter` or the
Media3/ExoPlayer path.
