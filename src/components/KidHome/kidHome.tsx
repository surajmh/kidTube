import React from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { VideoCard } from '../youtube/VideoCard';
import { KID_COPY } from './kidHome.constant';
import { videoKey } from './kidHome.helper';
import { useKidHome } from './kidHome.hook';
import { useKidHomeList } from './kidHome.list.hook';
import { KidHomeProps } from './kidHome.type';
import { Chip, Empty, Notice } from './kidHome.primitives';
import { ChannelHeader, ChannelRow } from './kidHome.channelPage';
import { SearchHeader } from './kidHome.search';
import { AskPanel } from './kidHome.askPanel';
import { ProfileSwitcher, TopBar } from './kidHome.topBar';
import { BottomNav } from './kidHome.bottomNav';
import { PlaylistsSection } from './kidHome.library';
import { DownloadsSection } from './kidHome.downloads';
import styles from './kidHome.style';

/**
 * Kid Mode.
 *
 * Presentation only: every derivation lives in `useKidHome`, and the rules it depends on live in
 * `helpers.ts` so they are covered by tests rather than only by rendering. Each section of the
 * screen (search, a channel's page, the ask-a-parent form, …) is its own file alongside this one.
 */
export function KidHomeScreen(props: KidHomeProps) {
  const {
    profiles,
    activeProfile,
    onSelectProfile,
    library,
    notice,
    noticeAction,
    selectedCategoryId,
    onSelectCategory,
    onSelectChannel,
    onVideoPress,
    onParentPress,
    requests,
    onSubmitRequest,
    onRequestVideo,
    onRequestChannel,
    pendingRequestCount,
  } = props;

  const kid = useKidHome(props);
  const tab = kid.tab;
  const { playlists, selectedPlaylist, list, videos, renderVideo, channelVideoCounts } = useKidHomeList(props, kid);

  let channelsBody: React.ReactNode;
  if (kid.selectedChannel) {
    channelsBody = (
      <ChannelHeader
        channel={kid.selectedChannel}
        videos={kid.channelVideos}
        availability={kid.availability}
        onBack={() => onSelectChannel(null)}
      />
    );
  } else if (library.channels.length) {
    channelsBody = library.channels.map((channel) => (
      <ChannelRow
        key={channel.id}
        channel={channel}
        videoCount={channelVideoCounts.get(channel.channelId) ?? 0}
        onOpen={onSelectChannel}
      />
    ));
  } else {
    channelsBody = <Empty icon="users" title="No channels yet" body="Approved channels will appear here." />;
  }

  return (
    <View style={styles.screen}>
      <TopBar
        searching={kid.searching}
        query={kid.query}
        setQuery={kid.setQuery}
        activeProfile={activeProfile}
        closeSearch={kid.closeSearch}
        openSearch={kid.openSearch}
        toggleSwitcher={kid.toggleSwitcher}
        onParentPress={onParentPress}
      />

      {kid.switcherOpen && profiles.length > 1 ? (
        <ProfileSwitcher
          profiles={profiles}
          activeProfile={activeProfile}
          onSelectProfile={onSelectProfile}
          closeSwitcher={kid.closeSwitcher}
        />
      ) : null}

      {kid.onFeed && !kid.searching && library.categories.length > 0 ? (
        <View style={styles.chipBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label="All" active={!selectedCategoryId} onPress={() => onSelectCategory(null)} />
            {library.categories.map((entry) => (
              <Chip
                key={entry.category.id}
                label={entry.category.name}
                active={selectedCategoryId === entry.category.id}
                onPress={() => onSelectCategory(entry.category.id)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        ref={list}
        key={`${activeProfile?.id}:${kid.searching ? 'search' : tab}:${selectedCategoryId}:${props.selectedChannelId}:${props.selectedPlaylistId}`}
        data={videos}
        renderItem={renderVideo}
        keyExtractor={videoKey}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews={false}
        keyboardShouldPersistTaps="handled"
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<>

          {notice ? <Notice notice={notice} action={noticeAction} /> : null}

          {kid.searching ? (
            <SearchHeader
              query={kid.query}
              results={kid.results}
              onSelectChannel={kid.openChannelFromSearch}
            />
          ) : null}

          {!kid.searching && kid.onFeed ? (
            <>
              {kid.keepWatching.length > 0 ? (
                <>
                  <Text style={styles.shelfTitle}>Keep watching</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
                    {kid.keepWatching.map((video) => (
                      <VideoCard key={`recent-${video.id}`} video={video} compact onPress={onVideoPress} />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {!kid.feedVideos.length ? (
                <Empty
                  icon="play-circle"
                  title={selectedCategoryId ? KID_COPY.feedEmptyCategoryTitle : KID_COPY.feedEmptyTitle}
                  body={KID_COPY.feedEmptyBody}
                />
              ) : null}
            </>
          ) : null}

          {!kid.searching && tab === 'channels' ? channelsBody : null}

          {!kid.searching && tab === 'playlists' ? (
            <PlaylistsSection
              playlists={playlists}
              selectedPlaylist={selectedPlaylist}
              onSelectPlaylist={props.onSelectPlaylist}
              onPlayPlaylist={props.onPlayPlaylist}
            />
          ) : null}

          {!kid.searching && tab === 'downloads' ? (
            <DownloadsSection downloads={props.downloads ?? []} videos={library.videos} onPlay={onVideoPress} />
          ) : null}

          {!kid.searching && tab === 'requests' ? (
            <AskPanel
              activeProfile={activeProfile}
              askableVideos={library.askableVideos}
              askableChannels={library.askableChannels}
              requests={requests}
              onSubmit={onSubmitRequest}
              onRequestVideo={onRequestVideo}
              onRequestChannel={onRequestChannel}
            />
          ) : null}
        </>}
      />

      <BottomNav tab={tab} downloadsEnabled={props.downloadsEnabled ?? true} pendingRequestCount={pendingRequestCount} onChangeTab={kid.changeTab} />
    </View>
  );
}
