import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { channelRepository } from './src/repositories/channelRepository';
import { profileRepository } from './src/repositories/profileRepository';
import { videoRepository } from './src/repositories/videoRepository';
import { watchHistoryRepository } from './src/repositories/watchHistoryRepository';
import {
  approvalRepository,
  categoryRepository,
  childRulesRepository,
  overrideRepository,
  profilePolicyRepository,
  requestRepository,
} from './src/repositories/phase4Repository';
import { channelSyncRepository, ChannelSyncMap } from './src/repositories/channelSyncRepository';
import { channelSyncService } from './src/services/channelSyncService';
import { SyncMode } from './src/services/content/channelSyncRules';
import { parentPinService } from './src/services/auth/parentPinService';
import { ParentSession, parentSessionService } from './src/services/auth/parentSession';
import { parentResetService, resetConfirmationPhrase } from './src/services/auth/parentResetService';
import { whitelistService } from './src/services/whitelistService';
import { contentAccessService } from './src/services/contentAccessService';
import { approvalService } from './src/services/approvalService';
import { categoryService } from './src/services/categoryService';
import { ChildRulesMap, childRulesService } from './src/services/childRulesService';
import { profilePolicyService, mergeProfilePolicy } from './src/services/profilePolicyService';
import { OverridePreset, playbackOverrideService } from './src/services/playbackOverrideService';
import { kidContentLibraryService } from './src/services/kidContentLibraryService';
import { enrichLibrary } from './src/services/content/nativeVideoMetadata';
import { parentContentSearchService } from './src/services/parentContentSearchService';
import { parentContentService } from './src/services/parentContentService';
import { requestService } from './src/services/requestService';
import { YouTubePlayer, isNativeYouTubePlayerAvailable } from './src/native';
import { normalizePlayerError, playerErrorCodeOf, PlayerError } from './src/services/playerErrors';
import { playerAdapter } from './src/services/playerAdapterInstance';
import { ResumablePlayerAdapter } from './src/services/playerAdapter';
import { ApprovedChannel, ApprovedVideo, ChildProfile, WatchHistory } from './src/types';
import { Phase3Settings, PlaybackDecision, ScreenTimeUsage, defaultPhase3Settings } from './src/phase3Types';
import {
  ContentApproval,
  ContentCandidate,
  ContentCategory,
  ContentRequest,
  PlaybackOverride,
  ProfilePolicyOverrides,
  RequestType,
  defaultCategories,
} from './src/phase4Types';
import { settingsRepository, screenTimeRepository } from './src/repositories/phase3Repository';
import {
  describePlaybackDecision,
  isTimeRelatedReason,
  playbackPolicy,
} from './src/services/playbackPolicyService';
import { screenTimeService } from './src/services/screenTimeService';
import { accountPlayheadSample } from './src/services/screenTimeAccounting';
import { repairLocalData } from './src/services/dataIntegrityService';
import { extractChannelId, extractVideoId } from './src/services/contentValidation';
import { profileLifecycleService } from './src/services/profileLifecycleService';
import {
  defaultRecoveryPolicy,
  recoveryDelayMs,
  recoveryStatusText,
  shouldAutoRecover,
} from './src/services/playbackRecovery';
import { sponsorBlockService, SponsorSegment } from './src/services/sponsorBlockService';
import { Phase3SettingsPanel } from './src/components/Phase3Settings';
import { KidHomeScreen, KidTab } from './src/components/KidHome';
import { ParentShell, ParentSection } from './src/components/ParentShell';
import { ContentTab } from './src/components/ParentContent';
import { RequestDecisionInput } from './src/components/ParentRequests';
import { ParentOverrideSheet } from './src/components/ParentOverrideSheet';
import { PinEntry } from './src/components/PinEntry';
import { Avatar, avatarIcons, avatarOptions } from './src/components/Avatar';
import { colors } from './src/components/theme';
import { FocusablePressable } from './src/components/tv';
import { yt } from './src/components/youtube/theme';
import { ChannelAvatar, VideoCard as FeedVideoCard } from './src/components/youtube/VideoCard';

