import React from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { FocusablePressable } from '../tv';
import { Field, PrimaryButton, SecondaryButton } from '../AppShell/appFormControls';
import { styles } from '../AppShell/appShell.style';
import { colors } from '../theme';
import { useParentPlaylists } from './parentPlaylists.hook';
import { ParentPlaylistsProps } from './parentPlaylists.type';

export function ParentPlaylists({ playlists, videos, onSave, onRemove }: ParentPlaylistsProps) {
  const { draft, setDraft, query, setQuery, busy, error, byId, run, edit, move } = useParentPlaylists(videos);
  return <View style={styles.formPanel}>
    <Text style={styles.formPanelTitle}>Curated playlists</Text>
    <Text style={styles.formPanelSubtitle}>Choose the order. Each child sees only videos they can access; adding a video does not approve it.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
    {draft ? <>
      <Field label="Playlist name" value={draft.name} onChangeText={(name) => setDraft({ ...draft, name })} placeholder="Learning, stories, travel…" />
      {draft.videoIds.map((id, index) => <View key={id} style={{ marginVertical: 6 }}>
        <Text style={styles.inputLabel}>{index + 1}. {byId.get(id)?.title}</Text>
        <View style={styles.formButtonRow}>
          <PrimaryButton label="Move up" disabled={busy || index === 0} onPress={() => move(index, -1)} />
          <PrimaryButton label="Move down" disabled={busy || index === draft.videoIds.length - 1} onPress={() => move(index, 1)} />
          <PrimaryButton label="Remove" disabled={busy} onPress={() => setDraft({ ...draft, videoIds: draft.videoIds.filter((value) => value !== id) })} />
        </View>
      </View>)}
      <TextInput accessibilityLabel="Find videos to add to playlist" placeholder="Find videos to add" placeholderTextColor={colors.muted} style={styles.textInput} value={query} onChangeText={setQuery} />
      {/* ponytail: show 30 search matches; use a virtualized picker if libraries need browsing here. */}
      {videos.filter((video) => !draft.videoIds.includes(video.id) && video.title.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 30).map((video) =>
        <FocusablePressable key={video.id} disabled={busy} accessibilityLabel={`Add ${video.title} to playlist`} style={styles.secondaryButton} onPress={() => setDraft({ ...draft, videoIds: [...draft.videoIds, video.id] })}><Text style={styles.secondaryButtonText}>+ {video.title}</Text></FocusablePressable>)}
      <Text style={styles.formPanelSubtitle}>Showing up to 30 matches. Search to find more.</Text>
      <View style={styles.formButtonRow}>
        <PrimaryButton label={busy ? 'Saving…' : 'Save playlist'} disabled={busy} onPress={() => void run(() => onSave(draft))} />
        <PrimaryButton label="Cancel" disabled={busy} onPress={() => setDraft(null)} />
      </View>
    </> : <>
      {playlists.map((playlist) => <View key={playlist.id} style={{ marginVertical: 10 }}>
        <Text style={styles.inputLabel}>{playlist.name} · {playlist.videoIds.filter((id) => byId.has(id)).length} videos</Text>
        <View style={styles.formButtonRow}>
          <PrimaryButton label={`Edit ${playlist.name}`} disabled={busy} onPress={() => edit(playlist)} />
          <PrimaryButton label={`Delete ${playlist.name}`} disabled={busy} onPress={() => Alert.alert('Delete playlist?', `Remove “${playlist.name}”? Videos stay in your library.`, [
            { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => void run(() => onRemove(playlist.id)) },
          ])} />
        </View>
      </View>)}
      <SecondaryButton label="New playlist" onPress={() => edit({ id: '', name: '', videoIds: [] })} />
    </>}
  </View>;
}
