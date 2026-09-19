import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { ContentRequest, ContentCategory, RequestType } from '../phase4Types';
import { KidLibrary } from '../services/kidContentLibraryService';
import { ChannelSyncState } from '../services/content/channelSyncRules';
import { Avatar } from './Avatar';
import { ChannelVideoList } from './ChannelVideoList';
import { colors, cardTints } from './theme';
import { FocusablePressable } from './tv';
import { PagedGrid } from './PagedGrid';
import { KidRequestsPanel } from './KidRequestsPanel';

export type KidTab = 'home' | 'categories' | 'channels' | 'recent' | 'requests';

const tabs: Array<{ id: KidTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'channels', label: 'Channels', icon: 'radio' },
  { id: 'recent', label: 'Recently watched', icon: 'clock' },
  { id: 'requests', label: 'Ask a Parent', icon: 'help-circle' },
];

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

export function KidHomeScreen({
  profiles,
  activeProfile,
  onSelectProfile,
  library,
  notice,
  noticeAction,
  tab,
  onTabChange,
  selectedCategoryId,
  onSelectCategory,
  onSelectChannel,
  selectedChannelId,
  onVideoPress,
  onParentPress,
  requests,
  onSubmitRequest,
  onRequestVideo,
  onRequestChannel,
  pendingRequestCount,
  channelSyncStateFor,
}: {
  profiles: ChildProfile[];
  activeProfile?: ChildProfile;
  onSelectProfile: (profileId: string) => void;
  library: KidLibrary;
  notice: string;
  /** Shown next to a blocked notice, e.g. "Ask a parent for more time". */
  noticeAction?: { label: string; onPress: () => void } | null;
  tab: KidTab;
  onTabChange: (tab: KidTab) => void;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onVideoPress: (video: ApprovedVideo) => void;
  onParentPress: () => void;
  requests: ContentRequest[];
  onSubmitRequest: (input: { type: RequestType; title: string }) => Promise<void>;
  onRequestVideo: (video: ApprovedVideo) => Promise<void>;
  onRequestChannel: (channel: ApprovedChannel) => Promise<void>;
  pendingRequestCount: number;
  /**
   * Cached fetch state per channel. Kid Mode only reads this: it never triggers a
   * fetch, so a child can never spend the family's YouTube quota (§14).
   */
  channelSyncStateFor: (channelId: string) => ChannelSyncState | undefined;
}) {
  const selectedCategory = library.categories.find((entry) => entry.category.id === selectedCategoryId);
  const categoryVideos = selectedCategory
    ? library.videos.filter((video) => video.categoryIds?.includes(selectedCategory.category.id))
    : library.videos;
  const selectedChannel = library.channels.find((channel) => channel.channelId === selectedChannelId);
  const channelVideos = selectedChannel
    ? library.videos.filter((video) => video.channelId === selectedChannel.channelId || video.channelName === selectedChannel.name)
    : [];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}><Feather name="sun" size={17} color={colors.purple} /></View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.profilePill}>
            <Avatar profile={activeProfile} size={30} />
            <Text style={styles.profilePillText}>{activeProfile?.name ?? 'Explorer'}</Text>
          </View>
          <FocusablePressable accessibilityLabel="Open parent mode" style={styles.lockButton} onPress={onParentPress}>
            <Feather name="lock" size={19} color={colors.ink} />
          </FocusablePressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
        {tabs.map((item) => (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={item.label}
            style={[styles.tab, tab === item.id && styles.tabActive]}
            onPress={() => onTabChange(item.id)}
          >
            <Feather name={item.icon} size={16} color={tab === item.id ? colors.purple : colors.muted} />
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
            {item.id === 'requests' && pendingRequestCount > 0 ? (
              <View style={styles.badge}><Text style={styles.badgeText}>{pendingRequestCount}</Text></View>
            ) : null}
          </FocusablePressable>
        ))}
      </ScrollView>

      {notice ? (
        <View style={styles.notice}>
          <Feather name="info" size={17} color={colors.purple} />
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

      {profiles.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.profileStrip}>
          {profiles.map((profile) => (
            <FocusablePressable
              key={profile.id}
              accessibilityLabel={`Switch to ${profile.name}`}
              style={[styles.profileChoice, activeProfile?.id === profile.id && styles.profileChoiceActive]}
              onPress={() => onSelectProfile(profile.id)}
            >
              <Avatar profile={profile} size={36} />
              <Text style={[styles.profileChoiceText, activeProfile?.id === profile.id && styles.profileChoiceTextActive]}>{profile.name}</Text>
            </FocusablePressable>
          ))}
        </ScrollView>
      )}

      {tab === 'home' && (
        <>
          <View style={styles.welcome}>
            <View>
              <Text style={styles.greeting}>Hi, {activeProfile?.name ?? 'there'}!</Text>
              <Text style={styles.subheading}>What shall we discover?</Text>
            </View>
            <View style={styles.welcomeSpark}><Feather name="sun" size={25} color={colors.coral} /></View>
          </View>

          {library.categories.length > 0 && (
            <>
              <SectionHeading title="Pick a category" action={`${library.categories.length} to explore`} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {library.categories.slice(0, 6).map((entry, index) => (
                  <CategoryCard
                    key={entry.category.id}
                    category={entry.category}
                    count={entry.videoCount}
                    index={index}
                    onPress={() => {
                      onSelectCategory(entry.category.id);
                      onTabChange('categories');
                    }}
                  />
                ))}
              </ScrollView>
            </>
          )}

          <SectionHeading title="Channels" action={library.channels.length ? `${library.channels.length} saved` : undefined} />
          {library.channels.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {library.channels.map((channel, index) => (
                <ChannelCard key={channel.id} channel={channel} index={index} />
              ))}
            </ScrollView>
          ) : (
            <EmptyCard icon="radio" title="No channels yet" body="Approved channels will appear here." />
          )}

          <SectionHeading title="Videos for you" action={library.videos.length ? `${library.videos.length} ready` : undefined} />
          {library.videos.length ? (
            <PagedGrid
              items={library.videos}
              style={styles.videoGrid}
              renderItem={(video, index) => (
                <VideoCard key={video.id} video={video} index={index} onPress={() => onVideoPress(video)} />
              )}
            />
          ) : (
            <EmptyCard icon="play-circle" title="Nothing here yet" body="Ask a grown-up to add a video for you." />
          )}

          {library.recentVideos.length > 0 && (
            <>
              <SectionHeading title="Recently watched" action="Your picks" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
                {library.recentVideos.map((video, index) => (
                  <VideoCard key={`recent-${video.id}`} video={video} compact index={index} onPress={() => onVideoPress(video)} />
                ))}
              </ScrollView>
            </>
          )}
        </>
      )}

      {tab === 'categories' && (
        <>
          <SectionHeading
            title={selectedCategory ? selectedCategory.category.name : 'Categories'}
            action={selectedCategory ? 'Tap to clear' : `${library.categories.length} available`}
          />
          {selectedCategory ? (
            <FocusablePressable accessibilityLabel="Show all categories" style={styles.clearFilter} onPress={() => onSelectCategory(null)}>
              <Feather name="arrow-left" size={16} color={colors.purple} />
              <Text style={styles.clearFilterText}>All categories</Text>
            </FocusablePressable>
          ) : null}
          <View style={styles.categoryGrid}>
            {library.categories.map((entry, index) => (
              <CategoryCard
                key={entry.category.id}
                category={entry.category}
                count={entry.videoCount}
                index={index}
                large
                onPress={() => onSelectCategory(entry.category.id)}
              />
            ))}
          </View>
          {library.categories.length === 0 ? (
            <EmptyCard icon="grid" title="No categories yet" body="Your grown-up can sort videos into categories." />
          ) : null}
          {selectedCategory ? (
            categoryVideos.length ? (
              <PagedGrid
                items={categoryVideos}
                style={styles.videoGrid}
                renderItem={(video, index) => (
                  <VideoCard key={video.id} video={video} index={index} onPress={() => onVideoPress(video)} />
                )}
              />
            ) : (
              <EmptyCard icon="play-circle" title="Nothing here yet" body="No videos in this category right now." />
            )
          ) : null}
        </>
      )}

      {tab === 'channels' && (
        <>
          <SectionHeading title="Channels" action={library.channels.length ? `${library.channels.length} saved` : undefined} />
          {library.channels.length ? (
            <PagedGrid
              items={library.channels}
              pageSize={12}
              style={styles.categoryGrid}
              moreStyle={styles.channelTile}
              renderItem={(channel, index) => (
                <FocusablePressable
                  key={channel.id}
                  accessibilityLabel={`Show videos from ${channel.name}`}
                  style={[styles.channelTile, { backgroundColor: cardTints[index % cardTints.length] }, selectedChannelId === channel.channelId && styles.tileSelected]}
                  onPress={() => onSelectChannel(selectedChannelId === channel.channelId ? null : channel.channelId)}
                >
                  {channel.thumbnailUrl ? (
                    <Image source={{ uri: channel.thumbnailUrl }} style={styles.channelTileImage} />
                  ) : (
                    <View style={styles.channelTileFallback}><Feather name="radio" size={22} color={colors.purple} /></View>
                  )}
                  <Text style={styles.channelTileName} numberOfLines={1}>{channel.name}</Text>
                </FocusablePressable>
              )}
            />
          ) : (
            <EmptyCard icon="radio" title="No channels yet" body="Approved channels will appear here." />
          )}
          {selectedChannel ? (
            <>
              <SectionHeading
                title={`From ${selectedChannel.name}`}
                action={channelVideos.length ? `${channelVideos.length} videos` : undefined}
              />
              {/*
                The list owns the loading, failure and empty states, so a channel
                that failed to load never claims to have no videos.
              */}
              <ChannelVideoList
                variant="kid"
                videos={channelVideos}
                state={channelSyncStateFor(selectedChannel.channelId)}
                busy={false}
                errorMessage={channelSyncStateFor(selectedChannel.channelId)?.lastError?.message}
                canLoadMore={false}
                onVideoPress={onVideoPress}
              />
            </>
          ) : null}
        </>
      )}

      {tab === 'recent' && (
        <>
          <SectionHeading title="Recently watched" action={library.recentVideos.length ? `${library.recentVideos.length} picks` : undefined} />
          {library.recentVideos.length ? (
            <PagedGrid
              items={library.recentVideos}
              style={styles.videoGrid}
              renderItem={(video, index) => (
                <VideoCard key={`recent-tab-${video.id}`} video={video} index={index} onPress={() => onVideoPress(video)} />
              )}
            />
          ) : (
            <EmptyCard icon="clock" title="Nothing watched yet" body="Your favourite videos will appear here." />
          )}
        </>
      )}

      {tab === 'requests' && (
        <KidRequestsPanel
          activeProfile={activeProfile}
          askableVideos={library.askableVideos}
          askableChannels={library.askableChannels}
          requests={requests}
          onSubmit={onSubmitRequest}
          onRequestVideo={onRequestVideo}
          onRequestChannel={onRequestChannel}
        />
      )}

      <View style={styles.bottomSpace} />
    </ScrollView>
  );
}

