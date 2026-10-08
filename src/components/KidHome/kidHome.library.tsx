import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ApprovedVideo } from '../../types';
import { shuffleVideos } from '../../services/playlistService';
import { FocusablePressable } from '../tv';
import type { Playlist } from './kidHome.type';
import { ICON } from './kidHome.constant';
import { Chip, Empty } from './kidHome.primitives';
import styles from './kidHome.style';

/** The Playlists tab header: either the list of playlists or the chosen playlist's controls. */
export function PlaylistsSection({
  playlists,
  selectedPlaylist,
  onSelectPlaylist,
  onPlayPlaylist,
}: {
  playlists: Playlist[];
  selectedPlaylist?: Playlist;
  onSelectPlaylist?: (id: string | null) => void;
  onPlayPlaylist?: (videos: ApprovedVideo[], name: string) => void;
}) {
  if (selectedPlaylist) {
    return (
      <View>
        <Text style={styles.shelfTitle}>{selectedPlaylist.name}</Text>
        <View style={styles.chipRow}>
          <Chip label="All playlists" active={false} onPress={() => onSelectPlaylist?.(null)} />
          <Chip label="Play all" active={false} onPress={() => onPlayPlaylist?.(selectedPlaylist.videos, selectedPlaylist.name)} />
          <Chip label="Shuffle" active={false} onPress={() => onPlayPlaylist?.(shuffleVideos(selectedPlaylist.videos), selectedPlaylist.name)} />
        </View>
        <Text style={styles.noticeText}>Next videos play automatically only when your parent allows autoplay.</Text>
      </View>
    );
  }
  if (!playlists.length) {
    return <Empty icon="list" title="No playlists yet" body="Ask a grown-up to make a playlist for you." />;
  }
  return (
    <>
      {playlists.map((playlist) => (
        <FocusablePressable key={playlist.id} accessibilityLabel={`Open playlist ${playlist.name}`} style={styles.channelRow} onPress={() => onSelectPlaylist?.(playlist.id)}>
          <Feather name="list" size={24} color={ICON.ink} />
          <View><Text style={styles.channelRowName}>{playlist.name}</Text><Text style={styles.channelRowMeta}>{playlist.videos.length} videos</Text></View>
        </FocusablePressable>
      ))}
    </>
  );
}
