import React from 'react';
import { ApprovedVideo } from '../../types';
import { VideoCard } from '../youtube/VideoCard';
import { KID_COPY } from './kidHome.constant';
import { KidSearchResults } from './kidHome.type';
import { ChannelRow } from './kidHome.channelPage';
import { Empty } from './kidHome.primitives';

export function SearchResults({
  query,
  results,
  onVideoPress,
  onSelectChannel,
}: {
  query: string;
  results: KidSearchResults;
  onVideoPress: (video: ApprovedVideo) => void;
  onSelectChannel: (channelId: string) => void;
}) {
  if (!query.trim()) {
    return <Empty icon="search" title={KID_COPY.searchIdleTitle} body={KID_COPY.searchIdleBody} />;
  }
  if (!results.videos.length && !results.channels.length) {
    return <Empty icon="search" title={KID_COPY.searchEmptyTitle} body={KID_COPY.searchEmptyBody} />;
  }
  return (
    <>
      {results.channels.map((channel) => (
        <ChannelRow
          key={`result-${channel.id}`}
          channel={channel}
          subtitle="Channel"
          onOpen={onSelectChannel}
        />
      ))}
      {results.videos.map((video) => (
        <VideoCard key={`result-${video.id}`} video={video} onPress={onVideoPress} />
      ))}
    </>
  );
}
