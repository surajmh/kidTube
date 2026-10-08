import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';
import { colors } from '../theme';

export default StyleSheet.create({
  wrap: { marginTop: 14 },
  button: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: yt.surfaceAlt, borderRadius: 22, flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 18 },
  disabled: { opacity: 0.7 },
  label: { color: yt.text, fontSize: 15, fontWeight: '700' },
  message: { color: yt.textDim, fontSize: 13, marginTop: 8 },
  scrim: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: colors.card, borderRadius: 24, maxWidth: 420, padding: 20, width: '100%' },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  row: { backgroundColor: colors.lavender, borderRadius: 14, justifyContent: 'center', marginBottom: 8, minHeight: 48, paddingHorizontal: 16 },
  rowText: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  cancel: { alignItems: 'center', height: 46, justifyContent: 'center', marginTop: 4 },
  cancelText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});
