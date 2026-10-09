import { useTheme } from '../theme';
import React from 'react';
import { DeArrowPreview } from './deArrowPreview';
import type { ApprovedVideo } from '../../types';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { PlaybackSettings, ScreenTimeUsage } from '../../types';
import { localDayKey } from '../../services/playbackPolicyService';
import { ChildProfile } from '../../types';

import useStyles from './playbackSettings.style';
import { minutesToInput, minutesToTime } from '../shared/time.helper';
import { LIMIT_OPTIONS, CATEGORY_LABELS, QUALITY_HEIGHTS, DAY_LABELS, RETENTION_OPTIONS, DOWNLOADS_TOGGLE_LABEL, DOWNLOADS_HELPER, DOWNLOADS_QUALITY_HELPER } from './playbackSettings.constant';
import { usePlaybackSettings } from './playbackSettings.hook';

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const styles = useStyles();
  return (
    <Pressable onPress={() => onChange(!value)} style={styles.toggleRow} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={[styles.toggle, value && styles.toggleOn]}><View style={[styles.toggleKnob, value && styles.toggleKnobOn]} /></View>
    </Pressable>
  );
}

export function PlaybackSettingsPanel({ settings, usage, profiles, onChange, videos = [] }: { videos?: ApprovedVideo[]; settings: PlaybackSettings; usage: ScreenTimeUsage[]; profiles: ChildProfile[]; onChange: (settings: PlaybackSettings) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { selectedDay, setSelectedDay, currentWindow, patch, updateWindow, toggleCategory } = usePlaybackSettings(settings, onChange);

  return (
    <View>
      <View style={styles.intro}><View><Text style={styles.title}>Family playback defaults</Text><Text style={styles.subtitle}>Applies to every child. Per-child overrides live in the Children tab.</Text></View><Feather name="sliders" size={24} color={colors.ink} /></View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Appearance</Text>
        <Text style={styles.helper}>One theme for child and parent screens. System follows your device.</Text>
        <View style={styles.limitWrap} accessibilityRole="radiogroup">
          {(['light', 'dark', 'system'] as const).map((themeMode) => {
            const selected = (settings.themeMode ?? 'system') === themeMode;
            return <Pressable key={themeMode} accessibilityRole="radio" accessibilityLabel={`${themeMode} theme`} accessibilityState={{ selected }} onPress={() => patch({ themeMode })} style={[styles.limitChip, selected && styles.limitChipSelected]}>
              <Text style={[styles.limitText, selected && styles.limitTextSelected]}>{themeMode[0].toUpperCase() + themeMode.slice(1)}</Text>
            </Pressable>;
          })}
        </View>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Player behavior</Text>
        <ToggleRow label="Autoplay next approved video" value={settings.autoplay} onChange={(autoplay) => patch({ autoplay })} />
        <ToggleRow label="Allow background audio" value={Boolean(settings.backgroundAudioEnabled)} onChange={(backgroundAudioEnabled) => patch({ backgroundAudioEnabled })} />
        <Text style={styles.helper}>Listening with the screen locked still counts toward playtime and follows bedtime, allowed hours and approvals.</Text>
        <ToggleRow label="Use parent-approved DeArrow replacements" value={Boolean(settings.deArrowEnabled)} onChange={(deArrowEnabled) => patch({ deArrowEnabled })} />
        <Text style={styles.cardTitle}>Maximum video quality</Text>
        <View style={styles.limitWrap}>
          {QUALITY_HEIGHTS.map((height) => <Pressable key={height} accessibilityRole="radio" accessibilityLabel={`Maximum quality ${height}p`} accessibilityState={{ selected: (settings.maxQualityHeight ?? 1080) === height }} onPress={() => patch({ maxQualityHeight: height })} style={[styles.limitChip, (settings.maxQualityHeight ?? 1080) === height && styles.limitChipSelected]}><Text style={[styles.limitText, (settings.maxQualityHeight ?? 1080) === height && styles.limitTextSelected]}>{height}p</Text></Pressable>)}
        </View>
        <ToggleRow label="SponsorBlock" value={settings.sponsorBlockEnabled} onChange={(sponsorBlockEnabled) => patch({ sponsorBlockEnabled })} />
        {settings.sponsorBlockEnabled && <View style={styles.categoryWrap}>{CATEGORY_LABELS.map(([category, label]) => { const selected = settings.sponsorBlockCategories.includes(category); return <Pressable key={category} onPress={() => toggleCategory(category)} style={[styles.category, selected && styles.categorySelected]} accessibilityRole="checkbox" accessibilityState={{ checked: selected }}><Feather name={selected ? 'check-square' : 'square'} size={16} color={selected ? colors.ink : colors.muted} /><Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>{label}</Text></Pressable>; })}</View>}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Downloads</Text>
        <ToggleRow label={DOWNLOADS_TOGGLE_LABEL} value={settings.downloadsEnabled} onChange={(downloadsEnabled) => patch({ downloadsEnabled })} />
        <Text style={styles.helper}>{DOWNLOADS_HELPER}</Text>
        <Text style={styles.helper}>{DOWNLOADS_QUALITY_HELPER}</Text>
        {settings.downloadsEnabled && <>
          <Text style={styles.usageHeading}>Keep downloads for</Text>
          <View style={styles.limitWrap}>
            {RETENTION_OPTIONS.map((days) => <Pressable key={days} accessibilityRole="radio" accessibilityLabel={`Keep downloads ${days} days`} accessibilityState={{ selected: settings.downloadRetentionDays === days }} onPress={() => patch({ downloadRetentionDays: days })} style={[styles.limitChip, settings.downloadRetentionDays === days && styles.limitChipSelected]}><Text style={[styles.limitText, settings.downloadRetentionDays === days && styles.limitTextSelected]}>{days} days</Text></Pressable>)}
          </View>
        </>}
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
        <View style={styles.dayWrap}>{DAY_LABELS.map(([day, label]) => <Pressable key={day} onPress={() => setSelectedDay(Number(day))} style={[styles.dayChip, selectedDay === Number(day) && styles.dayChipSelected]}><Text style={[styles.dayText, selectedDay === Number(day) && styles.dayTextSelected]}>{label}</Text></Pressable>)}</View>
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
      <DeArrowPreview videos={videos} settings={settings} onChange={onChange} />
      <Text style={styles.saveHint}>Changes are saved locally on this device.</Text>
    </View>
  );
}
