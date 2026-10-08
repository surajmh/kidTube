import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { downloadService, downloadableVideos, savedVideos, SavedVideo, setNativeDownloadModule } from '../src/services/downloadService';
import { parentSessionService } from '../src/services/auth/parentSession';
import { contentAccessService } from '../src/services/contentAccessService';
import { whitelistService } from '../src/services/whitelistService';
import { kidContentLibraryService } from '../src/services/kidContentLibraryService';
import { defaultCategories, defaultChildContentRules } from '../src/parentalControlsTypes';
import { defaultPlaybackSettings } from '../src/playbackTypes';
import { localDayKey, PlaybackPolicyService } from '../src/services/playbackPolicyService';
import { SponsorBlockService } from '../src/services/sponsorBlockService';
import { ApprovedVideo } from '../src/types';

it('saving needs parent authorization and approval; saved bytes never grant child access', async () => {
  await AsyncStorage.clear();
  const a: ApprovedVideo = { id: 'a', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true };
  const b: ApprovedVideo = { id: 'b', youtubeVideoId: 'bbbbbbbbbbb', title: 'B', approved: false, candidate: true };
  const videos = [a, b];
  const profiles = [{ id: 'kid', name: 'Kid', avatar: '' }];
  whitelistService.setContent(videos, []);
  contentAccessService.hydrate({ approvals: [], rules: {} });
  const rows: SavedVideo[] = [{ videoId: a.youtubeVideoId, state: 'ready', expiresAt: Date.now() + 100_000, bytes: 100, percent: 100 }];
  const downloadVideo = jest.fn(async () => ({ accepted: true }));
  const authorization = jest.fn(async () => {});
  const removeDownload = jest.fn(async () => {});
  const clearDownloads = jest.fn(async () => {});
  setNativeDownloadModule({ getDownloads: async () => rows, downloadVideo, setDownloadAuthorization: authorization, removeDownload, clearDownloads });
  // Avoid a network request for the best-effort SponsorBlock cache fill.
  await AsyncStorage.setItem('@nestling/sponsorblock/aaaaaaaaaaa', JSON.stringify({ fetchedAt: Date.now(), segments: [] }));
  const session = parentSessionService.grant();
  try {
    assert.deepEqual(downloadableVideos(videos, profiles), [a]);
    const before = Date.now();
    await downloadService.save(session, a, videos, profiles, 360, 7);
    expect(authorization).toHaveBeenLastCalledWith([a.youtubeVideoId], session.expiresAt);
    expect(downloadVideo).toHaveBeenCalledTimes(1);
    const [id, height, expires] = (downloadVideo.mock.calls as unknown as [string, number, number][])[0];
    assert.equal(id, a.youtubeVideoId); assert.equal(height, 360);
    assert.ok(expires >= before + 7 * 86400_000 && expires <= Date.now() + 7 * 86400_000);
    await assert.rejects(downloadService.save(session, b, videos, profiles, 360, 7), /Approve this video/);
    await assert.rejects(downloadService.save(session, a, videos, profiles, 4000, 7), /valid download/);
    const allowed = () => kidContentLibraryService.build({ profileId: 'kid', videos, channels: [], categories: defaultCategories }).videos;
    assert.deepEqual(savedVideos(await downloadService.list(), allowed()), [a]);
    assert.deepEqual(savedVideos(rows, allowed(), rows[0].expiresAt), []);
    assert.deepEqual(savedVideos([{ ...rows[0], state: 'downloading' }], allowed()), []);
    contentAccessService.setRules({ kid: { ...defaultChildContentRules('kid'), blockedVideoIds: [a.youtubeVideoId] } });
    assert.deepEqual(savedVideos(rows, allowed()), []);
    await assert.rejects(downloadService.save(session, a, videos, profiles, 360, 7), /Approve this video/);
    await downloadService.remove(session, a.youtubeVideoId, videos, profiles);
    expect(removeDownload).toHaveBeenCalledWith(a.youtubeVideoId);
    parentSessionService.end();
    await downloadService.authorize(null, videos, profiles);
    expect(authorization).toHaveBeenLastCalledWith([], 0);
    await assert.rejects(downloadService.save(session, a, videos, profiles, 360, 7), /Parent PIN required/);
    await assert.rejects(downloadService.remove(session, a.youtubeVideoId, videos, profiles), /Parent PIN required/);
    await downloadService.clear();
    expect(clearDownloads).toHaveBeenCalledTimes(1);
  } finally {
    parentSessionService.end(); setNativeDownloadModule(null);
    contentAccessService.hydrate({ approvals: [], rules: {} }); whitelistService.setContent([], []);
  }
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
