import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

/** Parent home dashboard styles. */
const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  childCard: { alignItems: 'center', backgroundColor: yt.surface, borderRadius: 20, flexDirection: 'row', gap: 14, marginTop: 18, padding: 12 },
  childInfo: { flex: 1 },
  childName: { color: yt.text, fontSize: 18, fontWeight: '700' },
  childCaption: { color: yt.textDim, fontSize: 12.5, marginTop: 2 },
  pill: { alignItems: 'center', backgroundColor: yt.surfaceAlt, borderRadius: 18, flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: 14 },
  pillText: { color: yt.text, fontSize: 13, fontWeight: '600' },

  card: { backgroundColor: yt.surface, borderRadius: 20, marginTop: 18, padding: 16 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  cardTitle: { color: yt.text, fontSize: 17, fontWeight: '700' },
  link: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  linkText: { color: yt.textDim, fontSize: 13, fontWeight: '600' },

  statsRow: { flexDirection: 'row', marginTop: 16 },
  stat: { alignItems: 'center', flex: 1, gap: 6 },
  statIcon: { alignItems: 'center', borderRadius: 14, height: 40, justifyContent: 'center', width: 40 },
  statValue: { color: yt.text, fontSize: 22, fontWeight: '700' },
  statLabel: { color: yt.textDim, fontSize: 12 },

  sectionTitle: { color: yt.text, fontSize: 18, fontWeight: '700', marginTop: 26 },
  sectionBody: { color: yt.textDim, fontSize: 13, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  tile: { backgroundColor: yt.surface, borderRadius: 20, flexBasis: '47%', flexGrow: 1, minHeight: 112, padding: 14 },
  tileTop: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  tileIcon: { alignItems: 'center', borderRadius: 14, height: 44, justifyContent: 'center', width: 44 },
  tileLabel: { color: yt.text, fontSize: 16, fontWeight: '700', marginTop: 12 },
  tileHint: { color: yt.textDim, fontSize: 12.5, lineHeight: 17, marginTop: 3 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
