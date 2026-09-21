import assert from 'node:assert/strict';
import { fetchChannelPage } from '../src/services/content/channelPageFetcher';
import { emptyChannelSyncState } from '../src/services/content/channelSyncRules';
import { YouTubeProviderError } from '../src/services/content/youtubeContentProvider';
import { FakeProvider, channel, channelA, channelB, video, videoIds, syncedVideo } from './helpers/fakeProvider';

const now = new Date('2026-06-01T12:00:00.000Z');

function fetchWith(provider: FakeProvider, overrides: Partial<Parameters<typeof fetchChannelPage>[0]> = {}) {
  return fetchChannelPage({
    provider,
    channelId: channelA,
    channelName: 'Story Time',
    mode: 'initial',
    state: emptyChannelSyncState(channelA),
    existingVideos: [],
    now,
    ...overrides,
  });
}

describe('channel metadata (§1, §3)', () => {
  it('loads a valid channel and its videos', async () => {
    const provider = new FakeProvider({
      channel: () => channel(),
      videos: () => ({ channelId: channelA, videos: [video(0), video(1)] }),
    });
    const result = await fetchWith(provider);

    assert.equal(result.error, undefined);
    assert.equal(result.metadata?.youtubeChannelId, channelA);
    assert.equal(result.metadata?.name, 'Story Time');
    assert.equal(result.metadata?.uploadsPlaylistId, 'UUaaaaaaaaaaaaaaaaaaaaaa');
    assert.equal(result.videos.length, 2);
    assert.equal(result.added, 2);
    assert.equal(result.state.uploadsPlaylistId, 'UUaaaaaaaaaaaaaaaaaaaaaa');
  });

  it('reports a missing channel as an error and stores nothing', async () => {
    const provider = new FakeProvider({
      channel: () => new YouTubeProviderError('CHANNEL_NOT_FOUND', 'That channel could not be found.', false),
    });
    const result = await fetchWith(provider);

    assert.equal(result.error?.code, 'CHANNEL_NOT_FOUND');
    assert.equal(result.error?.retryable, false);
    assert.equal(result.videos.length, 0);
    assert.equal(result.added, 0);
  });

  it('does not re-read metadata for a later page', async () => {
    const provider = new FakeProvider({
      channel: () => channel(),
      videos: () => ({ channelId: channelA, videos: [video(2)] }),
    });
    await fetchWith(provider, {
      mode: 'more',
      state: { ...emptyChannelSyncState(channelA), uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa', nextPageToken: 'PAGE2' },
    });
    assert.equal(provider.calls.filter((call) => call.method === 'getChannel').length, 0);
  });

  it('re-reads metadata on a refresh so a renamed channel heals', async () => {
    const provider = new FakeProvider({
      channel: () => channel({ name: 'Story Time Renamed' }),
      videos: () => ({ channelId: channelA, videos: [] }),
    });
    const result = await fetchWith(provider, {
      mode: 'refresh',
      state: { ...emptyChannelSyncState(channelA), uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa' },
    });
    assert.equal(result.metadata?.name, 'Story Time Renamed');
  });
});

describe('pagination (§6)', () => {
  it('passes the stored token for load more and no token for a first load', async () => {
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [] }) });

    await fetchWith(provider, {
      state: { ...emptyChannelSyncState(channelA), nextPageToken: 'PAGE2', uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa' },
    });
    const firstCall = provider.calls.find((call) => call.method === 'getChannelVideos');
    assert.deepEqual(firstCall?.args[1], { pageToken: undefined });

    provider.calls.length = 0;
    await fetchWith(provider, {
      mode: 'more',
      state: { ...emptyChannelSyncState(channelA), nextPageToken: 'PAGE2', uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa' },
    });
    const moreCall = provider.calls.find((call) => call.method === 'getChannelVideos');
    assert.deepEqual(moreCall?.args[1], { pageToken: 'PAGE2' });
  });

  it('stops advertising more once the provider runs out of pages', async () => {
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [video(0)] }) });
    const result = await fetchWith(provider);
    assert.equal(result.state.nextPageToken, undefined);
  });

  it('carries the token forward when there are more pages', async () => {
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [video(0)], nextPageToken: 'PAGE2' }) });
    const result = await fetchWith(provider);
    assert.equal(result.state.nextPageToken, 'PAGE2');
  });

  it('appends the next page to what is already stored', async () => {
    const existing = [syncedVideo(videoIds[0]), syncedVideo(videoIds[1])];
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [video(2)] }) });
    const result = await fetchWith(provider, {
      mode: 'more',
      existingVideos: existing,
      state: { ...emptyChannelSyncState(channelA), nextPageToken: 'PAGE2', uploadsPlaylistId: 'UUaaaaaaaaaaaaaaaaaaaaaa' },
    });
    assert.equal(result.videos.length, 3);
    assert.equal(result.added, 1);
  });
});

