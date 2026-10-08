import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { yt } from '../youtube/theme';
import { colors } from '../theme';
import { ChannelAvatar, Thumbnail, VideoCard as FeedVideoCard } from '../youtube/VideoCard';
import { YouTubePlayer, isNativeYouTubePlayerAvailable } from '../../native';
import { describePlaybackDecision } from '../../services/playbackPolicyService';
import { centerPlayLabel, formatDuration, nativeHint } from './player.helper';
import { SPEED_OPTIONS } from './player.constant';
import optionStyles from './player.style';
import { usePlayerOptions } from './playerOptions.hook';
import { BlockedPlayer, ChoiceRow, PlayerHeader, PlayerScrubber } from './playerParts';
import { styles } from '../AppShell/appShell.style';
import { SecondaryButton } from '../AppShell/appFormControls';
import { usePlayer } from './player.hook';
import { PlayerDownload } from './playerDownload';
import type { PlayerScreenProps } from './player.type';

export function PlayerScreen(props: PlayerScreenProps) {
  const { video, profile, nextVideo, onNextVideo, onParentOverride } = props;
  const player = usePlayer(props);
  const { speed, setSpeed, quality, setQuality, captionTrack, setCaptionTrack, captionScale, setCaptionScale, tracks, setTracks, optionsOpen, setOptionsOpen } = usePlayerOptions(video.youtubeVideoId);
  const maximum = props.settings.maxQualityHeight ?? 1080;

  if (!player.isAllowed) {
    return (
      <View style={styles.playerScreen}>
        <PlayerHeader onBack={player.leavePlayer} />
        <BlockedPlayer message={describePlaybackDecision(player.accessDecision)} onBack={props.onBack} />
      </View>
    );
  }

  if (!isNativeYouTubePlayerAvailable) {
    return (
      <View style={styles.playerScreen}>
        <PlayerHeader onBack={player.leavePlayer} />
        <View style={styles.blockedPlayer}>
          <View style={styles.blockedIcon}><Feather name="smartphone" size={30} color={colors.ink} /></View>
          <Text style={styles.blockedTitle}>Android player build required</Text>
          <Text style={styles.blockedBody}>Install the native development build to play approved videos on Android phones, tablets, and TV.</Text>
          <SecondaryButton label="Go back" onPress={props.onBack} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.playerScreen} contentContainerStyle={optionStyles.scroll}>
      <PlayerHeader onBack={player.leavePlayer} />
      <View style={styles.nativePlayerStage}>
        <YouTubePlayer autoplay videoId={video.youtubeVideoId}
          playbackSpeed={speed} qualityHeight={quality} maxQualityHeight={maximum}
          captionTrack={captionTrack} captionScale={captionScale}
          onTracksChanged={({ nativeEvent }) => {
            if (nativeEvent.videoId !== video.youtubeVideoId) return;
            setTracks({ captions: nativeEvent.captions ?? [], heights: nativeEvent.qualityHeights ?? [] });
            setCaptionTrack((current) => nativeEvent.captions?.some((track) => track.id === current) ? current : null);
          }} style={styles.nativePlayer} {...player.nativeHandlers} />
        {player.showThumbnailCover ? (
          // The native surface still shows whatever it last rendered until this video's own
          // stream starts — covering it with this video's thumbnail (plus a spinner) makes a
          // video switch read as "loading the new one", not "nothing happened".
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Thumbnail video={video} />
            <View style={[StyleSheet.absoluteFill, styles.overlayCenter]}>
              <ActivityIndicator size="large" color={yt.text} />
            </View>
          </View>
        ) : null}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable accessibilityLabel="Show or hide player controls" style={StyleSheet.absoluteFill} onPress={player.toggleControls} />
          {player.controlsVisible || player.hasEnded ? (
            <>
              {!player.isPlaying && !player.error && !player.policyMessage ? (
                <View pointerEvents="box-none" style={styles.overlayCenter}>
                  <FocusablePressable
                    accessibilityLabel={centerPlayLabel(player.hasEnded, player.isBuffering)}
                    style={styles.overlayPlayDisc}
                    disabled={player.isBuffering}
                    onPress={player.onCenterPlay}
                  >
                    <Feather name={player.hasEnded ? 'rotate-ccw' : 'play'} size={32} color={yt.text} />
                  </FocusablePressable>
                </View>
              ) : null}
              <View style={styles.overlayBottom}>
                <View style={styles.overlayTimeRow}>
                  <Text style={styles.overlayTime}>{formatDuration(Math.round((player.durationMs / 1000) * player.progress))}</Text>
                  <PlayerScrubber positionMs={player.progress * player.durationMs} bufferedMs={player.bufferedMs} durationMs={player.durationMs} onSeek={player.seekToPosition} />
                  <Text style={styles.overlayTime}>{formatDuration(Math.round(player.durationMs / 1000) || video.duration || 0)}</Text>
                </View>
                <View style={styles.overlayControlsRow}>
                  <FocusablePressable accessibilityLabel="Back 10 seconds" style={styles.overlayButton} onPress={() => player.skipBy(-10_000)}>
                    <Feather name="rotate-ccw" size={22} color={yt.text} />
                  </FocusablePressable>
                  <FocusablePressable accessibilityLabel={player.wantsPlayback ? 'Pause video' : 'Play video'} style={styles.overlayButton} onPress={player.togglePlayback}>
                    <Feather name={player.wantsPlayback ? 'pause' : 'play'} size={24} color={yt.text} />
                  </FocusablePressable>
                  <FocusablePressable accessibilityLabel="Forward 10 seconds" style={styles.overlayButton} onPress={() => player.skipBy(10_000)}>
                    <Feather name="rotate-cw" size={22} color={yt.text} />
                  </FocusablePressable>
                  <View style={styles.overlaySpacer} />
                  <FocusablePressable accessibilityLabel="Player settings" accessibilityState={{ expanded: optionsOpen }} style={styles.overlayButton} onPress={() => setOptionsOpen(!optionsOpen)}>
                    <Feather name="settings" size={22} color={yt.text} />
                  </FocusablePressable>
                  {player.isBuffering ? <ActivityIndicator size="small" color={yt.text} /> : null}
                  {nextVideo && nextVideo.id !== video.id ? (
                    <FocusablePressable accessibilityLabel="Play next approved video" style={styles.overlayButton} onPress={player.selectNextVideo}>
                      <Feather name="skip-forward" size={22} color={yt.text} />
                    </FocusablePressable>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
      {optionsOpen ? (
        <View style={optionStyles.panel}>
          <FocusablePressable accessibilityLabel="Close player settings" style={optionStyles.choice} onPress={() => setOptionsOpen(false)}><Text style={optionStyles.text}>Close settings</Text></FocusablePressable>
          <ChoiceRow label="Speed" value={speed} options={SPEED_OPTIONS} onChange={setSpeed} />
          <ChoiceRow label="Quality" value={quality > maximum ? 0 : quality} options={[{ value: 0, label: 'Auto' }, ...tracks.heights.filter((height) => height <= maximum).map((height) => ({ value: height, label: `Up to ${height}p` }))]} onChange={setQuality} />
          <Text style={optionStyles.hint}>Auto adjusts to your connection, up to {maximum}p.</Text>
          <ChoiceRow label="Captions" value={captionTrack ?? ''} options={[{ value: '', label: 'Off' }, ...tracks.captions.map((track) => ({ value: track.id, label: track.label }))]} onChange={(value) => setCaptionTrack(value || null)} />
          {!tracks.captions.length ? <Text style={optionStyles.hint}>No captions available for this video.</Text> : null}
          {captionTrack ? <ChoiceRow label="Caption size" value={captionScale} options={[{ value: 1, label: 'Normal' }, { value: 1.5, label: 'Large' }]} onChange={setCaptionScale} /> : null}
        </View>
      ) : null}
      <View style={styles.playerInfo}>
        <Text style={styles.playerTitle}>{video.title}</Text>
        <View style={styles.playerChannelRow}>
          <ChannelAvatar name={video.channelName?.trim() || 'Approved by your parent'} size={34} />
          <Text style={styles.playerChannel}>{video.channelName?.trim() || 'Approved by your parent'}</Text>
        </View>
        {props.downloads?.enabled ? <PlayerDownload video={video} downloads={props.downloads} /> : null}
        <PlayerStatus player={player} queueLabel={props.queueLabel} />
        {player.policyMessage && player.timeBlocked && onParentOverride ? (
          <FocusablePressable accessibilityLabel="Parent override" style={styles.overrideButton} onPress={onParentOverride}>
            <Feather name="unlock" size={17} color="#fff" />
            <Text style={styles.overrideButtonText}>Parent Override</Text>
          </FocusablePressable>
        ) : null}
      </View>
      {nextVideo && nextVideo.id !== video.id ? (
        <>
          <Text style={styles.upNextLabel}>Up next</Text>
          <FeedVideoCard video={nextVideo} onPress={onNextVideo} />
        </>
      ) : null}
    </ScrollView>
  );
}

// First matching status wins; the order is the display priority.
function PlayerStatus({ player, queueLabel }: { player: ReturnType<typeof usePlayer>; queueLabel?: string }) {
  if (player.recoveryMessage) return <Text style={styles.warningText}>{player.recoveryMessage}</Text>;
  if (player.isBuffering) return <Text style={styles.nativeHint}>Getting the nest ready…</Text>;
  if (player.error) {
    return (
      <View>
        <Text style={styles.playerErrorText}>{player.error.message}</Text>
        <SecondaryButton label="Try again" onPress={player.manualRetryPlayback} />
      </View>
    );
  }
  if (player.policyMessage) return <Text style={styles.playerErrorText}>{player.policyMessage}</Text>;
  if (player.warningMessage) return <Text style={styles.warningText}>{player.warningMessage}</Text>;
  return <Text style={styles.nativeHint}>{nativeHint(player.isOffline, queueLabel)}</Text>;
}
