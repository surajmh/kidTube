import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ChannelSyncState,
  applyFetchFailure,
  applyFetchResult,
  canLoadMore,
  channelCacheTtlMs,
  channelFailureBackoffMs,
  channelVideosFrom,
  describeChannelSync,
  effectiveSyncMode,
  emptyChannelSyncState,
  isCanonicalChannelId,
  mergeSyncedVideos,
  normalizeChannelInput,
  normalizeTimestamp,
  parseChannelResponse,
  parseVideoPage,
  shouldFetchChannel,
  syncOwnedVideos,
  toApprovedVideo,
} from '../src/services/content/channelSyncRules';
import { YouTubeProviderError, readDurationSeconds } from '../src/services/content/youtubeContentProvider';
import { channelA, channelB, video, videoIds, approvedVideo, syncedVideo } from './helpers/fakeProvider';

const now = new Date('2026-06-01T12:00:00.000Z');

describe('channel input normalization (§3)', () => {
  it('accepts a bare handle or custom name with no host at all', () => {
    assert.deepEqual(normalizeChannelInput('MrBeast'), { kind: 'handle', handle: '@MrBeast' });
    assert.deepEqual(normalizeChannelInput('story_time'), { kind: 'handle', handle: '@story_time' });
    assert.deepEqual(normalizeChannelInput('/channel/' + channelA), { kind: 'channelId', id: channelA });
  });

  it('accepts every canonical channel reference form', () => {
    assert.deepEqual(normalizeChannelInput(channelA), { kind: 'channelId', id: channelA });
    assert.deepEqual(normalizeChannelInput(`https://www.youtube.com/channel/${channelA}`), {
      kind: 'channelId',
      id: channelA,
    });
    assert.deepEqual(normalizeChannelInput(`youtube.com/channel/${channelA}?sub_confirmation=1`), {
      kind: 'channelId',
      id: channelA,
    });
    assert.deepEqual(normalizeChannelInput(`https://www.youtube.com/${channelA}`), { kind: 'channelId', id: channelA });
  });

  it('treats handles as references, never as identifiers', () => {
    assert.deepEqual(normalizeChannelInput('https://www.youtube.com/@MrBeast'), {
      kind: 'handle',
      handle: '@MrBeast',
    });
    assert.deepEqual(normalizeChannelInput('@MrBeast'), { kind: 'handle', handle: '@MrBeast' });
    assert.deepEqual(normalizeChannelInput('MrBeast'), { kind: 'handle', handle: '@MrBeast' });
    assert.deepEqual(normalizeChannelInput('https://youtube.com/c/StoryTime'), {
      kind: 'handle',
      handle: '@StoryTime',
    });
  });

  it('keeps the legacy /user/ form distinct from a handle', () => {
    assert.deepEqual(normalizeChannelInput('https://www.youtube.com/user/OldChannel'), {
      kind: 'legacyUser',
      user: 'OldChannel',
    });
  });

  it('rejects other sites, malformed ids and empties', () => {
    assert.deepEqual(normalizeChannelInput('https://example.com/@MrBeast'), { kind: 'unknown' });
    assert.deepEqual(normalizeChannelInput('https://example.com/channel/' + channelA), { kind: 'unknown' });
    // A truncated channel id is a mistyped id, not a channel handle.
    assert.deepEqual(normalizeChannelInput(`UC${'a'.repeat(10)}`), { kind: 'unknown' });
    assert.deepEqual(normalizeChannelInput('   '), { kind: 'unknown' });
    assert.deepEqual(normalizeChannelInput('https://www.youtube.com/@ab'), { kind: 'unknown' });
  });

  it('only accepts a canonical id as an identifier', () => {
    assert.equal(isCanonicalChannelId(channelA), true);
    assert.equal(isCanonicalChannelId('@MrBeast'), false);
    assert.equal(isCanonicalChannelId('Story Time'), false);
    assert.equal(isCanonicalChannelId(undefined), false);
  });
});

