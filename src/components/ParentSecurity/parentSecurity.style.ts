import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4, maxWidth: 280 },
  card: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 20, borderWidth: 1, marginTop: 18, padding: 16 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 12 },
  field: { marginBottom: 12 },
  fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', marginBottom: 7 },
  input: {
    backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 13, borderWidth: 1,
    color: colors.ink, fontSize: 22, fontWeight: '800', height: 52, letterSpacing: 9,
    paddingHorizontal: 16, textAlign: 'center',
  },
  error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 4 },
  notice: { color: colors.mintDark, fontSize: 13, lineHeight: 19, marginTop: 4 },
  submit: {
    alignItems: 'center', backgroundColor: colors.purple, borderRadius: 14, flexDirection: 'row',
    gap: 9, height: 50, justifyContent: 'center', marginTop: 6,
  },
  submitDisabled: { opacity: 0.55 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
