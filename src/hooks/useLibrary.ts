import NativeYouTubePlayer from '../native/YouTubePlayerModule';
import { withDeArrow } from '../services/deArrowService';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import { profileRepository } from '../repositories/profileRepository';
import type { Screen } from './useKidNavigation.type';
import type { AppData } from '../store/appStore.type';
import { fieldSetter,loadAppData,useAppStore } from '../store/appStore';
import { withDefaultCategories } from '../repositories/parentalControlsRepository';
import { channelSyncService } from '../services/channelSyncService';
import type { SyncMode } from '../services/content/channelSyncRules.type';
import { parentSessionService } from '../services/auth/parentSession';
import type { ParentSession } from '../services/auth/parentSession.type';
import { parentPinService } from '../services/auth/parentPinService';
import { whitelistService } from '../services/whitelistService';
import { contentAccessService } from '../services/contentAccessService';
import { approvalService } from '../services/approvalService';
import { msUntilNextExpiry } from '../services/approvalRules';
import { categoryService } from '../services/categoryService';
import { childRulesService } from '../services/childRulesService';
import { profilePolicyService,mergeProfilePolicy } from '../services/profilePolicyService';
import { playbackOverrideService } from '../services/playbackOverrideService';
import type { OverridePreset } from '../services/playbackOverrideService.type';
import { kidContentLibraryService } from '../services/kidContentLibraryService';
import { enrichLibrary } from '../services/content/nativeVideoMetadata';
import { parentContentService } from '../services/parentContentService';
import { requestService } from '../services/requestService';
import { contentLookupService } from '../services/contentLookupService';
import { playerAdapter } from '../services/playerAdapterInstance';
import { ApprovedChannel,ApprovedVideo,ChildProfile } from '../types';
import type { PlaybackSettings } from '../types';
import { defaultPlaybackSettings } from '../constants/playback.constant';
import type { ContentApproval,ProfilePolicyOverrides,RequestType } from '../types';
import { defaultCategories } from '../constants/parentalControls.constant';
import { normaliseSettings } from '../repositories/playbackSettingsRepository';
import { playbackPolicy } from '../services/playbackPolicyService';
import { repairLocalData } from '../services/dataIntegrityService';
import type { RepairableCollection } from '../services/dataIntegrityService.type';
import { profileLifecycleService } from '../services/profileLifecycleService';
import { RequestDecisionInput } from '../components/ParentRequests';
import { downloadService } from '../services/downloadService';
import { ownersOfKnownProfiles } from '../services/downloadService.helper';
import { playlistService,sanitizePlaylists } from '../services/playlistService';
import { CuratedPlaylist } from '../types';
import { id } from '../utils/id';

