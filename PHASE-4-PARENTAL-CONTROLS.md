# Phase 4 — Advanced parental controls & content management

Phase 4 turns the Phase 1-3 whitelist player into a private, local-first
parental-control video library. Phase 1-3 (parent PIN, child profiles, whitelist,
Kid Mode, native ExoPlayer playback, SponsorBlock, screen time, allowed hours,
bedtime) is unchanged and still in charge of playback.

```text
Child sees curated library (KidContentLibrary)
        ↓
Child asks for unavailable content (Ask a Parent)
        ↓
Parent opens Requests → approves once / today / 7 days / permanently / whole channel
        ↓
Content appears in Kid Mode
        ↓
PlaybackPolicy.canPlay({ profileId, videoId, channelId, categoryIds })
        ↓
Native PlayerAdapter → ExoPlayer → Playback
```

## Layer map

| Concern | Module |
| --- | --- |
| Domain types | `src/phase4Types.ts` |
| Storage | `src/repositories/phase4Repository.ts` |
| Parent authorization | `src/services/auth/parentSession.ts` |
| Requests (child + parent) | `src/services/requestService.ts` |
| Approvals, expiry, one-playback consumption | `src/services/approvalService.ts`, `src/services/approvalRules.ts` |
| The access decision (shared) | `src/services/contentAccessService.ts` |
| Categories | `src/services/categoryService.ts` |
| Per-child content rules | `src/services/childRulesService.ts` |
| Per-child playback overrides | `src/services/profilePolicyService.ts` |
| Temporary parent overrides | `src/services/playbackOverrideService.ts` |
| Central playback decision | `src/services/playbackPolicyService.ts` |
| Parent search (parent-only) | `src/services/parentContentSearchService.ts` |
| Kid-facing library | `src/services/kidContentLibraryService.ts` |
| Activity dashboard data | `src/services/activityService.ts` |
| UI | `src/components/KidHomeScreen.tsx`, `KidRequestsPanel.tsx`, `ParentShell.tsx`, `ParentRequestsPanel.tsx`, `ParentContentPanel.tsx`, `ParentCategoriesPanel.tsx`, `ParentChildrenPanel.tsx`, `ParentActivityPanel.tsx`, `ParentOverrideSheet.tsx`, `PinEntry.tsx`, `tv.tsx` |

## 1. The single decision point

`PlaybackPolicyService.canPlay({ profileId, videoId, channelId, categoryIds })`
is the only thing that decides whether a child may play something. It evaluates,
in order:

1. profile validity
2. global whitelist approval, child-specific grant, or a temporary/permanent grant
   (an expired grant reports `APPROVAL_EXPIRED` instead of `VIDEO_NOT_APPROVED`)
3. child blocks (a block always wins)
4. disabled category for this child → `CATEGORY_BLOCKED`
5. allowed hours / bedtime (skipped while a parent override grants schedule access)
6. screen time, including any live parent-override bonus

`ContentAccessService` implements steps 1-4 and is used by **both** the policy and
`KidContentLibraryService`, so Kid Mode can never display something playback would
refuse. Screens never re-implement any of this; they render
`describePlaybackDecision()` copy, which is written for children
("This video isn't available for your profile.") and leaks no policy internals.

## 2. Authorization is enforced in the service layer

`ParentSession` is minted only by `parentSessionService.startWithPin(pin)` (or right
after the parent creates the PIN at first run) and expires after 30 minutes idle.
Every parent-only service method calls `parentSessionService.require(action)`:
approvals, requests, categories, child rules, per-child policies, parent overrides,
content mutations, and settings changes. Hiding UI is a second layer, not the
control. A child cannot approve/reject content, edit categories, change limits or
schedules, create overrides, edit another profile, or read activity data — those
calls throw `ParentAuthorizationError` without a live session.

## 3. Approvals

```ts
type ApprovalDuration = 'once' | 'today' | 'seven_days' | 'permanent';

type ContentApproval = {
  id: string;
  profileId: string | null;   // null = every child
  target: { type: 'video'; youtubeVideoId: string }
        | { type: 'channel'; youtubeChannelId: string };
  duration: ApprovalDuration;
  grantedAt: string;
  expiresAt?: string;         // undefined for permanent
  remainingPlays?: number;    // 1 for `once`
};
```

- **Permanent + family-wide** is written into the Phase 1 whitelist, so existing
  behaviour and screens keep working unchanged.
- **Permanent + one child** and every temporary approval are stored as grants.
- `once` expires when playback completes (`onEnd` → `approvalService.consumePlayback`).
- Expired approvals stop allowing playback immediately, because expiry is evaluated
  at decision time; expired rows are also pruned on launch.

## 4. Per-child rules (Phase 1-3 data stays valid)

Global approvals are untouched. Each child may additionally have
`ChildContentRules`: inherit-global toggle, enabled/disabled categories,
granted/blocked channels and videos, and a `ProfilePolicyOverrides` record that
overrides any of the family playback settings (daily limit, allowed hours,
bedtime, autoplay, SponsorBlock, warnings). Anything not overridden falls through
to the family default, so existing installs behave exactly as before.

Categories: seven defaults (Educational, Music, Stories, Animals, Numbers,
Alphabet, Other) plus custom ones. Content can belong to many; uncategorised
content counts as `Other`, so blocking `Other` is a real restriction.

## 5. Temporary parent override

`{ profileId, additionalSeconds, expiresAt, grantsScheduleAccess }`. `+15 minutes`,
`+30 minutes` and `Until bedtime` are all bounded and expire automatically; they
never change the child's configured limit. Reached from Kid Mode or the paused
player it demands the PIN again (`ParentOverrideSheet`), and it is the only path
that bypasses the time/schedule checks.

## 6. Parent content search vs. the kid library

`ParentContentSearch` requires a live parent session and only ever produces inert
`ContentCandidate` values. The bundled `LinkEntryProvider` resolves pasted YouTube
links/IDs locally — no network, no API key, no scraping. A candidate can be
**saved** (an unapproved row children may ask about) or **approved** (into the
family library); it is never playable in between. `KidContentLibraryService` has no
search at all — Kid Mode only receives already-allowed videos, channels, category
cards, recently watched, and the ask-for candidates.

## 7. Kid Mode and Android TV

Kid Mode navigation is Home / Categories / Channels / Recently watched / Ask a
Parent, with large category cards. No comments, likes, subscriptions, external
links, video URLs, or arbitrary search.

Every Phase 4 interactive element goes through `FocusablePressable` (`tv.tsx`),
which always renders a visible focus ring, and the parent PIN has a D-pad keypad
(`PinEntry`) so nothing requires touch or an OS keyboard. Allowed-hours windows in
the Children tab are edited with +/− 30-minute steppers for the same reason.

## Privacy

Still local-first: AsyncStorage + SecureStore only. No advertising, analytics,
tracking, child profiling, social accounts, or cloud services, and watch history is
never uploaded.

## Out of scope (not implemented)

Unrestricted YouTube browsing/recommendations, comments, likes, subscriptions,
YouTube account login, live chat, casting, downloads/offline video, payments,
social features, public sharing, iOS, and any new playback engine. The Phase 2
native playback layer is untouched.
