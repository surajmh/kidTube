import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export default function useStyles() {
  const { yt, dark } = useTheme();
  return useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: dark ? '#0F1724' : '#F8FAFC' },
    content: { width: '100%', maxWidth: 960, alignSelf: 'center', padding: Platform.isTV ? 36 : 16, paddingBottom: 48 },
    heading: { color: yt.text, fontSize: Platform.isTV ? 30 : 24, fontWeight: '700', marginVertical: 20 },
    row: { minHeight: Platform.isTV ? 76 : 56, width: '100%', flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Platform.isTV ? 14 : 10, paddingHorizontal: Platform.isTV ? 20 : 14, borderRadius: 12, borderWidth: 1, borderColor: dark ? '#253040' : '#E9EDF2', marginBottom: 8, backgroundColor: dark ? '#19212D' : '#FFFFFF' },
    highlighted: { backgroundColor: dark ? '#15304B' : '#ECFAFE', borderColor: dark ? '#1E6891' : '#C5ECF6' },
    focus: { backgroundColor: dark ? '#19405B' : '#E3F5FD', borderColor: dark ? '#53C5F2' : '#0789A7', transform: [{ scale: 1 }], elevation: 0, shadowOpacity: 0 },
    icon: { width: Platform.isTV ? 48 : 36, height: Platform.isTV ? 48 : 36, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1, gap: 4 },
    label: { color: yt.text, fontSize: Platform.isTV ? 21 : 16, fontWeight: '600' },
    description: { color: dark ? '#ADB9CA' : '#526174', fontSize: Platform.isTV ? 16 : 12, lineHeight: Platform.isTV ? 23 : 17 },
    value: { color: dark ? '#B9C8DA' : '#526174', fontSize: Platform.isTV ? 18 : 13, maxWidth: '38%', textAlign: 'right' },
    badge: { borderRadius: 12, overflow: 'hidden', backgroundColor: dark ? '#304660' : '#EDF1F6', paddingHorizontal: 10, paddingVertical: 4, fontSize: Platform.isTV ? 16 : 11 },
    focusedText: { color: dark ? '#FFFFFF' : '#073C53' },
    disabled: { opacity: 0.45 },
    input: { backgroundColor: yt.surface, color: yt.text, borderColor: yt.textDim, borderWidth: 1, borderRadius: 8, minHeight: 56, padding: 16, fontSize: 20, marginBottom: 20 },
    error: { color: yt.text, fontSize: 16, marginVertical: 12 },
  }), [yt, dark]);
}
