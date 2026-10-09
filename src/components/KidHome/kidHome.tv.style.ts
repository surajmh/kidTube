import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export default function useStyles() {
  const { colors, dark } = useTheme();
  return useMemo(() => StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 20, paddingHorizontal: 28, paddingVertical: 12, backgroundColor: colors.canvas },
    brand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    logo: { width: 30, height: 30 }, brandName: { color: colors.ink, fontSize: 21, fontWeight: '800', letterSpacing: -0.8 },
    nav: { flex: 1, flexDirection: 'row', gap: 8, justifyContent: 'center' },
    navItem: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 22, paddingHorizontal: 12, height: 38, backgroundColor: colors.card },
    navActive: { backgroundColor: '#C8AEFA' }, navLabel: { fontSize: 13, fontWeight: '600', color: colors.muted }, navLabelActive: { color: '#251744' },
    actions: { flexDirection: 'row', gap: 8 }, icon: { width: 38, height: 38, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, searchInput: { flex: 1, height: 40, color: colors.ink, fontSize: 18, backgroundColor: colors.card, borderRadius: 10, paddingHorizontal: 14 },
    hero: { height: 206, borderRadius: 18, overflow: 'hidden', backgroundColor: dark ? '#21192E' : '#EEE6FB', marginHorizontal: 8, marginBottom: 18 },
    heroArtwork: { position: 'absolute', right: 0, width: '59%', height: '100%', justifyContent: 'center' },
    heroCopy: { width: '42%', height: '100%', padding: 20, justifyContent: 'center', gap: 8, backgroundColor: dark ? '#21192E' : '#EEE6FB' },
    eyebrow: { color: dark ? '#C8AEFA' : '#62418C', fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
    heroTitle: { color: colors.ink, fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6 }, heroChannel: { color: colors.muted, fontSize: 13 },
    heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
    watch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 20, backgroundColor: '#C8AEFA', height: 40, paddingHorizontal: 16 }, watchLabel: { color: '#251744', fontSize: 13, fontWeight: '800' },
    more: { height: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 20, backgroundColor: colors.card }, moreLabel: { color: colors.ink, fontSize: 12, fontWeight: '600' },
    rail: { marginBottom: 14 }, railTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginHorizontal: 8, marginBottom: 6 }, railItems: { paddingHorizontal: 8, paddingVertical: 6, gap: 12 },
    videoCard: { width: 180, borderRadius: 12, padding: 3 }, videoTitle: { color: colors.ink, fontSize: 13, lineHeight: 17, fontWeight: '600', marginTop: 7 }, videoMeta: { color: colors.muted, fontSize: 11, marginTop: 3 },
  }), [colors, dark]);
}
