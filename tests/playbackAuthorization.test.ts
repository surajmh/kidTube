import { playbackAuthorization } from '../src/services/playbackAuthorization';
import { playbackPolicy } from '../src/services/playbackPolicyService';
import { playbackOverrideService } from '../src/services/playbackOverrideService';
import { contentAccessService } from '../src/services/contentAccessService';
import { defaultPlaybackSettings } from '../src/constants/playback.constant';

const video = { id: 'v', youtubeVideoId: 'aaaaaaaaaaa', title: 'A', approved: true };
afterEach(() => jest.restoreAllMocks());
it('uses exact approval/override expiry and the first disallowed schedule minute', () => {
  const now = new Date(2026, 9, 9, 17, 59, 15);
  playbackPolicy.hydrate({ settings: { ...defaultPlaybackSettings, bedtimeEnabled: true, bedtimeStartMinutes: 18 * 60 }, screenTime: [], profiles: [{ id: 'kid' }] });
  playbackPolicy.setContentAccessResolver(() => 'allowed');
  playbackPolicy.setOverrideResolver(() => ({ additionalSeconds: 0, grantsScheduleAccess: false }));
  contentAccessService.hydrate({ approvals: [] }); playbackOverrideService.hydrate([]);
  expect(playbackAuthorization('kid', video, now).stopAt).toBe(new Date(2026, 9, 9, 18).getTime());
  const expiry = new Date(now.getTime() + 12_345);
  contentAccessService.hydrate({ approvals: [{ id: 'a', profileId: 'kid', target: { type: 'video', youtubeVideoId: video.youtubeVideoId }, duration: 'today', grantedAt: now.toISOString(), expiresAt: expiry.toISOString() }] });
  playbackPolicy.setContentAccessResolver((_profile, _input, at) => at! >= expiry ? 'expired' : 'allowed');
  expect(playbackAuthorization('kid', video, now).stopAt).toBe(expiry.getTime());
  expect(playbackAuthorization('kid', video, expiry).stopAt).toBe(expiry.getTime());
});

it('caps authorization at override expiry even if present usage would fit the base limit', () => {
  const now = new Date(2026, 9, 9, 12);
  const expiresAt = new Date(now.getTime() + 15 * 60_000);
  playbackPolicy.hydrate({ settings: defaultPlaybackSettings, screenTime: [], profiles: [{ id: 'kid' }] });
  playbackPolicy.setContentAccessResolver(() => 'allowed');
  playbackPolicy.setOverrideResolver(() => ({ additionalSeconds: 900, grantsScheduleAccess: false }));
  playbackOverrideService.hydrate([{ id: 'override', profileId: 'kid', additionalSeconds: 900,
    grantedAt: now.toISOString(), expiresAt: expiresAt.toISOString(), grantsScheduleAccess: false }]);
  contentAccessService.hydrate({ approvals: [] });
  expect(playbackAuthorization('kid', video, now).stopAt).toBe(expiresAt.getTime());
});

it('does not turn an irrelevant fifteen-minute parent override into an Unlimited playback deadline', () => {
  const now = new Date(2026, 9, 9, 12);
  const expiry = new Date(now.getTime() + 15 * 60_000);
  const midnight = new Date(2026, 9, 10).getTime();
  playbackPolicy.hydrate({ settings: { ...defaultPlaybackSettings, dailyLimitMinutes: null }, screenTime: [
    { profileId: 'kid', date: '2026-10-09', secondsWatched: 24 * 60 * 60 },
  ], profiles: [{ id: 'kid' }], profilePolicies: { kid: { dailyLimitMinutes: null } } });
  playbackPolicy.setContentAccessResolver(() => 'allowed');
  playbackOverrideService.hydrate([{ id: 'override', profileId: 'kid', additionalSeconds: 900,
    grantedAt: now.toISOString(), expiresAt: expiry.toISOString(), grantsScheduleAccess: false }]);
  playbackPolicy.setOverrideResolver((id, at) => ({ additionalSeconds: playbackOverrideService.additionalSeconds(id, at), grantsScheduleAccess: false }));
  contentAccessService.hydrate({ approvals: [] });
  expect(playbackAuthorization('kid', video, now).stopAt).toBe(midnight);
  expect(playbackAuthorization('kid', video, expiry).stopAt).toBe(midnight);
  expect(playbackPolicy.getRemainingSeconds('kid', expiry)).toBeNull();
  expect(playbackPolicy.canContinuePlayback('kid', expiry, { videoId: video.youtubeVideoId }).allowed).toBe(true);
  // Unlimited still respects a real bedtime boundary after the temporary schedule grant ends.
  playbackPolicy.setSettings({ ...defaultPlaybackSettings, dailyLimitMinutes: null, bedtimeEnabled: true, bedtimeStartMinutes: 12 * 60, bedtimeEndMinutes: 13 * 60 });
  playbackPolicy.setOverrideResolver((id, at) => ({ additionalSeconds: 900, grantsScheduleAccess: at < expiry }));
  expect(playbackAuthorization('kid', video, now).stopAt).toBe(expiry.getTime());
});