describe('cache policy (§7)', () => {
  const state: ChannelSyncState = { ...emptyChannelSyncState(channelA), fetchedAt: now.toISOString() };

  it('fetches the first time and then serves from cache inside the TTL', () => {
    assert.equal(shouldFetchChannel(undefined, 'initial', now), true);
    assert.equal(shouldFetchChannel(state, 'initial', new Date(now.getTime() + 60_000)), false);
    assert.equal(shouldFetchChannel(state, 'initial', new Date(now.getTime() + channelCacheTtlMs - 1)), false);
  });

  it('fetches again once the cache is stale', () => {
    assert.equal(shouldFetchChannel(state, 'initial', new Date(now.getTime() + channelCacheTtlMs)), true);
  });

  it('always fetches on an explicit refresh or load more', () => {
    assert.equal(shouldFetchChannel(state, 'refresh', new Date(now.getTime() + 1_000)), true);
    assert.equal(shouldFetchChannel(state, 'more', new Date(now.getTime() + 1_000)), true);
  });

  it('backs off after a failure so a broken provider is not retried on every render', () => {
    // A stale cache whose last attempt just failed: the only thing holding it back is the backoff.
    const stale: ChannelSyncState = {
      ...emptyChannelSyncState(channelA),
      fetchedAt: new Date(now.getTime() - channelCacheTtlMs * 2).toISOString(),
    };
    assert.equal(shouldFetchChannel(stale, 'initial', now), true);

    const failed = applyFetchFailure(stale, { code: 'NETWORK', message: 'offline' }, now);
    assert.equal(shouldFetchChannel(failed, 'initial', new Date(now.getTime() + channelFailureBackoffMs - 1)), false);
    assert.equal(shouldFetchChannel(failed, 'initial', new Date(now.getTime() + channelFailureBackoffMs)), true);
    // An explicit refresh ignores the backoff — the user asked for it.
    assert.equal(shouldFetchChannel(failed, 'refresh', now), true);
  });

  it('offers load more only when the provider reported another page', () => {
    assert.equal(canLoadMore(undefined), false);
    assert.equal(canLoadMore(state), false);
    assert.equal(canLoadMore({ ...state, nextPageToken: 'CAoQAA' }), true);
    // Load more without a token would refetch page one.
    assert.equal(effectiveSyncMode(state, 'more'), 'refresh');
    assert.equal(effectiveSyncMode({ ...state, nextPageToken: 'CAoQAA' }, 'more'), 'more');
  });
});

