import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../src/store/appStore';
import { downloadService, savedVideos, setNativeDownloadModule } from '../src/services/downloadService';
import type { SavedVideo } from '../src/services/downloadService.type';
import { parentSessionService } from '../src/services/auth/parentSession';
import { contentAccessService } from '../src/services/contentAccessService';
import { whitelistService } from '../src/services/whitelistService';
import { kidContentLibraryService } from '../src/services/kidContentLibraryService';
import { defaultCategories } from '../src/constants/parentalControls.constant';
import { defaultChildContentRules } from '../src/utils/parentalControls.helper';
import { defaultPlaybackSettings } from '../src/constants/playback.constant';
import { localDayKey, PlaybackPolicyService } from '../src/services/playbackPolicyService';
import { SponsorBlockService } from '../src/services/sponsorBlockService';
import { ApprovedVideo } from '../src/types';

const A: ApprovedVideo = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true };
const B: ApprovedVideo = { id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'B', approved: false };

function fakeModule(rows: SavedVideo[] = [], heights?: number[]) {
  const fake = {
    getDownloads: jest.fn(async () => rows),
    downloadVideo: jest.fn(async () => ({ accepted: true })),
    setDownloadAuthorization: jest.fn(async () => {}),
    setParentAuthorization: jest.fn(async () => {}),
    getDownloadOptions: jest.fn(async () => ({ heights })),
    removeDownload: jest.fn(async () => {}),
    clearDownloads: jest.fn(async () => {}),
  };
  setNativeDownloadModule(fake);
  return fake;
}
const owners = () => useAppStore.getState().downloadOwners;

describe('child downloads', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useAppStore.setState({ downloadOwners: {} });
    whitelistService.setContent([A, B], []);
    contentAccessService.hydrate({ approvals: [], rules: {} });
    // Avoid a network request for the best-effort SponsorBlock cache fill.
    await AsyncStorage.setItem('@nestling/sponsorblock/aaaaaaaaaaa', JSON.stringify({ fetchedAt: Date.now(), segments: [] }));
  });
  afterEach(() => {
    parentSessionService.end(); setNativeDownloadModule(null);
    contentAccessService.hydrate({ approvals: [], rules: {} }); whitelistService.setContent([], []);
    useAppStore.setState({ downloadOwners: {} });
  });
  const settings = { ...defaultPlaybackSettings, downloadsEnabled: true, downloadRetentionDays: 7 as const, maxQualityHeight: 480 };
  const save = (profileId: string, video = A, height = 360, override = {}) => downloadService.save({ profileId, video, height, settings: { ...settings, ...override } });

  it('a child saves an approved video, scoped and short-lived, and is recorded as owner', async () => {
    const fake = fakeModule();
    const before = Date.now();
    await save('kid');
    const [ids, authExpiry] = (fake.setDownloadAuthorization.mock.calls as unknown as [string[], number][])[0];
    assert.deepEqual(ids, [A.youtubeVideoId]);
    assert.ok(authExpiry > before && authExpiry <= Date.now() + 5 * 60_000);
    const [id, height, expires] = (fake.downloadVideo.mock.calls as unknown as [string, number, number][])[0];
    assert.equal(id, A.youtubeVideoId); assert.equal(height, 360);
    assert.ok(expires >= before + 7 * 86400_000 && expires <= Date.now() + 7 * 86400_000);
    assert.deepEqual(owners(), { [A.youtubeVideoId]: ['kid'] });
  });

  it('honours the 30 day retention setting', async () => {
    const fake = fakeModule();
    const before = Date.now();
    await save('kid', A, 360, { downloadRetentionDays: 30 });
    const expires = (fake.downloadVideo.mock.calls as unknown as [string, number, number][])[0][2];
    assert.ok(expires >= before + 30 * 86400_000 && expires <= Date.now() + 30 * 86400_000);
  });

  it('refuses when disabled, not allowed, above the ceiling or an invalid height', async () => {
    const fake = fakeModule();
    await assert.rejects(save('kid', A, 360, { downloadsEnabled: false }), /turned off/);
    await assert.rejects(save('kid', B), /not available/);
    contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), blockedVideoIds: [A.youtubeVideoId] } });
    await assert.rejects(save('kid'), /not available/);
    contentAccessService.setRules({});
    await assert.rejects(save('kid', A, 720), /valid download/);
    await assert.rejects(save('kid', A, 4000), /valid download/);
    await assert.rejects(save('kid', A, 333), /valid download/);
    expect(fake.downloadVideo).not.toHaveBeenCalled();
    assert.deepEqual(owners(), {});
  });

  it('a second child saving an existing video only adds a claim', async () => {
    const fake = fakeModule([{ videoId: A.youtubeVideoId, state: 'ready', expiresAt: Date.now() + 100_000, bytes: 1, percent: 100 }]);
    useAppStore.setState({ downloadOwners: { [A.youtubeVideoId]: ['kid'] } });
    await save('sibling');
    expect(fake.downloadVideo).not.toHaveBeenCalled();
    assert.deepEqual(owners(), { [A.youtubeVideoId]: ['kid', 'sibling'] });
  });

  it('removeForChild needs a parent session and keeps the file until the last owner leaves', async () => {
    const fake = fakeModule();
    useAppStore.setState({ downloadOwners: { [A.youtubeVideoId]: ['kid', 'sibling'] } });
    await assert.rejects(downloadService.removeForChild('kid', A.youtubeVideoId), /Parent PIN required/);
    assert.deepEqual(owners(), { [A.youtubeVideoId]: ['kid', 'sibling'] });
    parentSessionService.grant();
    await downloadService.removeForChild('kid', A.youtubeVideoId);
    assert.deepEqual(owners(), { [A.youtubeVideoId]: ['sibling'] });
    expect(fake.removeDownload).not.toHaveBeenCalled();
    await downloadService.removeForChild('sibling', A.youtubeVideoId);
    assert.deepEqual(owners(), {});
    expect(fake.removeDownload).toHaveBeenCalledWith(A.youtubeVideoId);
  });

  it('dropProfile removes only orphaned files; clear empties owners', async () => {
    const fake = fakeModule();
    useAppStore.setState({ downloadOwners: { [A.youtubeVideoId]: ['kid'], [B.youtubeVideoId]: ['kid', 'sibling'] } });
    await assert.rejects(downloadService.dropProfile('kid'), /Parent PIN required/);
    parentSessionService.grant();
    await downloadService.dropProfile('kid');
    assert.deepEqual(owners(), { [B.youtubeVideoId]: ['sibling'] });
    expect(fake.removeDownload).toHaveBeenCalledTimes(1);
    expect(fake.removeDownload).toHaveBeenCalledWith(A.youtubeVideoId);
    await downloadService.clear();
    assert.deepEqual(owners(), {});
    expect(fake.clearDownloads).toHaveBeenCalledTimes(1);
  });

  it('options use native heights and fall back to steps within the ceiling', async () => {
    fakeModule([], [144, 360, 720]);
    assert.deepEqual(await downloadService.options(A, 480), [144, 360]);
    fakeModule([], undefined);
    assert.deepEqual(await downloadService.options(A, 480), [144, 240, 360, 480]);
  });

  it('saved bytes never grant child access', async () => {
    const rows: SavedVideo[] = [{ videoId: A.youtubeVideoId, state: 'ready', expiresAt: Date.now() + 100_000, bytes: 100, percent: 100 }];
    fakeModule(rows);
    const allowed = () => kidContentLibraryService.build({ profileId: 'kid', videos: [A, B], channels: [], categories: defaultCategories }).videos;
    assert.deepEqual(savedVideos(await downloadService.list(), allowed()), [A]);
    assert.deepEqual(savedVideos(rows, allowed(), rows[0].expiresAt), []);
    assert.deepEqual(savedVideos([{ ...rows[0], state: 'downloading' }], allowed()), []);
    contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), blockedVideoIds: [A.youtubeVideoId] } });
    assert.deepEqual(savedVideos(rows, allowed()), []);
  });
});

