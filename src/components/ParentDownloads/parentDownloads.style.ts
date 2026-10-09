import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 20 },
  groupName: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800' },
  groupCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  list: { marginTop: 10 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
