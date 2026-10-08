import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList } from 'react-native';
import { playlistVideos } from '../../services/playlistService';
import { ApprovedVideo } from '../../types';
import { VideoCard } from '../youtube/VideoCard';
import { EMPTY_VIDEOS } from './kidHome.constant';
import { useKidHome } from './kidHome.hook';
import { KidHomeProps } from './kidHome.type';

/** The screen's list wiring: playlists, which videos the FlatList shows, and its scroll reset. */
export function useKidHomeList(props: KidHomeProps, kid: ReturnType<typeof useKidHome>) {
  const { library, onVideoPress } = props;
  const tab = kid.tab;
  const playlists = useMemo(() => (props.playlists ?? []).map((playlist) => ({ ...playlist, videos: playlistVideos(playlist, library.videos) })).filter((playlist) => playlist.videos.length > 0), [props.playlists, library.videos]);
  const selectedPlaylist = playlists.find((playlist) => playlist.id === props.selectedPlaylistId);
  const list = useRef<FlatList<ApprovedVideo>>(null);
  let videos = EMPTY_VIDEOS;
  if (kid.searching) videos = kid.query.trim() ? kid.results.videos : EMPTY_VIDEOS;
  else if (kid.onFeed) videos = kid.feedVideos;
  else if (tab === 'playlists') videos = selectedPlaylist?.videos ?? EMPTY_VIDEOS;
  else if (tab === 'channels' && kid.selectedChannel) videos = kid.channelVideos;
  const renderVideo = useCallback(({ item }: { item: ApprovedVideo }) => createElement(VideoCard, {
    video: item,
    onPress: selectedPlaylist && tab === 'playlists' && !kid.searching
      ? (video: ApprovedVideo) => props.onPlayPlaylist?.(selectedPlaylist.videos.slice(selectedPlaylist.videos.findIndex((entry) => entry.id === video.id)), selectedPlaylist.name)
      : onVideoPress,
  }), [onVideoPress, selectedPlaylist, props.onPlayPlaylist, kid.searching, tab]);
  useEffect(() => {
    if (kid.searching) list.current?.scrollToOffset({ offset: 0, animated: false });
  }, [kid.searching, kid.results]);

  // Per-channel video counts, computed once per library instead of a full scan per channel row.
  const channelVideoCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const video of library.videos) {
      if (!video.channelId) continue;
      counts.set(video.channelId, (counts.get(video.channelId) ?? 0) + 1);
    }
    return counts;
  }, [library.videos]);

  return { playlists, selectedPlaylist, list, videos, renderVideo, channelVideoCounts };
}
