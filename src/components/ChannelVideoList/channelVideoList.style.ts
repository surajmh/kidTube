import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Channel video list styles. */
const styles = StyleSheet.create({
  wrap: { marginTop: 6, width: '100%' },
  headerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  status: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  refresh: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 11, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 11 },
  refreshText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  pending: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, flexDirection: 'row', gap: 10, padding: 14 },
  pendingText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '700' },
  errorCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 16 },
  errorIcon: { alignItems: 'center', backgroundColor: '#FDE9EC', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  errorTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10, textAlign: 'center' },
  errorBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  tryAgain: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 12, justifyContent: 'center', marginTop: 12, minHeight: 44, paddingHorizontal: 18 },
  tryAgainText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  inlineWarning: { alignItems: 'center', backgroundColor: '#FDE9EC', borderRadius: 12, flexDirection: 'row', gap: 7, marginBottom: 10, padding: 10 },
  inlineWarningText: { color: colors.danger, flex: 1, fontSize: 11, fontWeight: '700', lineHeight: 15 },
  grid: { gap: 8 },
  row: { alignItems: 'center', borderRadius: 14, flexDirection: 'row', minHeight: 68, padding: 8 },
  thumb: { borderRadius: 10, height: 48, width: 64 },
  thumbFallback: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center' },
  rowInfo: { flex: 1, paddingHorizontal: 10 },
  rowTitle: { color: colors.ink, fontSize: 13, fontWeight: '800', lineHeight: 18 },
  rowMeta: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 4 },
  playBadge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, height: 32, justifyContent: 'center', width: 32 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 18 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  emptyTitle: { color: colors.ink, fontSize: 14, fontWeight: '800', marginTop: 10 },
  emptyBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 5, textAlign: 'center' },
  loadMore: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 14, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 9, minHeight: 48, paddingHorizontal: 14 },
  loadMoreText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
});

export default styles;
