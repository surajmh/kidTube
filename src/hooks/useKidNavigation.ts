import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler } from 'react-native';
import { describePlaybackDecision, isTimeRelatedReason, playbackPolicy } from '../services/playbackPolicyService';
import { ApprovedVideo, ChildProfile } from '../types';
import type { PlaybackDecision } from '../types';
import { nextQueuedVideo } from '../services/playlistService';
import { ContentTab } from '../components/ParentContent';
import { KidTab } from '../components/KidHome';
import type { Screen } from './useKidNavigation.type';
import type { KidLibrary } from '../services/kidContentLibraryService.type';

/**
 * Kid Mode / Parent Mode / player screen state, the Android back button's escape routes, and the
 * playback-gate decisions (`canPlay` + the notice shown when a video is refused).
 *
 * `screen` itself is owned by the caller (rather than by this hook), because `useParentAuth` also
 * reads and writes it — hoisting it out avoids a construction-order cycle between the two hooks.
 */
export function useKidNavigation({
  screen,
  setScreen,
  pinModalVisible,
  setPinModalVisible,
  exitParentMode,
  commitPendingHistory,
  setupStep,
  activeProfile,
  kidLibrary,
}: {
  screen: Screen;
  setScreen: (screen: Screen) => void;
  pinModalVisible: boolean;
  setPinModalVisible: (visible: boolean) => void;
  exitParentMode: () => void;
  commitPendingHistory: () => void;
  setupStep: 'pin' | 'profile' | null;
  activeProfile: ChildProfile | undefined;
  kidLibrary: KidLibrary;
}) {
  const [queue, setQueue] = useState<{ ids: string[]; label: string } | null>(null);
  const [kidPlaylistId, setKidPlaylistId] = useState<string | null>(null);
  useEffect(() => { setQueue(null); setKidPlaylistId(null); }, [activeProfile?.id]);
  const [selectedVideo, setSelectedVideo] = useState<ApprovedVideo | null>(null);
  const [kidNotice, setKidNotice] = useState('');
  const [kidNoticeAction, setKidNoticeAction] = useState<'override' | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>('channels');
  /** Which channel's own page is open in Parent Mode, if any. */
  const [parentChannelId, setParentChannelId] = useState<string | null>(null);
  const [kidTab, setKidTab] = useState<KidTab>('home');
  const [kidCategoryId, setKidCategoryId] = useState<string | null>(null);
  const [kidChannelId, setKidChannelId] = useState<string | null>(null);
  const [overrideForProfileId, setOverrideForProfileId] = useState<string | null>(null);
  const [retrySignal, setRetrySignal] = useState(0);

  /**
   * Android back is the main way a child escapes a screen, so it must never land somewhere that is
   * not theirs: player and Parent Mode both return to Kid Mode, and nested kid screens go home.
   */
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overrideForProfileId) { setOverrideForProfileId(null); return true; }
      if (pinModalVisible) { setPinModalVisible(false); return true; }
      if (screen === 'player') { commitPendingHistory(); setScreen('kid'); return true; }
      if (screen === 'parent') { exitParentMode(); return true; }
      if (kidPlaylistId) { setKidPlaylistId(null); return true; }
      if (kidTab !== 'home' || kidCategoryId || kidChannelId) {
        setKidTab('home');
        setKidCategoryId(null);
        setKidChannelId(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [screen, kidTab, kidCategoryId, kidChannelId, kidPlaylistId, pinModalVisible, overrideForProfileId, setupStep]);

  // Must stay above any early return in the component: a hook there would change the hook
  // count between the loading and loaded renders.
  const nextVideo = useMemo(() => {
    if (!selectedVideo) return undefined;
    if (queue) return nextQueuedVideo(queue.ids, selectedVideo.id, kidLibrary.videos);
    const videos = kidLibrary.videos;
    const index = videos.findIndex((item) => item.id === selectedVideo.id);
    return videos[(index + 1) % Math.max(1, videos.length)];
  }, [selectedVideo, kidLibrary, queue]);

  // Stable identity: `openPlayer` reaches KidHome's memoized video cards, and re-creating it on
  // every render would defeat them.
  const playbackDecision = useCallback(
    (video: ApprovedVideo): PlaybackDecision =>
      activeProfile
        ? playbackPolicy.canPlay({
            profileId: activeProfile.id,
            videoId: video.youtubeVideoId,
            channelId: video.channelId,
            categoryIds: video.categoryIds,
          })
        : { allowed: false, reason: 'VIDEO_NOT_APPROVED' },
    [activeProfile],
  );

  const explainDecision = useCallback((decision: PlaybackDecision) => {
    if (decision.allowed) return;
    setKidNotice(describePlaybackDecision(decision));
    setKidNoticeAction(isTimeRelatedReason(decision) ? 'override' : null);
  }, []);

  const openPlayer = useCallback(
    (video: ApprovedVideo) => {
      const decision = playbackDecision(video);
      if (!decision.allowed) {
        explainDecision(decision);
        return;
      }
      setKidNotice('');
      setKidNoticeAction(null);
      setQueue(null);
      setSelectedVideo(video);
      setScreen('player');
    },
    [playbackDecision, explainDecision],
  );

  const openPlaylist = useCallback((videos: ApprovedVideo[], label: string) => {
    const first = videos[0];
    if (!first) return;
    const decision = playbackDecision(first);
    if (!decision.allowed) { explainDecision(decision); return; }
    setQueue({ ids: videos.map((video) => video.id), label });
    setSelectedVideo(first);
    setKidNotice('');
    setKidNoticeAction(null);
    setScreen('player');
  }, [playbackDecision, explainDecision]);

  /** A parent override clears the notice that sent the child looking for one, and retries playback. */
  function onOverrideGranted() {
    setKidNotice('');
    setKidNoticeAction(null);
    if (screen === 'player') setRetrySignal((value) => value + 1);
  }

  /** The navigation half of a full PIN reset (`screen` itself is reset by the caller). */
  function resetAll() {
    setQueue(null);
    setKidPlaylistId(null);
    setSelectedVideo(null);
    setKidNotice('');
    setKidNoticeAction(null);
    setContentTab('channels');
    setParentChannelId(null);
    setKidTab('home');
    setKidCategoryId(null);
    setKidChannelId(null);
    setOverrideForProfileId(null);
  }

  return {
    queueLabel: queue?.label,
    openPlaylist,
    kidPlaylistId,
    setKidPlaylistId,
    selectedVideo,
    setSelectedVideo,
    kidNotice,
    setKidNotice,
    kidNoticeAction,
    setKidNoticeAction,
    contentTab,
    setContentTab,
    parentChannelId,
    setParentChannelId,
    kidTab,
    setKidTab,
    kidCategoryId,
    setKidCategoryId,
    kidChannelId,
    setKidChannelId,
    overrideForProfileId,
    setOverrideForProfileId,
    retrySignal,
    nextVideo,
    playbackDecision,
    explainDecision,
    openPlayer,
    onOverrideGranted,
    resetAll,
  };
}
