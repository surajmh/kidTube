import assert from 'node:assert/strict';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import { ContentCandidate } from '../../../phase4Types';
import { useParentContent } from '../parentContent.hook';
import { PARENT_CONTENT_COPY } from '../parentContent.constant';

const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';

function video(id: string, overrides: Partial<ApprovedVideo> = {}): ApprovedVideo {
  return { id, youtubeVideoId: id, title: `Video ${id}`, approved: true, ...overrides };
}

const channels: ApprovedChannel[] = [
  { id: 'c1', name: 'Numberblocks', channelId: channelA, approved: true },
];

function candidate(title = 'Video abc'): ContentCandidate {
  return { type: 'video', title, youtubeVideoId: 'abc', source: 'link', alreadyKnown: false };
}

type Input = Parameters<typeof useParentContent>[0];

function setup(overrides: Partial<Input> = {}) {
  const onSearch = jest.fn<Promise<ContentCandidate[]>, [string]>(async () => [candidate()]);
  const props: Input = {
    videos: [video('a', { title: 'Counting song' }), video('b', { title: 'Alphabet time' })],
    channels,
    mode: 'channels',
    selectedChannelId: null,
    accessFor: () => true,
    onSearch,
    ...overrides,
  };
  const view = renderHook((next: Input) => useParentContent(next), { initialProps: props });
  return { ...view, onSearch };
}

describe('useParentContent', () => {
  it('derives the tab from the page, defaulting to channels', () => {
    assert.equal(setup({ mode: 'videos' }).result.current.tab, 'videos');
    assert.equal(setup({ mode: 'categories' }).result.current.tab, 'categories');
    assert.equal(setup({ mode: 'dashboard' }).result.current.tab, 'channels');
  });

  it('starts unfiltered and narrows as filters are applied', () => {
    const { result } = setup();
    assert.equal(result.current.filteredVideos.length, 2);
    act(() => result.current.setFilters({ query: 'counting', childId: null, categoryId: null }));
    assert.deepEqual(result.current.filteredVideos.map((v) => v.id), ['a']);
  });

  it('resolves the selected channel', () => {
    const { result } = setup({ selectedChannelId: channelA });
    assert.equal(result.current.selectedChannel?.name, 'Numberblocks');
    assert.equal(setup().result.current.selectedChannel, undefined);
  });

  it('shows recently added from whichever list the page is about', () => {
    assert.equal(setup({ mode: 'channels' }).result.current.recentlyAdded.length, 1);
    assert.equal(setup({ mode: 'videos' }).result.current.recentlyAdded.length, 2);
  });

  it('opens and closes the filter drawer', () => {
    const { result } = setup();
    assert.equal(result.current.filtersOpen, false);
    act(() => result.current.openFilters());
    assert.equal(result.current.filtersOpen, true);
    act(() => result.current.closeFilters());
    assert.equal(result.current.filtersOpen, false);
  });

  it('toggles an expanded row, and only one at a time', () => {
    const { result } = setup();
    act(() => result.current.toggleExpanded('c1'));
    assert.equal(result.current.expandedId, 'c1');
    act(() => result.current.toggleExpanded('c2'));
    assert.equal(result.current.expandedId, 'c2');
    act(() => result.current.toggleExpanded('c2'));
    assert.equal(result.current.expandedId, null);
  });

  it('stores search results', async () => {
    const { result } = setup();
    act(() => result.current.setSearchQuery('https://youtube.com/watch?v=abc'));
    await act(async () => {
      await result.current.runSearch();
    });
    assert.equal(result.current.results?.length, 1);
    assert.equal(result.current.searchError, '');
  });

  it('explains an empty result rather than showing nothing', async () => {
    const { result, onSearch } = setup();
    onSearch.mockResolvedValueOnce([]);
    await act(async () => {
      await result.current.runSearch();
    });
    assert.equal(result.current.searchError, PARENT_CONTENT_COPY.noIdFound);
  });

  it('clears results when a lookup fails, so nothing stale stays approvable', async () => {
    const { result, onSearch } = setup();
    await act(async () => {
      await result.current.runSearch();
    });
    assert.equal(result.current.results?.length, 1);

    onSearch.mockRejectedValueOnce(new Error('provider unavailable'));
    await act(async () => {
      await result.current.runSearch();
    });
    assert.equal(result.current.results, null);
    assert.equal(result.current.searchError, 'provider unavailable');
  });

  it('clears the busy flag even when the lookup throws', async () => {
    const { result, onSearch } = setup();
    onSearch.mockRejectedValueOnce(new Error('nope'));
    await act(async () => {
      await result.current.runSearch();
    });
    await waitFor(() => assert.equal(result.current.searching, false));
  });

  it('applies an edited title to a candidate', () => {
    const { result } = setup();
    const item = candidate();
    assert.equal(result.current.titled(item).title, 'Video abc');
    act(() => result.current.setResultTitle(item, 'Counting song'));
    assert.equal(result.current.titled(item).title, 'Counting song');
  });

  it('keeps filtered lists stable when unrelated state changes', () => {
    const { result } = setup();
    const before = result.current.filteredVideos;
    act(() => result.current.openFilters());
    assert.equal(result.current.filteredVideos, before, 'opening the drawer must not re-filter');
  });
});
