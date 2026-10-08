import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { isNativeYouTubePlayerAvailable } from '../../native';
import { normalizePlayerError, playerErrorCodeOf, PlayerError } from '../../services/playerErrors';
import { playerAdapter } from '../../services/playerAdapterInstance';
import { ResumablePlayerAdapter } from '../../services/playerAdapter';
import { ApprovedVideo, ChildProfile, WatchHistory } from '../../types';
import { PlaybackSettings, PlaybackDecision } from '../../playbackTypes';
import { describePlaybackDecision, isTimeRelatedReason, playbackPolicy } from '../../services/playbackPolicyService';
import { screenTimeService } from '../../services/screenTimeService';
import { accountPlayheadSample } from '../../services/screenTimeAccounting';
import {
  defaultRecoveryPolicy,
  recoveryDelayMs,
  recoveryStatusText,
  shouldAutoRecover,
} from '../../services/playbackRecovery';
import { sponsorBlockService, SponsorSegment } from '../../services/sponsorBlockService';

export type PlayerScreenProps = {
  video: ApprovedVideo;
  profile?: ChildProfile;
  settings: PlaybackSettings;
  nextVideo?: ApprovedVideo;
  retrySignal?: number;
  onNextVideo: (video: ApprovedVideo) => void;
  onUsageChange: () => void;
  onBack: () => void;
  onSaveHistory: (item: WatchHistory) => void;
  onPlaybackCompleted: () => void;
  onParentOverride?: () => void;
};

/**
 * All of the native-player wiring for one video: progress/buffering/error state, screen-time
 * accounting, sponsor-segment skipping, background/foreground recovery and the bounded,
 * backed-off retry after a native failure. `PlayerScreen` stays a render function over this.
 */