function id(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function App() {
  const [hydrated, setHydrated] = useState(false);
  const [setupStep, setSetupStep] = useState<'pin' | 'profile' | null>(null);
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [channels, setChannels] = useState<ApprovedChannel[]>([]);
  const [videos, setVideos] = useState<ApprovedVideo[]>([]);
  const [history, setHistory] = useState<WatchHistory[]>([]);
  const [phase3Settings, setPhase3Settings] = useState<Phase3Settings>(defaultPhase3Settings);
  const [screenTimeUsage, setScreenTimeUsage] = useState<ScreenTimeUsage[]>([]);
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [approvals, setApprovals] = useState<ContentApproval[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>(defaultCategories);
  const [childRules, setChildRules] = useState<ChildRulesMap>({});
  const [profilePolicies, setProfilePolicies] = useState<Record<string, ProfilePolicyOverrides>>({});
  const [overrides, setOverrides] = useState<PlaybackOverride[]>([]);
  const [channelSyncStates, setChannelSyncStates] = useState<ChannelSyncMap>({});
  const [busyChannelIds, setBusyChannelIds] = useState<string[]>([]);
  const [parentSession, setParentSession] = useState<ParentSession | null>(null);
  const [activeProfileId, setActiveProfileId] = useState('');
  const [screen, setScreen] = useState<'kid' | 'parent' | 'player'>('kid');
  const [selectedVideo, setSelectedVideo] = useState<ApprovedVideo | null>(null);
  const [kidNotice, setKidNotice] = useState('');
  const [kidNoticeAction, setKidNoticeAction] = useState<'override' | null>(null);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLockRemainingMs, setPinLockRemainingMs] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [parentSection, setParentSection] = useState<ParentSection>('home');
  const [contentTab, setContentTab] = useState<ContentTab>('channels');
  /** Which channel's own page is open in Parent Mode, if any. */
  const [parentChannelId, setParentChannelId] = useState<string | null>(null);
  const [kidTab, setKidTab] = useState<KidTab>('home');
  const [kidCategoryId, setKidCategoryId] = useState<string | null>(null);
  const [kidChannelId, setKidChannelId] = useState<string | null>(null);
  const [overrideForProfileId, setOverrideForProfileId] = useState<string | null>(null);
  const [retrySignal, setRetrySignal] = useState(0);
  const [repairNotice, setRepairNotice] = useState('');
  const historyWrite = useRef<{ timer: ReturnType<typeof setTimeout> | null; pending: WatchHistory[] | null }>({
    timer: null,
    pending: null,
  });
  /** Last value pushed into React state, so playback ticks cannot re-render the tree needlessly. */
  const usageSyncKey = useRef('');

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
      const { snapshot, repairs } = repairLocalData({
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
        await Promise.all([
          videoRepository.saveAll(snapshot.videos),
          channelRepository.saveAll(snapshot.channels),
          categoryRepository.saveAll(snapshot.categories),
          requestRepository.saveAll(snapshot.requests),
          approvalRepository.saveAll(snapshot.approvals),
          overrideRepository.saveAll(snapshot.overrides),
          childRulesRepository.saveAll(snapshot.childRules),
          profilePolicyRepository.saveAll(snapshot.profilePolicies),
          watchHistoryRepository.saveAll(snapshot.history),
          screenTimeRepository.saveAll(snapshot.screenTime),
          channelSyncRepository.saveAll(snapshot.channelSync),
          settingsRepository.save(snapshot.settings),
        ]);
      }

      setChannels(snapshot.channels);
      setVideos(snapshot.videos);
      setHistory(snapshot.history);
      setPhase3Settings(snapshot.settings);
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
   * Android back is the main way a child escapes a screen, so it must never land somewhere that is
   * not theirs: player and Parent Mode both return to Kid Mode, and nested kid screens go home.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overrideForProfileId) { setOverrideForProfileId(null); return true; }
      if (pinModalVisible) { setPinModalVisible(false); return true; }
      if (screen === 'player') { setScreen('kid'); return true; }
      if (screen === 'parent') { exitParentMode(); return true; }
      if (kidTab !== 'home' || kidCategoryId || kidChannelId) {
        setKidTab('home');
        setKidCategoryId(null);
        setKidChannelId(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, kidTab, kidCategoryId, kidChannelId, pinModalVisible, overrideForProfileId, setupStep]);

  // A parent session expiring while Parent Mode is open must drop back to Kid Mode, not linger.
  useEffect(() => {
    if (screen !== 'parent') return;
    const check = () => {
      if (parentSessionService.isActive()) return;
      parentSessionService.end();
      setParentSession(null);
      setParentSection('home');
      setScreen('kid');
    };
    const subscription = AppState.addEventListener('change', (nextState) => { if (nextState === 'active') check(); });
    const interval = setInterval(check, 60_000);
    return () => { subscription.remove(); clearInterval(interval); };
  }, [screen]);

  // A lockout is timed, so the countdown ticks down while the PIN screen is open.
  useEffect(() => {
    if (pinLockRemainingMs <= 0) return;
    const interval = setInterval(() => {
      setPinLockRemainingMs((remaining) => (remaining <= 1_000 ? 0 : remaining - 1_000));
    }, 1_000);
    return () => clearInterval(interval);
  }, [pinLockRemainingMs > 0]);

  /**
   * Keeps the access layer in step with React state synchronously, because the derived Kid Mode
   * library and decisions are computed from these services during the same render.
   *
   * The identity check matters: without it every render (including the player's own ticks) rebuilt
   * six maps. Reference equality is enough because each service is only re-hydrated when the array it
   * reads actually changed.
   */
  const accessHydrationRef = useRef<unknown[]>([]);
  const accessInputs: unknown[] = [
    videos,
    channels,
    childRules,
    approvals,
    categories,
    profilePolicies,
    overrides,
    channelSyncStates,
  ];
  if (accessHydrationRef.current.length !== accessInputs.length || accessInputs.some((value, index) => value !== accessHydrationRef.current[index])) {
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
    playbackPolicy.setSettings(phase3Settings);
    playbackPolicy.setProfilePolicies(profilePolicies);
    playbackPolicy.setContentAccessResolver((profileId, input, now) => contentAccessService.evaluate(profileId, input, now));
    playbackPolicy.setOverrideResolver((profileId, now) => ({
      additionalSeconds: playbackOverrideService.additionalSeconds(profileId, now),
      grantsScheduleAccess: playbackOverrideService.grantsScheduleAccess(profileId, now),
    }));
  }, [profiles, phase3Settings, profilePolicies, childRules, approvals, overrides]);

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
    () => mergeProfilePolicy(phase3Settings, activeProfile ? profilePolicies[activeProfile.id] : undefined),
    [phase3Settings, profilePolicies, activeProfile],
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

  /**
   * Always-current view of the library for async work.
   *
   * Handlers that set state and then immediately kick off an await (approving a channel, then
   * syncing it) would otherwise write back the arrays captured before that state change.
   */
  const libraryRef = useRef({ videos, channels });
  libraryRef.current = { videos, channels };

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

  /**
   * The player reports progress every couple of seconds; storage writes are debounced and flushed
   * on background/unmount so watch history is neither lost nor written on every tick.
   */
  async function flushHistory() {
    const pending = historyWrite.current.pending;
    historyWrite.current.pending = null;
    if (historyWrite.current.timer) {
      clearTimeout(historyWrite.current.timer);
      historyWrite.current.timer = null;
    }
    if (pending) await watchHistoryRepository.saveAll(pending);
  }

  function saveHistory(next: WatchHistory[]) {
    setHistory(next);
    historyWrite.current.pending = next;
    if (historyWrite.current.timer) return;
    historyWrite.current.timer = setTimeout(() => {
      historyWrite.current.timer = null;
      void flushHistory();
    }, 5_000);
  }

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') return;
      void flushHistory();
      void screenTimeService.flush();
    });
    return () => {
      subscription.remove();
      void flushHistory();
      void screenTimeService.flush();
    };
  }, []);

  /**
   * Watch time accrues in the policy's own store on every tick; the parent-facing summary only needs
   * minute resolution. Re-rendering the whole app on each tick is exactly what §11 rules out, so
   * global state is updated when the rounded minute changes (or when forced, e.g. leaving the player).
   */
  const syncUsageIntoState = useCallback((force = false) => {
    const records = playbackPolicy.records();
    const key = records
      .map((record) => `${record.profileId}|${record.date}|${Math.floor(record.secondsWatched / 60)}`)
      .sort()
      .join(',');
    if (!force && key === usageSyncKey.current) return;
    usageSyncKey.current = key;
    setScreenTimeUsage(records);
  }, []);

  async function enterParentMode() {
    setPin('');
    setPinError('');
    // A lockout survives app restarts, so the countdown is restored before the keypad appears.
    const lock = await parentPinService.lockState();
    setPinLockRemainingMs(lock.locked ? lock.retryAfterMs : 0);
    setPinModalVisible(true);
  }

  async function verifyParentPin() {
    if (pin.length !== 4) {
      setPinError('Enter your 4-digit PIN.');
      return;
    }
    const result = await parentSessionService.startWithPin(pin);
    setPin('');
    if (!result.ok) {
      if (result.reason === 'locked') {
        setPinLockRemainingMs(result.retryAfterMs);
        setPinError('');
      } else if (result.reason === 'not-set') {
        setPinError('No parent PIN is set on this device.');
      } else {
        setPinError(
          result.attemptsRemaining <= 1
            ? 'That PIN did not match. One more try before PIN entry locks.'
            : `That PIN did not match. ${result.attemptsRemaining} tries left.`,
        );
      }
      return;
    }
    setPinLockRemainingMs(0);
    setPinModalVisible(false);
    setParentSession(result.session);
    setScreen('parent');
  }

  function exitParentMode() {
    parentSessionService.end();
    setParentSession(null);
    setScreen('kid');
  }

  async function finishPinSetup() {
    if (pin.length !== 4) {
      setPinError('Choose exactly 4 numbers for your parent PIN.');
      return;
    }
    try {
      await parentPinService.setPin(pin);
    } catch {
      setPinError('That PIN could not be saved. Try a different 4-digit PIN.');
      return;
    }
    // The PIN was just set by the parent, so this session is authorized.
    setParentSession(parentSessionService.grant());
    setPin('');
    setPinError('');
    setSetupStep('profile');
  }

  /**
   * The only PIN recovery path: destructive, lockout-only and phrase-confirmed. Everything the
   * parent configured is wiped, so this cannot be used to reach the existing setup.
   */
  async function resetParentPin() {
    setResetting(true);
    try {
      await parentResetService.resetEverything();
      parentSessionService.end();
      whitelistService.setContent([], []);
      contentAccessService.hydrate({ rules: {}, approvals: [] });
      approvalService.hydrate([]);
      categoryService.hydrate(defaultCategories);
      childRulesService.hydrate({});
      profilePolicyService.hydrate({});
      playbackOverrideService.hydrate([]);
      playbackPolicy.hydrate({
        settings: defaultPhase3Settings,
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
      setPhase3Settings(defaultPhase3Settings);
      setActiveProfileId('');
      setSelectedVideo(null);
      setParentSession(null);
      setPinModalVisible(false);
      setPin('');
      setPinError('');
      setPinLockRemainingMs(0);
      setKidNotice('');
      setKidNoticeAction(null);
      setScreen('kid');
      setSetupStep('pin');
    } finally {
      setResetting(false);
    }
  }

  async function createFirstProfile(name: string, avatar: string) {
    const profile = { id: id('profile'), name: name.trim(), avatar };
    const session = parentSessionService.current();
    if (session) await parentContentService.saveProfiles(session, [profile]);
    else await profileRepository.saveAll([profile]);
    setProfiles([profile]);
    setActiveProfileId(profile.id);
    setSetupStep(null);
    setScreen('parent');
  }

  function playbackDecision(video: ApprovedVideo): PlaybackDecision {
    if (!activeProfile) return { allowed: false, reason: 'VIDEO_NOT_APPROVED' };
    return playbackPolicy.canPlay({
      profileId: activeProfile.id,
      videoId: video.youtubeVideoId,
      channelId: video.channelId,
      categoryIds: video.categoryIds,
    });
  }

  function explainDecision(decision: PlaybackDecision) {
    if (decision.allowed) return;
    setKidNotice(describePlaybackDecision(decision));
    setKidNoticeAction(isTimeRelatedReason(decision) ? 'override' : null);
  }

  function openPlayer(video: ApprovedVideo) {
    const decision = playbackDecision(video);
    if (!decision.allowed) {
      explainDecision(decision);
      return;
    }
    setKidNotice('');
    setKidNoticeAction(null);
    setSelectedVideo(video);
    setScreen('player');
  }

  async function savePhase3Settings(next: Phase3Settings) {
    if (!parentSession) return;
    await parentContentService.saveSettings(parentSession, next);
    setPhase3Settings(next);
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
    setKidNotice('');
    setKidNoticeAction(null);
    if (screen === 'player') setRetrySignal((value) => value + 1);
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

  if (!hydrated) {
    return <LoadingScreen />;
  }

  const nextVideo = selectedVideo
    ? kidLibrary.videos[(kidLibrary.videos.findIndex((item) => item.id === selectedVideo.id) + 1) % Math.max(1, kidLibrary.videos.length)]
    : undefined;

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, (screen === 'kid' || screen === 'player') && !setupStep && styles.safeAreaDark]}
        edges={['top', 'bottom']}
      >
        {setupStep === 'pin' && <PinSetup onSubmit={finishPinSetup} pin={pin} setPin={setPin} error={pinError} />}
        {setupStep === 'profile' && <ProfileSetup onSubmit={createFirstProfile} />}
        {!setupStep && screen === 'kid' && (
          <KidHomeScreen
            profiles={profiles}
            activeProfile={activeProfile}
            onSelectProfile={(profileId) => {
              setActiveProfileId(profileId);
              setKidCategoryId(null);
              setKidChannelId(null);
              setKidNotice('');
              setKidNoticeAction(null);
            }}
            library={kidLibrary}
            notice={kidNotice}
            noticeAction={
              kidNoticeAction === 'override' && activeProfile
                ? { label: 'Ask a parent for more time', onPress: () => setOverrideForProfileId(activeProfile.id) }
                : null
            }
            tab={kidTab}
            onTabChange={setKidTab}
            selectedCategoryId={kidCategoryId}
            onSelectCategory={setKidCategoryId}
            selectedChannelId={kidChannelId}
            onSelectChannel={setKidChannelId}
            onVideoPress={openPlayer}
            onParentPress={enterParentMode}
            requests={requests}
            onSubmitRequest={submitKidRequest}
            onRequestVideo={(video) =>
              submitKidRequest({
                type: 'video',
                title: video.title,
                videoId: video.youtubeVideoId,
                thumbnailUrl: video.thumbnailUrl,
                channelName: video.channelName,
              })
            }
            onRequestChannel={(channel) =>
              submitKidRequest({
                type: 'channel',
                title: channel.name,
                channelId: channel.channelId,
                thumbnailUrl: channel.thumbnailUrl,
              })
            }
            pendingRequestCount={childRequests.filter((request) => request.status === 'pending').length}
            channelSyncStateFor={(channelId) => channelSyncService.getState(channelId)}
          />
        )}
        {/* Parent Mode renders only with a live session — hiding the button is not the control. */}
        {!setupStep && screen === 'parent' && parentSession && (
          <ParentShell
            data={{
              session: parentSession,
              profiles,
              activeProfileId,
              channels,
              videos,
              categories,
              approvals,
              requests,
              childRules,
              profilePolicies,
              overrides,
              settings: phase3Settings,
              screenTimeUsage,
              history,
            }}
            actions={{
              onExit: exitParentMode,
              onDecideRequest: decideRequest,
              onDeleteRequest: deleteRequest,
              onClearResolved: clearResolvedRequests,
              onRemoveVideo: removeVideo,
              onRemoveChannel: removeChannel,
              onToggleVideoCategory: toggleVideoCategory,
              onToggleChannelCategory: toggleChannelCategory,
              onSearchContent: searchContent,
              onSaveCandidate: saveCandidate,
              onApproveCandidate: approveCandidate,
              syncStateFor: (channelId) => channelSyncService.getState(channelId),
              channelBusy: (channelId) => busyChannelIds.includes(channelId),
              onOpenChannelVideos: (channel) => void openChannelVideos(channel),
              onRefreshChannel: (channel) => void syncChannel(channel, 'refresh'),
              onLoadMoreChannel: (channel) => void syncChannel(channel, 'more'),
              onSelectChannel: setParentChannelId,
              onCreateCategory: createCategory,
              onRenameCategory: renameCategory,
              onDeleteCategory: deleteCategory,
              onSetPolicy: setChildPolicy,
              onToggleInherit: toggleChildInherit,
              onToggleCategoryForChild: toggleChildCategory,
              onToggleGrantChannel: toggleGrantChannel,
              onToggleBlockChannel: toggleBlockChannel,
              onToggleGrantVideo: toggleGrantVideo,
              onToggleBlockVideo: toggleBlockVideo,
              onGrantOverride: grantOverride,
              onRevokeOverride: revokeOverride,
              onRevokeApproval: revokeApproval,
              onProfilesChange: saveProfiles,
              onSettingsChange: savePhase3Settings,
              accessFor,
            }}
            notice={repairNotice}
            section={parentSection}
            setSection={setParentSection}
            contentTab={contentTab}
            selectedChannelId={parentChannelId}
            setContentTab={setContentTab}
            manualAddSlot={
              <ManualAddSection
                channels={channels}
                onAddChannel={async (channel) => {
                  await saveChannels([channel, ...channels]);
                  void syncNewlyApprovedChannel(channel);
                }}
                onAddVideo={(video) => saveVideos([video, ...videos])}
              />
            }
            profilesSlot={
              <ProfileManager
                profiles={profiles}
                activeProfileId={activeProfileId}
                setActiveProfileId={setActiveProfileId}
                onChange={saveProfiles}
                onDelete={deleteProfile}
              />
            }
            settingsSlot={
              <Phase3SettingsPanel
                settings={phase3Settings}
                usage={screenTimeUsage}
                profiles={profiles}
                onChange={(next) => void savePhase3Settings(next)}
              />
            }
          />
        )}
        {!setupStep && screen === 'player' && selectedVideo && (
          <PlayerScreen
            video={selectedVideo}
            profile={activeProfile}
            settings={effectiveSettings}
            nextVideo={nextVideo}
            retrySignal={retrySignal}
            onNextVideo={(next) => {
              const decision = playbackDecision(next);
              if (!decision.allowed) explainDecision(decision);
              else setSelectedVideo(next);
            }}
            onUsageChange={syncUsageIntoState}
            onBack={() => {
              // Leaving playback is a natural boundary: persist and refresh the usage summary.
              void screenTimeService.flush();
              syncUsageIntoState(true);
              setScreen('kid');
            }}
            onSaveHistory={(item) =>
              void saveHistory([
                item,
                ...history.filter((old) => !(old.profileId === item.profileId && old.videoId === item.videoId)),
              ])
            }
            onPlaybackCompleted={() => void consumePlaybackApproval(selectedVideo)}
            onParentOverride={() => setOverrideForProfileId(activeProfile?.id ?? null)}
          />
        )}
      </SafeAreaView>
      <ParentPinModal
        visible={pinModalVisible}
        pin={pin}
        setPin={setPin}
        error={pinError}
        lockRemainingMs={pinLockRemainingMs}
        resetting={resetting}
        onClose={() => setPinModalVisible(false)}
        onSubmit={verifyParentPin}
        onReset={resetParentPin}
      />
      <ParentOverrideSheet
        visible={Boolean(overrideForProfileId)}
        profile={profiles.find((profile) => profile.id === overrideForProfileId)}
        settings={playbackPolicy.getEffectiveSettings(overrideForProfileId ?? activeProfile?.id ?? '')}
        overrideSecondsToday={
          overrideForProfileId ? playbackOverrideService.additionalSeconds(overrideForProfileId) : 0
        }
        onClose={() => setOverrideForProfileId(null)}
        onGranted={setOverrides}
      />
    </SafeAreaProvider>
  );
}

