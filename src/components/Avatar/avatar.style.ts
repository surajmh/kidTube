import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: colors.lavender, justifyContent: 'center' },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