describe('merge: duplicates, refresh and parent decisions (§5, §6)', () => {
  it('does not duplicate a video that is fetched twice', () => {
    const first = mergeSyncedVideos([], [video(0), video(1)], { channelId: channelA });
    assert.equal(first.added, 2);

    const second = mergeSyncedVideos(first.videos, [video(0), video(1)], { channelId: channelA });
    assert.equal(second.added, 0);
    assert.equal(second.updated, 2);
    assert.equal(second.videos.filter((item) => item.youtubeVideoId === videoIds[0]).length, 1);
    assert.equal(second.videos.length, 2);
  });

  it('collapses duplicates inside a single page', () => {
    const result = mergeSyncedVideos([], [video(0), video(0), video(1)], { channelId: channelA });
    assert.equal(result.videos.length, 2);
  });

  it('refreshes metadata without touching a parent decision', () => {
    const existing = [
      { ...approvedVideo(videoIds[0], channelA), categoryIds: ['stories'], approved: true },
    ];
    const result = mergeSyncedVideos(existing, [video(0, channelA, { title: 'Renamed', durationSeconds: 99 })], {
      channelId: channelA,
    });
    const merged = result.videos[0];
    assert.equal(merged.id, `manual-${videoIds[0]}`);
    assert.equal(merged.title, 'Renamed');
    assert.equal(merged.duration, 99);
    assert.equal(merged.approved, true);
    assert.deepEqual(merged.categoryIds, ['stories']);
    assert.notEqual(merged.syncedFromChannel, true);
  });

  it('keeps videos that the provider no longer returns', () => {
    const existing = [syncedVideo(videoIds[0]), syncedVideo(videoIds[1])];
    const result = mergeSyncedVideos(existing, [video(0)], { channelId: channelA });
    assert.equal(result.videos.length, 2);
    assert.equal(result.added, 0);
  });

  it('stores fetched videos as not individually approved', () => {
    const created = toApprovedVideo(video(0), { channelId: channelA, channelName: 'Story Time' });
    assert.equal(created.approved, false);
    assert.equal(created.candidate, false);
    assert.equal(created.syncedFromChannel, true);
    assert.equal(created.channelId, channelA);
    assert.equal(created.duration, 300);
  });

  it('attributes a fetched video to the approved channel, not to whatever the provider claims', () => {
    // Otherwise a provider could hand back a video tagged with another approved
    // channel and inherit that channel's approval.
    const created = toApprovedVideo(video(0, channelB), { channelId: channelA });
    assert.equal(created.channelId, channelA);
  });

  it('ignores malformed video ids instead of storing them', () => {
    const result = mergeSyncedVideos([], [video(0, channelA, { youtubeVideoId: 'too-short' })], { channelId: channelA });
    assert.equal(result.videos.length, 0);
  });

  it('separates sync-owned rows from a parent-approved row', () => {
    const videos = [syncedVideo(videoIds[0]), approvedVideo(videoIds[1], channelA), syncedVideo(videoIds[2], channelB)];
    const owned = syncOwnedVideos(videos, channelA);
    assert.deepEqual(owned.map((item) => item.youtubeVideoId), [videoIds[0]]);
  });
});

describe('pagination and state (§6)', () => {
  it('records the next page token and counts pages', () => {
    const outcome = applyFetchResult({
      existingVideos: [],
      state: emptyChannelSyncState(channelA),
      page: { channelId: channelA, videos: [video(0)], nextPageToken: 'CAoQAA' },
      mode: 'initial',
      now,
    });
    assert.equal(outcome.state.nextPageToken, 'CAoQAA');
    assert.equal(outcome.state.pagesFetched, 1);
    assert.equal(outcome.state.videoCount, 1);
    assert.equal(outcome.state.fetchedAt, now.toISOString());
  });

  it('appends a second page without refetching the first', () => {
    const first = applyFetchResult({
      existingVideos: [],
      state: emptyChannelSyncState(channelA),
      page: { channelId: channelA, videos: [video(0), video(1)], nextPageToken: 'PAGE2' },
      mode: 'initial',
      now,
    });
    const second = applyFetchResult({
      existingVideos: first.result.videos,
      state: first.state,
      page: { channelId: channelA, videos: [video(2)] },
      mode: 'more',
      now,
    });
    assert.equal(second.result.videos.length, 3);
    assert.equal(second.result.added, 1);
    assert.equal(second.state.pagesFetched, 2);
    assert.equal(second.state.nextPageToken, undefined);
  });

  it('restarts from page one on a refresh', () => {
    const first = applyFetchResult({
      existingVideos: [],
      state: emptyChannelSyncState(channelA),
      page: { channelId: channelA, videos: [video(0)], nextPageToken: 'PAGE2' },
      mode: 'initial',
      now,
    });
    const refreshed = applyFetchResult({
      existingVideos: first.result.videos,
      state: first.state,
      page: { channelId: channelA, videos: [video(1)] },
      mode: 'refresh',
      now,
    });
    assert.equal(refreshed.state.pagesFetched, 1);
    assert.equal(refreshed.state.nextPageToken, undefined);
  });

  it('clears a recorded error on the next success', () => {
    const failed = applyFetchFailure(emptyChannelSyncState(channelA), { code: 'NETWORK', message: 'offline' }, now);
    assert.equal(failed.lastError?.code, 'NETWORK');
    const recovered = applyFetchResult({
      existingVideos: [],
      state: failed,
      page: { channelId: channelA, videos: [video(0)] },
      mode: 'initial',
      now,
    });
    assert.equal(recovered.state.lastError, undefined);
  });
});

