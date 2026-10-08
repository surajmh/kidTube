import assert from 'node:assert/strict';
import { act, renderHook } from '@testing-library/react-native';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import type { KidLibrary } from '../../../services/kidContentLibraryService.type';
import type { ChannelSyncState } from '../../../services/content/channelSyncRules.type';
import { useKidHome } from '../kidHome.hook';

const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';

function video(id: string, overrides: Partial<ApprovedVideo> = {}): ApprovedVideo {
  return { id, youtubeVideoId: id, title: `Video ${id}`, approved: true, ...overrides };
}

const blender: ApprovedChannel = { id: 'c1', name: 'Blender', channelId: channelA, approved: true };

function library(overrides: Partial<KidLibrary> = {}): KidLibrary {
  return {
    profileId: 'p1',
    categories: [],
    channels: [blender],
    videos: [video('a', { channelId: channelA, categoryIds: ['music'] }), video('b')],
    recentVideos: [video('a', { channelId: channelA })],
    askableVideos: [],
    askableChannels: [],
    ...overrides,
  };
}

type Input = Parameters<typeof useKidHome>[0];

function setup(overrides: Partial<Input> = {}) {
  const onTabChange = jest.fn();
  const onSelectChannel = jest.fn();
  const channelSyncStateFor = jest.fn<ChannelSyncState | undefined, [string]>(() => undefined);
  const props: Input = {
    library: library(),
    tab: 'home',
    onTabChange,
    selectedCategoryId: null,
    selectedChannelId: null,
    onSelectChannel,
    channelSyncStateFor,
    ...overrides,
  };
  const view = renderHook((next: Input) => useKidHome(next), { initialProps: props });
  return { ...view, onTabChange, onSelectChannel, channelSyncStateFor, props };
}

describe('useKidHome', () => {
  it('starts on the feed, not searching', () => {
    const { result } = setup();
    assert.equal(result.current.searching, false);
    assert.equal(result.current.onFeed, true);
    assert.equal(result.current.feedVideos.length, 2);
  });

  it('treats the categories tab as the feed, since chips are not a destination', () => {
    const { result } = setup({ tab: 'categories' });
    assert.equal(result.current.onFeed, true);
  });

  it('narrows the feed to a selected category', () => {
    const { result } = setup({ selectedCategoryId: 'music' });
    assert.deepEqual(result.current.feedVideos.map((v) => v.id), ['a']);
  });

  it('hides Keep watching while a category chip is applied', () => {
    assert.equal(setup().result.current.keepWatching.length, 1);
    assert.equal(setup({ selectedCategoryId: 'music' }).result.current.keepWatching.length, 0);
  });

  it('clears the query when search closes, so reopening starts clean', () => {
    jest.useFakeTimers();
    const { result } = setup();
    act(() => result.current.openSearch());
    act(() => result.current.setQuery('blender'));
    assert.equal(result.current.searching, true);
    // The search scan is debounced: it only runs once typing pauses.
    act(() => jest.advanceTimersByTime(250));
    assert.equal(result.current.results.channels.length, 1);

    act(() => result.current.closeSearch());
    assert.equal(result.current.searching, false);
    assert.equal(result.current.query, '');
    assert.deepEqual(result.current.results, { videos: [], channels: [] });
    jest.useRealTimers();
  });

  it('leaves search and lands on the channel page when a result is opened', () => {
    const { result, onSelectChannel, onTabChange } = setup();
    act(() => result.current.openSearch());
    act(() => result.current.setQuery('blender'));
    act(() => result.current.openChannelFromSearch(channelA));

    // Jest matchers for mocks: jest-expo runs tests in a separate VM realm, so node:assert's
    // strict deep equality fails the prototype check on cross-realm arrays even when they match.
    expect(onSelectChannel).toHaveBeenCalledTimes(1);
    expect(onSelectChannel).toHaveBeenCalledWith(channelA);
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('channels');
    assert.equal(result.current.searching, false);
    assert.equal(result.current.query, '');
  });

  it('closes search when the nav changes destination', () => {
    const { result, onTabChange } = setup();
    act(() => result.current.openSearch());
    act(() => result.current.changeTab('downloads'));
    assert.equal(result.current.searching, false);
    expect(onTabChange).toHaveBeenCalledTimes(1);
    expect(onTabChange).toHaveBeenCalledWith('downloads');
  });

  it('treats the downloads tab as home when downloads are turned off', () => {
    assert.equal(setup({ tab: 'downloads', downloadsEnabled: false }).result.current.tab, 'home');
    assert.equal(setup({ tab: 'downloads' }).result.current.tab, 'downloads');
  });

  it('toggles the profile switcher', () => {
    const { result } = setup();
    assert.equal(result.current.switcherOpen, false);
    act(() => result.current.toggleSwitcher());
    assert.equal(result.current.switcherOpen, true);
    act(() => result.current.closeSwitcher());
    assert.equal(result.current.switcherOpen, false);
  });

  it('resolves the selected channel and only its videos', () => {
    const { result } = setup({ selectedChannelId: channelA });
    assert.equal(result.current.selectedChannel?.name, 'Blender');
    assert.deepEqual(result.current.channelVideos.map((v) => v.id), ['a']);
  });

  it('reports a failed refresh that still has cached videos as stale, not unavailable', () => {
    const { result } = setup({
      selectedChannelId: channelA,
      channelSyncStateFor: () => ({
        channelId: channelA,
        pagesFetched: 1,
        videoCount: 1,
        fetchedAt: '2026-01-01T00:00:00Z',
        lastError: { code: 'NETWORK', message: 'no', at: '2026-01-01T00:00:00Z' },
      }),
    });
    assert.equal(result.current.availability, 'stale-with-cache');
  });

  it('keeps derived lists referentially stable when unrelated state changes', () => {
    const { result } = setup();
    const before = result.current.feedVideos;
    act(() => result.current.toggleSwitcher());
    assert.equal(result.current.feedVideos, before, 'opening the switcher must not re-filter the feed');
  });
});
