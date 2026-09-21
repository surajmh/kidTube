import assert from 'node:assert/strict';
import { channelListState, isLoadingMore } from '../channelVideoList.helper';
import { formatDuration } from '../../shared/duration.helper';

describe('channelListState', () => {
  it('is ready with videos and no failure', () => {
    assert.equal(channelListState({ busy: false, videoCount: 30, hasError: false }), 'ready');
  });

  it('is loading only while there is nothing to show yet', () => {
    assert.equal(channelListState({ busy: true, videoCount: 0, hasError: false }), 'loading');
  });

  it('keeps showing cached videos while more are fetched', () => {
    // Collapsing to a spinner here would blank a list the parent is already reading.
    assert.equal(channelListState({ busy: true, videoCount: 30, hasError: false }), 'ready');
  });

  it('shows cached videos with a warning when a refresh fails', () => {
    // The central rule: a failed refresh must not discard what is already known.
    assert.equal(channelListState({ busy: false, videoCount: 30, hasError: true }), 'stale-with-cache');
  });

  it('is unavailable only when a failure leaves nothing cached', () => {
    assert.equal(channelListState({ busy: false, videoCount: 0, hasError: true }), 'unavailable');
  });

  it('never reports an errored channel as empty', () => {
    // "0 videos" would claim an approved channel holds nothing, which is a different statement
    // from "we could not read it".
    for (const videoCount of [0, 5]) {
      assert.notEqual(channelListState({ busy: false, videoCount, hasError: true }), 'empty');
    }
  });

  it('shows the retry in progress rather than the previous failure', () => {
    // Retrying after a failure with nothing cached: the spinner is the current truth, and
    // leaving the old error up would suggest the retry had already failed too.
    assert.equal(channelListState({ busy: true, videoCount: 0, hasError: true }), 'loading');
  });

  it('is empty only when there is no failure and nothing to show', () => {
    assert.equal(channelListState({ busy: false, videoCount: 0, hasError: false }), 'empty');
  });
});

describe('isLoadingMore', () => {
  it('is true only when fetching underneath an existing list', () => {
    assert.equal(isLoadingMore(true, 30), true);
    assert.equal(isLoadingMore(true, 0), false, 'that is the first load, not another page');
    assert.equal(isLoadingMore(false, 30), false);
  });
});

describe('shared formatDuration', () => {
  it('formats below and past an hour', () => {
    assert.equal(formatDuration(75), '1:15');
    assert.equal(formatDuration(3661), '1:01:01');
  });

  it('returns null for a missing duration so each caller picks its own placeholder', () => {
    // The two previous copies disagreed here: one returned an em dash, the other null.
    assert.equal(formatDuration(undefined), null);
    assert.equal(formatDuration(0), null);
  });
});
