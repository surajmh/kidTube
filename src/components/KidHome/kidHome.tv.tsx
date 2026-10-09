import React, { useEffect, useRef } from 'react';
import { FlatList, Image, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { ApprovedVideo } from '../../types';
import { FocusablePressable } from '../tv';
import { ChannelAvatar, Thumbnail } from '../youtube/VideoCard';
import { useTheme } from '../theme';
import { KID_COPY, KID_DESTINATIONS } from './kidHome.constant';
import type { KidHomeProps } from './kidHome.type';
import type { useKidHome } from './kidHome.hook';
import { Empty } from './kidHome.primitives';
import useStyles from './kidHome.tv.style';

type KidState = ReturnType<typeof useKidHome>;

export function TvTopBar({ props, kid }: { props: KidHomeProps; kid: KidState }) {
  const styles = useStyles();
  const { colors } = useTheme();
  useEffect(() => { props.onBottomNavLayout?.(0); }, [props.onBottomNavLayout]);
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Image source={require('../../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brandName}>kidTube</Text>
      </View>
      {kid.searching ? (
        <View style={styles.search}>
          <FocusablePressable accessibilityLabel="Close search" style={styles.icon} onPress={kid.closeSearch}>
            <Feather name="arrow-left" size={20} color={colors.ink} />
          </FocusablePressable>
          <TextInput autoFocus value={kid.query} onChangeText={kid.setQuery} placeholder={KID_COPY.searchPlaceholder} placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel={KID_COPY.searchPlaceholder} />
        </View>
      ) : (
        <View style={styles.nav}>
          {KID_DESTINATIONS.filter((item) => item.id !== 'downloads' || props.downloadsEnabled !== false).map((item) => (
            <FocusablePressable key={item.id} accessibilityLabel={item.label} accessibilityState={{ selected: kid.tab === item.id }} hasTVPreferredFocus={kid.tvFocusMenu && (kid.onFeed ? item.id === 'home' : kid.tab === item.id)} onFocus={() => kid.setTvFocusMenu(true)} style={[styles.navItem, kid.tab === item.id && styles.navActive]} onPress={() => kid.changeTab(item.id)}>
              <Feather name={item.icon as React.ComponentProps<typeof Feather>['name']} size={16} color={kid.tab === item.id ? '#251744' : colors.muted} />
              <Text style={[styles.navLabel, kid.tab === item.id && styles.navLabelActive]}>{item.label}{item.id === 'requests' && props.pendingRequestCount ? ` (${props.pendingRequestCount})` : ''}</Text>
            </FocusablePressable>
          ))}
        </View>
      )}
      <View style={styles.actions}>
        {!kid.searching && <FocusablePressable accessibilityLabel="Search" style={styles.icon} onPress={kid.openSearch}><Feather name="search" size={20} color={colors.ink} /></FocusablePressable>}
        <FocusablePressable accessibilityLabel={`Signed in as ${props.activeProfile?.name ?? 'explorer'}`} style={styles.icon} onPress={kid.toggleSwitcher}><ChannelAvatar name={props.activeProfile?.name ?? '?'} size={28} /></FocusablePressable>
        <FocusablePressable accessibilityLabel="Open parent mode" style={styles.icon} onPress={props.onParentPress}><Feather name="lock" size={18} color={colors.muted} /></FocusablePressable>
      </View>
    </View>
  );
}

export function TvVideoCard({ video, onPress, onFocus, restoreFocus = false }: { video: ApprovedVideo; onPress: (video: ApprovedVideo) => void; onFocus?: () => void; restoreFocus?: boolean }) {
  const styles = useStyles();
  return (
    <FocusablePressable accessibilityLabel={`Play ${video.title}`} style={styles.videoCard} hasTVPreferredFocus={restoreFocus} onPress={() => onPress(video)} onFocus={onFocus}>
      <Thumbnail video={video} radius={10} />
      <Text numberOfLines={2} style={styles.videoTitle}>{video.title}</Text>
      <Text numberOfLines={1} style={styles.videoMeta}>{video.channelName || KID_COPY.unknownChannel}</Text>
    </FocusablePressable>
  );
}

function TvVideoRail({ title, videos, railId, props, kid }: { title: string; videos: ApprovedVideo[]; railId: string; props: KidHomeProps; kid: KidState }) {
  const styles = useStyles();
  const list = useRef<FlatList<ApprovedVideo>>(null);
  const restoreIndex = videos.findIndex((video) => props.tvFocusTarget === `${railId}:${video.id}`);
  if (!videos.length) return null;
  return (
    <View style={styles.rail}>
      <Text style={styles.railTitle}>{title}</Text>
      <FlatList ref={list} horizontal initialScrollIndex={restoreIndex >= 0 ? restoreIndex : undefined} data={videos} keyExtractor={(video) => video.id} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.railItems} initialNumToRender={6} windowSize={5} removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ index, length: 192, offset: 192 * index })}
        renderItem={({ item, index }) => <TvVideoCard video={item} restoreFocus={!kid.tvFocusMenu && index === restoreIndex} onPress={(video) => { props.onTvFocusTargetChange?.(`${railId}:${video.id}`); props.onVideoPress(video); }} onFocus={() => { kid.setTvFocusMenu(false); list.current?.scrollToIndex({ index, viewPosition: 0.5, animated: true }); }} />} />
    </View>
  );
}

export function TvHomeFeed({ props, kid }: { props: KidHomeProps; kid: KidState }) {
  const styles = useStyles();
  const featured = kid.feedVideos[0];
  return (
    <View testID="tv-home-feed">
      {featured ? (
        <View style={styles.hero}>
          <View style={styles.heroArtwork}><Thumbnail video={featured} radius={16} /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>PICKED FOR {props.activeProfile?.name?.toUpperCase() || 'YOU'}</Text>
            <Text style={styles.heroTitle} numberOfLines={2}>{featured.title}</Text>
            <Text style={styles.heroChannel} numberOfLines={1}>{featured.channelName || KID_COPY.unknownChannel}</Text>
            <View style={styles.heroActions}>
              <FocusablePressable accessibilityLabel={`Watch featured ${featured.title}`} style={styles.watch} hasTVPreferredFocus={!kid.tvFocusMenu && props.tvFocusTarget === `featured:${featured.id}`} onFocus={() => kid.setTvFocusMenu(false)} onPress={() => { props.onTvFocusTargetChange?.(`featured:${featured.id}`); props.onVideoPress(featured); }}>
                <Feather name="play" size={18} color="#251744" /><Text style={styles.watchLabel}>Watch now</Text>
              </FocusablePressable>
              {props.library.channels.some((channel) => channel.channelId === featured.channelId) && <FocusablePressable accessibilityLabel="More like this" style={styles.more} onFocus={() => kid.setTvFocusMenu(false)} onPress={() => { props.onSelectChannel(featured.channelId!); kid.changeTab('channels'); }}><Text style={styles.moreLabel}>More like this</Text></FocusablePressable>}
            </View>
          </View>
        </View>
      ) : <Empty icon="play-circle" title={props.selectedCategoryId ? KID_COPY.feedEmptyCategoryTitle : KID_COPY.feedEmptyTitle} body={KID_COPY.feedEmptyBody} />}
      <TvVideoRail title="Continue watching" videos={kid.keepWatching} railId="recent" props={props} kid={kid} />
      <TvVideoRail title={props.selectedCategoryId ? 'In this category' : 'Picked for you'} videos={kid.feedVideos} railId="feed" props={props} kid={kid} />
    </View>
  );
}
