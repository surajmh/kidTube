import { ChannelListState } from './channelVideoList.type';

/**
 * What the list should render, from the three inputs that decide it.
 *
 * This was inline branching spread across five JSX conditions, which made one rule easy to break
 * by accident: a failure that still has cached videos must show those videos with a warning, not
 * an error card, and never "0 videos".
 */
export function channelListState(input: {
  busy: boolean;
  videoCount: number;
  hasError: boolean;
}): ChannelListState {
  const { busy, videoCount, hasError } = input;
  // Busy only reads as loading when there is nothing to show yet; otherwise the cached list stays.
  if (busy && videoCount === 0) return 'loading';
  if (hasError) return videoCount > 0 ? 'stale-with-cache' : 'unavailable';
  if (videoCount === 0) return 'empty';
  return 'ready';
}

/** True while a further page is being fetched underneath an already-rendered list. */
export function isLoadingMore(busy: boolean, videoCount: number): boolean {
  return busy && videoCount > 0;
}