function SectionHeading({ title, action }: { title: string; action?: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

export function CategoryCard({
  category,
  count,
  index,
  large = false,
  onPress,
}: {
  category: ContentCategory;
  count: number;
  index: number;
  large?: boolean;
  onPress: () => void;
}) {
  return (
    <FocusablePressable
      accessibilityLabel={`${category.name}, ${count} videos`}
      style={[large ? styles.categoryCardLarge : styles.categoryCard, { backgroundColor: cardTints[index % cardTints.length] }]}
      onPress={onPress}
    >
      <View style={large ? styles.categoryIconLarge : styles.categoryIcon}>
        <Feather name={category.icon as keyof typeof Feather.glyphMap} size={large ? 30 : 22} color={colors.purple} />
      </View>
      <Text style={large ? styles.categoryNameLarge : styles.categoryName} numberOfLines={1}>{category.name}</Text>
      <Text style={styles.categoryCount}>{count} {count === 1 ? 'video' : 'videos'}</Text>
    </FocusablePressable>
  );
}

export function VideoCard({
  video,
  onPress,
  compact = false,
  index,
}: {
  video: ApprovedVideo;
  onPress: () => void;
  compact?: boolean;
  index: number;
}) {
  return (
    <FocusablePressable
      accessibilityLabel={`Play ${video.title}`}
      style={[compact ? styles.videoCardCompact : styles.videoCard, { backgroundColor: cardTints[index % cardTints.length] }]}
      onPress={onPress}
    >
      {video.thumbnailUrl ? (
        <Image source={{ uri: video.thumbnailUrl }} style={compact ? styles.thumbCompact : styles.thumb} />
      ) : (
        <View style={[compact ? styles.thumbCompact : styles.thumb, styles.thumbFallback]}>
          <View style={styles.thumbPlay}><Feather name="play" size={18} color={colors.purple} /></View>
        </View>
      )}
      <View style={styles.videoBody}>
        <Text style={styles.videoTitle} numberOfLines={2}>{video.title}</Text>
        <Text style={styles.videoMeta} numberOfLines={1}>{video.channelName ?? 'Family pick'}</Text>
        <View style={styles.durationTag}>
          <Feather name="clock" size={11} color={colors.muted} />
          <Text style={styles.durationText}>{formatDuration(video.duration)}</Text>
        </View>
      </View>
    </FocusablePressable>
  );
}

function ChannelCard({ channel, index }: { channel: ApprovedChannel; index: number }) {
  return (
    <View style={[styles.channelCard, { backgroundColor: cardTints[index % cardTints.length] }]}>
      {channel.thumbnailUrl ? (
        <Image source={{ uri: channel.thumbnailUrl }} style={styles.channelImage} />
      ) : (
        <View style={styles.channelImageFallback}><Feather name="radio" size={24} color={colors.purple} /></View>
      )}
      <Text style={styles.channelName} numberOfLines={1}>{channel.name}</Text>
      <Text style={styles.channelApproved}>
        <Feather name="check-circle" size={12} color={colors.mintDark} /> Approved
      </Text>
    </View>
  );
}

function EmptyCard({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Feather name={icon} size={21} color={colors.purple} /></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: 24, paddingHorizontal: 20 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingTop: 12 },
  brandRow: { flexDirection: 'row', gap: 9 },
  logoMark: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 17, height: 34, justifyContent: 'center', width: 34 },
  headerRight: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  profilePill: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.line, borderRadius: 22, borderWidth: 1, flexDirection: 'row', gap: 7, padding: 4, paddingRight: 12 },
  profilePillText: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  lockButton: { alignItems: 'center', backgroundColor: colors.yellow, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  tabStrip: { gap: 8, paddingTop: 16 },
  tab: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, flexDirection: 'row', gap: 7, minHeight: 46, paddingHorizontal: 13 },
  tabActive: { backgroundColor: colors.lavender },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: colors.purple },
  badge: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 9, minWidth: 19, paddingHorizontal: 5, paddingVertical: 2 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  notice: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 14, flexDirection: 'row', gap: 8, marginTop: 14, paddingHorizontal: 13, paddingVertical: 11 },
  noticeText: { color: colors.ink, flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  noticeAction: { backgroundColor: colors.purple, borderRadius: 11, justifyContent: 'center', minHeight: 42, paddingHorizontal: 12 },
  noticeActionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  profileStrip: { gap: 8, paddingTop: 15 },
  profileChoice: { alignItems: 'center', borderRadius: 16, flexDirection: 'row', gap: 8, padding: 5, paddingRight: 11 },
  profileChoiceActive: { backgroundColor: colors.lavender },
  profileChoiceText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  profileChoiceTextActive: { color: colors.purple },
  welcome: { alignItems: 'center', backgroundColor: colors.peach, borderRadius: 24, flexDirection: 'row', justifyContent: 'space-between', marginTop: 22, paddingHorizontal: 20, paddingVertical: 20 },
  greeting: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  subheading: { color: '#855A4B', fontSize: 15, marginTop: 4 },
  welcomeSpark: { alignItems: 'center', backgroundColor: '#FFF1B9', borderRadius: 28, height: 56, justifyContent: 'center', transform: [{ rotate: '12deg' }], width: 56 },
  sectionHeading: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, marginTop: 26 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sectionAction: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  horizontalList: { gap: 12, paddingBottom: 3 },
  categoryCard: { borderRadius: 20, minHeight: 140, padding: 14, width: 150 },
  categoryCardLarge: { borderRadius: 22, flexBasis: '47%', flexGrow: 1, minHeight: 160, padding: 16 },
  categoryIcon: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, height: 46, justifyContent: 'center', width: 46 },
  categoryIconLarge: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 20, height: 62, justifyContent: 'center', width: 62 },
  categoryName: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 12 },
  categoryNameLarge: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 14 },
  categoryCount: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 5 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  clearFilter: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.lavender, borderRadius: 12, flexDirection: 'row', gap: 7, marginBottom: 12, minHeight: 42, paddingHorizontal: 12 },
  clearFilterText: { color: colors.purple, fontSize: 13, fontWeight: '800' },
  tileSelected: { borderColor: colors.purple },
  videoGrid: { gap: 12 },
  videoCard: { borderRadius: 20, flexDirection: 'row', padding: 10 },
  videoCardCompact: { borderRadius: 18, padding: 8, width: 195 },
  thumb: { borderRadius: 14, height: 106, width: 138 },
  thumbCompact: { borderRadius: 13, height: 92, width: '100%' },
  thumbFallback: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.65)', justifyContent: 'center' },
  thumbPlay: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  videoBody: { flex: 1, paddingHorizontal: 13, paddingVertical: 3 },
  videoTitle: { color: colors.ink, fontSize: 16, fontWeight: '800', lineHeight: 21 },
  videoMeta: { color: colors.muted, fontSize: 12, marginTop: 6 },
  durationTag: { alignItems: 'center', flexDirection: 'row', gap: 4, marginTop: 9 },
  durationText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  channelCard: { borderRadius: 18, minHeight: 132, padding: 12, width: 134 },
  channelImage: { backgroundColor: '#fff', borderRadius: 15, height: 62, marginBottom: 10, width: 62 },
  channelImageFallback: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, height: 62, justifyContent: 'center', marginBottom: 10, width: 62 },
  channelTile: { alignItems: 'center', borderRadius: 20, flexBasis: '47%', flexGrow: 1, padding: 16 },
  channelTileImage: { borderRadius: 18, height: 68, width: 68 },
  channelTileFallback: { alignItems: 'center', backgroundColor: '#fff', borderRadius: 18, height: 68, justifyContent: 'center', width: 68 },
  channelTileName: { color: colors.ink, fontSize: 16, fontWeight: '800', marginTop: 12 },
  channelName: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  channelApproved: { color: colors.mintDark, fontSize: 11, fontWeight: '700', marginTop: 6 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 24 },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 13, marginTop: 5, textAlign: 'center' },
  bottomSpace: { height: 28 },
});
