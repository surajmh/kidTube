import { useMemo } from 'react';
import { useTheme, type Palette, type VideoPalette } from '../theme';
import { StyleSheet } from 'react-native';

/** Filter drawer styles. */
const makeStyles = (colors: Palette, yt: VideoPalette) => StyleSheet.create({
  trigger: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 7,
    minHeight: 34,
    paddingHorizontal: 14,
  },
  triggerText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  triggerBadge: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 8,
    minWidth: 16,
    paddingHorizontal: 4,
  },
  triggerBadgeText: { color: yt.chipActiveText, fontSize: 11, fontWeight: '700' },

  scrim: { backgroundColor: 'rgba(0,0,0,0.6)', flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: yt.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: 12,
  },
  grabber: {
    alignSelf: 'center',
    backgroundColor: yt.line,
    borderRadius: 2,
    height: 4,
    marginTop: 8,
    width: 36,
  },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  heading: { color: yt.text, fontSize: 17, fontWeight: '700' },
  close: { alignItems: 'center', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },

  body: { gap: 10, paddingBottom: 12, paddingHorizontal: 16 },
  input: {
    backgroundColor: yt.surfaceAlt,
    borderRadius: 20,
    color: yt.text,
    fontSize: 14,
    height: 42,
    paddingHorizontal: 16,
  },
  groupLabel: { color: yt.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: yt.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: yt.chipActive },
  chipText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: yt.chipActiveText },

  footer: {
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  clear: { alignItems: 'center', borderRadius: 20, flex: 1, justifyContent: 'center', minHeight: 42 },
  clearText: { color: yt.textDim, fontSize: 14, fontWeight: '600' },
  apply: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 20,
    flex: 1,
    justifyContent: 'center',
    minHeight: 42,
  },
  applyText: { color: yt.chipActiveText, fontSize: 14, fontWeight: '700' },
});

export function useStyles() {
  const { colors, yt } = useTheme();
  return useMemo(() => makeStyles(colors, yt), [colors, yt]);
}

export default useStyles;
