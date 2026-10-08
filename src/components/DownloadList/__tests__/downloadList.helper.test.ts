import assert from 'node:assert/strict';
import type { SavedVideo } from '../../../services/downloadService.type';
import type { ApprovedVideo } from '../../../types';
import { durationLabel, entriesFor, formatExpiry, formatSize, ringSvgUri, rowMeta, sortEntries, thumbnailFor } from '../downloadList.helper';

const day = 86_400_000;
const now = 1_800_000_000_000;
const item = (videoId: string, state: SavedVideo['state'] = 'ready', over: Partial<SavedVideo> = {}): SavedVideo => ({ videoId, state, expiresAt: now + 7 * day, bytes: 50 * 1048576, percent: 40, ...over });
const video = (id: string, title = id): ApprovedVideo => ({ id, youtubeVideoId: id, title, approved: true });

describe('formatExpiry', () => {
  it('counts whole days, rounding up, then today, then expired', () => {
    assert.equal(formatExpiry(now + 3 * day, now), 'Expires in 3 days');
    assert.equal(formatExpiry(now + 2.2 * day, now), 'Expires in 3 days');
    assert.equal(formatExpiry(now + 1000, now), 'Expires today');
    assert.equal(formatExpiry(now - 1, now), 'Expired');
  });
});

describe('formatSize', () => {
  it('uses MB, GB, and a floor for tiny or missing sizes', () => {
    assert.equal(formatSize(52 * 1048576), '52 MB');
    assert.equal(formatSize(2.5 * 1048576), '2.5 MB');
    assert.equal(formatSize(1.5 * 1073741824), '1.5 GB');
    assert.equal(formatSize(1000), '<1 MB');
    assert.equal(formatSize(0), '0 MB');
  });
});

describe('rowMeta', () => {
  it('describes each state in kid-friendly words', () => {
    assert.equal(rowMeta(item('a'), now), '50 MB · Expires in 7 days');
    assert.equal(rowMeta(item('a', 'downloading'), now), 'Saving… 40%');
    assert.equal(rowMeta(item('a', 'preparing'), now), 'Getting ready…');
    assert.equal(rowMeta(item('a', 'failed'), now), "Couldn't save");
  });
});

describe('entriesFor', () => {
  it('drops files on their way out and expired ones; can require a known video', () => {
    const list = [item('a'), item('b', 'removing'), item('c', 'ready', { expiresAt: now - 1 }), item('d'), item('e', 'downloading')];
    const videos = [video('a'), video('e')];
    assert.deepEqual(entriesFor(list, videos, true, now).map((entry) => entry.item.videoId), ['a', 'e']);
    assert.deepEqual(entriesFor(list, videos, false, now).map((entry) => entry.item.videoId), ['a', 'd', 'e']);
  });
});

describe('sortEntries', () => {
  const entries = [
    { video: video('b', 'Banana'), item: item('b', 'ready', { bytes: 10, expiresAt: now + 2 * day }) },
    { video: video('a', 'apple'), item: item('a', 'ready', { bytes: 30, expiresAt: now + 3 * day }) },
    { video: video('c', 'Cherry'), item: item('c', 'ready', { bytes: 20, expiresAt: now + 1 * day }) },
  ];
  it('puts the newest save first, by name, or by size', () => {
    assert.deepEqual(sortEntries(entries, 'recent').map((entry) => entry.item.videoId), ['a', 'b', 'c']);
    assert.deepEqual(sortEntries(entries, 'name').map((entry) => entry.item.videoId), ['a', 'b', 'c']);
    assert.deepEqual(sortEntries(entries, 'size').map((entry) => entry.item.videoId), ['a', 'c', 'b']);
  });
  it('does not change the list it was given', () => {
    sortEntries(entries, 'size');
    assert.deepEqual(entries.map((entry) => entry.item.videoId), ['b', 'a', 'c']);
  });
});

describe('ringSvgUri', () => {
  const decode = (uri: string) => decodeURIComponent(uri.replace('data:image/svg+xml;utf8,', ''));
  it('draws the filled arc in proportion to the percent', () => {
    const circumference = 2 * Math.PI * 16;
    const half = decode(ringSvgUri(50));
    assert.match(half, new RegExp(`stroke-dasharray="${(circumference / 2).toFixed(2)} ${circumference.toFixed(2)}"`));
    assert.match(decode(ringSvgUri(0)), /stroke-dasharray="0\.00 /);
  });
  it('clamps nonsense percentages', () => {
    assert.equal(ringSvgUri(250), ringSvgUri(100));
    assert.equal(ringSvgUri(-5), ringSvgUri(0));
    assert.equal(ringSvgUri(Number.NaN), ringSvgUri(0));
  });
});

describe('thumbnailFor / durationLabel', () => {
  it('prefers the library thumbnail, else YouTube\'s', () => {
    assert.equal(thumbnailFor({ ...video('a'), thumbnailUrl: 'https://x/y.jpg' }, 'a'), 'https://x/y.jpg');
    assert.equal(thumbnailFor(undefined, 'abc'), 'https://i.ytimg.com/vi/abc/mqdefault.jpg');
  });
  it('formats lengths and hides unknown ones', () => {
    assert.equal(durationLabel(135), '2:15');
    assert.equal(durationLabel(3725), '1:02:05');
    assert.equal(durationLabel(undefined), null);
  });
});
