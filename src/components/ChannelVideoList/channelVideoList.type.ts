import { ApprovedVideo } from '../../types';
import { ChannelSyncState } from '../../services/content/channelSyncRules';

/** Which audience the list is rendering for. Kid Mode gets no network controls. */
export type ChannelListVariant = 'parent' | 'kid';

/**
 * What the list should show right now.
 *
 * `stale-with-cache` is the one that matters: a failed refresh must keep every cached video on
 * screen rather than collapsing to an error, and must never render as "0 videos", which would
 * claim an approved channel is empty when it is not.
 */
export type ChannelListState = 'loading' | 'unavailable' | 'stale-with-cache' | 'empty' | 'ready';

export type ChannelVideoListProps = {
  videos: ApprovedVideo[];
  state?: ChannelSyncState;
  busy?: boolean;
  /** Set when the last fetch failed; the list still renders every cached video. */
  errorMessage?: string;
  canLoadMore: boolean;
  onRefresh?: () => void;
  onLoadMore?: () => void;
  onVideoPress?: (video: ApprovedVideo) => void;
  /** `kid` hides every network control and softens the copy. */
  variant: ChannelListVariant;
};
