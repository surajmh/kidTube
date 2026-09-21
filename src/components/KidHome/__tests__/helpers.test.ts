import assert from 'node:assert/strict';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import { ChannelSyncState } from '../../../services/content/channelSyncRules';
import {
  channelAvailability,
  formatDuration,
  monogramTint,
  searchLibrary,
  thumbnailUrls,
  videosForChannel,
  videosInCategory,
} from '../helpers';

const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';

function video(overrides: Partial<ApprovedVideo> = {}): ApprovedVideo {
  return {
    id: overrides.youtubeVideoId ?? 'v1',
    youtubeVideoId: 'vid00000001',
    title: 'A counting song',
    approved: true,
    ...overrides,
  };
}

function channel(overrides: Partial<ApprovedChannel> = {}): ApprovedChannel {
  return { id: 'c1', name: 'Numberblocks', channelId: channelA, approved: true, ...overrides };
}

function syncState(overrides: Partial<ChannelSyncState> = {}): ChannelSyncState {
  return { channelId: channelA, pagesFetched: 0, videoCount: 0, ...overrides };
}

describe('searchLibrary', () => {
  const videos = [
    video({ youtubeVideoId: 'vid00000001', title: 'A counting song' }),
    video({ youtubeVideoId: 'vid00000002', title: 'Alphabet time', channelName: 'Counting Club' }),
  ];
  const channels = [channel({ name: 'Numberblocks' })];

  it('returns nothing for an empty or whitespace query', () => {
    assert.deepEqual(searchLibrary(videos, channels, ''), { videos: [], channels: [] });
    assert.deepEqual(searchLibrary(videos, channels, '   '), { videos: [], channels: [] });
  });

  it('matches a video title regardless of case', () => {
    const found = searchLibrary(videos, channels, 'COUNTING');
    assert.equal(found.videos.length, 2, 'matches the title and the channel name');
  });

  it('matches a video by its channel name', () => {
    const found = searchLibrary(videos, channels, 'Counting Club');
    assert.deepEqual(found.videos.map((item) => item.youtubeVideoId), ['vid00000002']);
  });

  it('matches channels by name', () => {
    const found = searchLibrary(videos, channels, 'number');
    assert.deepEqual(found.channels.map((item) => item.name), ['Numberblocks']);
  });

  it('cannot surface anything outside the list it was given', () => {
    // The library handed in has already passed the access rules, so search can only narrow it.
    const found = searchLibrary([], channels, 'counting');
    assert.deepEqual(found.videos, []);
  });
});

describe('videosInCategory', () => {
  const videos = [
    video({ youtubeVideoId: 'vid00000001', categoryIds: ['music'] }),
    video({ youtubeVideoId: 'vid00000002', categoryIds: ['stories'] }),
    video({ youtubeVideoId: 'vid00000003' }),
  ];

  it('returns everything when no category is selected', () => {
    assert.equal(videosInCategory(videos, null).length, 3);
  });

  it('narrows to the selected category', () => {
    assert.deepEqual(videosInCategory(videos, 'music').map((v) => v.youtubeVideoId), ['vid00000001']);
  });

  it('excludes videos with no categories at all', () => {
    assert.equal(videosInCategory(videos, 'music').length, 1);
  });
});

describe('videosForChannel', () => {
  it('matches on channel id', () => {
    const videos = [video({ channelId: channelA }), video({ youtubeVideoId: 'other', channelId: 'UCzz' })];
    assert.equal(videosForChannel(videos, channel()).length, 1);
  });

  it('also matches on channel name, for rows added before the channel was approved', () => {
    const videos = [video({ channelName: 'Numberblocks' })];
    assert.equal(videosForChannel(videos, channel()).length, 1);
  });
});

describe('channelAvailability', () => {
  it('is ready once a fetch has succeeded', () => {
    assert.equal(channelAvailability(syncState({ fetchedAt: '2026-01-01T00:00:00Z' }), 3), 'ready');
  });

  it('keeps showing cached videos when a refresh failed', () => {
    const state = syncState({ fetchedAt: 'x', lastError: { code: 'NETWORK', message: 'no', at: 'x' } });
    assert.equal(channelAvailability(state, 5), 'stale-with-cache');
  });

  it('is unavailable only when a failure leaves nothing cached', () => {
    const state = syncState({ lastError: { code: 'NETWORK', message: 'no', at: 'x' } });
    assert.equal(channelAvailability(state, 0), 'unavailable');
  });

  it('distinguishes never-fetched from empty', () => {
    // "0 videos" would be a lie: an unloaded channel is unknown, not empty.
    assert.equal(channelAvailability(undefined, 0), 'not-loaded');
    assert.equal(channelAvailability(syncState(), 0), 'not-loaded');
  });
});

describe('formatDuration', () => {
  it('formats below an hour as m:ss', () => {
    assert.equal(formatDuration(75), '1:15');
    assert.equal(formatDuration(9), '0:09');
  });

  it('formats past an hour as h:mm:ss', () => {
    assert.equal(formatDuration(3661), '1:01:01');
  });

  it('returns null rather than a misleading zero', () => {
    assert.equal(formatDuration(undefined), null);
    assert.equal(formatDuration(0), null);
    assert.equal(formatDuration(-5), null);
    assert.equal(formatDuration(Number.NaN), null);
  });
});

describe('thumbnailUrls', () => {
  it('prefers a stored thumbnail when there is one', () => {
    const urls = thumbnailUrls({ youtubeVideoId: 'abc', thumbnailUrl: 'https://example.com/a.jpg' });
    assert.equal(urls.primary, 'https://example.com/a.jpg');
  });

  it('falls back to the CDN by video id', () => {
    const urls = thumbnailUrls({ youtubeVideoId: 'abc' });
    assert.equal(urls.primary, 'https://i.ytimg.com/vi/abc/hq720.jpg');
    assert.equal(urls.fallback, 'https://i.ytimg.com/vi/abc/mqdefault.jpg');
  });
});

describe('monogramTint', () => {
  const tints = ['#a', '#b', '#c'] as const;

  it('is stable for the same seed', () => {
    assert.equal(monogramTint('Blender', tints), monogramTint('Blender', tints));
  });

  it('always returns one of the supplied tints', () => {
    for (const seed of ['', 'a', 'Numberblocks', '????']) {
      assert.ok(tints.includes(monogramTint(seed, tints) as (typeof tints)[number]));
    }
  });
});