it('continuing saved playback rechecks expiry, blocks, schedules and persisted viewing limits without fetching', async () => {
  const now = new Date();
  const video: ApprovedVideo = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: false, channelId: 'channel', categoryIds: ['learning'] };
  whitelistService.setContent([video], []);
  contentAccessService.hydrate({ rules: {}, approvals: [{ id: 'grant', profileId: 'kid', target: { type: 'video', youtubeVideoId: video.youtubeVideoId }, duration: 'today', grantedAt: now.toISOString(), expiresAt: new Date(now.getTime() + 1000).toISOString() }] });
  const policy = new PlaybackPolicyService();
  policy.setContentAccessResolver((profileId, input, date) => contentAccessService.evaluate(profileId, input, date));
  const input = { videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds };
  const hydrate = (settings = defaultPlaybackSettings, seconds = 0) => policy.hydrate({ settings, profiles: [{ id: 'kid' }], screenTime: [{ profileId: 'kid', date: localDayKey(now), secondsWatched: seconds }] });
  const fetchSpy = jest.spyOn(global, 'fetch');
  try {
    hydrate();
    assert.deepEqual(policy.canContinuePlayback('kid', now, input), { allowed: true });
    assert.deepEqual(policy.canContinuePlayback('kid', new Date(now.getTime() + 1000), input), { allowed: false, reason: 'APPROVAL_EXPIRED' });
    for (const rule of [{ blockedVideoIds: [video.youtubeVideoId] }, { blockedChannelIds: ['channel'] }, { blockedCategoryIds: ['learning'] }]) {
      contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), ...rule } });
      assert.equal(policy.canContinuePlayback('kid', now, input).allowed, false);
    }
    contentAccessService.setRules({});
    hydrate({ ...defaultPlaybackSettings, dailyLimitMinutes: 1 }, 60);
    assert.deepEqual(policy.canContinuePlayback('kid', now, input), { allowed: false, reason: 'SCREEN_TIME_EXCEEDED' });
    hydrate({ ...defaultPlaybackSettings, bedtimeEnabled: true, bedtimeStartMinutes: 0, bedtimeEndMinutes: 0 });
    assert.deepEqual(policy.canContinuePlayback('kid', now, input), { allowed: false, reason: 'BEDTIME' });
    hydrate({ ...defaultPlaybackSettings, allowedHoursEnabled: true, schedules: {} });
    assert.deepEqual(policy.canContinuePlayback('kid', now, input), { allowed: false, reason: 'OUTSIDE_ALLOWED_HOURS' });
    await AsyncStorage.setItem('@nestling/sponsorblock/aaaaaaaaaaa', JSON.stringify({ fetchedAt: 0, segments: [{ category: 'sponsor', start: 1, end: 3 }] }));
    const sponsor = new SponsorBlockService();
    assert.equal((await sponsor.getSkippableSegments(video.youtubeVideoId, ['sponsor'], true)).length, 1);
    assert.deepEqual(await sponsor.getSkippableSegments('missing', ['sponsor'], true), []);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore(); contentAccessService.hydrate({ approvals: [], rules: {} }); whitelistService.setContent([], []);
  }
});
