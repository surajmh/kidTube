import assert from 'node:assert/strict';
import { repairLocalData } from '../src/services/dataIntegrityService';
import { defaultCategories } from '../src/constants/parentalControls.constant';
import { defaultPlaybackSettings } from '../src/constants/playback.constant';
import type { ApprovedVideo } from '../src/types';

const base = {
  profiles: [{ id: 'p1', name: 'Kid', avatar: 'sun' }],
  channels: [{ id: 'c1', name: 'Chan', channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa', approved: true }],
  categories: defaultCategories,
  requests: [],
  approvals: [],
  overrides: [],
  childRules: {},
  profilePolicies: {},
  history: [],
  screenTime: [],
  settings: defaultPlaybackSettings,
};

const video = (id: string, extra: object = {}) =>
  ({ id, youtubeVideoId: id.padEnd(11, 'x'), title: id, approved: false, ...extra }) as ApprovedVideo;

describe('rows saved by the removed content search', () => {
  it('drops unapproved candidates so an approved channel cannot make them playable', () => {
    const candidate = video('cand', { candidate: true, channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' });
    const approved = video('keep', { approved: true });
    const { snapshot, repairs, changed } = repairLocalData({ ...base, videos: [candidate, approved] });

    assert.deepEqual(snapshot.videos.map((item) => item.id), ['keep']);
    assert.ok(repairs.includes('removed items saved by the old content search'));
    assert.ok(changed.includes('videos'));
  });

  it('leaves ordinary unapproved rows, such as channel uploads, alone', () => {
    const upload = video('up', { syncedFromChannel: true, channelId: 'UCaaaaaaaaaaaaaaaaaaaaaa' });
    const { snapshot, repairs } = repairLocalData({ ...base, videos: [upload] });
    assert.equal(snapshot.videos.length, 1);
    assert.equal(repairs.length, 0);
  });
});
