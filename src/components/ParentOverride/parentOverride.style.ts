import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Parent override sheet styles. */
const styles = StyleSheet.create({
  scrim: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1, justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.card, borderRadius: 24, padding: 20, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', gap: 13 },
  icon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 20, height: 42, justifyContent: 'center', width: 42 },
  headerText: { flex: 1 },
  title: { color: colors.ink, fontSize: 21, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  existing: { backgroundColor: colors.mint, borderRadius: 12, color: colors.mintDark, fontSize: 12, fontWeight: '800', marginTop: 14, padding: 10 },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 18 },
  preset: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 13, flexGrow: 1, minHeight: 52, justifyContent: 'center', paddingHorizontal: 14 },
  presetText: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  scheduleToggle: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 12, flexDirection: 'row', gap: 8, marginTop: 12, minHeight: 48, paddingHorizontal: 11 },
  scheduleToggleActive: { backgroundColor: colors.lavender },
  scheduleText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: '800' },
  scheduleTextActive: { color: colors.ink },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 12 },
  cancel: { alignItems: 'center', height: 46, justifyContent: 'center', marginTop: 12 },
  cancelText: { color: colors.muted, fontSize: 14, fontWeight: '700' },
});

export default styles;
