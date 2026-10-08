import { StyleSheet } from 'react-native';
import { yt } from '../youtube/theme';

export default StyleSheet.create({
  scroll: { paddingBottom: 24 },
  panel: { padding: 12, gap: 10, backgroundColor: yt.surface },
  label: { color: yt.text, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  choice: { padding: 12, minHeight: 44, borderRadius: 8, backgroundColor: yt.surfaceAlt },
  selected: { borderWidth: 1, borderColor: yt.text },
  text: { color: yt.text },
  hint: { color: yt.textDim, fontSize: 12 },
});
