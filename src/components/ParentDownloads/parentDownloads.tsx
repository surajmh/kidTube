import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { downloadService } from '../../services/downloadService';
import { PrimaryButton } from '../AppShell/appFormControls';
import { FocusablePressable } from '../tv';
import { styles } from '../AppShell/appShell.style';
import { colors } from '../theme';
import { RETENTION_DAYS } from './parentDownloads.constant';
import { useParentDownloads } from './parentDownloads.hook';
import { downloadStatusText } from './parentDownloads.helper';
import { ParentDownloadsProps } from './parentDownloads.type';

export function ParentDownloads({ session, videos, profiles, downloads, maximum, refresh, readError }: ParentDownloadsProps) {
  const { query, setQuery, setQuality, days, setDays, busy, error, approved, byId, run, choices, selectedQuality } = useParentDownloads({ videos, profiles, maximum, refresh });
  return <View style={styles.formPanel}>
    <Text style={styles.formPanelTitle}>Saved for travel</Text>
    <Text style={styles.formPanelSubtitle}>Files stay inside kidTube. Downloads never override approvals, child blocks, bedtime or daily limits.</Text>
    <Text style={styles.inputLabel}>Download quality (up to)</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {choices.map((height) => <FocusablePressable key={height} accessibilityRole="radio" accessibilityLabel={`Download quality ${height}p`} accessibilityState={{ selected: height === selectedQuality }} style={styles.secondaryButton} onPress={() => setQuality(height)}><Text style={styles.secondaryButtonText}>{height === selectedQuality ? '✓ ' : ''}{height}p</Text></FocusablePressable>)}
    </View>
    <Text style={styles.inputLabel}>Keep downloads for</Text>
    <View style={styles.formButtonRow}>{RETENTION_DAYS.map((value) => <FocusablePressable key={value} accessibilityRole="radio" accessibilityLabel={`Keep downloads ${value} days`} accessibilityState={{ selected: value === days }} style={styles.secondaryButton} onPress={() => setDays(value)}><Text style={styles.secondaryButtonText}>{value === days ? '✓ ' : ''}{value} days</Text></FocusablePressable>)}</View>
    {error || readError ? <Text accessibilityRole="alert" style={styles.errorText}>{error || readError}</Text> : null}
    <Text style={styles.inputLabel}>Downloads on this device</Text>
    {!downloads.length ? <Text style={styles.formPanelSubtitle}>No saved videos yet.</Text> : null}
    {downloads.map((item) => <View key={item.videoId} style={{ marginVertical: 8 }}>
      <Text style={styles.inputLabel}>{byId.get(item.videoId)?.title ?? 'Removed from library'}</Text>
      <Text style={styles.formPanelSubtitle}>{downloadStatusText(item)} · {(item.bytes / 1048576).toFixed(1)} MB{item.expiresAt ? ` · expires ${new Date(item.expiresAt).toLocaleDateString()}` : ''}</Text>
      <PrimaryButton label={item.state === 'preparing' || item.state === 'downloading' ? 'Cancel download' : 'Remove download'} disabled={Boolean(busy && busy !== item.videoId)} onPress={() => void run(item.videoId, () => downloadService.remove(session, item.videoId, videos, profiles))} />
    </View>)}
    <TextInput accessibilityLabel="Find approved videos to download" placeholder="Find approved videos" placeholderTextColor={colors.muted} style={styles.textInput} value={query} onChangeText={setQuery} />
    {/* ponytail: cap the picker at 30 matches; virtualize if parents need to browse large libraries here. */}
    {approved.filter((video) => video.title.toLowerCase().includes(query.trim().toLowerCase()) && !downloads.some((item) => item.videoId === video.youtubeVideoId)).slice(0, 30).map((video) => <View key={video.id} style={{ marginVertical: 6 }}>
      <Text style={styles.inputLabel}>{video.title}</Text>
      <PrimaryButton label={busy === video.youtubeVideoId ? 'Preparing…' : `Save ${video.title}`} disabled={Boolean(busy)} onPress={() => void run(video.youtubeVideoId, () => downloadService.save(session, video, videos, profiles, selectedQuality, days))} />
    </View>)}
    <Text style={styles.formPanelSubtitle}>Showing up to 30 matches. Downloads continue in the background while Android permits it; reopen kidTube to resume interrupted transfers.</Text>
  </View>;
}
