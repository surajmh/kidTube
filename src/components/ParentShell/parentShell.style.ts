import { StyleSheet } from 'react-native';
import { colors } from '../theme';
import { yt } from '../youtube/theme';

/** Parent shell styles. */
const styles = StyleSheet.create({
  screen: { backgroundColor: yt.bg, flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: 16 },

  topBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 14 },
  kicker: { color: yt.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  title: { color: yt.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 2 },
  exitButton: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 36,
    paddingHorizontal: 14,
  },
  exitText: { color: yt.text, fontSize: 13, fontWeight: '600' },

  // Filter-chip navigation, matching Kid Mode: inverted pill for the active section.
  tabStrip: { gap: 8, marginTop: 18, paddingRight: 16 },
  tab: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  tabActive: { backgroundColor: yt.chipActive },
  tabText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: yt.chipActiveText },
  badge: {
    alignItems: 'center',
    backgroundColor: yt.accent,
    borderRadius: 9,
    minWidth: 18,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: { color: yt.onAccent, fontSize: 11, fontWeight: '700' },

  notice: {
    alignItems: 'center',
    backgroundColor: yt.surface,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12,
  },
  noticeText: { color: yt.text, flex: 1, fontSize: 13, lineHeight: 18 },

  // Counters read as a quiet summary strip, not four competing cards.
  statsRow: { borderTopColor: yt.line, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', marginTop: 20, paddingTop: 16 },
  statCard: { flex: 1, gap: 2 },
  statIcon: { alignItems: 'center', borderRadius: 8, height: 26, justifyContent: 'center', width: 26 },
  statValue: { color: yt.text, fontSize: 20, fontWeight: '700', marginTop: 8 },
  statLabel: { color: yt.textDim, fontSize: 11 },

  shortcuts: { borderTopColor: yt.line, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 24, paddingTop: 8 },
  shortcut: { alignItems: 'center', borderWidth: 0, flexDirection: 'row', gap: 14, paddingVertical: 14 },
  shortcutText: { flex: 1, gap: 2 },
  shortcutLabel: { color: yt.text, fontSize: 15, fontWeight: '600' },
  shortcutHint: { color: yt.textDim, fontSize: 12.5 },
  bottomSpace: { height: 28 },
});

export default styles;
