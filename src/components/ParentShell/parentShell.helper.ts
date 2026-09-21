import { ContentRequest } from '../../phase4Types';
import { ParentContentMode, ParentSection } from './parentShell.type';
import { NEAR_BOTTOM_THRESHOLD } from './parentShell.constant';

/** The scroll geometry a near-bottom check needs, matching NativeScrollEvent's shape. */
export type ScrollMetrics = {
  layoutMeasurement: { height: number };
  contentOffset: { y: number };
  contentSize: { height: number };
};

/** Sections that render the content panel rather than a standalone page. */
export function isContentPage(section: ParentSection): boolean {
  return section === 'home' || section === 'channels' || section === 'videos' || section === 'categories';
}

/** Which page the content panel should render for a section. */
export function contentModeFor(section: ParentSection): ParentContentMode {
  if (section === 'channels') return 'channels';
  if (section === 'videos') return 'videos';
  if (section === 'categories') return 'categories';
  return 'dashboard';
}

export function pendingRequestCount(requests: ContentRequest[]): number {
  return requests.filter((request) => request.status === 'pending').length;
}

/** Distance in pixels from the bottom of the scrollable content. */
export function distanceFromBottom(metrics: ScrollMetrics): number {
  return metrics.contentSize.height - (metrics.contentOffset.y + metrics.layoutMeasurement.height);
}

export function isNearBottom(metrics: ScrollMetrics, threshold = NEAR_BOTTOM_THRESHOLD): boolean {
  return distanceFromBottom(metrics) <= threshold;
}

/**
 * Whether a scroll should trigger the next page of a channel's uploads.
 *
 * The page token is the guard: scroll events arrive in bursts, and without it the same page
 * would be requested many times over. Requesting again is only correct once the token has moved
 * on, which means the previous page actually landed.
 */
export function shouldLoadMore(input: {
  selectedChannelId: string | null;
  metrics: ScrollMetrics;
  nextPageToken?: string;
  busy: boolean;
  lastRequestedToken: string | null;
  threshold?: number;
}): boolean {
  const { selectedChannelId, metrics, nextPageToken, busy, lastRequestedToken, threshold } = input;
  if (!selectedChannelId) return false;
  if (!isNearBottom(metrics, threshold)) return false;
  // No token means the channel is fully paged in.
  if (!nextPageToken) return false;
  if (busy) return false;
  return lastRequestedToken !== nextPageToken;
}
