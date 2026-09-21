import { StyleSheet } from 'react-native';
import { colors } from '../theme';

/** Playback settings styles. */
const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 18, borderWidth: 1, marginTop: 16, padding: 16 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  rowLabel: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  toggle: { backgroundColor: colors.line, borderRadius: 16, height: 30, justifyContent: 'center', padding: 3, width: 52 },
  toggleOn: { backgroundColor: colors.purple },
  toggleKnob: { backgroundColor: '#fff', borderRadius: 12, height: 24, width: 24 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 7 },
  category: { alignItems: 'center', backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 40, paddingHorizontal: 10 },
  categorySelected: { backgroundColor: colors.lavender },
  categoryText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.ink },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  limitWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  limitChip: { borderColor: colors.line, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  limitChipSelected: { backgroundColor: colors.lavender },
  limitText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  limitTextSelected: { color: colors.ink },
  usageHeading: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },
  usageRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 38 },
  usageText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  dayWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 },
  dayChip: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  dayChipSelected: { backgroundColor: colors.lavender },
  dayText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  dayTextSelected: { color: colors.ink },
  scheduleFields: { flexDirection: 'row', gap: 10 },
  scheduleField: { flex: 1 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  scheduleInput: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 10, borderWidth: 1, color: colors.ink, fontSize: 14, height: 44, paddingHorizontal: 10 },
  saveHint: { color: colors.muted, fontSize: 12, marginTop: 16, textAlign: 'center' },
});

export default styles;