describe('response validation (§10, §13)', () => {
  it('accepts a well-formed channel payload', () => {
    const parsed = parseChannelResponse({
      youtubeChannelId: channelA,
      name: 'Story Time',
      thumbnailUrl: 'https://img.example/a.jpg',
      uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa',
    });
    assert.equal(parsed.youtubeChannelId, channelA);
    assert.equal(parsed.name, 'Story Time');
  });

  it('rejects a malformed channel payload instead of storing a half-row', () => {
    assert.throws(() => parseChannelResponse(null), YouTubeProviderError);
    assert.throws(() => parseChannelResponse({ name: 'No id' }), YouTubeProviderError);
    assert.throws(() => parseChannelResponse({ youtubeChannelId: 'not-a-channel' }), YouTubeProviderError);
  });

  it('drops unusable video rows and non-ISO timestamps', () => {
    const page = parseVideoPage(
      {
        channelId: channelA,
        videos: [
          { youtubeVideoId: videoIds[0], title: 'Good', publishedAt: '2026-01-01T00:00:00.000Z' },
          { youtubeVideoId: 'nope', title: 'Bad id' },
          { title: 'No id at all' },
          'not an object',
          { youtubeVideoId: videoIds[0], title: 'Duplicate' },
        ],
      },
      channelA,
    );
    assert.equal(page.videos.length, 1);
    assert.equal(page.videos[0].title, 'Good');
  });

  it('falls back to a readable title and drops invalid timestamps', () => {
    const page = parseVideoPage({ videos: [{ youtubeVideoId: videoIds[0], publishedAt: 'not-a-date' }] }, channelA);
    assert.equal(page.videos[0].title, `Video ${videoIds[0]}`);
    assert.equal(page.videos[0].publishedAt, undefined);
    assert.equal(normalizeTimestamp('2026-01-01T00:00:00Z'), '2026-01-01T00:00:00.000Z');
    assert.equal(normalizeTimestamp('soon'), undefined);
  });

  it('rejects a non-numeric duration and a negative one', () => {
    assert.equal(readDurationSeconds(123), 123);
    assert.equal(readDurationSeconds(12.6), 13);
    assert.equal(readDurationSeconds('300'), undefined);
    assert.equal(readDurationSeconds(-5), undefined);
    assert.equal(readDurationSeconds(Number.NaN), undefined);
    assert.equal(readDurationSeconds(Number.POSITIVE_INFINITY), undefined);
  });

  it('never returns a JSON payload that is not an object', () => {
    assert.throws(() => parseVideoPage('nope', channelA), YouTubeProviderError);
  });
});

describe('library views', () => {
  it('returns a channel’s videos, newest first', () => {
    const videos = [
      { ...syncedVideo(videoIds[0]), publishedAt: '2026-01-01T00:00:00.000Z' },
      { ...syncedVideo(videoIds[1]), publishedAt: '2026-03-01T00:00:00.000Z' },
      { ...syncedVideo(videoIds[2], channelB), publishedAt: '2026-05-01T00:00:00.000Z' },
    ];
    const own = channelVideosFrom(videos, channelA);
    assert.deepEqual(own.map((item) => item.youtubeVideoId), [videoIds[1], videoIds[0]]);
  });

  it('describes a failure without hiding the videos it still holds', () => {
    const state: ChannelSyncState = { ...emptyChannelSyncState(channelA), videoCount: 4, fetchedAt: now.toISOString() };
    assert.match(describeChannelSync(state, now), /Updated just now · 4 videos/);
    const failed = applyFetchFailure(state, { code: 'NETWORK', message: 'offline' }, now);
    assert.match(describeChannelSync(failed, now), /Couldn't load videos right now · 4 videos saved/);
  });

  it('labels an unvisited channel rather than implying it is empty', () => {
    assert.equal(describeChannelSync(undefined), 'Not loaded yet');
  });
});
