import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Phase3Settings, SponsorBlockCategory, ScreenTimeUsage } from '../../phase3Types';
import { localDayKey } from '../../services/playbackPolicyService';
import { ChildProfile } from '../../types';
import { colors } from '../theme';
import styles from './phase3Settings.style';
import { minutesToInput, minutesToTime, parseTime } from '../shared/time.helper';
import { LIMIT_OPTIONS, DEFAULT_SETTINGS_WINDOW } from './phase3Settings.constant';
import { toggleInList } from './phase3Settings.helper';


const categoryLabels: Array<[SponsorBlockCategory, string]> = [
  ['sponsor', 'Sponsorship'],
  ['intro', 'Intro'],
  ['outro', 'Outro'],
  ['selfpromo', 'Self promotion'],
  ['interaction', 'Interaction reminder'],
  ['music', 'Music'],
];


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
  const currentWindow = dayWindows[0] ?? DEFAULT_SETTINGS_WINDOW;

  function patch(patch: Partial<Phase3Settings>) {
    onChange({ ...settings, ...patch });
  }

  function updateWindow(field: 'startMinutes' | 'endMinutes', value: string) {
    const parsed = parseTime(value);
    if (parsed === null) return;
    patch({ schedules: { ...settings.schedules, [String(selectedDay)]: [{ ...currentWindow, [field]: parsed }] } });
  }

  function toggleCategory(category: SponsorBlockCategory) {
    patch({ sponsorBlockCategories: toggleInList(settings.sponsorBlockCategories, category) });
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
          {LIMIT_OPTIONS.map((minutes) => <Pressable key={minutes} onPress={() => patch({ dailyLimitMinutes: minutes })} style={[styles.limitChip, settings.dailyLimitMinutes === minutes && styles.limitChipSelected]}><Text style={[styles.limitText, settings.dailyLimitMinutes === minutes && styles.limitTextSelected]}>{minutes} min</Text></Pressable>)}
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
