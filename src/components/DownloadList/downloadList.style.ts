import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';

/** Download list styles. */
const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 },
  count: { color: yt.text, fontSize: 18, fontWeight: '700' },
  sortPill: { alignItems: 'center', flexDirection: 'row', gap: 6, minHeight: 32, paddingHorizontal: 4 },
  sortText: { color: yt.text, fontSize: 14, fontWeight: '600' },

  row: { alignItems: 'center', backgroundColor: yt.surface, borderRadius: 18, flexDirection: 'row', gap: 12, marginBottom: 10, padding: 10 },
  rowMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: 12 },
  rowBusy: { opacity: 0.5 },
  thumbBox: { alignItems: 'center', aspectRatio: 16 / 9, backgroundColor: yt.surfaceAlt, borderRadius: 12, justifyContent: 'center', overflow: 'hidden', width: 112 },
  thumb: { height: '100%', width: '100%' },
  duration: { backgroundColor: yt.badge, borderRadius: 6, bottom: 5, paddingHorizontal: 6, paddingVertical: 2, position: 'absolute', right: 5 },
  durationText: { color: yt.onAccent, fontSize: 10.5, fontWeight: '700' },
  info: { flex: 1 },
  title: { color: yt.text, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  channelRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 5 },
  channel: { color: yt.textDim, flexShrink: 1, fontSize: 13 },
  meta: { color: yt.textDim, fontSize: 12.5, marginTop: 4 },
  status: { alignItems: 'center', justifyContent: 'center', minWidth: 36 },
  doneBadge: { alignItems: 'center', backgroundColor: '#6FD38A', borderRadius: 18, height: 34, justifyContent: 'center', width: 34 },
  ring: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  ringImage: { height: 36, position: 'absolute', width: 36 },
  ringText: { color: yt.text, fontSize: 9.5, fontWeight: '700' },
  menuButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 32 },

  scrim: { backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: yt.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 24, paddingHorizontal: 16, paddingTop: 14 },
  sheetTitle: { color: yt.textDim, fontSize: 13, marginBottom: 6, paddingHorizontal: 4 },
  sheetOption: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: 4 },
  sheetText: { color: yt.text, fontSize: 16, fontWeight: '600' },
  sheetDanger: { color: '#FF6E6E' },
  sheetCancel: { alignItems: 'center', backgroundColor: yt.surfaceAlt, borderRadius: 14, justifyContent: 'center', marginTop: 8, minHeight: 48 },
});

export default styles;
