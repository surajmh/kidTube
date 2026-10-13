import { SettingsChoice, SettingsGroup } from '../SettingsMenu';
import React from 'react';
import { Text, View } from 'react-native';
import { useStyles as useShell } from '../AppShell/appShell.style';
import { DOWNLOADS_EMPTY, DOWNLOADS_OFF_NOTE, DOWNLOADS_SUBTITLE, DOWNLOADS_TITLE } from './parentDownloads.constant';
import { useParentDownloads } from './parentDownloads.hook';
import useStyles from './parentDownloads.style';
import type { ParentDownloadsProps } from './parentDownloads.type';

/** Parent view: every child's saved videos, each with a "…" menu to delete it. */
export function ParentDownloads({ profiles, videos, downloads, downloadsEnabled, refresh, readError }: ParentDownloadsProps) {
  const shell = useShell();
  const styles = useStyles();
  const { groups, busy, error, remove } = useParentDownloads({ profiles, videos, downloads, refresh });
  return <View style={shell.formPanel}>
    <Text style={shell.formPanelTitle}>{DOWNLOADS_TITLE}</Text>
    <Text style={shell.formPanelSubtitle}>{DOWNLOADS_SUBTITLE}</Text>
    {downloadsEnabled ? null : <Text style={styles.note}>{DOWNLOADS_OFF_NOTE}</Text>}
    {error || readError ? <Text accessibilityRole="alert" style={shell.errorText}>{error || readError}</Text> : null}
    {groups.length ? null : <Text style={shell.formPanelSubtitle}>{DOWNLOADS_EMPTY}</Text>}
    {groups.map(({ profile, entries }) => <SettingsGroup key={profile.id} label={profile.name} value={`${entries.length} downloads`}>
      {entries.map((entry) => <SettingsChoice key={entry.item.videoId} label={entry.video?.title ?? entry.item.videoId} value={false}
        description={entry.item.state} options={[{ value: false, label: 'Keep download' }, { value: true, label: 'Delete download' }]}
        onChange={(deleteFile) => deleteFile ? remove(profile.id, entry.item.videoId) : undefined} />)}
    </SettingsGroup>)}
  </View>;
}
