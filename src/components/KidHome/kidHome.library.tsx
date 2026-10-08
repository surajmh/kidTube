import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ApprovedVideo } from '../../types';
import { shuffleVideos } from '../../services/playlistService';
import { FocusablePressable } from '../tv';
import { VideoCard } from '../youtube/VideoCard';
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

/** The Library tab header: videos saved for travel, then the "recently watched" heading. */
export function SavedShelf({ saved, onVideoPress }: { saved: ApprovedVideo[]; onVideoPress: (video: ApprovedVideo) => void }) {
  return (
    <View>
      <Text style={styles.shelfTitle}>Saved for travel</Text>
      {saved.length ? <ScrollView horizontal contentContainerStyle={styles.shelf} showsHorizontalScrollIndicator={false}>
        {saved.map((video) => <VideoCard key={`saved-${video.id}`} video={video} compact onPress={onVideoPress} />)}
      </ScrollView> : <Text style={styles.noticeText}>Ask a grown-up to save videos before your trip.</Text>}
      <Text style={styles.shelfTitle}>Recently watched</Text>
    </View>
  );
}
