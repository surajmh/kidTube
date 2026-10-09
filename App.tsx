import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { ThemeProvider, useResolvedTheme } from './src/components/theme';
import { useAppStore } from './src/store/appStore';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { playbackPolicy } from './src/services/playbackPolicyService';
import { playbackOverrideService } from './src/services/playbackOverrideService';
import { screenTimeService } from './src/services/screenTimeService';
import { PlaybackSettingsPanel } from './src/components/PlaybackSettings';
import { KidHomeScreen } from './src/components/KidHome';
import { ParentShell, ParentSection } from './src/components/ParentShell';
import { ParentOverrideSheet } from './src/components/ParentOverride';
import { ParentDownloads } from './src/components/ParentDownloads';
import { useChildDownloads } from './src/hooks/useChildDownloads';
import { useDownloads } from './src/hooks/useDownloads';
import { ParentPlaylists } from './src/components/ParentPlaylists';
import { PlayerScreen } from './src/components/Player';
import {
  LoadingScreen,
  PinSetup,
  ProfileSetup,
  ProfileManager,
  AddContentModal,
  ParentPinModal,
  useAppShellStyles,
} from './src/components/AppShell';
import { useLibrary } from './src/hooks/useLibrary';
import { useParentAuth } from './src/hooks/useParentAuth';
import { parentBackAction } from './src/hooks/useKidNavigation.helper';
import { useKidNavigation } from './src/hooks/useKidNavigation';
import type { Screen } from './src/hooks/useKidNavigation.type';
import { useWatchHistory } from './src/hooks/useWatchHistory';
import { useScreenTimeUsage } from './src/hooks/useScreenTimeUsage';

