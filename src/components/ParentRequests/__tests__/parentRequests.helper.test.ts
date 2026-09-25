import assert from 'node:assert/strict';
import { ApprovedVideo, ChildProfile } from '../../../types';
import { ContentRequest } from '../../../parentalControlsTypes';
import { profileNameFor, splitByStatus, thumbnailFor, timeAgo } from '../parentRequests.helper';

const now = new Date('2026-02-01T12:00:00Z').getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();

describe('timeAgo', () => {
  it('says just now under a minute', () => {
    assert.equal(timeAgo(ago(20_000), now), 'just now');
  });

  it('counts minutes, then hours, then days', () => {
    assert.equal(timeAgo(ago(5 * 60_000), now), '5m ago');
    assert.equal(timeAgo(ago(3 * 3_600_000), now), '3h ago');
    assert.equal(timeAgo(ago(2 * 86_400_000), now), '2d ago');
  });

  it('switches unit at the boundaries rather than saying 60m or 24h', () => {
    assert.equal(timeAgo(ago(59 * 60_000), now), '59m ago');
    assert.equal(timeAgo(ago(60 * 60_000), now), '1h ago');
    assert.equal(timeAgo(ago(24 * 3_600_000), now), '1d ago');
  });
});

describe('splitByStatus', () => {
  const requests = [
    { id: 'r1', status: 'pending' },
    { id: 'r2', status: 'approved' },
    { id: 'r3', status: 'pending' },
    { id: 'r4', status: 'rejected' },
  ] as ContentRequest[];

  it('separates waiting from answered', () => {
    const { pending, resolved } = splitByStatus(requests);
    assert.deepEqual(pending.map((r) => r.id), ['r1', 'r3']);
    assert.deepEqual(resolved.map((r) => r.id), ['r2', 'r4']);
  });

  it('treats every non-pending status as resolved', () => {
    assert.equal(splitByStatus(requests).resolved.length, 2);
  });

  it('handles an empty list', () => {
    assert.deepEqual(splitByStatus([]), { pending: [], resolved: [] });
  });
});

describe('profileNameFor', () => {
  const profiles = [{ id: 'milo', name: 'Milo', avatar: 'sun' }] as ChildProfile[];

  it('finds the child', () => {
    assert.equal(profileNameFor(profiles, 'milo'), 'Milo');
  });

  it('falls back when the profile was deleted after the request was made', () => {
    assert.equal(profileNameFor(profiles, 'gone'), 'Child');
  });
});

describe('thumbnailFor', () => {
  const videos = [
    { id: 'v1', youtubeVideoId: 'abc', title: 'A', approved: true, thumbnailUrl: 'from-library' },
  ] as ApprovedVideo[];

  it('prefers the thumbnail captured with the request', () => {
    const request = { youtubeVideoId: 'abc', thumbnailUrl: 'from-request' } as ContentRequest;
    assert.equal(thumbnailFor(request, videos), 'from-request');
  });

  it('falls back to the library so a hand-typed request can still show artwork', () => {
    const request = { youtubeVideoId: 'abc' } as ContentRequest;
    assert.equal(thumbnailFor(request, videos), 'from-library');
  });

  it('is undefined when neither has one', () => {
    assert.equal(thumbnailFor({ youtubeVideoId: 'zzz' } as ContentRequest, videos), undefined);
  });
});
