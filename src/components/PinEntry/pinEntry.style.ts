import { StyleSheet } from 'react-native';
import { colors } from '../theme';

const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.canvas,
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 26,
    fontWeight: '800',
    height: 56,
    letterSpacing: 10,
    paddingHorizontal: 18,
    textAlign: 'center',
  },
  inputError: { borderColor: colors.danger },
  dots: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 14 },
  dot: { backgroundColor: colors.line, borderRadius: 7, height: 13, width: 13 },
  dotFilled: { backgroundColor: colors.purple },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 14 },
  key: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 13, height: 52, justifyContent: 'center', width: '30%' },
  keyLabel: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 13, marginTop: 10, textAlign: 'center' },
  helper: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10, textAlign: 'center' },
  submit: {
    alignItems: 'center',
    backgroundColor: colors.purple,
    borderRadius: 14,
    flexDirection: 'row',
    gap: 10,
    height: 52,
    justifyContent: 'center',
    marginTop: 16,
  },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  submitBusy: { opacity: 0.7 },
});

export default styles;
