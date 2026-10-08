import assert from 'node:assert/strict';
import { addOwner, downloadsFor, ownersOfKnownProfiles, parentDownloadRows, qualityChoices, reconcileOwners, removeOwner, removeProfile } from '../src/services/downloadService.helper';
import type { SavedVideo } from '../src/services/downloadService.type';
import type { ApprovedVideo } from '../src/types';

const file = (videoId: string): SavedVideo => ({ videoId, state: 'ready', expiresAt: 1, bytes: 1, percent: 100 });

it('addOwner is idempotent and does not mutate', () => {
  const start = { a: ['k1'] };
  assert.equal(addOwner(start, 'a', 'k1'), start);
  assert.deepEqual(addOwner(start, 'a', 'k2'), { a: ['k1', 'k2'] });
  assert.deepEqual(addOwner(start, 'b', 'k1'), { a: ['k1'], b: ['k1'] });
  assert.deepEqual(start, { a: ['k1'] });
});

it('removeOwner drops the entry with its last owner', () => {
  assert.deepEqual(removeOwner({ a: ['k1', 'k2'] }, 'a', 'k1'), { a: ['k2'] });
  assert.deepEqual(removeOwner({ a: ['k1'] }, 'a', 'k1'), {});
  assert.deepEqual(removeOwner({ a: ['k1'] }, 'zzz', 'k1'), { a: ['k1'] });
});

it('removeProfile reports orphaned videos', () => {
  const result = removeProfile({ a: ['k1'], b: ['k1', 'k2'], c: ['k2'] }, 'k1');
  assert.deepEqual(result.owners, { b: ['k2'], c: ['k2'] });
  assert.deepEqual(result.orphaned, ['a']);
});

it('ownersOfKnownProfiles forgets unknown children', () => {
  assert.deepEqual(ownersOfKnownProfiles({ a: ['k1', 'gone'], b: ['gone'] }, [{ id: 'k1' }]), { a: ['k1'] });
});

it('downloadsFor shows a child only their own', () => {
  const files = [file('a'), file('b')];
  assert.deepEqual(downloadsFor(files, { a: ['k1'], b: ['k2'] }, 'k1'), [files[0]]);
  assert.deepEqual(downloadsFor(files, { a: ['k1'] }, undefined), []);
});

describe('reconcileOwners', () => {
  it('gives legacy downloads with no owner to every child', () => {
    assert.deepEqual(reconcileOwners({}, [file('a')], ['k1', 'k2'], false), { a: ['k1', 'k2'] });
    assert.deepEqual(reconcileOwners({}, [file('a')], [], false), {});
  });
  it('prunes missing files only when asked', () => {
    assert.deepEqual(reconcileOwners({ gone: ['k1'] }, [], ['k1'], false), { gone: ['k1'] });
    assert.deepEqual(reconcileOwners({ gone: ['k1'] }, [], ['k1'], true), {});
  });
  it('returns the same object when nothing changed', () => {
    const owners = { a: ['k1'] };
    assert.equal(reconcileOwners(owners, [file('a')], ['k1'], true), owners);
  });
});

it('qualityChoices respects ceiling and real heights', () => {
  assert.deepEqual(qualityChoices(undefined, 360), [144, 240, 360]);
  assert.deepEqual(qualityChoices([], 240), [144, 240]);
  assert.deepEqual(qualityChoices([360, 720, 1080], 720), [360, 720]);
  assert.deepEqual(qualityChoices([1080], 360), [144, 240, 360]);
});

it('parentDownloadRows groups in child order and tolerates removed videos', () => {
  const video: ApprovedVideo = { id: 'a', youtubeVideoId: 'a', title: 'A', approved: true };
  const files = [file('a'), file('b')];
  const rows = parentDownloadRows(files, { a: ['k1', 'k2'], b: ['k2'] }, ['k2', 'k1'], [video]);
  assert.deepEqual(rows.map((row) => [row.profileId, row.item.videoId]), [['k2', 'a'], ['k2', 'b'], ['k1', 'a']]);
  assert.equal(rows[0].video, video);
  assert.equal(rows[1].video, undefined);
});