function AppContent() {
  const styles = useAppShellStyles();
  const [screen, setScreen] = useState<Screen>('kid');
  const [pictureInPicture, setPictureInPicture] = useState(false);
  const [bottomNavHeight, setBottomNavHeight] = useState(64);
  const [parentSection, setParentSection] = useState<ParentSection>('home');

  // `useParentAuth`, `useLibrary` and `useKidNavigation` each need a callback the other two
  // produce, so none of them can be constructed strictly before the others. These refs break the
  // cycle: each hook is handed a stable trampoline, and the real target is patched in below once
  // everything exists — the same "always current" indirection `useLibrary`'s own `libraryRef` uses.
  const setSetupStepRef = useRef<(step: 'pin' | 'profile' | null) => void>(() => undefined);
  const onResetAllRef = useRef<() => void>(() => undefined);
  const onOverrideGrantedRef = useRef<() => void>(() => undefined);
  const parentBackRef = useRef<() => void>(() => undefined);

  const auth = useParentAuth({
    screen,
    onSessionExpired: () => {
      setParentSection('home');
      setScreen('kid');
    },
    onSignedIn: () => setScreen('parent'),
    onResetAll: () => onResetAllRef.current(),
    setSetupStep: (step) => setSetupStepRef.current(step),
  });

  const library = useLibrary({
    parentSession: auth.parentSession,
    screen,
    onOverrideGranted: () => onOverrideGrantedRef.current(),
  });

  // The device keeps one file per video; each child sees (and saves) only their own.
  const saved = useDownloads({ profileIds: library.profiles.map((profile) => profile.id), ready: library.libraryReady });
  const childDownloads = useChildDownloads({
    profile: library.activeProfile,
    settings: library.effectiveSettings,
    downloads: saved.downloads,
    refresh: saved.refresh,
  });

  const watchHistory = useWatchHistory(library.setHistory);
  const usageSync = useScreenTimeUsage(library.setScreenTimeUsage);

  const nav = useKidNavigation({
    screen,
    setScreen,
    pinModalVisible: auth.pinModalVisible,
    setPinModalVisible: auth.setPinModalVisible,
    onParentBack: () => parentBackRef.current(),
    commitPendingHistory: watchHistory.commitPendingHistory,
    setupStep: library.setupStep,
    activeProfile: library.activeProfile,
    kidLibrary: library.kidLibrary,
  });

  useEffect(() => {
    if (!nav.selectedVideo) setPictureInPicture(false);
  }, [nav.selectedVideo]);

  /** Ends the parent session and returns to Kid Mode; clearing the session alone leaves a blank screen. */
  function leaveParentMode() {
    auth.exitParentMode();
    setParentSection('home');
    nav.setParentChannelId(null);
    setScreen('kid');
  }

  // Back steps up one level at a time, and only the top level leaves Parent Mode.
  parentBackRef.current = () => {
    const action = parentBackAction(Boolean(nav.parentChannelId), parentSection);
    if (action === 'close-channel') nav.setParentChannelId(null);
    else if (action === 'go-home') setParentSection('home');
    else leaveParentMode();
  };
  setSetupStepRef.current = library.setSetupStep;
  onOverrideGrantedRef.current = nav.onOverrideGranted;
  onResetAllRef.current = () => {
    library.resetAll();
    nav.resetAll();
    setScreen('kid');
    setParentSection('home');
  };

  if (!library.hydrated) {
    return <LoadingScreen onRetry={library.loadFailed ? library.retryLoad : undefined} />;
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.safeArea, (screen === 'kid' || screen === 'player') && !library.setupStep && styles.safeAreaDark]}
        edges={pictureInPicture ? [] : ['top', 'bottom']}
      >
        <View style={{ flex: 1 }}>
        {library.setupStep === 'pin' && (
          <PinSetup onSubmit={auth.finishPinSetup} />
        )}
        {library.setupStep === 'profile' && (
          <ProfileSetup onSubmit={(name, avatar) => void library.createFirstProfile(name, avatar, () => setScreen('parent'))} />
        )}
        {!library.setupStep && screen === 'kid' && !pictureInPicture && (
          <KidHomeScreen
            tvFocusTarget={nav.tvFocusTarget}
            onTvFocusTargetChange={nav.setTvFocusTarget}
            miniPlayerVisible={Boolean(nav.selectedVideo)}
            onBottomNavLayout={setBottomNavHeight}
            downloads={childDownloads.mine}
            downloadsEnabled={childDownloads.enabled}
            playlists={library.playlists}
            selectedPlaylistId={nav.kidPlaylistId}
            onSelectPlaylist={nav.setKidPlaylistId}
            onPlayPlaylist={nav.openPlaylist}
            profiles={library.profiles}
            activeProfile={library.activeProfile}
            onSelectProfile={(profileId) => {
              nav.setTvFocusTarget(null);
              nav.setSelectedVideo(null);
              library.setActiveProfileId(profileId);
              nav.setKidCategoryId(null);
              nav.setKidChannelId(null);
              nav.setKidNotice('');
              nav.setKidNoticeAction(null);
            }}
            library={library.kidLibrary}
            notice={nav.kidNotice}
            noticeAction={
              nav.kidNoticeAction === 'override' && library.activeProfile
                ? { label: 'Ask a parent for more time', onPress: () => nav.setOverrideForProfileId(library.activeProfile!.id) }
                : null
            }
            tab={nav.kidTab}
            onTabChange={nav.setKidTab}
            selectedCategoryId={nav.kidCategoryId}
            onSelectCategory={nav.setKidCategoryId}
            selectedChannelId={nav.kidChannelId}
            onSelectChannel={nav.setKidChannelId}
            onVideoPress={nav.openPlayer}
            onParentPress={auth.enterParentMode}
            requests={library.requests}
            onSubmitRequest={library.submitKidRequest}
            onRequestVideo={(video) =>
              library.submitKidRequest({
                type: 'video',
                title: video.title,
                videoId: video.youtubeVideoId,
                thumbnailUrl: video.thumbnailUrl,
                channelName: video.channelName,
              })
            }
            onRequestChannel={(channel) =>
              library.submitKidRequest({
                type: 'channel',
                title: channel.name,
                channelId: channel.channelId,
                thumbnailUrl: channel.thumbnailUrl,
              })
            }
            pendingRequestCount={library.childRequests.filter((request) => request.status === 'pending').length}
            channelSyncStateFor={library.syncStateFor}
          />
        )}
        {/* Parent Mode renders only with a live session — hiding the button is not the control. */}
        {!library.setupStep && screen === 'parent' && auth.parentSession && (
          <ParentShell
            data={{
              session: auth.parentSession,
              profiles: library.profiles,
              activeProfileId: library.activeProfileId,
              channels: library.channels,
              videos: library.videos,
              categories: library.categories,
              approvals: library.approvals,
              requests: library.requests,
              childRules: library.childRules,
              profilePolicies: library.profilePolicies,
              overrides: library.overrides,
              settings: library.playbackSettings,
              screenTimeUsage: library.screenTimeUsage,
              history: library.history,
            }}
            actions={{
              onExit: leaveParentMode,
              onDecideRequest: library.decideRequest,
              onDeleteRequest: library.deleteRequest,
              onClearResolved: library.clearResolvedRequests,
              onRemoveVideo: library.removeVideo,
              onRemoveChannel: library.removeChannel,
              onToggleVideoCategory: library.toggleVideoCategory,
              onToggleChannelCategory: library.toggleChannelCategory,
              syncStateFor: library.syncStateFor,
              channelBusy: library.channelBusy,
              onOpenChannelVideos: (channel) => void library.openChannelVideos(channel),
              onRefreshChannel: (channel) => void library.syncChannel(channel, 'refresh'),
              onLoadMoreChannel: (channel) => void library.syncChannel(channel, 'more'),
              onSelectChannel: nav.setParentChannelId,
              onCreateCategory: library.createCategory,
              onRenameCategory: library.renameCategory,
              onDeleteCategory: library.deleteCategory,
              onSetPolicy: library.setChildPolicy,
              onToggleInherit: library.toggleChildInherit,
              onToggleCategoryForChild: library.toggleChildCategory,
              onToggleGrantChannel: library.toggleGrantChannel,
              onToggleBlockChannel: library.toggleBlockChannel,
              onToggleGrantVideo: library.toggleGrantVideo,
              onToggleBlockVideo: library.toggleBlockVideo,
              onGrantOverride: library.grantOverride,
              onRevokeOverride: library.revokeOverride,
              onRevokeApproval: library.revokeApproval,
              onProfilesChange: library.saveProfiles,
              onSettingsChange: library.savePlaybackSettings,
              accessFor: library.accessFor,
            }}
            notice={library.repairNotice}
            section={parentSection}
            setSection={setParentSection}
            contentTab={nav.contentTab}
            selectedChannelId={nav.parentChannelId}
            setContentTab={nav.setContentTab}
            addContentSlot={(kind, onClose) => (
              <AddContentModal
                kind={kind}
                channels={library.channels}
                onAddChannel={async (channel) => {
                  await library.saveChannels([channel, ...library.channels]);
                  // A channel saved without approval has nothing to fetch yet.
                  if (channel.approved) void library.syncNewlyApprovedChannel(channel);
                }}
                onAddVideo={(video) => library.saveVideos([video, ...library.videos])}
                onFindChannels={library.findChannels}
                onFindVideos={library.findVideos}
                onClose={onClose}
              />
            )}
            profilesSlot={
              <ProfileManager
                profiles={library.profiles}
                activeProfileId={library.activeProfileId}
                setActiveProfileId={library.setActiveProfileId}
                onChange={library.saveProfiles}
                onDelete={library.deleteProfile}
              />
            }
            downloadsSlot={<ParentDownloads videos={library.videos} profiles={library.profiles} downloads={saved.downloads} downloadsEnabled={library.playbackSettings.downloadsEnabled} refresh={saved.refresh} readError={saved.error} />}
            playlistsSlot={<ParentPlaylists playlists={library.playlists} videos={library.videos} onSave={library.savePlaylist} onRemove={library.removePlaylist} />}
            settingsSlot={
              <PlaybackSettingsPanel
                videos={library.videos}
                settings={library.playbackSettings}
                usage={library.screenTimeUsage}
                profiles={library.profiles}
                onChange={(next) => void library.savePlaybackSettings(next)}
              />
            }
          />
        )}
        {!library.setupStep && (screen === 'player' || screen === 'kid') && nav.selectedVideo && (
          <PlayerScreen
            miniPlayerBottomInset={bottomNavHeight}
            onPictureInPictureChange={setPictureInPicture}
            minimized={screen === 'kid'}
            onMinimize={() => setScreen('kid')}
            onExpand={() => setScreen('player')}
            video={nav.selectedVideo}
            profile={library.activeProfile}
            offlineExpected={saved.downloads.some((item) => item.videoId === nav.selectedVideo?.youtubeVideoId && item.state === 'ready' && item.expiresAt > Date.now())}
            settings={library.effectiveSettings}
            downloads={childDownloads}
            nextVideo={nav.nextVideo}
            upNextVideos={nav.upNextVideos}
            onBrowseChannel={library.kidLibrary.channels.some((channel) => channel.channelId === nav.selectedVideo?.channelId) ? () => {
              const channel = library.kidLibrary.channels.find((item) => item.channelId === nav.selectedVideo?.channelId);
              if (channel) { nav.setKidChannelId(channel.channelId); nav.setKidTab('channels'); setScreen('kid'); }
            } : undefined}
            queueLabel={nav.queueLabel}
            retrySignal={nav.retrySignal}
            // No pre-check here: PlayerScreen already re-derives and enforces this same policy
            // gate for whatever video it's given, and has its own "playback blocked" screen for
            // it. Pre-checking only meant a blocked "next" silently did nothing — the notice it
            // set lives on the Kid Home screen, which isn't what's on screen while playing.
            onNextVideo={nav.setSelectedVideo}
            onUsageChange={usageSync.syncUsageIntoState}
            onBack={() => {
              // Leaving playback is a natural boundary: commit the progress ticks the ref has been
              // carrying, persist and refresh the usage summary.
              watchHistory.commitPendingHistory();
              void screenTimeService.flush();
              usageSync.syncUsageIntoState(true);
              nav.setSelectedVideo(null);
              setScreen('kid');
            }}
            onSaveHistory={(item) =>
              void watchHistory.saveHistory([
                item,
                ...library.history.filter((old) => !(old.profileId === item.profileId && old.videoId === item.videoId)),
              ])
            }
            onPlaybackCompleted={() => void library.consumePlaybackApproval(nav.selectedVideo!)}
            onParentOverride={() => nav.setOverrideForProfileId(library.activeProfile?.id ?? null)}
          />
        )}
        </View>
      </SafeAreaView>
      <ParentPinModal
        visible={auth.pinModalVisible}
        lockRemainingMs={auth.pinLockRemainingMs}
        resetting={auth.resetting}
        onClose={() => auth.setPinModalVisible(false)}
        onSubmit={auth.verifyParentPin}
        onReset={auth.resetParentPin}
      />
      <ParentOverrideSheet
        visible={Boolean(nav.overrideForProfileId)}
        profile={library.profiles.find((profile) => profile.id === nav.overrideForProfileId)}
        settings={playbackPolicy.getEffectiveSettings(nav.overrideForProfileId ?? library.activeProfile?.id ?? '')}
        overrideSecondsToday={
          nav.overrideForProfileId ? playbackOverrideService.additionalSeconds(nav.overrideForProfileId) : 0
        }
        onClose={() => nav.setOverrideForProfileId(null)}
        onGranted={library.setOverrides}
      />
    </SafeAreaProvider>
  );
}

export default function App() {
  const mode = useAppStore((state) => state.playbackSettings.themeMode);
  const theme = useResolvedTheme(mode);
  return <ThemeProvider value={theme}>
    <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.canvas} />
    <AppContent />
  </ThemeProvider>;
}
