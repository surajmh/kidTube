import React from 'react';
import { Text, View } from 'react-native';
import { Avatar } from '../Avatar';
import { DownloadList } from '../DownloadList';
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
    {groups.map(({ profile, entries }) => <View key={profile.id}>
      <View style={styles.groupHeader}>
        <Avatar profile={profile} size={32} />
        <Text style={styles.groupName}>{profile.name}</Text>
        <Text style={styles.groupCount}>{entries.length}</Text>
      </View>
      <View style={styles.list}>
        <DownloadList
          entries={entries}
          showHeader={false}
          busyId={busy?.startsWith(`${profile.id}:`) ? busy.slice(profile.id.length + 1) : null}
          onDelete={(entry) => void remove(profile.id, entry.item.videoId)}
        />
      </View>
    </View>)}
  </View>;
}
