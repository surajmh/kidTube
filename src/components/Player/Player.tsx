import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { yt } from '../youtube/theme';
import { colors } from '../theme';
import { ChannelAvatar, Thumbnail, VideoCard as FeedVideoCard } from '../youtube/VideoCard';
import { YouTubePlayer, isNativeYouTubePlayerAvailable } from '../../native';
import { describePlaybackDecision } from '../../services/playbackPolicyService';
import { formatDuration } from './player.helper';
import { styles } from '../AppShell/appShell.style';
import { SecondaryButton } from '../AppShell/AppFormControls';
import { usePlayer, PlayerScreenProps } from './usePlayer';

export function PlayerScreen(props: PlayerScreenProps) {
  const { video, profile, nextVideo, onNextVideo, onParentOverride } = props;
  const player = usePlayer(props);
  const [speed, setSpeed] = useState(1);
  const [quality, setQuality] = useState(0);
  const [captionTrack, setCaptionTrack] = useState<string | null>(null);
  const [captionScale, setCaptionScale] = useState(1);
  const [tracks, setTracks] = useState<{ captions: { id: string; label: string }[]; heights: number[] }>({ captions: [], heights: [] });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const maximum = props.settings.maxQualityHeight ?? 1080;
  useEffect(() => {
    setTracks({ captions: [], heights: [] });
    setCaptionTrack(null);
    setQuality(0);
    setOptionsOpen(false);
  }, [video.youtubeVideoId]);

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
    <ScrollView style={styles.playerScreen} contentContainerStyle={{ paddingBottom: 24 }}>
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
                    accessibilityLabel={player.hasEnded ? 'Replay video' : player.isBuffering ? 'Buffering' : 'Play video'}
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
          <ChoiceRow label="Speed" value={speed} options={[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((value) => ({ value, label: `${value}×` }))} onChange={setSpeed} />
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
        {player.recoveryMessage ? (
          <Text style={styles.warningText}>{player.recoveryMessage}</Text>
        ) : player.isBuffering ? (
          <Text style={styles.nativeHint}>Getting the nest ready…</Text>
        ) : player.error ? (
          <View>
            <Text style={styles.playerErrorText}>{player.error.message}</Text>
            <SecondaryButton label="Try again" onPress={player.manualRetryPlayback} />
          </View>
        ) : player.policyMessage ? (
          <Text style={styles.playerErrorText}>{player.policyMessage}</Text>
        ) : player.warningMessage ? (
          <Text style={styles.warningText}>{player.warningMessage}</Text>
        ) : (
          <Text style={styles.nativeHint}>{player.isOffline ? 'Playing a saved video' : props.queueLabel ? `Playing from ${props.queueLabel}` : 'Approved by your parent'}</Text>
        )}
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

/** YouTube-style scrubber: buffered track, played bar, thumb appears only while dragging. */
function PlayerScrubber({ positionMs, bufferedMs, durationMs, onSeek }: {
  positionMs: number;
  bufferedMs: number;
  durationMs: number;
  onSeek: (positionMs: number) => void;
}) {
  const trackRef = useRef<View>(null);
  const geom = useRef({ left: 0, width: 0 });
  const [dragMs, setDragMs] = useState<number | null>(null);
  const enabled = durationMs > 0;
  const ratio = (ms: number) => (enabled ? Math.min(Math.max(ms / durationMs, 0), 1) : 0);
  const played = ratio(dragMs ?? positionMs);
  const buffered = ratio(bufferedMs);
  const positionFrom = (pageX: number) => {
    const { left, width } = geom.current;
    if (width <= 0) return null;
    return Math.min(Math.max((pageX - left) / width, 0), 1) * durationMs;
  };
  return (
    <View
      ref={trackRef}
      style={styles.scrubber}
      accessibilityLabel="Seek slider"
      onLayout={() => {
        const node = trackRef.current;
        if (!node) return;
        node.measureInWindow((x, _y, width) => {
          geom.current = { left: x, width };
        });
      }}
      onStartShouldSetResponder={() => enabled}
      onMoveShouldSetResponder={() => enabled}
      onResponderGrant={(event) => { const ms = positionFrom(event.nativeEvent.pageX); if (ms !== null) setDragMs(ms); }}
      onResponderMove={(event) => { const ms = positionFrom(event.nativeEvent.pageX); if (ms !== null) setDragMs(ms); }}
      onResponderRelease={(event) => {
        const ms = positionFrom(event.nativeEvent.pageX);
        setDragMs(null);
        if (ms !== null) onSeek(ms);
      }}
      onResponderTerminate={() => setDragMs(null)}
    >
      <View style={styles.scrubTrack}>
        <View style={[styles.scrubFill, styles.scrubBuffered, { width: `${buffered * 100}%` }]} />
        <View style={[styles.scrubFill, styles.scrubPlayed, { width: `${played * 100}%` }]} />
      </View>
      <View style={[styles.scrubThumb, { left: `${played * 100}%`, opacity: dragMs !== null ? 1 : 0 }]} />
    </View>
  );
}

function PlayerHeader({ onBack }: { onBack: () => void }) {
  return <View style={styles.playerTopBar}><FocusablePressable accessibilityLabel="Back to videos" style={styles.backButton} onPress={onBack}><Feather name="arrow-down" size={24} color={yt.text} /></FocusablePressable></View>;
}

function BlockedPlayer({ onBack, message }: { onBack: () => void; message: string }) {
  return <View style={styles.blockedPlayer}><View style={styles.blockedIcon}><Feather name="shield-off" size={30} color={colors.danger} /></View><Text style={styles.blockedTitle}>Playback blocked</Text><Text style={styles.blockedBody}>{message}</Text><SecondaryButton label="Go back" onPress={onBack} /></View>;
}

function ChoiceRow<T extends string | number>({ label, value, options, onChange }: {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <View><Text style={optionStyles.label}>{label}</Text><View style={optionStyles.row}>
    {options.map((option) => <FocusablePressable key={option.value} accessibilityRole="radio" accessibilityLabel={`${label}: ${option.label}`} accessibilityState={{ selected: option.value === value }} onPress={() => onChange(option.value)} style={[optionStyles.choice, option.value === value && optionStyles.selected]}>
      <Text style={optionStyles.text}>{option.label}</Text>
    </FocusablePressable>)}
  </View></View>;
}
const optionStyles = StyleSheet.create({
  panel: { padding: 12, gap: 10, backgroundColor: yt.surface },
  label: { color: yt.text, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { padding: 12, minHeight: 44, borderRadius: 8, backgroundColor: yt.surfaceAlt },
  selected: { borderWidth: 1, borderColor: yt.text },
  text: { color: yt.text },
  hint: { color: yt.textDim, fontSize: 12 },
});
