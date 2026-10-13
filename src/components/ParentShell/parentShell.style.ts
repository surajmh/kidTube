import { useMemo } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export default function useStyles() {
  const { yt, dark } = useTheme();
  return useMemo(() => StyleSheet.create({
    screen: { backgroundColor: dark ? '#0F1724' : '#F8FAFC', flex: 1 },
    content: { paddingBottom: 32, paddingHorizontal: Platform.isTV ? 36 : 16, width: '100%', maxWidth: 1040, alignSelf: 'center' },
    title: { color: yt.text, fontSize: Platform.isTV ? 30 : 24, fontWeight: '700', letterSpacing: -0.4, marginTop: 16, marginBottom: 20 },
    notice: { alignItems: 'center', backgroundColor: dark ? '#2A251B' : '#FFF8E8', borderColor: dark ? '#57401D' : '#F5E4BC', borderWidth: 1, borderRadius: 12, flexDirection: 'row', gap: 10, marginTop: 8, paddingVertical: 8, paddingLeft: 14, paddingRight: 4 },
    noticeIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: dark ? '#483518' : '#FFF0CC', alignItems: 'center', justifyContent: 'center' },
    noticeText: { color: dark ? '#E2D9C3' : '#66501F', flex: 1, fontSize: Platform.isTV ? 16 : 12, lineHeight: Platform.isTV ? 23 : 17 },
    dismissNotice: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
    bottomSpace: { height: 20 },
  }), [yt, dark]);
}