export function usePlayer({
  video,
  profile,
  settings,
  nextVideo,
  retrySignal = 0,
  onNextVideo,
  onUsageChange,
  onBack,
  onSaveHistory,
  onPlaybackCompleted,
  onParentOverride,
}: PlayerScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [wantsPlayback, setWantsPlayback] = useState(true);
  const wantsPlaybackRef = useRef(true);
  const [progress, setProgress] = useState(0);
  const [durationMs, setDurationMs] = useState((video.duration ?? 0) * 1000);
  const [bufferedMs, setBufferedMs] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState<PlayerError | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  // A switch to a new video (or the very first one) leaves the native surface showing whatever
  // frame it last rendered until the new stream actually starts — with no error and no visible
  // change, a tap on "next" or "up next" looked like it had done nothing. Covering the surface
  // with this video's own thumbnail until real playback starts (`onReady`/`onPlay`) gives instant
  // feedback that the switch happened, the same way YouTube's own player does.
  const [showThumbnailCover, setShowThumbnailCover] = useState(true);
  const [segments, setSegments] = useState<SponsorSegment[]>([]);
  const [policyMessage, setPolicyMessage] = useState('');
  const [timeBlocked, setTimeBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const wasPlayingBeforeBackground = useRef(false);
  const isPlayingRef = useRef(false);
  const progressRef = useRef(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedAt = useRef(0);
  const lastPlayheadMs = useRef<number | null>(null);
  const lastSkippedSegment = useRef<string | null>(null);
  const stoppedByPolicy = useRef(false);
  const warnedThreshold = useRef<number | null>(null);
  const accountingQueue = useRef(Promise.resolve());
  const recoveryAttempt = useRef(0);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Guards against re-issuing Up next resolution on every progress tick. */
  const hasPrefetchedNext = useRef(false);
  const accessDecision = profile
    ? playbackPolicy.canPlay({ profileId: profile.id, videoId: video.youtubeVideoId, channelId: video.channelId, categoryIds: video.categoryIds })
    : ({ allowed: false, reason: 'VIDEO_NOT_APPROVED' } as PlaybackDecision);
  const isAllowed = accessDecision.allowed;
  const resumableAdapter = playerAdapter as ResumablePlayerAdapter;

  useEffect(() => {
    wantsPlaybackRef.current = true;
    setWantsPlayback(true);
    isPlayingRef.current = false;
    setIsPlaying(false);
    wasPlayingBeforeBackground.current = false;
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    setProgress(0);
    setBufferedMs(0);
    setDurationMs((video.duration ?? 0) * 1000);
    setError(null);
    setPolicyMessage('');
    setWarningMessage('');
    setRecoveryMessage('');
    setTimeBlocked(false);
    setHasEnded(false);
    setControlsVisible(true);
    setShowThumbnailCover(true);
    progressRef.current = 0;
    lastPlayheadMs.current = null;
    recoveryAttempt.current = 0;
    lastSkippedSegment.current = null;
    stoppedByPolicy.current = false;
    hasPrefetchedNext.current = false;
  }, [video.youtubeVideoId]);

  // A new video is a new playback session: the recovery budget starts over.
  useEffect(() => () => {
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = null;
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
    wantsPlaybackRef.current = false;
    setWantsPlayback(false);
    isPlayingRef.current = false;
    lastPlayheadMs.current = null;
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    setRecoveryMessage('');
    setShowThumbnailCover(false);
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
    if (stoppedByPolicy.current || !wantsPlaybackRef.current || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    if (!shouldAutoRecover(nextError, recoveryAttempt.current)) return;

    const attempt = recoveryAttempt.current + 1;
    recoveryAttempt.current = attempt;
    const delay = recoveryDelayMs(attempt);
    setRecoveryMessage(recoveryStatusText(attempt, defaultRecoveryPolicy.maxAttempts));
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = setTimeout(() => {
      recoveryTimer.current = null;
      setRecoveryMessage('');
      if (wantsPlaybackRef.current && AppState.currentState !== 'background' && AppState.currentState !== 'inactive') retryPlayback();
    }, delay);
  }

  useEffect(() => {
    if (!isAllowed || !isNativeYouTubePlayerAvailable) return;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background' || nextState === 'inactive') {
        wasPlayingBeforeBackground.current = wantsPlaybackRef.current;
        if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
        recoveryTimer.current = null;
        if (wantsPlaybackRef.current) {
          lastPlayheadMs.current = null;
          void playerAdapter.pause().catch(() => undefined);
          persistProgress();
        }
        // Never leave pending watch time or history in memory when the app may be killed.
        void screenTimeService.flush();
      }
      if (nextState === 'active' && wasPlayingBeforeBackground.current) {
        wasPlayingBeforeBackground.current = false;
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
    setShowThumbnailCover(true);
    stoppedByPolicy.current = false;
    lastPlayheadMs.current = null;
    void resumableAdapter
      .resume(video.youtubeVideoId)
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  /** Manual retry from a child/parent tap: restores the recovery budget. */
  function manualRetryPlayback() {
    recoveryAttempt.current = 0;
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    wantsPlaybackRef.current = true;
    setWantsPlayback(true);
    retryPlayback();
  }

  function togglePlayback() {
    const nextPlaying = !wantsPlaybackRef.current;
    if (nextPlaying && profile) {
      const decision = playbackPolicy.canContinuePlayback(profile.id);
      if (!decision.allowed) {
        stopForPolicy(decision);
        return;
      }
    }
    wantsPlaybackRef.current = nextPlaying;
    setWantsPlayback(nextPlaying);
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
    recoveryTimer.current = null;
    setRecoveryMessage('');
    if (!nextPlaying) showControls(true);
    const command = nextPlaying ? resumableAdapter.resume(video.youtubeVideoId) : playerAdapter.pause();
    void command
      .then(() => { setError(null); if (nextPlaying) recoveryAttempt.current = 0; })
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  /** Control visibility: sticky when paused, auto-hidden a few seconds into playback. */
  function showControls(sticky: boolean) {
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = null;
    setControlsVisible(true);
    if (!sticky) controlsTimer.current = setTimeout(() => setControlsVisible(false), 4000);
  }

  function toggleControls() {
    if (controlsVisible) {
      if (controlsTimer.current) clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
      setControlsVisible(false);
    } else {
      showControls(!isPlayingRef.current);
    }
  }

  function seekToPosition(targetMs: number) {
    if (durationMs <= 0) return;
    const clamped = Math.max(0, Math.min(targetMs, durationMs));
    const nextProgress = clamped / durationMs;
    progressRef.current = nextProgress;
    setProgress(nextProgress);
    // A seek is a discontinuity: the next sample only re-anchors, it does not credit time.
    lastPlayheadMs.current = null;
    void playerAdapter
      .seek(clamped)
      .catch((caught) => handlePlayerError(normalizePlayerError({ code: playerErrorCodeOf(caught) ?? 'playback_failure' })));
  }

  function skipBy(deltaMs: number) {
    seekToPosition(progress * durationMs + deltaMs);
  }

  function onCenterPlay() {
    if (hasEnded) seekToPosition(0);
    togglePlayback();
  }

  const nativeHandlers = {
    onLoad: () => { setError(null); setIsBuffering(true); },
    onReady: (event: { nativeEvent: { duration?: number } }) => {
      setIsBuffering(false);
      setShowThumbnailCover(false);
      setRecoveryMessage('');
      if (event.nativeEvent.duration) setDurationMs(event.nativeEvent.duration);
    },
    onRetry: (event: { nativeEvent: { attempt?: number; attempts?: number } }) => {
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
    },
    onPlay: () => {
      if (!wantsPlaybackRef.current || AppState.currentState === 'background' || AppState.currentState === 'inactive') {
        void playerAdapter.pause().catch(() => undefined);
        return;
      }
      // A real onPlay means the stream is rendering frames, whatever happens next (including a
      // policy block below) — the frozen-old-frame/blank moment this covers for is over.
      setShowThumbnailCover(false);
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
      showControls(false);
    },
    onPause: () => { lastPlayheadMs.current = null; isPlayingRef.current = false; setIsPlaying(false); showControls(true); },
    onBuffer: () => { lastPlayheadMs.current = null; setIsBuffering(true); },
    onProgress: (event: { nativeEvent: { duration?: number; position?: number; isPlaying?: boolean; bufferedPosition?: number } }) => {
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
      // Wait for ten seconds of playback so resolution does not compete with startup.
      if (!hasPrefetchedNext.current && nextVideo && playing && positionMs >= 10_000) {
        hasPrefetchedNext.current = true;
        void playerAdapter.prefetch?.(nextVideo.youtubeVideoId);
      }
      const buffered = event.nativeEvent.bufferedPosition ?? 0;
      setBufferedMs((current) => (Math.abs(buffered - current) >= 1000 ? buffered : current));
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
    },
    onEnd: () => {
      lastPlayheadMs.current = null;
      isPlayingRef.current = false;
      wantsPlaybackRef.current = false;
      setWantsPlayback(false);
      progressRef.current = 1;
      setIsPlaying(false);
      setIsBuffering(false);
      setHasEnded(true);
      setRecoveryMessage('');
      showControls(true);
      persistProgress(1);
      void screenTimeService.flush();
      // A one-playback approval expires as soon as playback finishes.
      onPlaybackCompleted();
      if (profile && nextVideo && playbackPolicy.shouldAutoplay(profile.id)) onNextVideo(nextVideo);
    },
    onError: (event: { nativeEvent: { code?: string; message?: string } }) => {
      lastPlayheadMs.current = null;
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsBuffering(false);
      setShowThumbnailCover(false);
      handlePlayerError(normalizePlayerError(event.nativeEvent));
    },
  };

  return {
    isPlaying,
    wantsPlayback,
    progress,
    durationMs,
    bufferedMs,
    controlsVisible,
    error,
    isBuffering,
    hasEnded,
    showThumbnailCover,
    policyMessage,
    timeBlocked,
    warningMessage,
    recoveryMessage,
    accessDecision,
    isAllowed,
    togglePlayback,
    toggleControls,
    seekToPosition,
    skipBy,
    onCenterPlay,
    leavePlayer,
    selectNextVideo,
    manualRetryPlayback,
    onParentOverride,
    nativeHandlers,
  };
}
