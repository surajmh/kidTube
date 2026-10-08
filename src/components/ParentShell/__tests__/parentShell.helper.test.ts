import assert from 'node:assert/strict';
import type { ContentRequest } from '../../../types';
import type { ScrollMetrics } from '../parentShell.type';
import {
  contentModeFor,
  distanceFromBottom,
  isContentPage,
  isNearBottom,
  pendingRequestCount,
  shouldLoadMore,
} from '../parentShell.helper';

/** Scrolled so that `remaining` pixels are left below the viewport. */
function metrics(remaining: number): ScrollMetrics {
  return {
    layoutMeasurement: { height: 800 },
    contentOffset: { y: 1000 },
    contentSize: { height: 1800 + remaining },
  };
}

describe('section routing', () => {
  it('treats the four content pages as the content panel', () => {
    for (const section of ['home', 'channels', 'videos', 'categories'] as const) {
      assert.equal(isContentPage(section), true, section);
    }
  });

  it('treats the standalone pages as their own', () => {
    for (const section of ['requests', 'children', 'activity', 'settings'] as const) {
      assert.equal(isContentPage(section), false, section);
    }
  });

  it('maps each content page to its mode, with home as the dashboard', () => {
    assert.equal(contentModeFor('channels'), 'channels');
    assert.equal(contentModeFor('videos'), 'videos');
    assert.equal(contentModeFor('categories'), 'categories');
    assert.equal(contentModeFor('home'), 'dashboard');
  });

  it('falls back to the dashboard for a non-content section', () => {
    assert.equal(contentModeFor('settings'), 'dashboard');
  });
});

describe('pendingRequestCount', () => {
  it('counts only pending requests', () => {
    const requests = [
      { status: 'pending' },
      { status: 'approved' },
      { status: 'pending' },
      { status: 'rejected' },
    ] as ContentRequest[];
    assert.equal(pendingRequestCount(requests), 2);
    assert.equal(pendingRequestCount([]), 0);
  });
});

describe('scroll geometry', () => {
  it('measures the distance still below the viewport', () => {
    assert.equal(distanceFromBottom(metrics(500)), 500);
  });

  it('is near the bottom within the threshold and not beyond it', () => {
    assert.equal(isNearBottom(metrics(500), 700), true);
    assert.equal(isNearBottom(metrics(700), 700), true, 'exactly at the threshold counts');
    assert.equal(isNearBottom(metrics(701), 700), false);
  });

  it('treats overscroll as being at the bottom', () => {
    assert.equal(isNearBottom(metrics(-50), 700), true);
  });
});

describe('shouldLoadMore', () => {
  const base = {
    selectedChannelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
    metrics: metrics(100),
    nextPageToken: 'token-1',
    busy: false,
    lastRequestedToken: null as string | null,
  };

  it('loads when near the bottom with a fresh token', () => {
    assert.equal(shouldLoadMore(base), true);
  });

  it('does nothing when no channel page is open', () => {
    assert.equal(shouldLoadMore({ ...base, selectedChannelId: null }), false);
  });

  it('does nothing while still far from the bottom', () => {
    assert.equal(shouldLoadMore({ ...base, metrics: metrics(2000) }), false);
  });

  it('does nothing once the channel is fully paged in', () => {
    assert.equal(shouldLoadMore({ ...base, nextPageToken: undefined }), false);
  });

  it('does nothing while a fetch is already running', () => {
    assert.equal(shouldLoadMore({ ...base, busy: true }), false);
  });

  it('does not request the same page twice for a burst of scroll events', () => {
    // Scroll events arrive in bursts; without the token guard the same page is requested
    // repeatedly before the first response lands.
    assert.equal(shouldLoadMore({ ...base, lastRequestedToken: 'token-1' }), false);
  });

  it('requests again once the token has moved on, meaning the previous page landed', () => {
    assert.equal(shouldLoadMore({ ...base, nextPageToken: 'token-2', lastRequestedToken: 'token-1' }), true);
  });
});
