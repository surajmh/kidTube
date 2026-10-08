import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';

/** Parent shell styles. */
const styles = StyleSheet.create({
  screen: { backgroundColor: yt.bg, flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: 16 },

  topBar: { alignItems: 'flex-start', flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingTop: 14 },
  heading: { flex: 1 },
  kicker: { color: yt.textDim, fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  title: { color: yt.text, fontSize: 22, fontWeight: '700', letterSpacing: -0.4, marginTop: 2 },
  subtitle: { color: yt.textDim, fontSize: 13.5, lineHeight: 19, marginTop: 4 },
  exitButton: {
    flexShrink: 0,
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

  bottomSpace: { height: 28 },
});

export default styles;