const setProfiles = fieldSetter('profiles');
const setChannels = fieldSetter('channels');
const setVideos = fieldSetter('videos');
const setPlaylists = fieldSetter('playlists');
const setHistory = fieldSetter('history');
const setPlaybackSettings = fieldSetter('playbackSettings');
const setScreenTimeUsage = fieldSetter('screenTimeUsage');
const setRequests = fieldSetter('requests');
const setApprovals = fieldSetter('approvals');
const setCategories = fieldSetter('categories');
const setChildRules = fieldSetter('childRules');
const setProfilePolicies = fieldSetter('profilePolicies');
const setOverrides = fieldSetter('overrides');
const setChannelSyncStates = fieldSetter('channelSyncStates');

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
  const [accessClock, setAccessClock] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [libraryReady, setLibraryReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [setupStep, setSetupStep] = useState<'pin' | 'profile' | null>(null);
  const profiles = useAppStore((state) => state.profiles);
  const channels = useAppStore((state) => state.channels);
  const videos = useAppStore((state) => state.videos);
  const playlists = useAppStore((state) => state.playlists);
  const history = useAppStore((state) => state.history);
  const playbackSettings = useAppStore((state) => state.playbackSettings);
  const screenTimeUsage = useAppStore((state) => state.screenTimeUsage);
  const requests = useAppStore((state) => state.requests);
  const approvals = useAppStore((state) => state.approvals);
  const categories = useAppStore((state) => state.categories);
  const childRules = useAppStore((state) => state.childRules);
  const profilePolicies = useAppStore((state) => state.profilePolicies);
  const overrides = useAppStore((state) => state.overrides);
  const channelSyncStates = useAppStore((state) => state.channelSyncStates);

  // Content access only changes with time when an approval runs out, so wake exactly then rather
  // than re-checking the whole library on a fixed tick. Each tick re-arms the timer for the next one.
  useEffect(() => {
    const wait = msUntilNextExpiry(approvals);
    if (wait === null) return undefined;
    // setTimeout caps at ~24.8 days; an early wake-up just re-arms.
    const timer = setTimeout(() => setAccessClock((value) => value + 1), Math.min(wait + 100, 2_147_483_647));
    return () => clearTimeout(timer);
  }, [approvals, accessClock]);
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
      // One native read for every persisted key; nothing reaches the store until it is repaired.
      let loaded: [boolean, AppData];
      try {
        loaded = await Promise.all([parentPinService.hasPin(), loadAppData()]);
      } catch {
        // Starting empty would let the next save overwrite a library that is only unreadable right now.
        if (!cancelled) setLoadFailed(true);
        return;
      }
      if (cancelled) return;
      const [hasPin, data] = loaded;

      // Only whether a PIN exists is read — the stored digest is never exposed to the UI layer.
      const valid = data.profiles.filter((profile) => profile?.id?.trim());
      const profiles = valid.length === data.profiles.length ? data.profiles : valid;
      if (!hasPin) setSetupStep('pin');
      else setSetupStep(profiles.length ? null : 'profile');
      setProfiles(profiles);
      setActiveProfileId(profiles[0]?.id ?? '');
      setHydrated(true);
      void hydrateLibrary(data, profiles).catch(() => {
        if (!cancelled) { setLoadFailed(true); setHydrated(false); }
      });
    }

    async function hydrateLibrary(data: AppData, profiles: ChildProfile[]) {
      const nativeUsage = await NativeYouTubePlayer?.getPlaybackUsage?.() ?? [];
      if (cancelled) return;
      const recoveredUsage = data.screenTimeUsage.map((record) => ({ ...record }));
      for (const record of nativeUsage) {
        const previous = recoveredUsage.find((item) => item.profileId === record.profileId && item.date === record.date);
        if (previous) previous.secondsWatched = Math.max(previous.secondsWatched, record.secondsWatched);
        else recoveredUsage.push(record);
      }
      const input = {
        profiles,
        videos: data.videos,
        channels: data.channels,
        categories: withDefaultCategories(data.categories),
        requests: data.requests,
        approvals: data.approvals,
        overrides: data.overrides,
        childRules: data.childRules,
        profilePolicies: data.profilePolicies,
        history: data.history,
        screenTime: recoveredUsage,
        settings: normaliseSettings(data.playbackSettings),
        channelSync: data.channelSyncStates,
      };

      // Repair before trusting: duplicates, orphans, impossible values and stale grants.
      const { snapshot, repairs, changed } = repairLocalData(input);

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

      if (repairs.length) setRepairNotice(`Repaired local data: ${repairs.join(', ')}.`);
      // Only a repaired collection gets a new array, so the store rewrites exactly what changed
      // rather than serialising all of them on every cold start that found anything.
      const keep = <T,>(collection: RepairableCollection, repaired: T, original: T) =>
        changed.includes(collection) ? repaired : original;

      // A grant or override can expire while the app is closed, and an old resolved request
      // never gets a second look; drop all three now rather than carrying dead entries until
      // something else happens to touch these lists.
      const [prunedApprovals, prunedOverrides, prunedRequests] = await Promise.all([
        approvalService.pruneExpired(),
        playbackOverrideService.pruneExpired(),
        requestService.pruneResolved(snapshot.requests),
      ]);

      useAppStore.setState({
        profiles: keep('profiles', snapshot.profiles, profiles),
        playlists: sanitizePlaylists(data.playlists),
        channels: keep('channels', snapshot.channels, input.channels),
        videos: keep('videos', snapshot.videos, input.videos),
        history: keep('history', snapshot.history, input.history),
        playbackSettings: snapshot.settings,
        screenTimeUsage: keep('screenTime', snapshot.screenTime, input.screenTime),
        requests: prunedRequests,
        approvals: prunedApprovals,
        categories: keep('categories', snapshot.categories, input.categories),
        childRules: keep('childRules', snapshot.childRules, input.childRules),
        profilePolicies: keep('profilePolicies', snapshot.profilePolicies, input.profilePolicies),
        overrides: prunedOverrides,
        channelSyncStates: keep('channelSync', snapshot.channelSync, input.channelSync),
        downloadOwners: ownersOfKnownProfiles(data.downloadOwners, profiles),
      });
      setLibraryReady(true);
    }

    setLoadFailed(false);
    void hydrateEssential();
    return () => {
      cancelled = true;
    };
  }, [loadAttempt]);

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
        videos: videos.map((video) => withDeArrow(video, playbackSettings)),
        channels,
        categories,
        history,
      }),
    [activeProfile?.id, videos, channels, categories, history, childRules, approvals, accessClock, playbackSettings],
  );
  useEffect(() => {
    void downloadService.authorizeParent(parentSession).catch(() => undefined);
  }, [parentSession]);

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
   *
   * `kidLibrary.videos` already is exactly this set (`KidContentLibraryService.build` runs the
   * same `evaluate` check per video) — deriving from it instead of re-evaluating every video a
   * second time here avoids doing the same O(videos) access check twice on every relevant change.
   */
  const nativeAllowedVideoIds = useMemo(
    () => kidLibrary.videos.map((video) => video.youtubeVideoId),
    [kidLibrary],
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
    const saved = await parentContentService.saveProfiles(next);
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
    // Their saved videos go too; files a sibling also saved stay.
    await downloadService.dropProfile(profile.id).catch(() => undefined);
    if (activeProfileId === profile.id) setActiveProfileId(result.profiles[0]?.id ?? '');
  }

  async function saveChannels(next: ApprovedChannel[]) {
    if (!parentSession) return;
    await parentContentService.replaceContent({ videos, channels: next });
    setChannels(next);
  }

  async function saveVideos(next: ApprovedVideo[]) {
    if (!parentSession) return;
    await parentContentService.replaceContent({ videos: next, channels });
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
    const saved = await parentContentService.saveSettings(next);
    setPlaybackSettings(saved);
    playbackPolicy.setSettings(saved);
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

  async function removeVideo(video: ApprovedVideo) {
    if (!parentSession) return;
    setVideos(await parentContentService.removeVideo(video.id, videos));
  }

  /**
   * Removing a channel also drops the videos its sync created, so nothing is left
   * behind pointing at a channel that is no longer approved. Videos a parent
   * approved or saved by hand are kept — those were deliberate decisions.
   */
  async function removeChannel(channel: ApprovedChannel) {
    if (!parentSession) return;
    const purged = await channelSyncService.removeChannelContent(parentSession, channel.channelId, { videos, channels });
    const next = await parentContentService.removeChannel(channel.id, purged.channels);
    await parentContentService.replaceContent({ videos: purged.videos, channels: next });
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
    await parentContentService.replaceContent({ videos: nextVideos, channels: nextChannels });
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
    setVideos(await parentContentService.setVideoCategories(video.id, next, videos));
  }

  async function toggleChannelCategory(channel: ApprovedChannel, categoryId: string, assigned: boolean) {
    if (!parentSession) return;
    const next = assigned
      ? (channel.categoryIds ?? []).filter((item) => item !== categoryId)
      : [...(channel.categoryIds ?? []), categoryId];
    setChannels(await parentContentService.setChannelCategories(channel.id, next, channels));
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
    const cleaned = await parentContentService.stripCategoryFromContent(categoryId, { videos, channels });
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
    if (session) await parentContentService.saveProfiles([profile]);
    else await profileRepository.saveAll([profile]);
    setProfiles([profile]);
    setActiveProfileId(profile.id);
    setSetupStep(null);
    onDone(profile);
  }

  async function savePlaylist(draft: CuratedPlaylist) {
    if (!parentSession) throw new Error('Parent mode is required.');
    setPlaylists(await playlistService.save(parentSession, draft, playlists, videos));
  }

  async function removePlaylist(playlistId: string) {
    if (!parentSession) throw new Error('Parent mode is required.');
    setPlaylists(await playlistService.remove(parentSession, playlistId, playlists));
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
    setPlaylists([]);
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
    playlists,
    savePlaylist,
    removePlaylist,
    hydrated,
    loadFailed,
    libraryReady,
    retryLoad: () => setLoadAttempt((value) => value + 1),
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
    removeVideo,
    removeChannel,
    openChannelVideos,
    syncChannel,
    syncNewlyApprovedChannel,
    findChannels: (query: string) => {
      if (!parentSession) throw new Error('Parent mode is required.');
      return contentLookupService.findChannels(parentSession, query);
    },
    findVideos: (query: string) => contentLookupService.findVideos(query),
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
