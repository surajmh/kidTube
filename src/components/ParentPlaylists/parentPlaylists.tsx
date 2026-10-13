import React from 'react';
import { Text, View } from 'react-native';
import { SettingsChoice, SettingsGroup, SettingsRow, SettingsText } from '../SettingsMenu';
import { useStyles } from '../AppShell/appShell.style';
import { useParentPlaylists } from './parentPlaylists.hook';
import type { ParentPlaylistsProps } from './parentPlaylists.type';

export function ParentPlaylists({ playlists, videos, onSave, onRemove }: ParentPlaylistsProps) {
  const styles = useStyles();
  const { draft, setDraft, query, setQuery, busy, error, byId, run, edit, move } = useParentPlaylists(videos);
  return <View>
    <Text style={styles.formPanelSubtitle}>Each child sees only videos they can access. Adding a video does not approve it.</Text>
    {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
    {draft ? <>
      <SettingsText label="Playlist name" value={draft.name} onChange={(name) => setDraft({ ...draft, name })} />
      {draft.videoIds.map((id, index) => <SettingsGroup key={id} label={`${index + 1}. ${byId.get(id)?.title}`}>
        <SettingsRow label="Move up" disabled={busy || index === 0} onPress={() => move(index, -1)} />
        <SettingsRow label="Move down" disabled={busy || index === draft.videoIds.length - 1} onPress={() => move(index, 1)} />
        <SettingsRow label="Remove from playlist" disabled={busy} onPress={() => setDraft({ ...draft, videoIds: draft.videoIds.filter((value) => value !== id) })} />
      </SettingsGroup>)}
      <SettingsGroup label="Add videos">
        <SettingsText label="Find videos to add" value={query} onChange={setQuery} />
        {videos.filter((video) => !draft.videoIds.includes(video.id) && video.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30).map((video) =>
          <SettingsRow key={video.id} label={`Add ${video.title} to playlist`} disabled={busy} onPress={() => setDraft({ ...draft, videoIds: [...draft.videoIds, video.id] })} />)}
        <Text style={styles.formPanelSubtitle}>Showing up to 30 matches. Search to find more.</Text>
      </SettingsGroup>
      <SettingsRow label={busy ? 'Saving…' : 'Save playlist'} disabled={busy} onPress={() => void run(() => onSave(draft))} />
      <SettingsRow label="Cancel playlist changes" disabled={busy} onPress={() => setDraft(null)} />
    </> : <>
      <SettingsRow label="New playlist" onPress={() => edit({ id: '', name: '', videoIds: [] })} />
      {playlists.map((playlist) => <SettingsGroup key={playlist.id} label={playlist.name} value={`${playlist.videoIds.filter((id) => byId.has(id)).length} videos`}>
        <SettingsRow label={`Edit ${playlist.name}`} disabled={busy} onPress={() => edit(playlist)} />
        <SettingsChoice label={`Delete ${playlist.name}`} value={false} options={[{ value: false, label: 'Keep playlist' }, { value: true, label: 'Delete playlist' }]} onChange={(remove) => remove ? run(() => onRemove(playlist.id)) : undefined} />
      </SettingsGroup>)}
    </>}
  </View>;
}
