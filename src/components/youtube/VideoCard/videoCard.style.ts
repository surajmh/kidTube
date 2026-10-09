import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  thumbWrap: { backgroundColor: yt.surfaceAlt, overflow: 'hidden', position: 'relative', width: '100%' },
  thumb: { aspectRatio: 16 / 9, width: '100%' },
  badge: {
    backgroundColor: yt.badge,
    borderRadius: 4,
    bottom: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
    position: 'absolute',
    right: 8,
  },
  badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarText: { color: '#FFFFFF', fontWeight: '700' },

  card: { borderWidth: 0, marginBottom: 20 },
  meta: { flexDirection: 'row', gap: 12, paddingHorizontal: 12, paddingTop: 12 },
  metaText: { flex: 1, gap: 4 },
  title: { color: yt.text, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  subtitle: { color: yt.textDim, fontSize: 12.5 },

  compact: { borderWidth: 0, gap: 6, width: 210 },
  compactTitle: { color: yt.text, fontSize: 13.5, fontWeight: '600', lineHeight: 18 },
  compactMeta: { color: yt.textDim, fontSize: 12 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
