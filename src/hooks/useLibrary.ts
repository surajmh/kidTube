import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { channelRepository } from '../repositories/channelRepository';
import { profileRepository } from '../repositories/profileRepository';
import { videoRepository } from '../repositories/videoRepository';
import { watchHistoryRepository } from '../repositories/watchHistoryRepository';
import {
  approvalRepository,
  categoryRepository,
  childRulesRepository,
  overrideRepository,
  profilePolicyRepository,
  requestRepository,
} from '../repositories/parentalControlsRepository';
import { channelSyncRepository, ChannelSyncMap } from '../repositories/channelSyncRepository';
import { channelSyncService } from '../services/channelSyncService';
import { SyncMode } from '../services/content/channelSyncRules';
import { ParentSession, parentSessionService } from '../services/auth/parentSession';
import { parentPinService } from '../services/auth/parentPinService';
import { whitelistService } from '../services/whitelistService';
import { contentAccessService } from '../services/contentAccessService';
import { approvalService } from '../services/approvalService';
import { categoryService } from '../services/categoryService';
import { ChildRulesMap, childRulesService } from '../services/childRulesService';
import { profilePolicyService, mergeProfilePolicy } from '../services/profilePolicyService';
import { OverridePreset, playbackOverrideService } from '../services/playbackOverrideService';
import { kidContentLibraryService } from '../services/kidContentLibraryService';
import { enrichLibrary } from '../services/content/nativeVideoMetadata';
import { parentContentSearchService } from '../services/parentContentSearchService';
import { parentContentService } from '../services/parentContentService';
import { requestService } from '../services/requestService';
import { playerAdapter } from '../services/playerAdapterInstance';
import { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from '../types';
import { PlaybackSettings, ScreenTimeUsage, defaultPlaybackSettings } from '../playbackTypes';
import {
  ContentApproval,
  ContentCandidate,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
  RequestType,
  defaultCategories,
} from '../parentalControlsTypes';
import { settingsRepository, screenTimeRepository } from '../repositories/playbackSettingsRepository';
import { playbackPolicy } from '../services/playbackPolicyService';
import { RepairableCollection, repairLocalData } from '../services/dataIntegrityService';
import { profileLifecycleService } from '../services/profileLifecycleService';
import { RequestDecisionInput } from '../components/ParentRequests';
import { id } from '../utils/id';

type Screen = 'kid' | 'parent' | 'player';

/**
 * The persisted-content domain: profiles, approved channels/videos, categories, per-child rules,
 * requests/approvals, overrides and playback settings — everything that survives a restart, plus
 * the derived Kid Mode view and the actions a parent uses to manage it.
 */
export function useLibrary({
  parentSession,
  screen,
  onOverrideGranted,
}: {
  parentSession: ParentSession | null;
  screen: Screen;
  onOverrideGranted: () => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [setupStep, setSetupStep] = useState<'pin' | 'profile' | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [channels, setChannels] = useState<ApprovedChannel[]>([]);
  const [videos, setVideos] = useState<ApprovedVideo[]>([]);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [playbackSettings, setPlaybackSettings] = useState<PlaybackSettings>(defaultPlaybackSettings);
  const [screenTimeUsage, setScreenTimeUsage] = useState<ScreenTimeUsage[]>([]);
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [approvals, setApprovals] = useState<ContentApproval[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>(defaultCategories);
  const [childRules, setChildRules] = useState<ChildRulesMap>({});
  const [profilePolicies, setProfilePolicies] = useState<Record<string, ProfilePolicyOverrides>>({});
  const [overrides, setOverrides] = useState<PlaybackOverride[]>([]);
  const [channelSyncStates, setChannelSyncStates] = useState<ChannelSyncMap>({});
  const [busyChannelIds, setBusyChannelIds] = useState<string[]>([]);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [repairNotice, setRepairNotice] = useState('');

  /**
   * Startup is two-phase:
   *   1. essential (PIN + child profiles) decides which mode to show, and nothing else blocks it;
   *   2. the library loads in the background, then is repaired before it is trusted.
   * Playback fails closed until phase 2 has hydrated the policy.
   */
  useEffect(() => {
    let cancelled = false;

    async function hydrateEssential() {
      // Only whether a PIN exists is read — the stored digest is never exposed to the UI layer.
      const [hasPin, storedProfiles] = await Promise.all([parentPinService.hasPin(), profileRepository.getAll()]);
      if (cancelled) return;

      const profiles = storedProfiles.filter((profile) => profile?.id?.trim());
      setSetupStep(hasPin ? (profiles.length ? null : 'profile') : 'pin');
      setProfiles(profiles);
      setActiveProfileId(profiles[0]?.id ?? '');
      setHydrated(true);
      void hydrateLibrary(profiles);
    }

    async function hydrateLibrary(profiles: ChildProfile[]) {
      const [
        storedChannels,
        storedVideos,
        storedHistory,
        storedSettings,
        storedScreenTime,
        storedRequests,
        storedApprovals,
        storedCategories,
        storedChildRules,
        storedPolicies,
        storedOverrides,
        storedChannelSync,
      ] = await Promise.all([
        channelRepository.getAll(),
        videoRepository.getAll(),
        watchHistoryRepository.getAll(),
        settingsRepository.get(),
        screenTimeRepository.getAll(),
        requestRepository.getAll(),
        approvalRepository.getAll(),
        categoryRepository.getAll(),
        childRulesRepository.getAll(),
        profilePolicyRepository.getAll(),
        overrideRepository.getAll(),
        channelSyncRepository.getAll(),
      ]);
      if (cancelled) return;

      // Repair before trusting: duplicates, orphans, impossible values and stale grants.
      const { snapshot, repairs, changed } = repairLocalData({
        profiles,
        videos: storedVideos,
        channels: storedChannels,
        categories: storedCategories,
        requests: storedRequests,
        approvals: storedApprovals,
        overrides: storedOverrides,
        childRules: storedChildRules,
        profilePolicies: storedPolicies,
        history: storedHistory,
        screenTime: storedScreenTime,
        settings: storedSettings,
        channelSync: storedChannelSync,
      });

      whitelistService.setContent(snapshot.videos, snapshot.channels);
      contentAccessService.hydrate({ rules: snapshot.childRules, approvals: snapshot.approvals });
      approvalService.hydrate(snapshot.approvals);
      categoryService.hydrate(snapshot.categories);
      childRulesService.hydrate(snapshot.childRules);
      profilePolicyService.hydrate(snapshot.profilePolicies);
      playbackOverrideService.hydrate(snapshot.overrides);
      channelSyncService.hydrate({ states: snapshot.channelSync });
      playbackPolicy.hydrate({
        settings: snapshot.settings,
        screenTime: snapshot.screenTime,
        profiles,
        profilePolicies: snapshot.profilePolicies,
      });

      if (repairs.length) {
        setRepairNotice(`Repaired local data: ${repairs.join(', ')}.`);
        // Only rewrite what actually changed; a repair in one collection used to
        // mean serialising all twelve on every cold start that found anything.
        const persist: Record<RepairableCollection, () => Promise<void>> = {
          profiles: () => profileRepository.saveAll(snapshot.profiles),
          videos: () => videoRepository.saveAll(snapshot.videos),
          channels: () => channelRepository.saveAll(snapshot.channels),
          categories: () => categoryRepository.saveAll(snapshot.categories),
          requests: () => requestRepository.saveAll(snapshot.requests),
          approvals: () => approvalRepository.saveAll(snapshot.approvals),
          overrides: () => overrideRepository.saveAll(snapshot.overrides),
          childRules: () => childRulesRepository.saveAll(snapshot.childRules),
          profilePolicies: () => profilePolicyRepository.saveAll(snapshot.profilePolicies),
          history: () => watchHistoryRepository.saveAll(snapshot.history),
          screenTime: () => screenTimeRepository.saveAll(snapshot.screenTime),
          channelSync: () => channelSyncRepository.saveAll(snapshot.channelSync),
        };
        await Promise.all(changed.map((collection) => persist[collection]()));
      }

      setChannels(snapshot.channels);
      setVideos(snapshot.videos);
      setHistory(snapshot.history);
      setPlaybackSettings(snapshot.settings);
      setScreenTimeUsage(snapshot.screenTime);
      setRequests(snapshot.requests);
      setApprovals(snapshot.approvals);
      setCategories(snapshot.categories);
      setChildRules(snapshot.childRules);
      setProfilePolicies(snapshot.profilePolicies);
      setOverrides(snapshot.overrides);
      setChannelSyncStates(snapshot.channelSync);
    }

    void hydrateEssential();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Keeps the access layer in step with React state synchronously, because the derived Kid Mode
   * library and decisions are computed from these services during the same render.
   *
   * The identity check matters: without it every render (including the player's own ticks) rebuilt
   * six maps. Reference equality is enough because each service is only re-hydrated when the array it
   * reads actually changed.
   */
  const accessHydrationRef = useRef<unknown[]>([]);
  const accessInputs: unknown[] = [videos, channels, childRules, approvals, categories, profilePolicies, overrides, channelSyncStates];
  if (
    accessHydrationRef.current.length !== accessInputs.length ||
    accessInputs.some((value, index) => value !== accessHydrationRef.current[index])
  ) {
    accessHydrationRef.current = accessInputs;
    whitelistService.setContent(videos, channels);
    contentAccessService.hydrate({ rules: childRules, approvals });
    approvalService.hydrate(approvals);
    categoryService.hydrate(categories);
    childRulesService.hydrate(childRules);
    profilePolicyService.hydrate(profilePolicies);
    playbackOverrideService.hydrate(overrides);
    channelSyncService.setStates(channelSyncStates);
  }

  useEffect(() => {
    playbackPolicy.setProfiles(profiles);
    playbackPolicy.setSettings(playbackSettings);
    playbackPolicy.setProfilePolicies(profilePolicies);
    playbackPolicy.setContentAccessResolver((profileId, input, now) => contentAccessService.evaluate(profileId, input, now));
    playbackPolicy.setOverrideResolver((profileId, now) => ({
      additionalSeconds: playbackOverrideService.additionalSeconds(profileId, now),
      grantsScheduleAccess: playbackOverrideService.grantsScheduleAccess(profileId, now),
    }));
  }, [profiles, playbackSettings, profilePolicies, childRules, approvals, overrides]);

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? profiles[0];
  const childRequests = useMemo(
    () => (activeProfile ? requests.filter((request) => request.profileId === activeProfile.id) : []),
    [requests, activeProfile],
  );
  const kidLibrary = useMemo(
    () =>
      kidContentLibraryService.build({
        profileId: activeProfile?.id ?? '',
        videos,
        channels,
        categories,
        history,
      }),
    [activeProfile?.id, videos, channels, categories, history, childRules, approvals],
  );
  const effectiveSettings = useMemo(
    () => mergeProfilePolicy(playbackSettings, activeProfile ? profilePolicies[activeProfile.id] : undefined),
    [playbackSettings, profilePolicies, activeProfile],
  );
  const accessFor = useCallback(
    (profileId: string, target: { videoId?: string; channelId?: string }) =>
      contentAccessService.evaluate(profileId, target) === 'allowed',
    [videos, channels, childRules, approvals],
  );

  /**
   * The native player's allow list.
   *
   * This is the content half of the decision (approval, child rules, categories) for the active
   * profile, pushed into the module so the decoder itself refuses anything else. Screen time, allowed
   * hours and bedtime stay in `PlaybackPolicy` because they change minute by minute; this list exists
   * so that a bridge call can never reach content the child is not approved for at all.
   */
  const nativeAllowedVideoIds = useMemo(
    () =>
      activeProfile
        ? videos
            .filter(
              (video) =>
                contentAccessService.evaluate(activeProfile.id, {
                  videoId: video.youtubeVideoId,
                  channelId: video.channelId,
                  categoryIds: video.categoryIds,
                }) === 'allowed',
            )
            .map((video) => video.youtubeVideoId)
        : [],
    // `evaluate` already decides approval, candidates and child rules, so the list must not
    // second-guess it: a video fetched from an approved channel is intentionally not
    // individually approved (`approved: false`) and has to stay playable.
    [activeProfile, videos, childRules, approvals],
  );

  useEffect(() => {
    // Fail closed: if this never lands, the native player refuses to start anything.
    try {
      void playerAdapter.setAllowedVideoIds(nativeAllowedVideoIds).catch(() => undefined);
    } catch {
      // A native build without the allow list keeps playback disabled rather than crashing the app.
    }
  }, [nativeAllowedVideoIds]);

  /**
   * Always-current view of the library for async work.
   *
   * Handlers that set state and then immediately kick off an await (approving a channel, then
   * syncing it) would otherwise write back the arrays captured before that state change.
   */
  const libraryRef = useRef({ videos, channels });
  libraryRef.current = { videos, channels };

  async function saveProfiles(next: ChildProfile[]) {
    if (!parentSession) return;
    const saved = await parentContentService.saveProfiles(parentSession, next);
    setProfiles(saved);
  }

  /** Deleting a child removes everything that belonged to that child. */
  async function deleteProfile(profile: ChildProfile) {
    if (!parentSession) return;
    const result = await profileLifecycleService.deleteProfile(parentSession, profile.id, {
      profiles,
      requests,
      approvals,
      overrides,
      childRules,
      profilePolicies,
      history,
      screenTime: screenTimeUsage,
    });
    setProfiles(result.profiles);
    setRequests(result.requests);
    setApprovals(result.approvals);
    setOverrides(result.overrides);
    setChildRules(result.childRules);
    setProfilePolicies(result.profilePolicies);
    setHistory(result.history);
    setScreenTimeUsage(result.screenTime);
    playbackPolicy.replaceRecords(result.screenTime);
    if (activeProfileId === profile.id) setActiveProfileId(result.profiles[0]?.id ?? '');
  }

  async function saveChannels(next: ApprovedChannel[]) {
    if (!parentSession) return;
    await parentContentService.replaceContent(parentSession, { videos, channels: next });
    setChannels(next);
  }

  async function saveVideos(next: ApprovedVideo[]) {
    if (!parentSession) return;
    await parentContentService.replaceContent(parentSession, { videos: next, channels });
    setVideos(next);
  }

  /**
   * Fills in titles, channels and durations for rows added by link, which carry only an id.
   *
   * Parent Mode only, on purpose: Kid Mode still issues no network calls of any kind. This is
   * metadata, so it cannot change what is approved — it only makes the library readable. A row
   * that cannot be described is left exactly as it was.
   */
  useEffect(() => {
    if (screen !== 'parent' || !parentSession) return;
    let cancelled = false;
    void (async () => {
      const enriched = await enrichLibrary(videos);
      if (cancelled || !enriched) return;
      await saveVideos(enriched);
    })();
    return () => {
      cancelled = true;
    };
    // `videos` settles: once nothing needs metadata, enrichLibrary returns null and no state changes.
  }, [screen, parentSession, videos]);

  async function savePlaybackSettings(next: PlaybackSettings) {
    if (!parentSession) return;
    await parentContentService.saveSettings(parentSession, next);
    setPlaybackSettings(next);
    playbackPolicy.setSettings(next);
  }

  async function consumePlaybackApproval(video: ApprovedVideo) {
    if (!activeProfile) return;
    const next = await approvalService.consumePlayback(activeProfile.id, video.youtubeVideoId, video.channelId);
    setApprovals(next);
  }

  async function submitKidRequest(input: {
    type: RequestType;
    title: string;
    videoId?: string;
    channelId?: string;
    thumbnailUrl?: string;
    channelName?: string;
  }) {
    if (!activeProfile) throw new Error('Choose a profile first.');
    const created = await requestService.submit(activeProfile.id, input, { videos, channels, requests });
    setRequests((current) => [created, ...current]);
  }

  async function decideRequest(input: RequestDecisionInput) {
    if (!parentSession) return;
    const result = await requestService.decide(parentSession, {
      request: input.request,
      decision: input.decision,
      profileId: input.profileId,
      duration: input.duration,
      requests,
      videos,
      channels,
    });
    setRequests(result.requests);
    setApprovals(result.approvals);
    setVideos(result.videos);
    setChannels(result.channels);
  }

  async function deleteRequest(requestId: string) {
    if (!parentSession) return;
    setRequests(await requestService.deleteRequest(parentSession, requestId, requests));
  }

  async function clearResolvedRequests() {
    if (!parentSession) return;
    setRequests(await requestService.clearResolved(parentSession, requests));
  }

  async function searchContent(query: string) {
    if (!parentSession) throw new Error('Parent mode is required.');
    return parentContentSearchService.search(parentSession, query, { videos, channels });
  }

  async function saveCandidate(candidate: ContentCandidate) {
    if (!parentSession) return;
    parentContentSearchService.assertNotPlayable(candidate);
    const next = await parentContentService.addCandidate(parentSession, candidate, { videos, channels });
    setVideos(next.videos);
    setChannels(next.channels);
  }

  async function approveCandidate(candidate: ContentCandidate) {
    if (!parentSession) return;
    parentContentSearchService.assertNotPlayable(candidate);
    if (candidate.type === 'video' && candidate.youtubeVideoId) {
      const existing = videos.find((video) => video.youtubeVideoId === candidate.youtubeVideoId);
      const next = existing
        ? await parentContentService.setVideoApproved(parentSession, existing.id, true, videos)
        : await parentContentService.addVideo(
            parentSession,
            {
              id: id('video'),
              youtubeVideoId: candidate.youtubeVideoId,
              title: candidate.title,
              thumbnailUrl: candidate.thumbnailUrl,
              channelName: candidate.channelName,
              sourceUrl: `https://www.youtube.com/watch?v=${candidate.youtubeVideoId}`,
              approved: true,
            },
            videos,
          );
      setVideos(next);
      return;
    }
    if (candidate.type === 'channel' && candidate.youtubeChannelId) {
      const existing = channels.find((channel) => channel.channelId === candidate.youtubeChannelId);
      const next = existing
        ? await parentContentService.setChannelApproved(parentSession, existing.id, true, channels)
        : await parentContentService.addChannel(
            parentSession,
            {
              id: id('channel'),
              name: candidate.title,
              channelId: candidate.youtubeChannelId,
              thumbnailUrl: candidate.thumbnailUrl,
              sourceUrl: `https://www.youtube.com/channel/${candidate.youtubeChannelId}`,
              approved: true,
            },
            channels,
          );
      setChannels(next);
      // Approving a channel is the moment its uploads become eligible, so fetch them now.
      const approved = next.find((channel) => channel.channelId === candidate.youtubeChannelId);
      if (approved) void syncNewlyApprovedChannel(approved);
    }
  }

  async function removeVideo(video: ApprovedVideo) {
    if (!parentSession) return;
    setVideos(await parentContentService.removeVideo(parentSession, video.id, videos));
  }

  /**
   * Removing a channel also drops the videos its sync created, so nothing is left
   * behind pointing at a channel that is no longer approved. Videos a parent
   * approved or saved by hand are kept — those were deliberate decisions.
   */
  async function removeChannel(channel: ApprovedChannel) {
    if (!parentSession) return;
    const purged = await channelSyncService.removeChannelContent(parentSession, channel.channelId, { videos, channels });
    const next = await parentContentService.removeChannel(parentSession, channel.id, purged.channels);
    await parentContentService.replaceContent(parentSession, { videos: purged.videos, channels: next });
    setVideos(purged.videos);
    setChannels(next);
    setChannelSyncStates(channelSyncService.allStates());
  }

  /**
   * Publishes a fetched library to storage and to the screen.
   *
   * Persisting matters as much as rendering: the sync state records that a channel
   * was fetched, so if the merged videos were only held in memory they would be lost
   * on restart and the cache policy would suppress the refetch that could restore them.
   */
  async function publishLibrary(nextVideos: ApprovedVideo[], nextChannels: ApprovedChannel[]) {
    if (!parentSession) return;
    await parentContentService.replaceContent(parentSession, { videos: nextVideos, channels: nextChannels });
    setVideos(nextVideos);
    setChannels(nextChannels);
    setChannelSyncStates(channelSyncService.allStates());
  }

  /**
   * One page of a channel's uploads.
   *
   * `initial` respects the cache (so opening a channel page does not refetch a
   * fresh one), while `refresh` and `more` always go to the provider. Failures are
   * returned rather than thrown so the cached videos stay on screen.
   */
  async function syncChannel(channel: ApprovedChannel, mode: SyncMode) {
    if (!parentSession) return;
    setBusyChannelIds((current) => (current.includes(channel.channelId) ? current : [...current, channel.channelId]));
    try {
      const result = await channelSyncService.sync(parentSession, { channel, videos: libraryRef.current.videos, mode });
      // `fetched: false` means the cache was fresh or another sync was already
      // running; its caller publishes, so this one must not write a stale array back.
      if (!result.fetched) {
        setChannelSyncStates(channelSyncService.allStates());
        return;
      }
      // Read the library *after* the fetch, never from the render that created this function:
      // approving a channel sets state and syncs immediately, so the captured array would still
      // be the one from before the channel existed.
      const currentChannels = libraryRef.current.channels;
      const synced = result.channels[0];
      const known = currentChannels.some((item) => item.channelId === channel.channelId);
      // Appending when it is missing is the safety net: publishing a channel list without the
      // channel that was just synced would silently un-approve it.
      const nextChannels = known
        ? currentChannels.map((item) => (item.channelId === channel.channelId ? synced : item))
        : [...currentChannels, synced ?? channel];
      await publishLibrary(result.videos, nextChannels);
    } finally {
      setBusyChannelIds((current) => current.filter((id) => id !== channel.channelId));
    }
  }

  async function openChannelVideos(channel: ApprovedChannel) {
    await syncChannel(channel, 'initial');
  }

  /**
   * Runs right after a parent approves a channel, which is what makes the channel
   * page show videos instead of "0 videos" without a second tap.
   */
  async function syncNewlyApprovedChannel(channel: ApprovedChannel) {
    if (!parentSession) return;
    await syncChannel(channel, 'initial');
  }

  async function toggleVideoCategory(video: ApprovedVideo, categoryId: string, assigned: boolean) {
    if (!parentSession) return;
    const next = assigned
      ? (video.categoryIds ?? []).filter((item) => item !== categoryId)
      : [...(video.categoryIds ?? []), categoryId];
    setVideos(await parentContentService.setVideoCategories(parentSession, video.id, next, videos));
  }

  async function toggleChannelCategory(channel: ApprovedChannel, categoryId: string, assigned: boolean) {
    if (!parentSession) return;
    const next = assigned
      ? (channel.categoryIds ?? []).filter((item) => item !== categoryId)
      : [...(channel.categoryIds ?? []), categoryId];
    setChannels(await parentContentService.setChannelCategories(parentSession, channel.id, next, channels));
  }

  async function createCategory(name: string) {
    if (!parentSession) return;
    const created = await categoryService.create(parentSession, name);
    setCategories([...categories, created]);
  }

  async function renameCategory(categoryId: string, name: string) {
    if (!parentSession) return;
    setCategories(await categoryService.rename(parentSession, categoryId, name));
  }

  async function deleteCategory(categoryId: string) {
    if (!parentSession) return;
    const next = await categoryService.remove(parentSession, categoryId);
    const cleaned = await parentContentService.stripCategoryFromContent(parentSession, categoryId, { videos, channels });
    setCategories(next);
    setVideos(cleaned.videos);
    setChannels(cleaned.channels);
  }

  async function setChildPolicy(profileId: string, patch: ProfilePolicyOverrides | null) {
    if (!parentSession) return;
    const next = await profilePolicyService.update(parentSession, profileId, patch);
    setProfilePolicies(next);
    playbackPolicy.setProfilePolicies(next);
  }

  async function toggleChildInherit(profileId: string, inherit: boolean) {
    if (!parentSession) return;
    setChildRules(await childRulesService.setInheritGlobal(parentSession, profileId, inherit));
  }

  async function toggleChildCategory(profileId: string, categoryId: string) {
    if (!parentSession) return;
    setChildRules(await childRulesService.toggleCategory(parentSession, profileId, categoryId));
  }

  async function toggleGrantChannel(profileId: string, channelId: string) {
    if (!parentSession) return;
    setChildRules(await childRulesService.toggleGrantedChannel(parentSession, profileId, channelId));
  }

  async function toggleBlockChannel(profileId: string, channelId: string) {
    if (!parentSession) return;
    setChildRules(await childRulesService.toggleBlockedChannel(parentSession, profileId, channelId));
  }

  async function toggleGrantVideo(profileId: string, videoId: string) {
    if (!parentSession) return;
    setChildRules(await childRulesService.toggleGrantedVideo(parentSession, profileId, videoId));
  }

  async function toggleBlockVideo(profileId: string, videoId: string) {
    if (!parentSession) return;
    setChildRules(await childRulesService.toggleBlockedVideo(parentSession, profileId, videoId));
  }

  async function grantOverride(profileId: string, preset: OverridePreset, grantsScheduleAccess: boolean) {
    if (!parentSession) return;
    const next = await playbackOverrideService.grant(parentSession, {
      profileId,
      preset,
      settings: playbackPolicy.getEffectiveSettings(profileId),
      grantsScheduleAccess,
    });
    setOverrides(next);
    onOverrideGranted();
  }

  async function revokeOverride(profileId: string) {
    if (!parentSession) return;
    setOverrides(await playbackOverrideService.revoke(parentSession, profileId));
  }

  async function revokeApproval(approval: ContentApproval) {
    if (!parentSession) return;
    const videoId = approval.target.type === 'video' ? approval.target.youtubeVideoId : undefined;
    const channelId = approval.target.type === 'channel' ? approval.target.youtubeChannelId : undefined;
    const next = await approvalService.revoke(parentSession, { profileId: approval.profileId, videoId, channelId });
    setApprovals(next);
  }

  async function createFirstProfile(name: string, avatar: string, onDone: (profile: ChildProfile) => void) {
    const profile = { id: id('profile'), name: name.trim(), avatar };
    const session = parentSessionService.current();
    if (session) await parentContentService.saveProfiles(session, [profile]);
    else await profileRepository.saveAll([profile]);
    setProfiles([profile]);
    setActiveProfileId(profile.id);
    setSetupStep(null);
    onDone(profile);
  }

  /** The content half of a full PIN reset: everything a parent configured is wiped. */
  function resetAll() {
    whitelistService.setContent([], []);
    contentAccessService.hydrate({ rules: {}, approvals: [] });
    approvalService.hydrate([]);
    categoryService.hydrate(defaultCategories);
    childRulesService.hydrate({});
    profilePolicyService.hydrate({});
    playbackOverrideService.hydrate([]);
    playbackPolicy.hydrate({
      settings: defaultPlaybackSettings,
      screenTime: [],
      profiles: [],
      profilePolicies: {},
    });
    setProfiles([]);
    setChannels([]);
    setVideos([]);
    setHistory([]);
    setRequests([]);
    setApprovals([]);
    setOverrides([]);
    setChildRules({});
    setProfilePolicies({});
    setCategories(defaultCategories);
    setScreenTimeUsage([]);
    setPlaybackSettings(defaultPlaybackSettings);
    setActiveProfileId('');
    setSetupStep('pin');
  }

  return {
    hydrated,
    setupStep,
    setSetupStep,
    profiles,
    channels,
    videos,
    history,
    setHistory,
    playbackSettings,
    screenTimeUsage,
    setScreenTimeUsage,
    requests,
    approvals,
    categories,
    childRules,
    profilePolicies,
    overrides,
    channelSyncStates,
    busyChannelIds,
    activeProfileId,
    setActiveProfileId,
    repairNotice,
    activeProfile,
    childRequests,
    kidLibrary,
    effectiveSettings,
    accessFor,
    saveProfiles,
    deleteProfile,
    saveChannels,
    saveVideos,
    setOverrides,
    savePlaybackSettings,
    consumePlaybackApproval,
    submitKidRequest,
    decideRequest,
    deleteRequest,
    clearResolvedRequests,
    searchContent,
    saveCandidate,
    approveCandidate,
    removeVideo,
    removeChannel,
    openChannelVideos,
    syncChannel,
    syncNewlyApprovedChannel,
    resolveChannel: (input: string) => {
      if (!parentSession) throw new Error('Parent mode is required.');
      return channelSyncService.resolveChannel(parentSession, input);
    },
    toggleVideoCategory,
    toggleChannelCategory,
    createCategory,
    renameCategory,
    deleteCategory,
    setChildPolicy,
    toggleChildInherit,
    toggleChildCategory,
    toggleGrantChannel,
    toggleBlockChannel,
    toggleGrantVideo,
    toggleBlockVideo,
    grantOverride,
    revokeOverride,
    revokeApproval,
    createFirstProfile,
    resetAll,
    channelBusy: (channelId: string) => busyChannelIds.includes(channelId),
    syncStateFor: (channelId: string) => channelSyncService.getState(channelId),
  };
}

export type UseLibraryResult = ReturnType<typeof useLibrary>;
