import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Activity dashboard styles. */
const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  badge: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 12, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  badgeText: { color: colors.mintDark, fontSize: 11, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  card: { backgroundColor: colors.card, borderRadius: 18, marginTop: 16, padding: 15 },
  cardHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: colors.ink, fontSize: 18, fontWeight: '800' },
  cardMeta: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  sectionLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  metricRow: { flexDirection: 'row', gap: 10 },
  metric: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, flex: 1, padding: 11 },
  metricIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 10, height: 28, justifyContent: 'center', width: 28 },
  metricValue: { color: colors.ink, fontSize: 17, fontWeight: '800', marginTop: 9 },
  metricLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 3, textAlign: 'center' },
  usageRow: { alignItems: 'center', flexDirection: 'row', gap: 10, minHeight: 36 },
  usageLabel: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  usageBar: { backgroundColor: colors.line, borderRadius: 4, flex: 1, height: 7, overflow: 'hidden' },
  usageFill: { backgroundColor: colors.purple, borderRadius: 4, height: 7 },
  usageValue: { color: colors.muted, fontSize: 12, fontWeight: '800', minWidth: 24, textAlign: 'right' },
  historyRow: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 12, flexDirection: 'row', gap: 10, marginTop: 7, minHeight: 54, padding: 10 },
  historyInfo: { flex: 1 },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 3 },
});

export default styles;
