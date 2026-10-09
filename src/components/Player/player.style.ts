import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  hero: { overflow: 'hidden', borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroBack: { position: 'absolute', top: 8, left: 8, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  heroMenu: { position: 'absolute', top: 8, right: 8, width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  heroScrim: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  details: { paddingHorizontal: 16, paddingTop: 14, gap: 14 },
  detailTitle: { color: yt.text, fontSize: 17, fontWeight: '700', lineHeight: 24 },
  channelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderWidth: 0 },
  channelText: { flex: 1, gap: 3 },
  channelName: { color: yt.text, fontSize: 13, fontWeight: '600' },
  secondary: { color: yt.textDim, fontSize: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  downloadAction: { flex: 1 },
  action: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4, borderWidth: 0 },
  actionCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: yt.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { color: yt.textDim, fontSize: 11 },
  nextHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8, paddingHorizontal: 16 },
  nextTitle: { color: yt.text, fontSize: 14, fontWeight: '700' },
  autoplay: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 6, borderWidth: 0 },
  nextThumbnail: { width: 128 },
  nextInfo: { flex: 1, gap: 4, paddingTop: 2 },
  nextVideoTitle: { color: yt.text, fontSize: 14, fontWeight: '600', lineHeight: 19 },
  miniCard: { position: 'absolute', right: 12, width: 180, height: 180 * 9 / 16, borderRadius: 12, overflow: 'hidden', backgroundColor: '#000', elevation: 8 },
  miniStage: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  miniButton: { position: 'absolute', width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  miniPlay: { top: '50%', left: '50%', marginTop: -24, marginLeft: -24 },
  miniClose: { top: 0, right: 0 },
  miniScrim: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.54)', alignItems: 'center', justifyContent: 'center' },
  miniProgress: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  miniProgressFill: { height: 2, backgroundColor: yt.accent },
  controlsRow: { gap: 4, flexWrap: 'wrap' },
  button: { height: 44, width: 44 },
  chapterButton: { minHeight: 44, justifyContent: 'center' },
  scroll: { paddingBottom: 24 },
  panel: { padding: 12, gap: 10, backgroundColor: yt.surface },
  label: { color: yt.text, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { padding: 12, minHeight: 44, borderRadius: 8, backgroundColor: yt.surfaceAlt },
  selected: { borderWidth: 1, borderColor: yt.text },
  text: { color: yt.text },
  hint: { color: yt.textDim, fontSize: 12 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
