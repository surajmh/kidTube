import React from 'react';
import { KID_COPY } from './kidHome.constant';
import { KidSearchResults } from './kidHome.type';
import { ChannelRow } from './kidHome.channelPage';
import { Empty } from './kidHome.primitives';

export function SearchHeader({
  query,
  results,
  onSelectChannel,
}: {
  query: string;
  results: KidSearchResults;
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
    </>
  );
}
