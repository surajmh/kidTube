import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';
import { SCRUBBER_HIT_HEIGHT } from './playerControls.constant';

export default StyleSheet.create({
  surface: { ...StyleSheet.absoluteFillObject },
  /**
   * The scrim only appears with the controls. Over a bright frame, white glyphs on bare video
   * are unreadable, and YouTube does the same.
   */
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.45)' },

  centreRow: {
    alignItems: 'center',
    bottom: 0,
    flexDirection: 'row',
    gap: 28,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  centreButton: { alignItems: 'center', height: 56, justifyContent: 'center', width: 56 },
  playButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    width: 68,
  },

  bottomBar: {
    bottom: 0,
    left: 0,
    paddingBottom: 6,
    paddingHorizontal: 10,
    position: 'absolute',
    right: 0,
  },
  timeRow: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  time: { color: '#FFFFFF', fontSize: 12, fontVariant: ['tabular-nums'], fontWeight: '600' },
  spacer: { flex: 1 },
  iconButton: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },

  scrubber: { height: SCRUBBER_HIT_HEIGHT, justifyContent: 'center' },
  track: { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderRadius: 2, height: 3 },
  fill: { backgroundColor: yt.accent, borderRadius: 2, height: 3, left: 0, position: 'absolute' },
  knob: {
    backgroundColor: yt.accent,
    borderRadius: 7,
    height: 14,
    marginLeft: -7,
    position: 'absolute',
    width: 14,
  },
});
