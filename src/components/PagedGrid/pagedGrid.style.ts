import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  more: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderRadius: 16,
    gap: 4,
    justifyContent: 'center',
    minHeight: 96,
    padding: 12,
  },
  moreText: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  moreCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
