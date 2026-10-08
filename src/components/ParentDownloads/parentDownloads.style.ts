import { StyleSheet } from 'react-native';
import { colors } from '../theme';

const styles = StyleSheet.create({
  groupHeader: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 20 },
  groupName: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '800' },
  groupCount: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  list: { marginTop: 10 },
  note: { color: colors.muted, fontSize: 12, marginTop: 8 },
});

export default styles;
