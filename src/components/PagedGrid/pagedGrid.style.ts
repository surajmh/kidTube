import { StyleSheet } from 'react-native';
import { colors } from '../theme';

const styles = StyleSheet.create({
  more: {
    alignItems: 'center',
    backgroundColor: colors.lavender,
    borderRadius: 16,
    gap: 4,
    justifyContent: 'center',
    minHeight: 96,
    padding: 12,
  },
  moreText: { color: colors.ink, fontSize: 13, fontWeight: '800', textAlign: 'center' },
  moreCount: { color: colors.muted, fontSize: 11, fontWeight: '700' },
});

export default styles;