describe('duplicates and refresh (§5, §6)', () => {
  it('does not duplicate a video across a refresh', async () => {
    const existing = [syncedVideo(videoIds[0]), syncedVideo(videoIds[1])];
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [video(0), video(1)] }) });
    const result = await fetchWith(provider, { mode: 'refresh', existingVideos: existing });

    assert.equal(result.videos.length, 2);
    assert.equal(result.added, 0);
    assert.equal(result.updated, 2);
  });

  it('updates the library when a refresh returns a new video', async () => {
    const existing = [syncedVideo(videoIds[0])];
    const provider = new FakeProvider({ videos: () => ({ channelId: channelA, videos: [video(0), video(3)] }) });
    const result = await fetchWith(provider, { mode: 'refresh', existingVideos: existing });

    assert.equal(result.videos.length, 2);
    assert.equal(result.added, 1);
    assert.ok(result.videos.some((item) => item.youtubeVideoId === videoIds[3]));
  });

  it('does not let a provider hand back videos belonging to another channel', async () => {
    // A provider that mislabels a video must not be able to attach it to a different
    // approved channel, so the row is pinned to the channel the parent approved.
    const provider = new FakeProvider({
      videos: () => ({ channelId: channelA, videos: [video(0, channelB)] }),
    });
    const result = await fetchWith(provider);
    assert.equal(result.videos.length, 1);
    assert.equal(result.videos[0].channelId, channelA);
    assert.equal(result.state.videoCount, 1);
  });
});

describe('failure handling (§13)', () => {
  it('keeps every cached video when the provider is unavailable', async () => {
    const existing = [syncedVideo(videoIds[0]), syncedVideo(videoIds[1]), syncedVideo(videoIds[2])];
    const provider = new FakeProvider({ videos: () => new YouTubeProviderError('NETWORK', 'Could not reach the metadata provider.') });
    const result = await fetchWith(provider, { mode: 'refresh', existingVideos: existing });

    assert.ok(result.error);
    assert.equal(result.error?.code, 'NETWORK');
    assert.deepEqual(result.videos, existing);
    assert.equal(result.added, 0);
    assert.equal(result.updated, 0);
  });

  it('still keeps the video count in the sync state so the UI can say "saved"', async () => {
    const existing = [syncedVideo(videoIds[0]), syncedVideo(videoIds[1])];
    const provider = new FakeProvider({ videos: () => new YouTubeProviderError('QUOTA_EXCEEDED', 'Quota used up.', false) });
    const result = await fetchWith(provider, {
      mode: 'refresh',
      existingVideos: existing,
      state: { ...emptyChannelSyncState(channelA), videoCount: 2, fetchedAt: now.toISOString() },
    });

    assert.equal(result.error?.code, 'QUOTA_EXCEEDED');
    assert.equal(result.state.videoCount, 2);
    assert.equal(result.state.lastError?.code, 'QUOTA_EXCEEDED');
  });

  it('records the attempt so the next one can back off', async () => {
    const provider = new FakeProvider({ videos: () => new Error('boom') });
    const result = await fetchWith(provider);
    assert.equal(result.state.lastAttemptAt, now.toISOString());
    assert.equal(result.error?.code, 'UNKNOWN');
  });

  it('treats a terminal error as not worth retrying', async () => {
    const provider = new FakeProvider({
      channel: () => new YouTubeProviderError('CHANNEL_NOT_FOUND', 'gone', false),
    });
    const result = await fetchWith(provider);
    assert.equal(result.error?.retryable, false);
  });

  it('survives a provider that returns a malformed page', async () => {
    const provider = new FakeProvider({
      videos: () => new YouTubeProviderError('MALFORMED_RESPONSE', 'unexpected', true),
    });
    const result = await fetchWith(provider, { existingVideos: [syncedVideo(videoIds[0])] });
    assert.equal(result.error?.code, 'MALFORMED_RESPONSE');
    assert.equal(result.videos.length, 1);
  });
});
