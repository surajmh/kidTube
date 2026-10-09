import { useTheme } from '../theme';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Platform, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';

import { ChannelAvatar, Thumbnail } from '../youtube/VideoCard';
import { YouTubePlayer, isNativeYouTubePlayerAvailable } from '../../native';
import { describePlaybackDecision } from '../../services/playbackPolicyService';
import { centerPlayLabel, formatDuration, nativeHint } from './player.helper';
import { SPEED_OPTIONS } from './player.constant';
import useOptionStyles from './player.style';
import { usePlayerGestures } from './playerGestures.hook';
import { usePlayerOptions } from './playerOptions.hook';
import { BlockedPlayer, ChoiceRow, PlayerHeader, PlayerScrubber } from './playerParts';
import { useStyles as useStyles } from '../AppShell/appShell.style';
import { SecondaryButton } from '../AppShell/appFormControls';
import { usePlayer } from './player.hook';
import { PlayerDownload } from './playerDownload';
import type { PlayerScreenProps } from './player.type';

export function PlayerScreen(props: PlayerScreenProps) {
  const optionStyles = useOptionStyles();
  const styles = useStyles();
  const { colors, yt } = useTheme();
  const { video, profile, nextVideo, onNextVideo, onParentOverride } = props;
  const player = usePlayer(props);
  const scrollRef = useRef<ScrollView>(null);
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const [actionMessage, setActionMessage] = useState('');
  const { audioLanguage, setAudioLanguage, preferenceError, chapters, setChapters, speed, setSpeed, quality, setQuality, captionTrack, setCaptionTrack, captionScale, setCaptionScale, tracks, setTracks, optionsOpen, setOptionsOpen } = usePlayerOptions(video.youtubeVideoId, profile?.id);
  const gestures = usePlayerGestures(player.progress * player.durationMs, player.durationMs, player.seekToPosition, { minimized: props.minimized, onMinimize: props.onMinimize, onExpand: props.onExpand, onClose: player.leavePlayer });
  useEffect(() => {
    const frame = requestAnimationFrame(() => scrollRef.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [gestures.fullscreen, viewport.width, viewport.height]);
  useEffect(() => {
    if (props.minimized || (!Platform.isTV && !gestures.fullscreen)) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (Platform.isTV && optionsOpen) setOptionsOpen(false);
      else if (Platform.isTV && player.controlsVisible && player.isAllowed && !player.error && !player.policyMessage) player.toggleControls();
      else if (gestures.fullscreen) gestures.setFullscreen(false);
      else player.leavePlayer();
      return true;
    });
    return () => subscription.remove();
  }, [gestures.fullscreen, props.minimized, optionsOpen, player.controlsVisible, player.isAllowed, player.error, player.policyMessage, player.leavePlayer]);
  const activeChapter = chapters.filter((chapter) => chapter.startMs <= player.progress * player.durationMs).at(-1);
  const maximum = props.settings.maxQualityHeight ?? 1080;
  const compact = Boolean(props.minimized);
  const [pip, setPip] = useState(false);
  useEffect(() => {
    if (pip) scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [pip]);
  const miniCardStyle = [optionStyles.miniCard, { bottom: (props.miniPlayerBottomInset ?? 64) + 12 }];
  const upcoming = (props.upNextVideos ?? (nextVideo ? [nextVideo] : [])).filter((item) => item.id !== video.id);
  async function shareVideo() {
    try { await Share.share({ message: `${video.title}\nhttps://www.youtube.com/watch?v=${video.youtubeVideoId}` }); }
    catch { setActionMessage('Could not open sharing. Try again.'); }
  }

  if (!player.isAllowed && compact) {
    return <View style={[miniCardStyle, { padding: 12 }]}>
      <Text style={[optionStyles.text, { paddingRight: 32 }]}>{describePlaybackDecision(player.accessDecision)}</Text>
      <FocusablePressable accessibilityLabel="Close mini player" style={[optionStyles.miniButton, optionStyles.miniClose]} onPress={player.leavePlayer}><View style={optionStyles.miniScrim}><Feather name="x" size={18} color={yt.text} /></View></FocusablePressable>
    </View>;
  }

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
    <ScrollView ref={scrollRef} style={compact && !pip ? miniCardStyle : styles.playerScreen} onLayout={({ nativeEvent }) => setViewport({ width: nativeEvent.layout.width, height: nativeEvent.layout.height })} scrollEnabled={!pip && !gestures.fullscreen && !compact} contentContainerStyle={compact || pip || gestures.fullscreen ? undefined : optionStyles.scroll}>
      <View testID="video-stage" style={pip ? { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' } : compact ? optionStyles.miniStage : gestures.fullscreen ? { aspectRatio: 'auto', backgroundColor: '#000', overflow: 'hidden', width: viewport.width, height: viewport.height } : [styles.nativePlayerStage, optionStyles.hero, viewport.height > 0 && { aspectRatio: 'auto', height: Math.min(viewport.width * 9 / 16, viewport.height) }]}>
        <YouTubePlayer {...player.nativeHandlers} beforePlay={player.authorizePlayback} displayTitle={video.title} autoplay videoId={video.youtubeVideoId}
          onPictureInPictureChanged={({ nativeEvent }) => { setPip(Boolean(nativeEvent.inPictureInPicture)); player.setPictureInPicture(Boolean(nativeEvent.inPictureInPicture)); props.onPictureInPictureChange?.(Boolean(nativeEvent.inPictureInPicture)); }}
          fullscreen={gestures.fullscreen} volume={gestures.volume} brightness={gestures.brightness} audioLanguage={audioLanguage}
          onReady={(event) => {
            if (event.nativeEvent.videoId !== video.youtubeVideoId) return;
            player.nativeHandlers.onReady(event);
            setChapters(event.nativeEvent.chapters ?? []);
          }}
          playbackSpeed={speed} qualityHeight={quality} maxQualityHeight={maximum}
          captionTrack={captionTrack} captionScale={captionScale}
          onTracksChanged={({ nativeEvent }) => {
            if (nativeEvent.videoId !== video.youtubeVideoId) return;
            setTracks({ captions: nativeEvent.captions ?? [], heights: nativeEvent.qualityHeights ?? [], audio: nativeEvent.audio ?? [] });
            setCaptionTrack((current) => nativeEvent.captions?.some((track) => track.id === current) ? current : null);
          }} style={styles.nativePlayer} />
        {player.showThumbnailCover ? (
          // The native surface still shows whatever it last rendered until this video's own
          // stream starts — covering it with this video's thumbnail (plus a spinner) makes a
          // video switch read as "loading the new one", not "nothing happened".
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Thumbnail video={video} />
            <View style={[StyleSheet.absoluteFill, styles.overlayCenter]}>
              <ActivityIndicator size="large" color={yt.onVideo} />
            </View>
          </View>
        ) : null}
        <View style={StyleSheet.absoluteFill} pointerEvents={pip ? "none" : "box-none"}>
          {Platform.isTV ? <FocusablePressable accessibilityLabel={compact ? 'Expand mini player' : 'Show player controls'} hasTVPreferredFocus={!compact && !player.controlsVisible} onPress={compact ? props.onExpand : player.toggleControls} style={StyleSheet.absoluteFill} focusStyle={{ borderColor: 'transparent', transform: [{ scale: 1 }] }} /> : <View accessibilityLabel={compact ? 'Expand mini player'  : 'Show or hide player controls'} accessibilityRole="button" accessibilityActions={[{ name: 'activate' }]} onAccessibilityAction={compact ? props.onExpand : player.toggleControls}
            style={StyleSheet.absoluteFill} {...gestures.handlers}
            onResponderRelease={() => { if (gestures.handlers.onResponderRelease()) { if (compact) props.onExpand?.(); else player.toggleControls(); } }} />}
          {gestures.feedback && !compact ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlayCenter]}><Text style={[optionStyles.choice, optionStyles.text]}>{gestures.feedback}</Text></View> : null}
          {compact && !pip ? <>
            <FocusablePressable accessibilityLabel={player.wantsPlayback ? 'Pause video' : 'Play video'} onPress={player.togglePlayback} style={[optionStyles.miniButton, optionStyles.miniPlay]}><View style={optionStyles.miniScrim}><Feather name={player.wantsPlayback ? 'pause' : 'play'} size={22} color={yt.onVideo} /></View></FocusablePressable>
            <FocusablePressable accessibilityLabel="Close mini player" onPress={player.leavePlayer} style={[optionStyles.miniButton, optionStyles.miniClose]}><View style={optionStyles.miniScrim}><Feather name="x" size={18} color={yt.onVideo} /></View></FocusablePressable>
            <View pointerEvents="none" style={optionStyles.miniProgress}><View style={[optionStyles.miniProgressFill, { width: `${Math.max(0, Math.min(1, player.progress)) * 100}%` }]} /></View>
          </> : null}
          {!compact && !pip && !gestures.fullscreen ? <>
            <FocusablePressable accessibilityLabel="Minimize player" onPress={props.onMinimize ?? player.leavePlayer} style={optionStyles.heroBack}><View style={optionStyles.heroScrim}><Feather name="arrow-left" size={22} color={yt.onVideo} /></View></FocusablePressable>
            <FocusablePressable accessibilityLabel="Video options" onPress={() => setOptionsOpen(!optionsOpen)} style={optionStyles.heroMenu}><View style={optionStyles.heroScrim}><Feather name="more-vertical" size={20} color={yt.onVideo} /></View></FocusablePressable>
          </> : null}
          {!pip && !compact && (player.controlsVisible || player.hasEnded) ? (
            <>
              {!player.isPlaying && !player.error && !player.policyMessage ? (
                <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, styles.overlayCenter]}>
                  <FocusablePressable
                    accessibilityLabel={centerPlayLabel(player.hasEnded, player.isBuffering)}
                    style={styles.overlayPlayDisc}
                    disabled={player.isBuffering}
                    onPress={player.onCenterPlay}
                  >
                    <Feather name={player.hasEnded ? 'rotate-ccw' : 'play'} size={32} color={yt.onVideo} />
                  </FocusablePressable>
                </View>
              ) : null}
              <View style={[styles.overlayBottom, { position: 'absolute', bottom: 0, left: 0, right: 0 }]}>
                {activeChapter ? <FocusablePressable accessibilityLabel={`Chapters: ${activeChapter.title}`} style={optionStyles.chapterButton} onPress={() => setOptionsOpen(true)}><Text numberOfLines={1} style={optionStyles.text}>{activeChapter.title}</Text></FocusablePressable> : null}
                <View style={styles.overlayTimeRow}>
                  <Text style={styles.overlayTime}>{formatDuration(Math.round((player.durationMs / 1000) * player.progress))}</Text>
                  <PlayerScrubber positionMs={player.progress * player.durationMs} bufferedMs={player.bufferedMs} durationMs={player.durationMs} onSeek={player.seekToPosition} />
                  <Text style={styles.overlayTime}>{formatDuration(Math.round(player.durationMs / 1000) || video.duration || 0)}</Text>
                </View>
                <View style={[styles.overlayControlsRow, optionStyles.controlsRow]}>
                  <FocusablePressable accessibilityLabel="Back 10 seconds" style={[styles.overlayButton, optionStyles.button]} onPress={() => player.skipBy(-10_000)}>
                    <Feather name="rotate-ccw" size={22} color={yt.onVideo} />
                  </FocusablePressable>
                  <FocusablePressable accessibilityLabel={player.wantsPlayback ? 'Pause video' : 'Play video'} hasTVPreferredFocus={Platform.isTV && player.controlsVisible} style={[styles.overlayButton, optionStyles.button]} onPress={player.togglePlayback}>
                    <Feather name={player.wantsPlayback ? 'pause' : 'play'} size={24} color={yt.onVideo} />
                  </FocusablePressable>
                  <FocusablePressable accessibilityLabel="Forward 10 seconds" style={[styles.overlayButton, optionStyles.button]} onPress={() => player.skipBy(10_000)}>
                    <Feather name="rotate-cw" size={22} color={yt.onVideo} />
                  </FocusablePressable>
                  <View style={styles.overlaySpacer} />
                  <FocusablePressable accessibilityLabel={gestures.fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} style={[styles.overlayButton, optionStyles.button]} onPress={() => gestures.setFullscreen(!gestures.fullscreen)}>
                    <Feather name={gestures.fullscreen ? 'minimize' : 'maximize'} size={22} color={yt.onVideo} />
                  </FocusablePressable>
                  <FocusablePressable accessibilityLabel="Player settings" accessibilityState={{ expanded: optionsOpen }} style={[styles.overlayButton, optionStyles.button]} onPress={() => setOptionsOpen(!optionsOpen)}>
                    <Feather name="settings" size={22} color={yt.onVideo} />
                  </FocusablePressable>
                  {player.isBuffering ? <ActivityIndicator size="small" color={yt.onVideo} /> : null}
                  {nextVideo && nextVideo.id !== video.id ? (
                    <FocusablePressable accessibilityLabel="Play next approved video" style={[styles.overlayButton, optionStyles.button]} onPress={player.selectNextVideo}>
                      <Feather name="skip-forward" size={22} color={yt.onVideo} />
                    </FocusablePressable>
                  ) : null}
                </View>
              </View>
            </>
          ) : null}
        </View>
      </View>
      {!pip && !compact && optionsOpen ? (
        <ScrollView style={[optionStyles.panel, gestures.fullscreen && { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }]} contentContainerStyle={{ gap: 10 }}>
          <FocusablePressable accessibilityLabel="Close player settings" style={optionStyles.choice} onPress={() => setOptionsOpen(false)}><Text style={optionStyles.text}>Close settings</Text></FocusablePressable>
          <Text style={optionStyles.label}>Chapters</Text>
          {chapters.length ? chapters.map((chapter) => <FocusablePressable key={chapter.startMs} accessibilityLabel={`Chapter: ${chapter.title}, ${formatDuration(chapter.startMs / 1000)}`} accessibilityState={{ selected: activeChapter?.startMs === chapter.startMs }} style={[optionStyles.choice, activeChapter?.startMs === chapter.startMs && optionStyles.selected]} onPress={() => { player.seekToPosition(chapter.startMs); setOptionsOpen(false); }}><Text style={optionStyles.text}>{formatDuration(chapter.startMs / 1000)} · {chapter.title}</Text></FocusablePressable>) : <Text style={optionStyles.hint}>No chapters available for this video.</Text>}
          <ChoiceRow label="Audio language" value={tracks.audio.find((track) => track.selected)?.language ?? ''} options={[{ value: '', label: 'Video default' }, ...tracks.audio.map((track) => ({ value: track.language, label: track.label }))]} onChange={(value) => setAudioLanguage(value || null)} />
          {audioLanguage && !tracks.audio.some((track) => track.language === audioLanguage) ? <Text style={optionStyles.hint}>Your preferred language is unavailable. Using the video default.</Text> : null}
          {tracks.audio.some((track) => track.selected) ? <Text style={optionStyles.hint}>Playing: {tracks.audio.find((track) => track.selected)?.label}</Text> : null}
          {preferenceError ? <Text style={optionStyles.hint}>{preferenceError}</Text> : null}
          <Text style={optionStyles.hint}>Swipe horizontally to seek. Swipe up/down at the left edge for brightness, at the right edge for volume, in fullscreen. Swipe up to enter fullscreen; swipe down to exit fullscreen or minimize. Press Home to keep watching in picture-in-picture.</Text>
          <ChoiceRow label="Volume" value={gestures.volume} options={[{ value: 0, label: 'Mute' }, { value: 0.5, label: '50%' }, { value: 1, label: '100%' }]} onChange={gestures.setVolume} />
          <ChoiceRow label="Brightness" value={gestures.brightness ?? 0.5} options={[{ value: 0.25, label: 'Low' }, { value: 0.5, label: 'Medium' }, { value: 1, label: 'High' }]} onChange={gestures.setBrightness} />
          <ChoiceRow label="Speed" value={speed} options={SPEED_OPTIONS} onChange={setSpeed} />
          <ChoiceRow label="Quality" value={quality > maximum ? 0 : quality} options={[{ value: 0, label: 'Auto' }, ...tracks.heights.filter((height) => height <= maximum).map((height) => ({ value: height, label: `Up to ${height}p` }))]} onChange={setQuality} />
          <Text style={optionStyles.hint}>Auto adjusts to your connection, up to {maximum}p.</Text>
          <ChoiceRow label="Captions" value={captionTrack ?? ''} options={[{ value: '', label: 'Off' }, ...tracks.captions.map((track) => ({ value: track.id, label: track.label }))]} onChange={(value) => setCaptionTrack(value || null)} />
          {!tracks.captions.length ? <Text style={optionStyles.hint}>No captions available for this video.</Text> : null}
          {captionTrack ? <ChoiceRow label="Caption size" value={captionScale} options={[{ value: 1, label: 'Normal' }, { value: 1.5, label: 'Large' }]} onChange={setCaptionScale} /> : null}
        </ScrollView>
      ) : null}
      {!gestures.fullscreen && !compact && !pip ? <><View style={optionStyles.details}>
        <Text style={optionStyles.detailTitle}>{video.title}</Text>
        <FocusablePressable accessibilityLabel={`Channel: ${video.channelName?.trim() || 'Approved by your parent'}`} disabled={!props.onBrowseChannel} onPress={props.onBrowseChannel} style={optionStyles.channelRow}>
          <ChannelAvatar name={video.channelName?.trim() || 'Approved by your parent'} channelId={video.channelId} size={40} />
          <View style={optionStyles.channelText}><Text style={optionStyles.channelName}>{video.channelName?.trim() || 'Approved by your parent'}</Text><Text style={optionStyles.secondary}>From your approved library</Text></View>
          {props.onBrowseChannel ? <Feather name="chevron-right" size={20} color={yt.textDim} /> : null}
        </FocusablePressable>
        <View style={optionStyles.actions}>
          {props.downloads?.enabled || props.downloads?.itemFor(video)?.state === 'ready' ? <View style={optionStyles.downloadAction}><PlayerDownload video={video} downloads={props.downloads!} /></View> : null}
          <FocusablePressable accessibilityLabel="Share video" onPress={shareVideo} style={optionStyles.action}><View style={optionStyles.actionCircle}><Feather name="share-2" size={20} color={yt.text} /></View><Text style={optionStyles.actionLabel}>Share</Text></FocusablePressable>
        </View>
        {actionMessage ? <Text style={optionStyles.secondary}>{actionMessage}</Text> : null}
        <PlayerStatus player={player} queueLabel={props.queueLabel} />
        {player.policyMessage && player.timeBlocked && onParentOverride ? (
          <FocusablePressable accessibilityLabel="Parent override" style={styles.overrideButton} onPress={onParentOverride}>
            <Feather name="unlock" size={17} color="#fff" />
            <Text style={styles.overrideButtonText}>Parent Override</Text>
          </FocusablePressable>
        ) : null}
      </View>
      {upcoming.length ? (
        <>
          <View style={optionStyles.nextHeader}><Text style={optionStyles.nextTitle}>Up next</Text><View style={optionStyles.autoplay}><Text style={optionStyles.secondary}>Autoplay</Text><Switch accessibilityLabel="Autoplay is controlled by your parent" disabled value={props.settings.autoplay} trackColor={{ false: yt.line, true: yt.accent }} /></View></View>
          {upcoming.map((item) => <FocusablePressable key={item.id} accessibilityLabel={`Play ${item.title}`} style={optionStyles.nextRow} onPress={() => onNextVideo(item)}>
            <View style={optionStyles.nextThumbnail}><Thumbnail video={item} radius={10} /></View>
            <View style={optionStyles.nextInfo}><Text style={optionStyles.nextVideoTitle} numberOfLines={2}>{item.title}</Text><Text style={optionStyles.secondary} numberOfLines={1}>{item.channelName?.trim() || 'Approved by your parent'}</Text><Text style={optionStyles.secondary}>Approved video</Text></View>
          </FocusablePressable>)}
        </>
      ) : null}</> : null}
    </ScrollView>
  );
}

// First matching status wins; the order is the display priority.
function PlayerStatus({ player, queueLabel }: { player: ReturnType<typeof usePlayer>; queueLabel?: string }) {
  const styles = useStyles();
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
