import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Phase3Settings, SponsorBlockCategory, ScreenTimeUsage } from '../phase3Types';
import { localDayKey } from '../services/playbackPolicyService';
import { ChildProfile } from '../types';

const colors = {
  ink: '#243047',
  muted: '#718096',
  canvas: '#FFF9F2',
  card: '#FFFFFF',
  lavender: '#EEE8FF',
  purple: '#6654C7',
  mint: '#DDF5EA',
  mintDark: '#257A5A',
  line: '#EEE9E2',
  danger: '#B74754',
};

const categoryLabels: Array<[SponsorBlockCategory, string]> = [
  ['sponsor', 'Sponsorship'],
  ['intro', 'Intro'],
  ['outro', 'Outro'],
  ['selfpromo', 'Self promotion'],
  ['interaction', 'Interaction reminder'],
  ['music', 'Music'],
];

const limitOptions = [15, 30, 45, 60, 90, 120];

function minutesToTime(value: number) {
  const hour = Math.floor(value / 60) % 24;
  const minute = value % 60;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function minutesToInput(value: number) {
  return `${String(Math.floor(value / 60) % 24).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
}

function parseTime(value: string) {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}><View style={[styles.toggleKnob, value && styles.toggleKnobOn]} /></View>
    </Pressable>
  );
}

export function Phase3SettingsPanel({ settings, usage, profiles, onChange }: { settings: Phase3Settings; usage: ScreenTimeUsage[]; profiles: ChildProfile[]; onChange: (settings: Phase3Settings) => void }) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDay());
  const dayWindows = settings.schedules[String(selectedDay)] ?? [];
  const currentWindow = dayWindows[0] ?? { startMinutes: 16 * 60, endMinutes: 19 * 60 };

  function patch(patch: Partial<Phase3Settings>) {
    onChange({ ...settings, ...patch });
  }

  function updateWindow(field: 'startMinutes' | 'endMinutes', value: string) {
    const parsed = parseTime(value);
    if (parsed === null) return;
    patch({ schedules: { ...settings.schedules, [String(selectedDay)]: [{ ...currentWindow, [field]: parsed }] } });
  }

  function toggleCategory(category: SponsorBlockCategory) {
    const exists = settings.sponsorBlockCategories.includes(category);
    patch({ sponsorBlockCategories: exists ? settings.sponsorBlockCategories.filter((item) => item !== category) : [...settings.sponsorBlockCategories, category] });
  }

  return (
    <View>
      <View style={styles.intro}><View><Text style={styles.title}>Family playback defaults</Text><Text style={styles.subtitle}>Applies to every child. Per-child overrides live in the Children tab.</Text></View><Feather name="sliders" size={24} color={colors.ink} /></View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Player behavior</Text>
        <ToggleRow label="Autoplay next approved video" value={settings.autoplay} onChange={(autoplay) => patch({ autoplay })} />
        <ToggleRow label="SponsorBlock" value={settings.sponsorBlockEnabled} onChange={(sponsorBlockEnabled) => patch({ sponsorBlockEnabled })} />
        {settings.sponsorBlockEnabled && <View style={styles.categoryWrap}>{categoryLabels.map(([category, label]) => { const selected = settings.sponsorBlockCategories.includes(category); return <Pressable key={category} onPress={() => toggleCategory(category)} style={[styles.category, selected && styles.categorySelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><Feather name={selected ? 'check-square' : 'square'} size={16} color={selected ? colors.purple : colors.muted} /><Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{label}</Text></Pressable>; })}</View>}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily screen time</Text>
        <Text style={styles.helper}>Only actual playing time is counted. Paused, buffering, and browsing do not count.</Text>
        <View style={styles.limitWrap}>
          {limitOptions.map((minutes) => <Pressable key={minutes} onPress={() => patch({ dailyLimitMinutes: minutes })} style={[styles.limitChip, settings.dailyLimitMinutes === minutes && styles.limitChipSelected]}><Text style={[styles.limitText, settings.dailyLimitMinutes === minutes && styles.limitTextSelected]}>{minutes} min</Text></Pressable>)}
          <Pressable onPress={() => patch({ dailyLimitMinutes: null })} style={[styles.limitChip, settings.dailyLimitMinutes === null && styles.limitChipSelected]}><Text style={[styles.limitText, settings.dailyLimitMinutes === null && styles.limitTextSelected]}>Unlimited</Text></Pressable>
        </View>
        <ToggleRow label="Screen-time warnings" value={settings.screenTimeWarningsEnabled} onChange={(screenTimeWarningsEnabled) => patch({ screenTimeWarningsEnabled })} />
        <Text style={styles.usageHeading}>Used today</Text>
        {profiles.map((profile) => { const record = usage.find((item) => item.profileId === profile.id && item.date === localDayKey()); return <View key={profile.id} style={styles.usageRow}><Text style={styles.rowLabel}>{profile.name}</Text><Text style={styles.usageText}>{Math.floor((record?.secondsWatched ?? 0) / 60)} min</Text></View>; })}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Allowed hours</Text>
        <ToggleRow label="Limit Kid Mode to a daily window" value={settings.allowedHoursEnabled} onChange={(allowedHoursEnabled) => patch({ allowedHoursEnabled })} />
        <Text style={styles.helper}>Choose a day, then set its allowed window. Times use your device’s local timezone.</Text>
        <View style={styles.dayWrap}>{[['0', 'Sun'], ['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat']].map(([day, label]) => <Pressable key={day} onPress={() => setSelectedDay(Number(day))} style={[styles.dayChip, selectedDay === Number(day) && styles.dayChipSelected]}><Text style={[styles.dayText, selectedDay === Number(day) && styles.dayTextSelected]}>{label}</Text></Pressable>)}</View>
        <View style={styles.scheduleFields}>
          <View style={styles.scheduleField}><Text style={styles.fieldLabel}>Start (24h)</Text><TextInput key={`start-${selectedDay}`} defaultValue={minutesToInput(currentWindow.startMinutes)} onEndEditing={(event) => updateWindow('startMinutes', event.nativeEvent.text)} keyboardType="numbers-and-punctuation" style={styles.scheduleInput} accessibilityLabel="Allowed hours start" /></View>
          <View style={styles.scheduleField}><Text style={styles.fieldLabel}>End (24h)</Text><TextInput key={`end-${selectedDay}`} defaultValue={minutesToInput(currentWindow.endMinutes)} onEndEditing={(event) => updateWindow('endMinutes', event.nativeEvent.text)} keyboardType="numbers-and-punctuation" style={styles.scheduleInput} accessibilityLabel="Allowed hours end" /></View>
        </View>
        <Text style={styles.helper}>Current window: {minutesToTime(currentWindow.startMinutes)} – {minutesToTime(currentWindow.endMinutes)}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Bedtime</Text>
        <ToggleRow label="Pause Kid Mode during bedtime" value={settings.bedtimeEnabled} onChange={(bedtimeEnabled) => patch({ bedtimeEnabled })} />
        <Text style={styles.helper}>Bedtime: {minutesToTime(settings.bedtimeStartMinutes)} · Available again: {minutesToTime(settings.bedtimeEndMinutes)}</Text>
      </View>
      <Text style={styles.saveHint}>Changes are saved locally on this device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 28 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  card: { backgroundColor: colors.card, borderColor: colors.line, borderRadius: 18, borderWidth: 1, marginTop: 16, padding: 16 },
  cardTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', marginBottom: 8 },
  toggleRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  rowLabel: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '700' },
  toggle: { backgroundColor: '#DED9D1', borderRadius: 16, height: 30, justifyContent: 'center', padding: 3, width: 52 },
  toggleOn: { backgroundColor: colors.purple },
  toggleKnob: { backgroundColor: '#fff', borderRadius: 12, height: 24, width: 24 },
  toggleKnobOn: { alignSelf: 'flex-end' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 7 },
  category: { alignItems: 'center', backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 5, minHeight: 40, paddingHorizontal: 10 },
  categorySelected: { backgroundColor: colors.lavender, borderColor: colors.purple },
  categoryText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  categoryTextSelected: { color: colors.ink },
  helper: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  limitWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  limitChip: { borderColor: colors.line, borderRadius: 12, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 9 },
  limitChipSelected: { backgroundColor: colors.lavender, borderColor: colors.purple },
  limitText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  limitTextSelected: { color: colors.ink },
  usageHeading: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginTop: 8, textTransform: 'uppercase' },
  usageRow: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row', minHeight: 38 },
  usageText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  dayWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 },
  dayChip: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  dayChipSelected: { backgroundColor: colors.lavender, borderColor: colors.purple },
  dayText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  dayTextSelected: { color: colors.ink },
  scheduleFields: { flexDirection: 'row', gap: 10 },
  scheduleField: { flex: 1 },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', marginBottom: 5 },
  scheduleInput: { backgroundColor: colors.canvas, borderColor: colors.line, borderRadius: 10, borderWidth: 1, color: colors.ink, fontSize: 14, height: 44, paddingHorizontal: 10 },
  saveHint: { color: colors.muted, fontSize: 12, marginTop: 16, textAlign: 'center' },
});
