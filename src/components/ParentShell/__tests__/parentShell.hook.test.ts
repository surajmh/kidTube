import assert from 'node:assert/strict';
import { act, renderHook } from '@testing-library/react-native';
import { ApprovedChannel } from '../../../types';
import type { ChannelSyncState } from '../../../services/content/channelSyncRules.type';
import { useParentShell } from '../parentShell.hook';
import { ParentShellActions, ParentShellData } from '../parentShell.type';

const channelId = 'UCaaaaaaaaaaaaaaaaaaaaaa';
const blender: ApprovedChannel = { id: 'c1', name: 'Blender', channelId, approved: true };

/** A scroll event positioned `remaining` pixels from the bottom. */
function scrollEvent(remaining: number) {
  return {
    nativeEvent: {
      layoutMeasurement: { height: 800 },
      contentOffset: { y: 1000 },
      contentSize: { height: 1800 + remaining },
    },
  } as never;
}

type Input = Parameters<typeof useParentShell>[0];

function setup(options: { token?: string; busy?: boolean; selected?: string | null } = {}) {
  const { token = 'token-1', busy = false, selected = channelId } = options;
  const onLoadMoreChannel = jest.fn();
  let currentToken = token;

  const data = { channels: [blender], requests: [] } as unknown as ParentShellData;
  const actions = {
    syncStateFor: (id: string): ChannelSyncState | undefined =>
      id === channelId
        ? ({ channelId, pagesFetched: 1, videoCount: 30, nextPageToken: currentToken } as ChannelSyncState)
        : undefined,
    channelBusy: () => busy,
    onLoadMoreChannel,
  } as unknown as ParentShellActions;

  const props: Input = { data, actions, section: 'channels', selectedChannelId: selected };
  const view = renderHook((next: Input) => useParentShell(next), { initialProps: props });
  return { ...view, onLoadMoreChannel, advanceToken: (next: string) => { currentToken = next; } };
}

describe('useParentShell', () => {
  it('derives the page and mode from the section', () => {
    const { result } = setup();
    assert.equal(result.current.contentPage, true);
    assert.equal(result.current.contentMode, 'channels');
  });

  it('fetches the next page when the parent nears the bottom', () => {
    const { result, onLoadMoreChannel } = setup();
    act(() => result.current.handleScroll(scrollEvent(100)));
    expect(onLoadMoreChannel).toHaveBeenCalledTimes(1);
    expect(onLoadMoreChannel).toHaveBeenCalledWith(blender);
  });

  it('does nothing while far from the bottom', () => {
    const { result, onLoadMoreChannel } = setup();
    act(() => result.current.handleScroll(scrollEvent(3000)));
    expect(onLoadMoreChannel).not.toHaveBeenCalled();
  });

  it('requests a page only once for a burst of scroll events', () => {
    // This is the whole point of the token guard: scrolling fires continuously, and the first
    // response has not landed yet, so the token has not moved on.
    const { result, onLoadMoreChannel } = setup();
    act(() => {
      result.current.handleScroll(scrollEvent(100));
      result.current.handleScroll(scrollEvent(80));
      result.current.handleScroll(scrollEvent(40));
    });
    expect(onLoadMoreChannel).toHaveBeenCalledTimes(1);
  });

  it('requests again once the token has moved on', () => {
    const { result, onLoadMoreChannel, advanceToken } = setup();
    act(() => result.current.handleScroll(scrollEvent(100)));
    advanceToken('token-2');
    act(() => result.current.handleScroll(scrollEvent(100)));
    expect(onLoadMoreChannel).toHaveBeenCalledTimes(2);
  });

  it('does nothing while a fetch is already running', () => {
    const { result, onLoadMoreChannel } = setup({ busy: true });
    act(() => result.current.handleScroll(scrollEvent(100)));
    expect(onLoadMoreChannel).not.toHaveBeenCalled();
  });

  it('does nothing when no channel page is open', () => {
    const { result, onLoadMoreChannel } = setup({ selected: null });
    act(() => result.current.handleScroll(scrollEvent(100)));
    expect(onLoadMoreChannel).not.toHaveBeenCalled();
  });
});
