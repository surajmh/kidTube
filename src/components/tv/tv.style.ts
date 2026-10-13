import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  // A transparent border keeps the focus ring from shifting layout.
  base: { borderColor: 'transparent', borderWidth: 2 },
  // A light ring reads on both the dark kid and parent surfaces.
  focused: { borderColor: colors.ink, elevation: 6, shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 10, transform: [{ scale: 1.03 }] },
  pressed: { opacity: 0.82 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
