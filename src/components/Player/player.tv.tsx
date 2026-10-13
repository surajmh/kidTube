import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { Thumbnail } from '../youtube/VideoCard';
import { formatDuration } from './player.helper';
import type { usePlayer } from './player.hook';
import type { PlayerScreenProps } from './player.type';
import type { ApprovedVideo } from '../../types';
import type { YouTubePlayerProps } from '../../native/YouTubePlayer.types';

export function TvPlayer({ props, player, nativePlayer, settingsPanel, optionsOpen, setOptionsOpen }: {
  props: PlayerScreenProps;
  player: ReturnType<typeof usePlayer>;
  nativePlayer: React.ReactElement<YouTubePlayerProps>;
  settingsPanel: React.ReactNode;
  optionsOpen: boolean;
  setOptionsOpen: (open: boolean) => void;
}) {
  const [upNextOpen, setUpNextOpen] = useState(false);
  const rail = useRef<FlatList<ApprovedVideo>>(null);
  const [seeking, setSeeking] = useState(false);
  const [interaction, setInteraction] = useState(0);
  const [seekFeedback, setSeekFeedback] = useState('');
  const blocked = Boolean(player.error || player.policyMessage);
  const controls = player.controlsVisible || player.hasEnded;
  const upcoming = (props.upNextVideos ?? (props.nextVideo ? [props.nextVideo] : [])).filter((video) => video.id !== props.video.id);
  const touch = () => setInteraction((value) => value + 1);
  const showControls = () => { if (!player.controlsVisible) player.toggleControls(); touch(); };

  useEffect(() => { setUpNextOpen(false); setSeeking(false); setSeekFeedback(''); }, [props.video.youtubeVideoId]);
  useEffect(() => { if (blocked) { setUpNextOpen(false); setSeeking(false); } }, [blocked]);
  useEffect(() => {
    if (!controls || !player.isPlaying || !player.wantsPlayback || seeking || optionsOpen || upNextOpen || blocked) return;
    const timer = setTimeout(player.toggleControls, 6000);
    return () => clearTimeout(timer);
  }, [controls, player.isPlaying, player.wantsPlayback, seeking, optionsOpen, upNextOpen, blocked, interaction]);
  useEffect(() => {
    if (!seekFeedback) return;
    const timer = setTimeout(() => setSeekFeedback(''), 1200);
    return () => clearTimeout(timer);
  }, [seekFeedback, interaction]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (optionsOpen) { setOptionsOpen(false); showControls(); }
      else if (upNextOpen) { setUpNextOpen(false); showControls(); }
      else if (seeking) { setSeeking(false); showControls(); }
      else if (controls && !blocked && !player.hasEnded) player.toggleControls();
      else player.leavePlayer();
      return true;
    });
    return () => subscription.remove();
  }, [optionsOpen, upNextOpen, seeking, controls, blocked, player.leavePlayer]);

  function remote(key: 'left' | 'right' | 'up' | 'down' | 'select' | 'playPause') {
    if (blocked || optionsOpen || upNextOpen) return;
    touch();
    if (key === 'left' || key === 'right') {
      player.skipBy(key === 'left' ? -10_000 : 10_000);
      setSeekFeedback(key === 'left' ? '−10 seconds' : '+10 seconds');
    } else if (key === 'down' && !seeking && upcoming.length) {
      setUpNextOpen(true);
    } else if (key === 'playPause') { player.togglePlayback(); showControls(); }
    else { setSeeking(false); showControls(); }
  }

  function button(label: string, icon: React.ComponentProps<typeof Feather>['name'], action: () => void, preferred = false) {
    return <FocusablePressable accessibilityLabel={label} hasTVPreferredFocus={preferred} onFocus={touch} onPress={() => { touch(); action(); }} style={styles.button} focusStyle={styles.focus}>
      <Feather name={icon} size={24} color="#fff" />
      <Text style={styles.buttonLabel}>{label}</Text>
    </FocusablePressable>;
  }
  return <View testID="tv-player" style={styles.screen}>
    <View testID="video-stage" style={StyleSheet.absoluteFill}>
      {React.cloneElement(nativePlayer, { fullscreen: true, tvRemoteEnabled: !blocked && !optionsOpen && !upNextOpen && (!controls || seeking), onTvRemote: ({ nativeEvent }) => remote(nativeEvent.key), style: StyleSheet.absoluteFill })}
      {player.showThumbnailCover ? <View pointerEvents="none" style={StyleSheet.absoluteFill}><Thumbnail video={props.video} /><View style={styles.loading}><ActivityIndicator size="large" color="#fff" /></View></View> : null}
    </View>
    {seekFeedback && !controls ? <View pointerEvents="none" style={styles.loading}><Text style={styles.feedback}>{seekFeedback}</Text></View> : null}
    {controls && !optionsOpen && !upNextOpen && !blocked ? <>
      <View style={styles.header}>
        {button('Back to videos', 'arrow-left', player.leavePlayer)}
        <View style={styles.heading}><Text style={styles.title} numberOfLines={2}>{props.video.title}</Text><Text style={styles.subtitle}>{props.video.channelName?.trim() || 'From your approved library'}</Text></View>
      </View>
      <View style={styles.bottom}>
        <FocusablePressable accessibilityLabel="Seek video" accessibilityRole="adjustable" accessibilityValue={{ min: 0, max: Math.round(player.durationMs / 1000), now: Math.round(player.progress * player.durationMs / 1000) }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={({ nativeEvent }) => player.skipBy(nativeEvent.actionName === 'increment' ? 10_000 : -10_000)} onFocus={touch} onPress={() => { setSeeking(true); touch(); }} style={[styles.timeline, seeking && styles.focus]} focusStyle={styles.focus}>
          <View style={styles.timeRow}><Text style={styles.subtitle}>{formatDuration(Math.floor(player.progress * player.durationMs / 1000))}</Text><Text style={styles.subtitle}>{formatDuration(Math.floor(player.durationMs / 1000))}</Text></View>
          <View style={styles.track}><View style={[styles.buffered, { width: `${player.durationMs ? Math.min(100, player.bufferedMs / player.durationMs * 100) : 0}%` }]} /><View style={[styles.played, { width: `${player.progress * 100}%` }]} /><View style={[styles.thumb, { left: `${player.progress * 100}%` }]} /></View>
          <Text style={styles.hint}>{seeking ? '◀ / ▶ Seek 10 seconds · OK to finish' : 'Select the timeline to seek'}{seekFeedback ? ` · ${seekFeedback}` : ''}</Text>
        </FocusablePressable>
        {!seeking ? <View style={styles.actions}>
          {button('Back 10 seconds', 'rotate-ccw', () => player.skipBy(-10_000))}
          {button(player.hasEnded ? 'Replay video' : player.wantsPlayback ? 'Pause video' : 'Play video', player.hasEnded ? 'rotate-ccw' : player.wantsPlayback ? 'pause' : 'play', player.onCenterPlay, true)}
          {button('Forward 10 seconds', 'rotate-cw', () => player.skipBy(10_000))}
          {props.nextVideo && props.nextVideo.id !== props.video.id ? button('Next video', 'skip-forward', player.selectNextVideo) : null}
          <View style={styles.spacer} />
          {upcoming.length ? button('Up next', 'list', () => setUpNextOpen(true)) : null}
          {button('Player settings', 'settings', () => setOptionsOpen(true))}
        </View> : null}
        {upcoming.length && !seeking ? <Text style={styles.hint}>Choose Up next to browse · Press ↓ when controls are hidden</Text> : null}
        {player.isBuffering ? <Text style={styles.hint}>Buffering…</Text> : player.warningMessage || player.recoveryMessage ? <Text style={styles.hint}>{player.warningMessage || player.recoveryMessage}</Text> : null}
      </View>
    </> : null}
    {blocked ? <View style={styles.blocked}>
      <Text style={styles.title}>{player.policyMessage || player.error?.message}</Text>
      {player.error ? button('Try again', 'refresh-cw', player.manualRetryPlayback, true) : null}
      {player.timeBlocked && props.onParentOverride ? button('Parent override', 'unlock', props.onParentOverride, true) : null}
      {button('Back to videos', 'arrow-left', player.leavePlayer, !player.error && !player.timeBlocked)}
    </View> : null}
    {optionsOpen ? <View style={styles.settings} testID="tv-player-settings">{settingsPanel}</View> : null}
    {upNextOpen && !blocked ? <View style={styles.upNext} testID="tv-up-next">
      <View style={styles.railHeader}>
        <View style={styles.heading}><Text style={styles.title}>{props.queueLabel || 'Up next'}</Text><Text style={styles.subtitle}>Approved videos · ◀ / ▶ Browse · OK Play · Back to watching</Text></View>
        {button('Close up next', 'chevron-up', () => { setUpNextOpen(false); showControls(); })}
      </View>
      <FlatList ref={rail} horizontal data={upcoming} keyExtractor={(video) => video.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ index, length: 238, offset: 238 * index })}
        renderItem={({ item: video, index }) => <FocusablePressable accessibilityLabel={`Play ${video.title}`} hasTVPreferredFocus={index === 0}
          onFocus={() => rail.current?.scrollToIndex({ index, viewPosition: 0.5, animated: false })}
          onPress={() => props.onNextVideo(video)} style={styles.card} focusStyle={styles.focus}>
          <View style={styles.thumbnail}><Thumbnail video={video} radius={8} /></View><Text style={styles.cardTitle} numberOfLines={2}>{video.title}</Text><Text style={styles.hint} numberOfLines={1}>{video.channelName || 'Approved video'}</Text>
        </FocusablePressable>} />
      <Text style={styles.railFooter}>Autoplay {props.settings.autoplay ? 'on' : 'off'} by parent · Browse without leaving the current video</Text>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 24, padding: 28, backgroundColor: 'rgba(0,0,0,0.6)' },
  heading: { flex: 1, gap: 6 },
  title: { color: '#fff', fontSize: 24, lineHeight: 30, fontWeight: '700' },
  subtitle: { color: '#ddd', fontSize: 14 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 36, paddingTop: 16, paddingBottom: 24, gap: 12, backgroundColor: 'rgba(0,0,0,0.8)' },
  timeline: { padding: 12, borderRadius: 10, gap: 12 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 4, backgroundColor: '#555' },
  buffered: { position: 'absolute', height: 4, backgroundColor: '#999' },
  played: { position: 'absolute', height: 4, backgroundColor: '#ff354b' },
  thumb: { position: 'absolute', top: -4, marginLeft: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' },
  hint: { color: '#ccc', fontSize: 14 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  button: { width: 84, minHeight: 76, padding: 8, gap: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonLabel: { color: '#fff', fontSize: 11, textAlign: 'center' },
  focus: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ scale: 1 }] },
  spacer: { flex: 1 },
  settings: { position: 'absolute', top: 0, bottom: 0, right: 0, width: 340, backgroundColor: '#202020', elevation: 12 },
  blocked: { ...StyleSheet.absoluteFillObject, padding: 48, gap: 24, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  feedback: { padding: 20, borderRadius: 12, color: '#fff', fontSize: 22, backgroundColor: 'rgba(0,0,0,0.65)' },
  upNext: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingVertical: 24, backgroundColor: 'rgba(0,0,0,0.92)' },
  railHeader: { paddingHorizontal: 36, flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 12 },
  rail: { paddingHorizontal: 36, gap: 18 },
  railFooter: { paddingHorizontal: 36, marginTop: 12, color: '#ccc', fontSize: 14 },
  card: { width: 220, padding: 6, borderRadius: 10, gap: 6 },
  thumbnail: { width: '100%', aspectRatio: 16 / 9 },
  cardTitle: { color: '#fff', fontSize: 18, lineHeight: 23, fontWeight: '600' },
});
