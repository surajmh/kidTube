import React from 'react';
import { Text, View } from 'react-native';
import type { ApprovedVideo, PlaybackSettings, ScreenTimeUsage, ChildProfile } from '../../types';
import { localDayKey } from '../../services/playbackPolicyService';
import { SettingsChoice, SettingsGroup, SettingsTime, SettingsToggle } from '../SettingsMenu';
import { AllowedWindowEditor } from '../ParentChildren/parentChildren.allowedWindow';
import { DeArrowPreview } from './deArrowPreview';
import useStyles from './playbackSettings.style';
import { LIMIT_OPTIONS, CATEGORY_LABELS, QUALITY_HEIGHTS, RETENTION_OPTIONS, DOWNLOADS_TOGGLE_LABEL, DOWNLOADS_HELPER } from './playbackSettings.constant';
import { usePlaybackSettings } from './playbackSettings.hook';

export function PlaybackSettingsPanel({ settings, usage, profiles, onChange, videos = [] }: { videos?: ApprovedVideo[]; settings: PlaybackSettings; usage: ScreenTimeUsage[]; profiles: ChildProfile[]; onChange: (settings: PlaybackSettings) => void | Promise<void> }) {
  const styles = useStyles();
  const { patch, toggleCategory } = usePlaybackSettings(settings, onChange);
  return <View>
    <Text style={styles.title}>Family settings</Text>
    <Text style={styles.subtitle}>Defaults for every child. Choose a row to configure it.</Text>
    <SettingsGroup label="Appearance" value={settings.themeMode ?? 'system'}>
      <SettingsChoice label="Theme" value={settings.themeMode ?? 'system'} options={(['light', 'dark', 'system'] as const).map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} onChange={(themeMode) => patch({ themeMode })} />
    </SettingsGroup>
    <SettingsGroup label="Player behavior">
      <SettingsToggle label="Autoplay next approved video" value={settings.autoplay} onChange={(autoplay) => patch({ autoplay })} />
      <SettingsToggle label="Allow background audio" value={Boolean(settings.backgroundAudioEnabled)} onChange={(backgroundAudioEnabled) => patch({ backgroundAudioEnabled })} description="Listening still counts toward playtime and follows bedtime, allowed hours and approvals." />
      <SettingsChoice label="Maximum video quality" value={settings.maxQualityHeight ?? 1080} options={QUALITY_HEIGHTS.map((value) => ({ value, label: `${value}p` }))} onChange={(maxQualityHeight) => patch({ maxQualityHeight })} />
      <SettingsGroup label="SponsorBlock" value={settings.sponsorBlockEnabled ? 'On' : 'Off'}>
        <SettingsToggle label="Enable SponsorBlock" value={settings.sponsorBlockEnabled} onChange={(sponsorBlockEnabled) => patch({ sponsorBlockEnabled })} />
        {settings.sponsorBlockEnabled && CATEGORY_LABELS.map(([category, label]) => <SettingsToggle key={category} label={`Skip ${label}`} value={settings.sponsorBlockCategories.includes(category)} onChange={(enabled) => enabled === settings.sponsorBlockCategories.includes(category) ? undefined : toggleCategory(category)} />)}
      </SettingsGroup>
      <SettingsGroup label="DeArrow" value={settings.deArrowEnabled ? 'On' : 'Off'}>
        <SettingsToggle label="Use parent-approved DeArrow replacements" value={Boolean(settings.deArrowEnabled)} onChange={(deArrowEnabled) => patch({ deArrowEnabled })} />
        <SettingsGroup label="Review replacements"><DeArrowPreview videos={videos} settings={settings} onChange={onChange} /></SettingsGroup>
      </SettingsGroup>
    </SettingsGroup>
    <SettingsGroup label="Downloads" value={settings.downloadsEnabled ? 'On' : 'Off'} description={DOWNLOADS_HELPER}>
      <SettingsToggle label={DOWNLOADS_TOGGLE_LABEL} value={settings.downloadsEnabled} onChange={(downloadsEnabled) => patch({ downloadsEnabled })} />
      {settings.downloadsEnabled && <SettingsChoice label="Keep downloads for" value={settings.downloadRetentionDays} options={RETENTION_OPTIONS.map((value) => ({ value, label: `${value} days` }))} onChange={(downloadRetentionDays) => patch({ downloadRetentionDays })} />}
    </SettingsGroup>
    <SettingsGroup label="Daily screen time" value={settings.dailyLimitMinutes === null ? 'Unlimited' : `${settings.dailyLimitMinutes} min`} description="Only actual playing time is counted.">
      <SettingsChoice<number | null> label="Daily limit" value={settings.dailyLimitMinutes} options={[...LIMIT_OPTIONS.map((value) => ({ value, label: `${value} min` })), { value: null, label: 'Unlimited' }]} onChange={(dailyLimitMinutes) => patch({ dailyLimitMinutes })} />
      <SettingsToggle label="Screen-time warnings" value={settings.screenTimeWarningsEnabled} onChange={(screenTimeWarningsEnabled) => patch({ screenTimeWarningsEnabled })} />
      <SettingsGroup label="Used today">{profiles.map((profile) => <Text key={profile.id} style={styles.helper}>{profile.name}: {Math.floor((usage.find((item) => item.profileId === profile.id && item.date === localDayKey())?.secondsWatched ?? 0) / 60)} min</Text>)}</SettingsGroup>
    </SettingsGroup>
    <SettingsGroup label="Allowed hours" value={settings.allowedHoursEnabled ? 'Daily window' : 'Any time'}>
      <SettingsToggle label="Limit Kid Mode to a daily window" value={settings.allowedHoursEnabled} onChange={(allowedHoursEnabled) => patch({ allowedHoursEnabled })} />
      <AllowedWindowEditor schedules={settings.schedules} onChange={(schedules) => patch({ schedules })} />
    </SettingsGroup>
    <SettingsGroup label="Bedtime" value={settings.bedtimeEnabled ? 'On' : 'Off'}>
      <SettingsToggle label="Pause Kid Mode during bedtime" value={settings.bedtimeEnabled} onChange={(bedtimeEnabled) => patch({ bedtimeEnabled })} />
      <SettingsTime label="Bedtime starts" value={settings.bedtimeStartMinutes} onChange={(bedtimeStartMinutes) => patch({ bedtimeStartMinutes })} />
      <SettingsTime label="Available again" value={settings.bedtimeEndMinutes} onChange={(bedtimeEndMinutes) => patch({ bedtimeEndMinutes })} />
    </SettingsGroup>
    <Text style={styles.saveHint}>Changes are saved locally on this device.</Text>
  </View>;
}
