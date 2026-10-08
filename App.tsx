import React, { useRef, useState } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { playbackPolicy } from './src/services/playbackPolicyService';
import { playbackOverrideService } from './src/services/playbackOverrideService';
import { screenTimeService } from './src/services/screenTimeService';
import { PlaybackSettingsPanel } from './src/components/PlaybackSettings';
import { KidHomeScreen } from './src/components/KidHome';
import { ParentShell, ParentSection } from './src/components/ParentShell';
import { ParentOverrideSheet } from './src/components/ParentOverride';
import { ParentDownloads } from './src/components/ParentDownloads';
import { useDownloads } from './src/hooks/useDownloads';
import { ParentPlaylists } from './src/components/ParentPlaylists';
import { PlayerScreen } from './src/components/Player';
import {
  LoadingScreen,
  PinSetup,
  ProfileSetup,
  ProfileManager,
  ManualAddSection,
  ParentPinModal,
  appShellStyles as styles,
} from './src/components/AppShell';
import { useLibrary } from './src/hooks/useLibrary';
import { useParentAuth } from './src/hooks/useParentAuth';
import { useKidNavigation } from './src/hooks/useKidNavigation';
import type { Screen } from './src/hooks/useKidNavigation.type';
import { useWatchHistory } from './src/hooks/useWatchHistory';
import { useScreenTimeUsage } from './src/hooks/useScreenTimeUsage';

function App() {
  const saved = useDownloads();
  const [screen, setScreen] = useState<Screen>('kid');
  const [parentSection, setParentSection] = useState<ParentSection>('home');

  // `useParentAuth`, `useLibrary` and `useKidNavigation` each need a callback the other two
  // produce, so none of them can be constructed strictly before the others. These refs break the
  // cycle: each hook is handed a stable trampoline, and the real target is patched in below once
  // everything exists — the same "always current" indirection `useLibrary`'s own `libraryRef` uses.
  const setSetupStepRef = useRef<(step: 'pin' | 'profile' | null) => void>(() => undefined);
  const onResetAllRef = useRef<() => void>(() => undefined);
  const onOverrideGrantedRef = useRef<() => void>(() => undefined);

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

  const watchHistory = useWatchHistory(library.setHistory);
  const usageSync = useScreenTimeUsage(library.setScreenTimeUsage);

  const nav = useKidNavigation({
    screen,
    setScreen,
    pinModalVisible: auth.pinModalVisible,
    setPinModalVisible: auth.setPinModalVisible,
    exitParentMode: auth.exitParentMode,
    commitPendingHistory: watchHistory.commitPendingHistory,
    setupStep: library.setupStep,
    activeProfile: library.activeProfile,
    kidLibrary: library.kidLibrary,
  });

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
        edges={['top', 'bottom']}
      >
        {library.setupStep === 'pin' && (
          <PinSetup onSubmit={auth.finishPinSetup} />
        )}
        {library.setupStep === 'profile' && (
          <ProfileSetup onSubmit={(name, avatar) => void library.createFirstProfile(name, avatar, () => setScreen('parent'))} />
        )}
        {!library.setupStep && screen === 'kid' && (
          <KidHomeScreen
            downloads={saved.downloads}
            playlists={library.playlists}
            selectedPlaylistId={nav.kidPlaylistId}
            onSelectPlaylist={nav.setKidPlaylistId}
            onPlayPlaylist={nav.openPlaylist}
            profiles={library.profiles}
            activeProfile={library.activeProfile}
            onSelectProfile={(profileId) => {
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
              onExit: auth.exitParentMode,
              onDecideRequest: library.decideRequest,
              onDeleteRequest: library.deleteRequest,
              onClearResolved: library.clearResolvedRequests,
              onRemoveVideo: library.removeVideo,
              onRemoveChannel: library.removeChannel,
              onToggleVideoCategory: library.toggleVideoCategory,
              onToggleChannelCategory: library.toggleChannelCategory,
              onSearchContent: library.searchContent,
              onSaveCandidate: library.saveCandidate,
              onApproveCandidate: library.approveCandidate,
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
            manualAddSlot={
              <ManualAddSection
                channels={library.channels}
                onAddChannel={async (channel) => {
                  await library.saveChannels([channel, ...library.channels]);
                  void library.syncNewlyApprovedChannel(channel);
                }}
                onAddVideo={(video) => library.saveVideos([video, ...library.videos])}
                onLookupChannel={library.resolveChannel}
              />
            }
            profilesSlot={
              <ProfileManager
                profiles={library.profiles}
                activeProfileId={library.activeProfileId}
                setActiveProfileId={library.setActiveProfileId}
                onChange={library.saveProfiles}
                onDelete={library.deleteProfile}
              />
            }
            downloadsSlot={<ParentDownloads session={auth.parentSession} videos={library.videos} profiles={library.profiles} downloads={saved.downloads} maximum={library.playbackSettings.maxQualityHeight ?? 1080} refresh={saved.refresh} readError={saved.error} />}
            playlistsSlot={<ParentPlaylists playlists={library.playlists} videos={library.videos} onSave={library.savePlaylist} onRemove={library.removePlaylist} />}
            settingsSlot={
              <PlaybackSettingsPanel
                settings={library.playbackSettings}
                usage={library.screenTimeUsage}
                profiles={library.profiles}
                onChange={(next) => void library.savePlaybackSettings(next)}
              />
            }
          />
        )}
        {!library.setupStep && screen === 'player' && nav.selectedVideo && (
          <PlayerScreen
            video={nav.selectedVideo}
            profile={library.activeProfile}
            offlineExpected={saved.downloads.some((item) => item.videoId === nav.selectedVideo?.youtubeVideoId && item.state === 'ready' && item.expiresAt > Date.now())}
            settings={library.effectiveSettings}
            nextVideo={nav.nextVideo}
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

export default App;