function LoadingScreen() {
  return (
    <View style={[styles.safeArea, styles.centered]}>
      <View style={styles.logoMark}><Feather name="sun" size={25} color={colors.ink} /></View>
      <Text style={styles.loadingText}>Waking up Nestling…</Text>
    </View>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.logoMarkSmall}><Feather name="sun" size={17} color={colors.ink} /></View>
      {!compact && <Text style={styles.brandName}>nestling</Text>}
    </View>
  );
}

function PinSetup({ onSubmit, pin, setPin, error }: { onSubmit: () => void; pin: string; setPin: (value: string) => void; error: string }) {
  return (
    <KeyboardAvoidingView style={styles.setupFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.setupScreen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Brand />
      <View style={styles.setupHero}>
        <View style={styles.heroOrb}><Feather name="lock" size={38} color={colors.ink} /></View>
        <Text style={styles.eyebrow}>A little grown-up setup</Text>
        <Text style={styles.heroTitle}>Make this nest{`\n`}just for them.</Text>
        <Text style={styles.heroBody}>Create a 4-digit parent PIN. You’ll use it whenever you want to change what your little ones can watch.</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Your private PIN</Text>
        <PinEntry pin={pin} onChange={setPin} onSubmit={onSubmit} error={error} helper="Keep it somewhere safe — kids won’t see this screen." submitLabel="Create parent PIN" />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileSetup({ onSubmit }: { onSubmit: (name: string, avatar: string) => void }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [error, setError] = useState('');
  return (
    <KeyboardAvoidingView style={styles.setupFlex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.setupScreen} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <Brand />
      <View style={styles.setupHero}>
        <View style={[styles.heroOrb, { backgroundColor: colors.peach }]}><Feather name="heart" size={38} color={colors.coral} /></View>
        <Text style={styles.eyebrow}>First little explorer</Text>
        <Text style={styles.heroTitle}>Who’s watching{`\n`}today?</Text>
        <Text style={styles.heroBody}>Create a profile for your child. You can add more profiles from Parent Mode anytime.</Text>
      </View>
      <View style={styles.formCard}>
        <Text style={styles.inputLabel}>Their name</Text>
        <TextInput value={name} onChangeText={setName} placeholder="e.g. Milo" placeholderTextColor="#B8B1AA" style={styles.textInput} maxLength={24} />
        <Text style={[styles.inputLabel, { marginTop: 18 }]}>Pick a little icon</Text>
        <View style={styles.avatarPicker}>
          {avatarOptions.map((option) => (
            <FocusablePressable key={option} accessibilityLabel={`Choose ${option} avatar`} style={[styles.avatarOption, avatar === option && styles.avatarOptionSelected]} onPress={() => setAvatar(option)}>
              <Feather name={avatarIcons[option]} size={25} color={avatar === option ? colors.purple : colors.muted} />
            </FocusablePressable>
          ))}
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <PrimaryButton label="Create profile" onPress={() => name.trim() ? onSubmit(name, avatar) : setError('Give this profile a name first.')} icon="arrow-right" />
      </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ProfileManager({ profiles, activeProfileId, setActiveProfileId, onChange, onDelete }: { profiles: ChildProfile[]; activeProfileId: string; setActiveProfileId: (id: string) => void; onChange: (profiles: ChildProfile[]) => Promise<void>; onDelete: (profile: ChildProfile) => Promise<void> }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(avatarOptions[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  function beginEdit(profile: ChildProfile) {
    setEditingId(profile.id); setName(profile.name); setAvatar(profile.avatar); setError('');
  }
  async function save() {
    if (!name.trim()) { setError('Add a name first.'); return; }
    const next = editingId
      ? profiles.map((profile) => profile.id === editingId ? { ...profile, name: name.trim(), avatar } : profile)
      : [...profiles, { id: id('profile'), name: name.trim(), avatar }];
    await onChange(next);
    setName(''); setEditingId(null); setError('');
  }
  return (
    <View>
      <View style={styles.sectionIntro}><View><Text style={styles.parentSectionTitle}>Little explorers</Text><Text style={styles.parentSectionBody}>Choose who sees the Kid Mode home.</Text></View><Feather name="heart" size={22} color={colors.coral} /></View>
      <View style={styles.profileManagerCard}>
        <Text style={styles.inputLabel}>{editingId ? 'Edit profile' : 'Add a child profile'}</Text>
        <TextInput value={name} onChangeText={setName} placeholder="Profile name" placeholderTextColor="#B8B1AA" style={styles.textInput} maxLength={24} />
        <View style={styles.avatarPicker}>{avatarOptions.map((option) => <FocusablePressable key={option} accessibilityLabel={`Choose ${option} avatar`} style={[styles.avatarOption, avatar === option && styles.avatarOptionSelected]} onPress={() => setAvatar(option)}><Feather name={avatarIcons[option]} size={23} color={avatar === option ? colors.purple : colors.muted} /></FocusablePressable>)}</View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <View style={styles.formButtonRow}>{editingId ? <SecondaryButton label="Cancel" onPress={() => { setEditingId(null); setName(''); }} /> : null}<PrimaryButton label={editingId ? 'Save changes' : 'Add profile'} onPress={() => void save()} icon="check" /></View>
      </View>
      <Text style={styles.listLabel}>PROFILES · {profiles.length}</Text>
      {profiles.map((profile) => (
        <View key={profile.id} style={styles.profileRow}>
          <Avatar profile={profile} size={48} />
          <View style={styles.profileRowInfo}>
            <Text style={styles.rowTitle}>{profile.name}</Text>
            <Text style={styles.rowSubtitle}>{activeProfileId === profile.id ? 'Active in Kid Mode' : 'Child profile'}</Text>
          </View>
          {activeProfileId !== profile.id && <FocusablePressable accessibilityLabel={`Use ${profile.name}`} style={styles.smallAction} onPress={() => setActiveProfileId(profile.id)}><Text style={styles.smallActionText}>Use</Text></FocusablePressable>}
          <FocusablePressable accessibilityLabel={`Edit ${profile.name}`} style={styles.iconButton} onPress={() => beginEdit(profile)}><Feather name="edit-2" size={17} color={colors.muted} /></FocusablePressable>
          {profiles.length > 1 && <FocusablePressable accessibilityLabel={`Delete ${profile.name}`} style={styles.iconButton} onPress={() => Alert.alert('Delete profile?', `${profile.name}'s approvals, requests, watch history and screen-time records will be removed too.`, [{ text: 'Keep', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void onDelete(profile) }])}><Feather name="trash-2" size={17} color={colors.danger} /></FocusablePressable>}
        </View>
      ))}
    </View>
  );
}

function ManualAddSection({ channels, onAddChannel, onAddVideo }: { channels: ApprovedChannel[]; onAddChannel: (channel: ApprovedChannel) => Promise<void>; onAddVideo: (video: ApprovedVideo) => Promise<void> }) {
  const [adding, setAdding] = useState<'channel' | 'video' | null>(null);
  return (
    <View style={styles.manualSection}>
      <Text style={styles.listLabel}>ADD MANUALLY BY ID</Text>
      {adding === 'channel' ? <ChannelForm onCancel={() => setAdding(null)} onSave={async (channel) => { await onAddChannel(channel); setAdding(null); }} /> : null}
      {adding === 'video' ? <VideoForm channels={channels} onCancel={() => setAdding(null)} onSave={async (video) => { await onAddVideo(video); setAdding(null); }} /> : null}
      {!adding && (
        <View style={styles.addActions}>
          <AddButton label="Add channel" icon="radio" onPress={() => setAdding('channel')} />
          <AddButton label="Add video" icon="play-circle" onPress={() => setAdding('video')} />
        </View>
      )}
    </View>
  );
}

function ChannelForm({ onCancel, onSave }: { onCancel: () => void; onSave: (channel: ApprovedChannel) => Promise<void> }) {
  const [name, setName] = useState(''); const [channelId, setChannelId] = useState(''); const [sourceUrl, setSourceUrl] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  return <FormCard title="Add approved channel" subtitle="This lets videos from this channel appear in Kid Mode." onCancel={onCancel} onSave={async () => { // A pasted channel URL normalizes to the same id as typing it by hand.
    const resolvedChannelId = extractChannelId(channelId) ?? extractChannelId(sourceUrl) ?? ''; if (!name.trim() || !resolvedChannelId) { setError('Add a name and a valid channel ID (UC…) or channel URL.'); return; } await onSave({ id: id('channel'), name: name.trim(), channelId: resolvedChannelId, thumbnailUrl: thumbnailUrl.trim() || undefined, sourceUrl: sourceUrl.trim() || undefined, approved: true }); }}>
    <Field label="Channel name" value={name} onChangeText={setName} placeholder="e.g. Bluey" />
    <Field label="YouTube channel URL" value={sourceUrl} onChangeText={setSourceUrl} placeholder="Optional — for your reference" keyboardType="url" />
    <Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="UC…" autoCapitalize="none" />
    <Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" />
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}

function VideoForm({ channels, onCancel, onSave }: { channels: ApprovedChannel[]; onCancel: () => void; onSave: (video: ApprovedVideo) => Promise<void> }) {
  const [title, setTitle] = useState(''); const [videoInput, setVideoInput] = useState(''); const [channelName, setChannelName] = useState(''); const [channelId, setChannelId] = useState(''); const [duration, setDuration] = useState(''); const [thumbnailUrl, setThumbnailUrl] = useState(''); const [error, setError] = useState('');
  return <FormCard title="Add approved video" subtitle="Paste a video ID or URL. Nestling never searches or browses YouTube on its own." onCancel={onCancel} onSave={async () => { const youtubeVideoId = extractVideoId(videoInput); if (!title.trim() || !youtubeVideoId) { setError('Add a title and a valid video ID or YouTube URL.'); return; } await onSave({ id: id('video'), youtubeVideoId, title: title.trim(), thumbnailUrl: thumbnailUrl.trim() || undefined, channelId: channelId.trim() || undefined, channelName: channelName.trim() || undefined, duration: duration ? Number(duration) * 60 : undefined, sourceUrl: videoInput.trim(), approved: true }); }}>
    <Field label="Video title" value={title} onChangeText={setTitle} placeholder="e.g. A calm morning song" />
    <Field label="YouTube video URL or ID" value={videoInput} onChangeText={setVideoInput} placeholder="https://youtu.be/…" autoCapitalize="none" keyboardType="url" />
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Channel name" value={channelName} onChangeText={setChannelName} placeholder="Optional" /></View><View style={styles.halfField}><Field label="Channel ID" value={channelId} onChangeText={setChannelId} placeholder="Optional" autoCapitalize="none" /></View></View>
    {channels.length > 0 && <Text style={styles.helperText}>Tip: use a saved channel’s ID so its approved videos stay connected.</Text>}
    <View style={styles.twoFields}><View style={styles.halfField}><Field label="Duration (minutes)" value={duration} onChangeText={setDuration} placeholder="e.g. 5" keyboardType="number-pad" /></View><View style={styles.halfField}><Field label="Thumbnail URL" value={thumbnailUrl} onChangeText={setThumbnailUrl} placeholder="Optional" keyboardType="url" /></View></View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </FormCard>;
}

function FormCard({ title, subtitle, children, onCancel, onSave }: { title: string; subtitle: string; children: React.ReactNode; onCancel: () => void; onSave: () => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  return (
    <View style={styles.formPanel}>
      <View style={styles.formPanelHeader}>
        <View><Text style={styles.formPanelTitle}>{title}</Text><Text style={styles.formPanelSubtitle}>{subtitle}</Text></View>
        <FocusablePressable accessibilityLabel="Close form" style={styles.iconButton} onPress={onCancel}><Feather name="x" size={20} color={colors.muted} /></FocusablePressable>
      </View>
      {children}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <View style={styles.formButtonRow}>
        <SecondaryButton label="Cancel" onPress={onCancel} />
        <PrimaryButton
          label={saving ? 'Saving…' : 'Save approval'}
          disabled={saving}
          onPress={async () => {
            setSaving(true);
            setError('');
            try {
              await onSave();
            } catch (caught) {
              setError(caught instanceof Error ? caught.message : 'That could not be saved.');
            } finally {
              setSaving(false);
            }
          }}
          icon="check"
        />
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize = 'sentences' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'url' | 'number-pad'; autoCapitalize?: 'none' | 'sentences' }) {
  return <View style={styles.field}><Text style={styles.inputLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#B8B1AA" style={styles.textInput} keyboardType={keyboardType} autoCapitalize={autoCapitalize} /></View>;
}

function formatLockRemaining(ms: number) {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} min ${String(seconds).padStart(2, '0')} s` : `${seconds} seconds`;
}

function ParentPinModal({ visible, pin, setPin, error, lockRemainingMs, resetting, onClose, onSubmit, onReset }: {
  visible: boolean;
  pin: string;
  setPin: (value: string) => void;
  error: string;
  lockRemainingMs: number;
  resetting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onReset: () => void;
}) {
  const [stage, setStage] = useState<'pin' | 'reset'>('pin');
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    if (visible) return;
    setStage('pin');
    setConfirmText('');
  }, [visible]);

  const locked = lockRemainingMs > 0;
  const canConfirmReset = parentResetService.confirmationMatches(confirmText) && !resetting;

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalScrim}>
        <ScrollView style={styles.pinModal} contentContainerStyle={styles.pinModalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalIcon}><Feather name="lock" size={22} color={colors.ink} /></View>
          <Text style={styles.modalTitle}>Parent check</Text>
          {locked ? (
            <>
              <Text style={styles.modalBody}>
                Too many tries, so PIN entry is locked for {formatLockRemaining(lockRemainingMs)}. The lockout is stored on this device
                and survives a restart.
              </Text>
              {stage === 'pin' ? (
                <FocusablePressable
                  accessibilityLabel="Forgot the parent PIN"
                  style={styles.modalCancel}
                  onPress={() => setStage('reset')}
                >
                  <Text style={styles.modalCancelText}>Forgot your PIN?</Text>
                </FocusablePressable>
              ) : (
                <View style={styles.resetCard}>
                  <Text style={styles.inputLabel}>Reset the parent PIN</Text>
                  <Text style={styles.modalBody}>
                    There is no way to recover a forgotten PIN on this device, so this clears the PIN along with everything you approved:
                    library, approvals, categories, per-child rules, schedules and watch history. It cannot be undone.
                  </Text>
                  <Text style={[styles.inputLabel, styles.resetLabelMargin]}>Type {resetConfirmationPhrase} to continue</Text>
                  <TextInput
                    value={confirmText}
                    onChangeText={setConfirmText}
                    placeholder={resetConfirmationPhrase}
                    placeholderTextColor="#B8B1AA"
                    style={styles.textInput}
                    autoCapitalize="characters"
                  />
                  <View style={styles.formButtonRow}>
                    <SecondaryButton label="Back" onPress={() => setStage('pin')} />
                    <PrimaryButton
                      label={resetting ? 'Resetting…' : 'Reset everything'}
                      disabled={!canConfirmReset}
                      onPress={onReset}
                      icon="alert-triangle"
                    />
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.modalBody}>
                Enter your 4-digit PIN to open grown-up settings. Use the keypad below with a TV remote.
              </Text>
              <PinEntry pin={pin} onChange={setPin} onSubmit={onSubmit} error={error} submitLabel="Unlock parent mode" />
            </>
          )}
          <FocusablePressable accessibilityLabel="Close parent check" style={styles.modalCancel} onPress={onClose}>
            <Text style={styles.modalCancelText}>Not now</Text>
          </FocusablePressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function PlayerScreen({ video, profile, settings, nextVideo, retrySignal = 0, onNextVideo, onUsageChange, onBack, onSaveHistory, onPlaybackCompleted, onParentOverride }: {
  video: ApprovedVideo;
  profile?: ChildProfile;
  settings: Phase3Settings;
  nextVideo?: ApprovedVideo;
  retrySignal?: number;
  onNextVideo: (video: ApprovedVideo) => void;
  onUsageChange: () => void;
  onBack: () => void;
  onSaveHistory: (item: WatchHistory) => void;
  onPlaybackCompleted: () => void;
  onParentOverride?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState((video.duration ?? 0) * 1000);
  const [progressWidth, setProgressWidth] = useState(0);
  const [error, setError] = useState<PlayerError | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [segments, setSegments] = useState<SponsorSegment[]>([]);
  const [policyMessage, setPolicyMessage] = useState('');
  const [timeBlocked, setTimeBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const wasPlayingBeforeBackground = useRef(false);
  const isPlayingRef = useRef(false);
  const progressRef = useRef(0);
  const lastPersistedAt = useRef(0);
  const lastPlayheadMs = useRef<number | null>(null);
  const lastSkippedSegment = useRef<string | null>(null);
  const stoppedByPolicy = useRef(false);
  const warnedThreshold = useRef<number | null>(null);
  const accountingQueue = useRef(Promise.resolve());
  const recoveryAttempt = useRef(0);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessDecision = profile
    ? playbackPolicy.canPlay({ profileId: profile.id, videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds })
    : ({ allowed: false, reason: 'VIDEO_NOT_APPROVED' } as PlaybackDecision);
  const isAllowed = accessDecision.allowed;
  const resumableAdapter = playerAdapter as ResumablePlayerAdapter;

  useEffect(() => {
    setProgress(0);
    setDurationMs((video.duration ?? 0) * 1000);
    setError(null);
    setPolicyMessage('');
    setWarningMessage('');
    setRecoveryMessage('');
    setTimeBlocked(false);
    setHasEnded(false);
    progressRef.current = 0;
    lastPlayheadMs.current = null;
    recoveryAttempt.current = 0;
    lastSkippedSegment.current = null;
    stoppedByPolicy.current = false;
  }, [video.youtubeVideoId]);

  // A new video is a new playback session: the recovery budget starts over.
  useEffect(() => () => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
  }, []);

  useEffect(() => {
    if (!settings.sponsorBlockEnabled) {
      setSegments([]);
      return;
    }
    let active = true;
    void sponsorBlockService
      .getSkippableSegments(video.youtubeVideoId, settings.sponsorBlockCategories)
      .then((nextSegments) => { if (active) setSegments(nextSegments); });
    return () => { active = false; };
  }, [settings.sponsorBlockCategories, settings.sponsorBlockEnabled, video.youtubeVideoId]);

  function stopForPolicy(decision: PlaybackDecision) {
    if (stoppedByPolicy.current) return;
    stoppedByPolicy.current = true;
    isPlayingRef.current = false;
    lastPlayheadMs.current = null;
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    setRecoveryMessage('');
    void playerAdapter.stop().catch(() => undefined);
    explainDecision(decision);
  }

  function explainDecision(decision: PlaybackDecision) {
    if (decision.allowed) return;
    setPolicyMessage(describePlaybackDecision(decision));
    setTimeBlocked(isTimeRelatedReason(decision));
  }

  function accountPlayback(seconds: number) {
    if (!profile || seconds <= 0) return;
    const remaining = playbackPolicy.getRemainingSeconds(profile.id);
    if (remaining !== null && remaining <= 0) {
      stopForPolicy({ allowed: false, reason: 'SCREEN_TIME_EXCEEDED' });
      return;
    }
    const counted = remaining === null ? seconds : Math.min(seconds, remaining);
    if (counted <= 0) return;
    accountingQueue.current = accountingQueue.current.then(async () => {
      const currentRemaining = profile ? playbackPolicy.getRemainingSeconds(profile.id) : 0;
      const currentCounted = currentRemaining === null ? seconds : Math.min(seconds, currentRemaining);
      if (currentCounted <= 0) {
        if (currentRemaining === 0) stopForPolicy({ allowed: false, reason: 'SCREEN_TIME_EXCEEDED' });
        return;
      }
      screenTimeService.recordPlaybackSeconds(profile.id, currentCounted);
      onUsageChange();
      const nextRemaining = playbackPolicy.getRemainingSeconds(profile.id);
      if (nextRemaining !== null) {
        const warning = [600, 300, 60].find((threshold) => nextRemaining <= threshold && warnedThreshold.current !== threshold);
        if (settings.screenTimeWarningsEnabled && warning !== undefined) {
          warnedThreshold.current = warning;
          setWarningMessage(`${Math.max(1, Math.ceil(nextRemaining / 60))} minutes of playtime left`);
        }
        if (nextRemaining === 0) stopForPolicy({ allowed: false, reason: 'SCREEN_TIME_EXCEEDED' });
      }
    }).catch(() => undefined);
  }

  function persistProgress(currentProgress = progressRef.current) {
    if (profile) {
      onSaveHistory({ profileId: profile.id, videoId: video.youtubeVideoId, watchedAt: new Date().toISOString(), progress: currentProgress });
    }
  }

  /** Playhead-based: a stalled, paused or recovering player never earns watch time. */
  function accountPlayhead(positionMs: number, playing: boolean) {
    const result = accountPlayheadSample(lastPlayheadMs.current, positionMs, playing);
    lastPlayheadMs.current = result.lastPositionMs;
    if (result.seconds > 0) accountPlayback(result.seconds);
  }

  /** Bounded, backed-off retry after the native player exhausted its own attempts. */
  function handlePlayerError(nextError: PlayerError) {
    setError(nextError);
    setRecoveryMessage('');
    if (!profile) return;
    if (stoppedByPolicy.current) return;
    if (!shouldAutoRecover(nextError, recoveryAttempt.current)) return;

    const attempt = recoveryAttempt.current + 1;
    recoveryAttempt.current = attempt;
    const delay = recoveryDelayMs(attempt);
    setRecoveryMessage(recoveryStatusText(attempt, defaultRecoveryPolicy.maxAttempts));
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => {
      recoveryTimer.current = null;
      setRecoveryMessage('');
      retryPlayback();
    }, delay);
  }

  useEffect(() => {
    if (!isAllowed || !isNativeYouTubePlayerAvailable) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        wasPlayingBeforeBackground.current = isPlayingRef.current;
        if (isPlayingRef.current) {
          lastPlayheadMs.current = null;
          void playerAdapter.pause().catch(() => undefined);
          persistProgress();
        }
        // Never leave pending watch time or history in memory when the app may be killed.
        void screenTimeService.flush();
      }
      if (nextState === 'active' && wasPlayingBeforeBackground.current) {
        const decision = profile ? playbackPolicy.canContinuePlayback(profile.id) : { allowed: false as const, reason: 'SCREEN_TIME_EXCEEDED' as const };
        if (!decision.allowed) stopForPolicy(decision);
        else
          void resumableAdapter
            .resume(video.youtubeVideoId)
            .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
      }
    });
    return () => {
      subscription.remove();
      persistProgress();
      void playerAdapter.stop().catch(() => undefined);
      // Leaving the player must not strand pending watch time in memory.
      void screenTimeService.flush();
    };
  }, [isAllowed, isNativeYouTubePlayerAvailable, video.youtubeVideoId]);

  useEffect(() => {
    if (!retrySignal) return;
    // A parent override is a user action: it restores the retry budget.
    manualRetryPlayback();
  }, [retrySignal]);

  function leavePlayer() {
    progressRef.current = progress;
    persistProgress();
    void playerAdapter.stop().catch(() => undefined);
    void screenTimeService.flush();
    onBack();
  }

  function selectNextVideo() {
    if (nextVideo) onNextVideo(nextVideo);
  }

  function retryPlayback() {
    if (profile) {
      const decision = playbackPolicy.canPlay({
        profileId: profile.id,
        videoId: video.youtubeVideoId,
        channelId: video.channelId,
        categoryIds: video.categoryIds,
      });
      if (!decision.allowed) {
        stopForPolicy(decision);
        return;
      }
    }
    setError(null);
    setPolicyMessage('');
    setRecoveryMessage('');
    setTimeBlocked(false);
    stoppedByPolicy.current = false;
    lastPlayheadMs.current = null;
    void playerAdapter
      .play(video.youtubeVideoId)
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  /** Manual retry from a child/parent tap: restores the recovery budget. */
  function manualRetryPlayback() {
    recoveryAttempt.current = 0;
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    retryPlayback();
  }

  function togglePlayback() {
    if (!isPlaying && profile) {
      const decision = playbackPolicy.canContinuePlayback(profile.id);
      if (!decision.allowed) {
        stopForPolicy(decision);
        return;
      }
    }
    const command = isPlaying ? playerAdapter.pause() : resumableAdapter.resume(video.youtubeVideoId);
    void command
      .then(() => { const nextPlaying = !isPlaying; isPlayingRef.current = nextPlaying; setIsPlaying(nextPlaying); setError(null); if (nextPlaying) recoveryAttempt.current = 0; })
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  function seekFromProgress(locationX: number) {
    if (progressWidth <= 0 || durationMs <= 0) return;
    const nextProgress = Math.max(0, Math.min(locationX / progressWidth, 1));
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    // A seek is a discontinuity: the next sample only re-anchors, it does not credit time.
    lastPlayheadMs.current = null;
    void playerAdapter
      .seek(nextProgress * durationMs)
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  if (!isAllowed) {
    return (
      <View style={styles.playerScreen}>
        <PlayerHeader onBack={leavePlayer} />
        <BlockedPlayer message={describePlaybackDecision(accessDecision)} onBack={onBack} />
      </View>
    );
  }

  if (!isNativeYouTubePlayerAvailable) {
    return <View style={styles.playerScreen}><PlayerHeader onBack={leavePlayer} /><View style={styles.blockedPlayer}><View style={styles.blockedIcon}><Feather name="smartphone" size={30} color={colors.ink} /></View><Text style={styles.blockedTitle}>Android player build required</Text><Text style={styles.blockedBody}>Install the native development build to play approved videos on Android phones, tablets, and TV.</Text><SecondaryButton label="Go back" onPress={onBack} /></View></View>;
  }

  return (
    <View style={styles.playerScreen}>
      <PlayerHeader onBack={leavePlayer} />
      <View style={styles.nativePlayerStage}>
        <YouTubePlayer
          autoplay
          videoId={video.youtubeVideoId}
          style={styles.nativePlayer}
          onLoad={() => { setError(null); setIsBuffering(true); }}
          onReady={(event) => {
            setIsBuffering(false);
            setRecoveryMessage('');
            if (event.nativeEvent.duration) setDurationMs(event.nativeEvent.duration);
          }}
          onRetry={(event) => {
            // The native player is refreshing the stream itself; keep the state honest and do not
            // credit any watch time while it recovers.
            lastPlayheadMs.current = null;
            setIsBuffering(true);
            setError(null);
            setRecoveryMessage(
              event.nativeEvent.attempt && event.nativeEvent.attempts
                ? recoveryStatusText(event.nativeEvent.attempt, event.nativeEvent.attempts)
                : 'Trying again…',
            );
          }}
          onPlay={() => {
            const decision = profile ? playbackPolicy.canContinuePlayback(profile.id) : { allowed: false as const, reason: 'SCREEN_TIME_EXCEEDED' as const };
            if (!decision.allowed) { stopForPolicy(decision); return; }
            stoppedByPolicy.current = false;
            setHasEnded(false);
            isPlayingRef.current = true;
            // Note: the recovery budget is NOT reset here. Resetting on every successful start
            // would let a flapping stream retry forever; only a user action restores it.
            setRecoveryMessage('');
            // The *message* is a different thing from the budget: playback is running, so a
            // previous failure is stale. Without this, a recovered start left "This video
            // couldn't start" and a Try again button on screen over a playing video.
            setError(null);
            setIsPlaying(true);
            setIsBuffering(false);
          }}
          onPause={() => { lastPlayheadMs.current = null; isPlayingRef.current = false; setIsPlaying(false); }}
          onBuffer={() => { lastPlayheadMs.current = null; setIsBuffering(true); }}
          onProgress={(event) => {
            const nativeDuration = event.nativeEvent.duration;
            const nextDuration = nativeDuration && nativeDuration > 0 ? nativeDuration : durationMs;
            const positionMs = event.nativeEvent.position ?? 0;
            const playing = Boolean(event.nativeEvent.isPlaying && !stoppedByPolicy.current);
            accountPlayhead(positionMs, playing);
            if (nextDuration <= 0) return;
            const nextProgress = Math.min(positionMs / nextDuration, 1);
            progressRef.current = nextProgress;
            setDurationMs(nextDuration);
            setProgress(nextProgress);
            const segment = sponsorBlockService.isInsideSegment(positionMs / 1000, segments);
            if (segment) {
              const segmentKey = segment.uuid ?? `${segment.start}-${segment.end}`;
              if (lastSkippedSegment.current !== segmentKey) {
                lastSkippedSegment.current = segmentKey;
                void playerAdapter.seek(segment.end * 1000).catch(() => undefined);
              }
            }
            if (profile && Date.now() - lastPersistedAt.current > 2000) {
              lastPersistedAt.current = Date.now();
              persistProgress(nextProgress);
            }
            const decision = profile ? playbackPolicy.canContinuePlayback(profile.id) : { allowed: false as const, reason: 'SCREEN_TIME_EXCEEDED' as const };
            if (!decision.allowed && playing) stopForPolicy(decision);
          }}
          onEnd={() => {
            lastPlayheadMs.current = null;
            isPlayingRef.current = false;
            progressRef.current = 1;
            setIsPlaying(false);
            setIsBuffering(false);
            setHasEnded(true);
            setRecoveryMessage('');
            persistProgress(1);
            void screenTimeService.flush();
            // A one-playback approval expires as soon as playback finishes.
            onPlaybackCompleted();
            if (profile && nextVideo && playbackPolicy.shouldAutoplay(profile.id)) onNextVideo(nextVideo);
          }}
          onError={(event) => {
            lastPlayheadMs.current = null;
            isPlayingRef.current = false;
            setIsPlaying(false);
            setIsBuffering(false);
            handlePlayerError(normalizePlayerError(event.nativeEvent));
          }}
        />
      </View>
      <View style={styles.playerInfo}>
        <Text style={styles.playerTitle}>{video.title}</Text>
        <View style={styles.playerChannelRow}>
          <ChannelAvatar name={video.channelName?.trim() || 'Approved by your parent'} size={34} />
          <Text style={styles.playerChannel}>{video.channelName?.trim() || 'Approved by your parent'}</Text>
        </View>
        {recoveryMessage ? (
          <Text style={styles.warningText}>{recoveryMessage}</Text>
        ) : isBuffering ? (
          <Text style={styles.nativeHint}>Getting the nest ready…</Text>
        ) : error ? (
          <View>
            <Text style={styles.playerErrorText}>{error.message}</Text>
            <SecondaryButton label="Try again" onPress={manualRetryPlayback} />
          </View>
        ) : policyMessage ? (
          <Text style={styles.playerErrorText}>{policyMessage}</Text>
        ) : warningMessage ? (
          <Text style={styles.warningText}>{warningMessage}</Text>
        ) : (
          <Text style={styles.nativeHint}>Playback is handled by the Android Media3 player.</Text>
        )}
        {policyMessage && timeBlocked && onParentOverride ? (
          <FocusablePressable accessibilityLabel="Parent override" style={styles.overrideButton} onPress={onParentOverride}>
            <Feather name="unlock" size={17} color="#fff" />
            <Text style={styles.overrideButtonText}>Parent Override</Text>
          </FocusablePressable>
        ) : null}
        <FocusablePressable style={styles.progressTrack} onPress={(event) => seekFromProgress(event.nativeEvent.locationX)} onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)} accessibilityLabel="Seek video">
          <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 1)}%` }]} />
        </FocusablePressable>
        <View style={styles.timeRow}><Text style={styles.timeText}>{formatDuration(Math.round((durationMs / 1000) * progress))}</Text><Text style={styles.timeText}>{formatDuration(Math.round(durationMs / 1000) || video.duration)}</Text></View>
        <FocusablePressable accessibilityLabel={isPlaying ? 'Pause video' : 'Resume video'} style={styles.playerControl} onPress={togglePlayback}><Feather name={isPlaying ? 'pause' : 'play'} size={20} color={yt.text} /><Text style={styles.playerControlText}>{isPlaying ? 'Pause' : 'Resume'} preview</Text></FocusablePressable>
        {hasEnded && nextVideo ? <FocusablePressable accessibilityLabel="Play next approved video" style={styles.playerControl} onPress={selectNextVideo}><Feather name="skip-forward" size={20} color={yt.text} /><Text style={styles.playerControlText}>Next approved video</Text></FocusablePressable> : null}
      </View>
      {nextVideo && nextVideo.id !== video.id ? (
        <>
          <Text style={styles.upNextLabel}>Up next</Text>
          <FeedVideoCard video={nextVideo} onPress={() => onNextVideo(nextVideo)} />
        </>
      ) : null}
    </View>
  );
}

function PlayerHeader({ onBack }: { onBack: () => void }) {
  return <View style={styles.playerTopBar}><FocusablePressable accessibilityLabel="Back to videos" style={styles.backButton} onPress={onBack}><Feather name="arrow-down" size={24} color={yt.text} /></FocusablePressable></View>;
}

function BlockedPlayer({ onBack, message }: { onBack: () => void; message: string }) {
  return <View style={styles.blockedPlayer}><View style={styles.blockedIcon}><Feather name="shield-off" size={30} color={colors.danger} /></View><Text style={styles.blockedTitle}>Playback blocked</Text><Text style={styles.blockedBody}>{message}</Text><SecondaryButton label="Go back" onPress={onBack} /></View>;
}

function PrimaryButton({ label, onPress, icon, disabled = false }: { label: string; onPress: () => void; icon?: keyof typeof Feather.glyphMap; disabled?: boolean }) { return <FocusablePressable disabled={disabled} accessibilityLabel={label} style={styles.primaryButton} onPress={onPress}><Text style={styles.primaryButtonText}>{label}</Text>{icon ? <Feather name={icon} size={18} color="#fff" /> : null}</FocusablePressable>; }
function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) { return <FocusablePressable accessibilityLabel={label} style={styles.secondaryButton} onPress={onPress}><Text style={styles.secondaryButtonText}>{label}</Text></FocusablePressable>; }
function AddButton({ label, icon, onPress }: { label: string; icon: keyof typeof Feather.glyphMap; onPress: () => void }) { return <FocusablePressable accessibilityLabel={label} style={styles.addButton} onPress={onPress}><Feather name={icon} size={18} color={colors.ink} /><Text style={styles.addButtonText}>{label}</Text><Feather name="plus" size={16} color={colors.ink} /></FocusablePressable>; }

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.canvas }, safeAreaDark: { backgroundColor: yt.bg }, screen: { flex: 1 }, centered: { alignItems: 'center', justifyContent: 'center' }, loadingText: { color: colors.muted, fontSize: 16, marginTop: 14 },
  setupFlex: { flex: 1 }, setupScreen: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 18, justifyContent: 'space-between', paddingBottom: 22 }, brandRow: { alignItems: 'center', flexDirection: 'row', gap: 9 }, logoMark: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 22, height: 54, justifyContent: 'center', width: 54 }, logoMarkSmall: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 }, brandName: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.8 }, setupHero: { alignItems: 'center', marginVertical: 20, paddingHorizontal: 16 }, heroOrb: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 42, height: 84, justifyContent: 'center', marginBottom: 20, width: 84 }, eyebrow: { color: colors.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' }, heroTitle: { color: colors.ink, fontSize: 38, fontWeight: '800', letterSpacing: -1.2, lineHeight: 42, marginTop: 9, textAlign: 'center' }, heroBody: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 16, maxWidth: 350, textAlign: 'center' }, formCard: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 24, borderWidth: 1, padding: 20, shadowColor: '#D7CFC5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 18, elevation: 3 }, inputLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 8 }, pinInput: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 14, borderWidth: 1, color: colors.ink, fontSize: 28, fontWeight: '800', height: 58, letterSpacing: 11, paddingHorizontal: 18, textAlign: 'center' }, textInput: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 13, borderWidth: 1, color: colors.ink, fontSize: 16, height: 50, paddingHorizontal: 14 }, inputError: { borderColor: colors.danger }, helperText: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8 }, errorText: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 8 }, primaryButton: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 14, flexDirection: 'row', gap: 10, height: 50, justifyContent: 'center', marginTop: 18, paddingHorizontal: 18 }, primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' }, buttonPressed: { opacity: 0.78 }, buttonDisabled: { opacity: 0.55 }, avatarPicker: { flexDirection: 'row', gap: 11 }, avatarOption: { alignItems: 'center', backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 50, justifyContent: 'center', width: 50 }, avatarOptionSelected: { backgroundColor: colors.lavender, borderColor: colors.purple },
  parentSectionTitle: { color: colors.ink, fontSize: 20, fontWeight: '800' }, parentSectionBody: { color: colors.muted, fontSize: 13, marginTop: 4 }, sectionIntro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 }, addActions: { flexDirection: 'row', gap: 10, marginTop: 12 }, addButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 7, height: 50, justifyContent: 'center' }, addButtonText: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '800' }, manualSection: { marginTop: 6 }, listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 26 }, profileRow: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 15, borderWidth: 1, flexDirection: 'row', marginBottom: 8, minHeight: 68, padding: 9 }, profileRowInfo: { flex: 1, paddingHorizontal: 11 }, rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' }, rowSubtitle: { color: colors.muted, fontSize: 12, marginTop: 4 }, iconButton: { alignItems: 'center', height: 46, justifyContent: 'center', width: 42 }, formPanel: { backgroundColor: colors.card, borderColor: colors.purple, borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 16 }, formPanelHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }, formPanelTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' }, formPanelSubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4, maxWidth: 280 }, field: { marginBottom: 12 }, twoFields: { flexDirection: 'row', gap: 10 }, halfField: { flex: 1 }, formButtonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 5 }, secondaryButton: { alignItems: 'center', borderColor: colors.line, borderRadius: 14, borderWidth: 1, height: 50, justifyContent: 'center', marginTop: 18, paddingHorizontal: 18 }, secondaryButtonText: { color: colors.ink, fontSize: 14, fontWeight: '800' }, profileManagerCard: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 16 }, smallAction: { backgroundColor: colors.lavender, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }, smallActionText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  playerScreen: { backgroundColor: yt.bg, flex: 1 }, playerTopBar: { alignItems: 'center', flexDirection: 'row', height: 52, paddingHorizontal: 4 }, nativeBadge: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 10, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 6 }, nativePlayerStage: { aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden', width: '100%' }, nativePlayer: { flex: 1 }, nativeHint: { color: yt.textDim, fontSize: 12.5, marginTop: 10 }, backButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, mockBadge: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 10, flexDirection: 'row', gap: 5, paddingHorizontal: 8, paddingVertical: 6 }, mockDot: { backgroundColor: colors.purple, borderRadius: 4, height: 7, width: 7 }, mockBadgeText: { color: colors.ink, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, playerInfo: { paddingHorizontal: 12, paddingTop: 14 }, playerTitle: { color: yt.text, fontSize: 17, fontWeight: '600', lineHeight: 23 }, playerChannel: { color: yt.textDim, fontSize: 13 }, warningText: { color: yt.text, fontSize: 13, fontWeight: '700', marginTop: 10 }, progressTrack: { backgroundColor: yt.surfaceAlt, borderRadius: 2, height: 20, justifyContent: 'center', marginTop: 18 }, progressFill: { backgroundColor: yt.accent, borderRadius: 2, height: 4 }, timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }, timeText: { color: yt.textDim, fontSize: 12, fontWeight: '600' }, playerControl: { alignItems: 'center', backgroundColor: yt.surfaceAlt, borderRadius: 22, flexDirection: 'row', gap: 9, height: 44, justifyContent: 'center', marginTop: 16 }, playerControlText: { color: yt.text, fontSize: 14, fontWeight: '700' }, overrideButton: { alignItems: 'center', backgroundColor: yt.accent, borderRadius: 22, flexDirection: 'row', gap: 9, height: 44, justifyContent: 'center', marginTop: 14 }, overrideButtonText: { color: '#fff', fontSize: 15, fontWeight: '800' }, blockedPlayer: { alignItems: 'center', backgroundColor: yt.surface, borderRadius: 14, margin: 12, padding: 28 }, blockedIcon: { alignItems: 'center', backgroundColor: '#FBE5E3', borderRadius: 30, height: 60, justifyContent: 'center', width: 60 }, blockedTitle: { color: yt.text, fontSize: 18, fontWeight: '700', marginTop: 16, textAlign: 'center' }, blockedBody: { color: yt.textDim, fontSize: 13.5, lineHeight: 20, marginTop: 8, textAlign: 'center' }, playerErrorText: { color: '#FF6E6E', fontSize: 13, lineHeight: 19, marginTop: 10 }, playerChannelRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 12 }, upNextLabel: { color: yt.text, fontSize: 14, fontWeight: '700', paddingBottom: 10, paddingHorizontal: 12, paddingTop: 22 }, modalScrim: { alignItems: 'center', backgroundColor: 'rgba(36, 48, 71, 0.48)', flex: 1, justifyContent: 'center', padding: 20 }, pinModal: { maxHeight: '92%', width: '100%' }, pinModalContent: { backgroundColor: colors.card, borderRadius: 24, padding: 20 }, modalIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 }, modalTitle: { color: colors.ink, fontSize: 24, fontWeight: '800', marginTop: 15 }, modalBody: { color: colors.muted, fontSize: 14, lineHeight: 21, marginBottom: 16, marginTop: 6 }, modalCancel: { alignItems: 'center', height: 46, justifyContent: 'center', marginTop: 12 }, modalCancelText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  resetCard: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 16, borderWidth: 1, marginTop: 6, padding: 14 },
  resetLabelMargin: { marginTop: 14 },
});

export default App;
