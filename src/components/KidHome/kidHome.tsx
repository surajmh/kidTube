import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FocusablePressable } from '../tv';
import { ApprovedVideo } from '../../types';
import { ChannelAvatar, VideoCard } from '../youtube/VideoCard';
import { ICON, KID_COPY, KID_DESTINATIONS } from './kidHome.constant';
import { useKidHome } from './kidHome.hook';
import { KidHomeProps } from './kidHome.type';
import { Chip, Empty } from './kidHome.primitives';
import { ChannelHeader, ChannelRow } from './kidHome.channelPage';
import { SearchHeader } from './kidHome.search';
import { AskPanel } from './kidHome.askPanel';
import styles from './kidHome.style';

/**
 * Kid Mode.
 *
 * Presentation only: every derivation lives in `useKidHome`, and the rules it depends on live in
 * `helpers.ts` so they are covered by tests rather than only by rendering. Each section of the
 * screen (search, a channel's page, the ask-a-parent form, …) is its own file alongside this one.
 */
const EMPTY_VIDEOS: ApprovedVideo[] = [];
const videoKey = (video: ApprovedVideo) => video.id;

export function KidHomeScreen(props: KidHomeProps) {
  const {
    profiles,
    activeProfile,
    onSelectProfile,
    library,
    notice,
    noticeAction,
    tab,
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
  const list = useRef<FlatList<ApprovedVideo>>(null);
  const videos = kid.searching ? (kid.query.trim() ? kid.results.videos : EMPTY_VIDEOS)
    : kid.onFeed ? kid.feedVideos
    : tab === 'recent' ? library.recentVideos
    : tab === 'channels' && kid.selectedChannel ? kid.channelVideos
    : EMPTY_VIDEOS;
  const renderVideo = useCallback(({ item }: { item: ApprovedVideo }) => (
    <VideoCard video={item} onPress={onVideoPress} />
  ), [onVideoPress]);
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

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        {kid.searching ? (
          <>
            <FocusablePressable
              accessibilityLabel="Close search"
              style={styles.iconButton}
              onPress={kid.closeSearch}
            >
              <Feather name="arrow-left" size={22} color={ICON.ink} />
            </FocusablePressable>
            <TextInput
              value={kid.query}
              onChangeText={kid.setQuery}
              autoFocus
              placeholder={KID_COPY.searchPlaceholder}
              placeholderTextColor={ICON.inkDim}
              style={styles.searchField}
              accessibilityLabel={KID_COPY.searchPlaceholder}
            />
          </>
        ) : (
          <>
            <View style={styles.brand}>
              <Image source={require('../../../assets/icon.png')} style={styles.brandMark} resizeMode="contain" />
              <Text style={styles.brandText}>kidTube</Text>
            </View>
            <View style={styles.topActions}>
              <FocusablePressable
                accessibilityLabel="Search"
                style={styles.iconButton}
                onPress={kid.openSearch}
              >
                <Feather name="search" size={21} color={ICON.ink} />
              </FocusablePressable>
              <FocusablePressable
                accessibilityLabel={`Signed in as ${activeProfile?.name ?? 'explorer'}`}
                style={styles.iconButton}
                onPress={kid.toggleSwitcher}
              >
                <ChannelAvatar name={activeProfile?.name ?? '?'} size={28} />
              </FocusablePressable>
              <FocusablePressable
                accessibilityLabel="Open parent mode"
                style={styles.iconButton}
                onPress={onParentPress}
              >
                <Feather name="lock" size={19} color={ICON.inkDim} />
              </FocusablePressable>
            </View>
          </>
        )}
      </View>

      {kid.switcherOpen && profiles.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
          {profiles.map((profile) => (
            <FocusablePressable
              key={profile.id}
              accessibilityLabel={`Switch to ${profile.name}`}
              style={[styles.switcherItem, activeProfile?.id === profile.id && styles.switcherItemActive]}
              onPress={() => {
                onSelectProfile(profile.id);
                kid.closeSwitcher();
              }}
            >
              <ChannelAvatar name={profile.name} size={24} />
              <Text
                style={[styles.switcherText, activeProfile?.id === profile.id && styles.switcherTextActive]}
              >
                {profile.name}
              </Text>
            </FocusablePressable>
          ))}
        </ScrollView>
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
        key={`${activeProfile?.id}:${kid.searching ? 'search' : tab}:${selectedCategoryId}:${props.selectedChannelId}`}
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

          {notice ? (
            <View style={styles.notice}>
              <Feather name="info" size={16} color={ICON.ink} />
              <Text style={styles.noticeText}>{notice}</Text>
              {noticeAction ? (
                <FocusablePressable
                  accessibilityLabel={noticeAction.label}
                  style={styles.noticeAction}
                  onPress={noticeAction.onPress}
                >
                  <Text style={styles.noticeActionText}>{noticeAction.label}</Text>
                </FocusablePressable>
              ) : null}
            </View>
          ) : null}

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

          {!kid.searching && tab === 'channels' ? (
            kid.selectedChannel ? (
              <ChannelHeader
                channel={kid.selectedChannel}
                videos={kid.channelVideos}
                availability={kid.availability}
                onBack={() => onSelectChannel(null)}
              />
            ) : library.channels.length ? (
              library.channels.map((channel) => (
                <ChannelRow
                  key={channel.id}
                  channel={channel}
                  videoCount={channelVideoCounts.get(channel.channelId) ?? 0}
                  onOpen={onSelectChannel}
                />
              ))
            ) : (
              <Empty icon="users" title="No channels yet" body="Approved channels will appear here." />
            )
          ) : null}

          {!kid.searching && tab === 'recent' && !library.recentVideos.length ? (
            <Empty icon="film" title="Nothing watched yet" body="Videos you watch show up here." />
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

      <View style={styles.bottomNav}>
        {KID_DESTINATIONS.map((item) => {
          const active = item.id === tab || (item.id === 'home' && tab === 'categories');
          return (
            <FocusablePressable
              key={item.id}
              accessibilityLabel={item.label}
              style={styles.navItem}
              onPress={() => kid.changeTab(item.id)}
            >
              <View>
                <Feather
                  name={item.icon as keyof typeof Feather.glyphMap}
                  size={22}
                  color={active ? ICON.ink : ICON.inkDim}
                />
                {item.id === 'requests' && pendingRequestCount > 0 ? (
                  <View style={styles.navBadge}>
                    <Text style={styles.navBadgeText}>{pendingRequestCount}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
            </FocusablePressable>
          );
        })}
      </View>
    </View>
  );
}
