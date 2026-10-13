import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

/** Parent requests styles. */
const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  pendingBadge: { alignItems: 'center', backgroundColor: colors.sky, borderRadius: 14, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 9 },
  pendingBadgeEmpty: { backgroundColor: colors.mint },
  pendingDot: { backgroundColor: colors.yellow, borderRadius: 5, height: 10, width: 10 },
  pendingDotEmpty: { backgroundColor: colors.mintDark },
  pendingText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  pendingTextEmpty: { color: colors.mintDark },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  empty: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, marginTop: 14, padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  emptyBody: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  card: { backgroundColor: colors.card, borderRadius: 20, marginTop: 14, padding: 14 },
  cardHeader: { alignItems: 'flex-start', flexDirection: 'row' },
  thumb: { borderRadius: 12, height: 58, width: 58 },
  thumbFallback: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 12, height: 58, justifyContent: 'center', width: 58 },
  cardInfo: { flex: 1, paddingHorizontal: 12 },
  cardWho: { color: colors.ink, fontSize: 12, fontWeight: '900', letterSpacing: 0.4 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 4 },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  cardAge: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  approve: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center' },
  approveOpen: { backgroundColor: colors.purpleDark },
  approveText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  reject: { alignItems: 'center', borderRadius: 13, flex: 1, flexDirection: 'row', gap: 7, height: 48, justifyContent: 'center' },
  rejectText: { color: colors.danger, fontSize: 14, fontWeight: '800' },
  delete: { alignItems: 'center', height: 48, justifyContent: 'center', width: 46 },
  sheet: { borderTopColor: colors.line, borderTopWidth: 1, marginTop: 14, paddingTop: 14 },
  sheetLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { backgroundColor: colors.canvas, borderRadius: 12, minHeight: 44, justifyContent: 'center', paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.lavender },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.ink },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 10 },
  confirm: { alignItems: 'center', backgroundColor: colors.mintDark, borderRadius: 13, flexDirection: 'row', gap: 8, height: 50, justifyContent: 'center', marginTop: 14, paddingHorizontal: 12 },
  confirmText: { color: '#fff', fontSize: 13, fontWeight: '800', flexShrink: 1 },
  historyHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  historyTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  clearButton: { borderRadius: 10, minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  clearText: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  historyRow: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', gap: 12, marginTop: 8, minHeight: 62, padding: 10 },
  historyTitleText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  footerHint: { color: colors.muted, fontSize: 12, marginTop: 22, textAlign: 'center' },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
