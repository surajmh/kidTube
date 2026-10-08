import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { yt } from '../youtube/theme';

/** Parent content styles. Tokens come from `../theme`; see youtube/theme.ts for the palette. */
const styles = StyleSheet.create({
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  chip: { backgroundColor: colors.card, borderRadius: 12, justifyContent: 'center', minHeight: 42, paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.lavender },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.ink },
  recentRow: { flexDirection: 'row', gap: 10 },
  recentCard: { borderRadius: 15, flex: 1, minHeight: 76, padding: 11 },
  recentTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  recentMeta: { color: colors.muted, fontSize: 11, marginTop: 6 },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 22 },
  row: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 15, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, minHeight: 74, padding: 9 },
  thumb: { borderRadius: 11, height: 52, width: 52 },
  thumbFallback: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 11, height: 52, justifyContent: 'center', width: 52 },
  rowInfo: { flex: 1, paddingHorizontal: 11 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  approvalTag: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 9, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 4 },
  approvalTagText: { color: colors.mintDark, fontSize: 10, fontWeight: '800' },
  expiryTag: { backgroundColor: colors.peach, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  expiryTagText: { color: colors.coral, fontSize: 10, fontWeight: '800' },
  videoCountTag: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 9, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 4 },
  videoCountText: { color: colors.ink, fontSize: 10, fontWeight: '800' },
  pageHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 14, paddingTop: 4 },
  pageTitle: { color: yt.text, fontSize: 20, fontWeight: '700' },
  backRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 6, paddingVertical: 8 },
  backText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  channelHero: { alignItems: 'center', gap: 6, paddingBottom: 18, paddingTop: 4 },
  heroThumb: { borderRadius: 32, height: 64, marginBottom: 4, width: 64 },
  heroName: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  heroMeta: { color: colors.muted, fontSize: 13 },
  iconButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 42 },
  categoryEditor: { borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 12, width: '100%' },
  empty: { backgroundColor: colors.card, borderRadius: 15, marginBottom: 8, padding: 16 },
  manualSlot: { marginTop: 18 },
});

export default styles;
