import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Categories panel styles. */
const styles = StyleSheet.create({
  formCard: { backgroundColor: colors.card, borderRadius: 18, marginTop: 16, padding: 14 },
  formLabel: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  input: { backgroundColor: colors.canvas, borderRadius: 13, color: colors.ink, fontSize: 15, height: 50, marginTop: 10, paddingHorizontal: 13 },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  formActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 12 },
  primary: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, height: 48, justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  secondary: { alignItems: 'center', height: 48, justifyContent: 'center', paddingHorizontal: 14 },
  secondaryText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 24 },
  row: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 15, flexDirection: 'row', marginBottom: 8, minHeight: 68, padding: 9 },
  icon: { alignItems: 'center', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  rowInfo: { flex: 1, paddingHorizontal: 11 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  iconButton: { alignItems: 'center', height: 46, justifyContent: 'center', width: 44 },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
});

export default styles;
