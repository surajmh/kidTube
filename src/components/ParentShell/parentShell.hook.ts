import { useCallback, useMemo, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import {
  contentModeFor,
  isContentPage,
  pendingRequestCount,
  shouldLoadMore,
} from './parentShell.helper';
import { ParentShellProps } from './parentShell.type';

type UseParentShellInput = Pick<ParentShellProps, 'data' | 'actions' | 'section' | 'selectedChannelId'>;

/**
 * Shell derivation and the channel page's infinite scroll.
 *
 * The requested token lives in a ref rather than state on purpose: it must be readable and
 * writable within a single scroll event, and re-rendering on every scroll would defeat the point.
 */
export function useParentShell({ data, actions, section, selectedChannelId }: UseParentShellInput) {
  const requestedTokenRef = useRef<string | null>(null);

  const pendingCount = useMemo(() => pendingRequestCount(data.requests), [data.requests]);
  const contentPage = isContentPage(section);
  const contentMode = contentModeFor(section);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!selectedChannelId) return;
      const ready = shouldLoadMore({
        selectedChannelId,
        metrics: event.nativeEvent,
        nextPageToken: actions.syncStateFor(selectedChannelId)?.nextPageToken,
        busy: actions.channelBusy(selectedChannelId),
        lastRequestedToken: requestedTokenRef.current,
      });
      if (!ready) return;

      const channel = data.channels.find((item) => item.channelId === selectedChannelId);
      if (!channel) return;
      requestedTokenRef.current = actions.syncStateFor(selectedChannelId)?.nextPageToken ?? null;
      actions.onLoadMoreChannel(channel);
    },
    [actions, data.channels, selectedChannelId],
  );

  return { pendingCount, contentPage, contentMode, handleScroll };
}
