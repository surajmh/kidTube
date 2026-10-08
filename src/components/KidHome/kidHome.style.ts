import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';

/**
 * Kid Mode styles.
 *
 * Kept as a StyleSheet in the component folder: NativeWind is installed and configured, but its
 * class names do not apply at runtime on this Expo 54 / RN 0.81 New Architecture setup, so the
 * screen would render unstyled. The tokens mirror tailwind.config.js -- keep the two in step.
 */
const styles = StyleSheet.create({
  downloadsWrap: { paddingHorizontal: 16, paddingTop: 8 },
  screen: { backgroundColor: yt.bg, flex: 1 },

  topBar: { alignItems: 'center', flexDirection: 'row', gap: 4, height: 56, paddingHorizontal: 12 },
  brand: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: 6 },
  brandMark: {
    height: 28,
    width: 28,
  },
  brandText: { color: yt.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.6 },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  iconButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  searchField: {
    backgroundColor: yt.surface,
    borderRadius: 20,
    color: yt.text,
    flex: 1,
    fontSize: 15,
    height: 40,
    paddingHorizontal: 16,
  },

  switcher: { gap: 8, paddingBottom: 8, paddingHorizontal: 12 },
  switcherItem: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switcherItemActive: { backgroundColor: yt.chipActive },
  switcherTextActive: { color: yt.chipActiveText },
  switcherText: { color: yt.text, fontSize: 13, fontWeight: '600' },

  chipBar: { paddingBottom: 10 },
  chipRow: { gap: 8, paddingHorizontal: 12 },
  chip: { backgroundColor: yt.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: yt.chipActive },
  chipText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: yt.chipActiveText },

  body: { flex: 1 },
  bodyContent: { paddingBottom: 24 },

  notice: {
    alignItems: 'center',
    backgroundColor: yt.surface,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    marginHorizontal: 12,
    padding: 12,
  },
  noticeText: { color: yt.text, flex: 1, fontSize: 13, lineHeight: 18 },
  noticeAction: { backgroundColor: yt.chipActive, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  noticeActionText: { color: yt.chipActiveText, fontSize: 12, fontWeight: '700' },

  shelfTitle: { color: yt.text, fontSize: 16, fontWeight: '700', paddingBottom: 10, paddingHorizontal: 12 },
  shelf: { gap: 12, paddingBottom: 20, paddingHorizontal: 12 },

  channelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  channelRowText: { flex: 1, gap: 2 },
  channelRowName: { color: yt.text, fontSize: 15, fontWeight: '600' },
  channelRowMeta: { color: yt.textDim, fontSize: 12.5 },

  backRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { color: yt.text, fontSize: 15, fontWeight: '600' },
  channelHero: { alignItems: 'center', gap: 6, paddingBottom: 18, paddingTop: 10 },
  channelHeroName: { color: yt.text, fontSize: 19, fontWeight: '700' },
  channelHeroMeta: { color: yt.textDim, fontSize: 13 },

  ask: { paddingHorizontal: 12 },
  askTitle: { color: yt.text, fontSize: 16, fontWeight: '700', paddingBottom: 10 },
  askBody: { color: yt.textDim, fontSize: 13, lineHeight: 19, paddingBottom: 14 },
  askForm: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  askInput: {
    backgroundColor: yt.surface,
    borderRadius: 22,
    color: yt.text,
    flex: 1,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 16,
  },
  askSend: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  askSendDisabled: { opacity: 0.4 },
  askSendText: { color: yt.chipActiveText, fontSize: 14, fontWeight: '700' },
  askError: { color: yt.accent, fontSize: 12.5, paddingTop: 8 },
  askSection: { color: yt.text, fontSize: 14, fontWeight: '700', paddingBottom: 6, paddingTop: 22 },
  askRow: {
    alignItems: 'center',
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  askRowText: { color: yt.text, flex: 1, fontSize: 14 },
  askRowButton: { backgroundColor: yt.surfaceAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  askRowButtonText: { color: yt.text, fontSize: 13, fontWeight: '700' },
  askStatus: { color: yt.textDim, fontSize: 12, textTransform: 'capitalize' },


  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { color: yt.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: yt.textDim, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  askRowLabel: { color: yt.text, flex: 1, fontSize: 14 },
  bottomNav: {
    backgroundColor: yt.bg,
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: 6,
    paddingTop: 8,
  },
  navItem: { alignItems: 'center', borderWidth: 0, flex: 1, gap: 4 },
  navLabel: { color: yt.textDim, fontSize: 10.5 },
  navLabelActive: { color: yt.text, fontWeight: '700' },
  navBadge: {
    alignItems: 'center',
    backgroundColor: yt.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -4,
  },
  navBadgeText: { color: yt.onAccent, fontSize: 10, fontWeight: '700' },
});

export default styles;
