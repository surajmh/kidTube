import assert from 'node:assert/strict';
import { act, renderHook } from '@testing-library/react-native';
import { ApprovedChannel, ApprovedVideo } from '../../../types';
import { useParentContent } from '../parentContent.hook';

const channelA = 'UCaaaaaaaaaaaaaaaaaaaaaa';

function video(id: string, overrides: Partial<ApprovedVideo> = {}): ApprovedVideo {
  return { id, youtubeVideoId: id, title: `Video ${id}`, approved: true, ...overrides };
}

const channels: ApprovedChannel[] = [
  { id: 'c1', name: 'Numberblocks', channelId: channelA, approved: true },
];

type Input = Parameters<typeof useParentContent>[0];

function setup(overrides: Partial<Input> = {}) {
  const props: Input = {
    videos: [video('a', { title: 'Counting song' }), video('b', { title: 'Alphabet time' })],
    channels,
    mode: 'channels',
    selectedChannelId: null,
    accessFor: () => true,
    ...overrides,
  };
  const view = renderHook((next: Input) => useParentContent(next), { initialProps: props });
  return view;
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

  it('keeps filtered lists stable when unrelated state changes', () => {
    const { result } = setup();
    const before = result.current.filteredVideos;
    act(() => result.current.openFilters());
    assert.equal(result.current.filteredVideos, before, 'opening the drawer must not re-filter');
  });

  it('opens and closes the add form for the chosen kind', () => {
    const { result } = setup();
    assert.equal(result.current.adding, null);
    act(() => result.current.openAdd('video'));
    assert.equal(result.current.adding, 'video');
    act(() => result.current.closeAdd());
    assert.equal(result.current.adding, null);
  });

  it('switches the channel order between recent and A to Z', () => {
    const { result } = setup({ channels: [
      { id: 'c1', name: 'Zebra', channelId: 'UC1', approved: true },
      { id: 'c2', name: 'Apple', channelId: 'UC2', approved: true },
    ] });
    assert.deepEqual(result.current.filteredChannels.map((c) => c.name), ['Zebra', 'Apple']);
    act(() => result.current.toggleChannelSort());
    assert.equal(result.current.channelSort, 'name');
    assert.deepEqual(result.current.filteredChannels.map((c) => c.name), ['Apple', 'Zebra']);
  });
});
