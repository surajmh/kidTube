import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { ContentRequest, RequestType } from '../phase4Types';
import { KidLibrary } from '../services/kidContentLibraryService';
import { ChannelSyncState } from '../services/content/channelSyncRules';
import { FocusablePressable } from './tv';
import { ChannelAvatar, VideoCard } from './youtube/VideoCard';
import { yt } from './youtube/theme';

export type KidTab = 'home' | 'categories' | 'channels' | 'recent' | 'requests';

/** Four destinations; categories live as filter chips on the feed instead of a destination. */
const destinations: Array<{ id: KidTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'recent', label: 'Library', icon: 'film' },
  { id: 'requests', label: 'Ask', icon: 'help-circle' },
];

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
  /** Cached fetch state per channel. Kid Mode only reads this and never triggers a fetch. */
  channelSyncStateFor: (channelId: string) => ChannelSyncState | undefined;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);

  /**
   * Search is a pure filter over the library Kid Mode was already given, so it can only ever
   * surface content that passed the access rules — and it issues no network request.
   */
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return { videos: [], channels: [] };
    const match = (value?: string) => Boolean(value && value.toLowerCase().includes(needle));
    return {
      videos: library.videos.filter((video) => match(video.title) || match(video.channelName)),
      channels: library.channels.filter((channel) => match(channel.name)),
    };
  }, [query, library.videos, library.channels]);

  const selectedChannel = library.channels.find((channel) => channel.channelId === selectedChannelId);
  const channelVideos = selectedChannel
    ? library.videos.filter(
        (video) => video.channelId === selectedChannel.channelId || video.channelName === selectedChannel.name,
      )
    : [];

  const feedVideos = selectedCategoryId
    ? library.videos.filter((video) => video.categoryIds?.includes(selectedCategoryId))
    : library.videos;

  const onFeed = tab === 'home' || tab === 'categories';

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        {searching ? (
          <>
            <FocusablePressable
              accessibilityLabel="Close search"
              style={styles.iconButton}
              onPress={() => {
                setSearching(false);
                setQuery('');
              }}
            >
              <Feather name="arrow-left" size={22} color={yt.text} />
            </FocusablePressable>
            <TextInput
              value={query}
              onChangeText={setQuery}
              autoFocus
              placeholder="Search your videos"
              placeholderTextColor={yt.textDim}
              style={styles.searchField}
              accessibilityLabel="Search your videos"
            />
          </>
        ) : (
          <>
            <View style={styles.brand}>
              <View style={styles.brandMark}>
                <Feather name="feather" size={15} color={yt.onAccent} />
              </View>
              <Text style={styles.brandText}>nestling</Text>
            </View>
            <View style={styles.topActions}>
              <FocusablePressable accessibilityLabel="Search" style={styles.iconButton} onPress={() => setSearching(true)}>
                <Feather name="search" size={21} color={yt.text} />
              </FocusablePressable>
              <FocusablePressable
                accessibilityLabel={`Signed in as ${activeProfile?.name ?? 'explorer'}`}
                style={styles.iconButton}
                onPress={() => setSwitcherOpen((open) => !open)}
              >
                <ChannelAvatar name={activeProfile?.name ?? '?'} size={28} />
              </FocusablePressable>
              <FocusablePressable accessibilityLabel="Open parent mode" style={styles.iconButton} onPress={onParentPress}>
                <Feather name="lock" size={19} color={yt.textDim} />
              </FocusablePressable>
            </View>
          </>
        )}
      </View>

      {switcherOpen && profiles.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.switcher}>
          {profiles.map((profile) => (
            <FocusablePressable
              key={profile.id}
              accessibilityLabel={`Switch to ${profile.name}`}
              style={[styles.switcherItem, activeProfile?.id === profile.id && styles.switcherItemActive]}
              onPress={() => {
                onSelectProfile(profile.id);
                setSwitcherOpen(false);
              }}
            >
              <ChannelAvatar name={profile.name} size={24} />
              <Text style={styles.switcherText}>{profile.name}</Text>
            </FocusablePressable>
          ))}
        </ScrollView>
      ) : null}

      {onFeed && !searching && library.categories.length > 0 ? (
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

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
        {notice ? (
          <View style={styles.notice}>
            <Feather name="info" size={16} color={yt.text} />
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

        {searching ? (
          <SearchResults
            query={query}
            results={results}
            onVideoPress={onVideoPress}
            onSelectChannel={(channelId) => {
              onSelectChannel(channelId);
              onTabChange('channels');
              setSearching(false);
              setQuery('');
            }}
          />
        ) : null}

        {!searching && onFeed ? (
          <>
            {library.recentVideos.length > 0 && !selectedCategoryId ? (
              <>
                <Text style={styles.shelfTitle}>Keep watching</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shelf}>
                  {library.recentVideos.map((video) => (
                    <VideoCard key={`recent-${video.id}`} video={video} compact onPress={() => onVideoPress(video)} />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {feedVideos.length ? (
              feedVideos.map((video) => (
                <VideoCard key={video.id} video={video} onPress={() => onVideoPress(video)} />
              ))
            ) : (
              <Empty
                icon="play-circle"
                title={selectedCategoryId ? 'Nothing in this category yet' : 'Nothing here yet'}
                body="Ask a grown-up to add a video for you."
              />
            )}
          </>
        ) : null}

        {!searching && tab === 'channels' ? (
          selectedChannel ? (
            <ChannelPage
              channel={selectedChannel}
              videos={channelVideos}
              syncState={channelSyncStateFor(selectedChannel.channelId)}
              onBack={() => onSelectChannel(null)}
              onVideoPress={onVideoPress}
            />
          ) : library.channels.length ? (
            library.channels.map((channel) => (
              <FocusablePressable
                key={channel.id}
                accessibilityLabel={`Open ${channel.name}`}
                style={styles.channelRow}
                onPress={() => onSelectChannel(channel.channelId)}
              >
                <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={48} />
                <View style={styles.channelRowText}>
                  <Text style={styles.channelRowName} numberOfLines={1}>{channel.name}</Text>
                  <Text style={styles.channelRowMeta}>
                    {`${library.videos.filter((video) => video.channelId === channel.channelId).length} videos`}
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color={yt.textDim} />
              </FocusablePressable>
            ))
          ) : (
            <Empty icon="users" title="No channels yet" body="Approved channels will appear here." />
          )
        ) : null}

        {!searching && tab === 'recent' ? (
          library.recentVideos.length ? (
            library.recentVideos.map((video) => (
              <VideoCard key={`library-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
            ))
          ) : (
            <Empty icon="film" title="Nothing watched yet" body="Videos you watch show up here." />
          )
        ) : null}

        {!searching && tab === 'requests' ? (
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
      </ScrollView>

      <View style={styles.bottomNav}>
        {destinations.map((item) => {
          const active = item.id === tab || (item.id === 'home' && tab === 'categories');
          return (
            <FocusablePressable
              key={item.id}
              accessibilityLabel={item.label}
              style={styles.navItem}
              onPress={() => {
                setSearching(false);
                onTabChange(item.id);
              }}
            >
              <View>
                <Feather name={item.icon} size={22} color={active ? yt.text : yt.textDim} />
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

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <FocusablePressable
      accessibilityLabel={label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </FocusablePressable>
  );
}

function SearchResults({
  query,
  results,
  onVideoPress,
  onSelectChannel,
}: {
  query: string;
  results: { videos: ApprovedVideo[]; channels: ApprovedChannel[] };
  onVideoPress: (video: ApprovedVideo) => void;
  onSelectChannel: (channelId: string) => void;
}) {
  if (!query.trim()) {
    return <Empty icon="search" title="Search your videos" body="Only videos a grown-up approved will show up." />;
  }
  if (!results.videos.length && !results.channels.length) {
    return <Empty icon="search" title="No matches" body="Try a different word, or ask a grown-up for it." />;
  }
  return (
    <>
      {results.channels.map((channel) => (
        <FocusablePressable
          key={`result-${channel.id}`}
          accessibilityLabel={`Open ${channel.name}`}
          style={styles.channelRow}
          onPress={() => onSelectChannel(channel.channelId)}
        >
          <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={48} />
          <View style={styles.channelRowText}>
            <Text style={styles.channelRowName} numberOfLines={1}>{channel.name}</Text>
            <Text style={styles.channelRowMeta}>Channel</Text>
          </View>
        </FocusablePressable>
      ))}
      {results.videos.map((video) => (
        <VideoCard key={`result-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
      ))}
    </>
  );
}

/**
 * Kid-facing channel page. It only reads cached sync state — refreshing is a Parent Mode control —
 * and never shows provider wording, codes or host names.
 */
function ChannelPage({
  channel,
  videos,
  syncState,
  onBack,
  onVideoPress,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  syncState?: ChannelSyncState;
  onBack: () => void;
  onVideoPress: (video: ApprovedVideo) => void;
}) {
  const failed = Boolean(syncState?.lastError);
  const neverFetched = !syncState?.fetchedAt;
  return (
    <>
      <FocusablePressable accessibilityLabel="Back to channels" style={styles.backRow} onPress={onBack}>
        <Feather name="arrow-left" size={20} color={yt.text} />
        <Text style={styles.backText}>Channels</Text>
      </FocusablePressable>

      <View style={styles.channelHero}>
        <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={64} />
        <Text style={styles.channelHeroName}>{channel.name}</Text>
        <Text style={styles.channelHeroMeta}>{`${videos.length} videos`}</Text>
      </View>

      {failed && videos.length === 0 ? (
        <Empty icon="wifi-off" title="Couldn't load videos right now." body="Ask a grown-up to refresh this channel for you." />
      ) : null}
      {failed && videos.length > 0 ? (
        <View style={styles.notice}>
          <Feather name="info" size={16} color={yt.text} />
          <Text style={styles.noticeText}>Showing saved videos. A grown-up can refresh this channel.</Text>
        </View>
      ) : null}
      {!failed && neverFetched && videos.length === 0 ? (
        <Empty icon="clock" title="Videos not loaded" body="Ask a grown-up to load this channel." />
      ) : null}

      {videos.map((video) => (
        <VideoCard key={`channel-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
      ))}
    </>
  );
}

/** Ask a Parent. No browsing, no search: saved-but-unapproved items, or the child's own words. */
function AskPanel({
  activeProfile,
  askableVideos,
  askableChannels,
  requests,
  onSubmit,
  onRequestVideo,
  onRequestChannel,
}: {
  activeProfile?: ChildProfile;
  askableVideos: ApprovedVideo[];
  askableChannels: ApprovedChannel[];
  requests: ContentRequest[];
  onSubmit: (input: { type: RequestType; title: string }) => Promise<void>;
  onRequestVideo: (video: ApprovedVideo) => Promise<void>;
  onRequestChannel: (channel: ApprovedChannel) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const mine = activeProfile ? requests.filter((request) => request.profileId === activeProfile.id) : [];

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage('');
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'That request did not go through.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.ask}>
      <Text style={styles.askTitle}>Ask a grown-up</Text>
      <Text style={styles.askBody}>Tell them what you would like to watch. They decide what gets added.</Text>

      <View style={styles.askForm}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What would you like to watch?"
          placeholderTextColor={yt.textDim}
          style={styles.askInput}
          accessibilityLabel="What would you like to watch?"
        />
        <FocusablePressable
          accessibilityLabel="Send request"
          disabled={busy || !title.trim()}
          style={[styles.askSend, (busy || !title.trim()) && styles.askSendDisabled]}
          onPress={() =>
            run(async () => {
              await onSubmit({ type: 'video', title: title.trim() });
              setTitle('');
            })
          }
        >
          <Text style={styles.askSendText}>Ask</Text>
        </FocusablePressable>
      </View>
      {message ? <Text style={styles.askError}>{message}</Text> : null}

      {askableVideos.length > 0 ? (
        <>
          <Text style={styles.askSection}>Saved videos you can ask for</Text>
          {askableVideos.map((video) => (
            <View key={`ask-${video.id}`} style={styles.askRow}>
              <Text style={styles.askRowText} numberOfLines={2}>{video.title}</Text>
              <FocusablePressable
                accessibilityLabel={`Ask for ${video.title}`}
                disabled={busy}
                style={styles.askRowButton}
                onPress={() => run(() => onRequestVideo(video))}
              >
                <Text style={styles.askRowButtonText}>Ask</Text>
              </FocusablePressable>
            </View>
          ))}
        </>
      ) : null}

      {askableChannels.length > 0 ? (
        <>
          <Text style={styles.askSection}>Saved channels you can ask for</Text>
          {askableChannels.map((channel) => (
            <View key={`ask-${channel.id}`} style={styles.askRow}>
              <Text style={styles.askRowText} numberOfLines={2}>{channel.name}</Text>
              <FocusablePressable
                accessibilityLabel={`Ask for ${channel.name}`}
                disabled={busy}
                style={styles.askRowButton}
                onPress={() => run(() => onRequestChannel(channel))}
              >
                <Text style={styles.askRowButtonText}>Ask</Text>
              </FocusablePressable>
            </View>
          ))}
        </>
      ) : null}

      {mine.length > 0 ? (
        <>
          <Text style={styles.askSection}>What you asked for</Text>
          {mine.map((request) => (
            <View key={request.id} style={styles.askRow}>
              <Text style={styles.askRowText} numberOfLines={2}>{request.title}</Text>
              <Text style={styles.askStatus}>{request.status}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function Empty({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={30} color={yt.textDim} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: yt.bg, flex: 1 },

  topBar: { alignItems: 'center', flexDirection: 'row', gap: 4, height: 56, paddingHorizontal: 12 },
  brand: { alignItems: 'center', flexDirection: 'row', flex: 1, gap: 6 },
  brandMark: {
    alignItems: 'center',
    backgroundColor: yt.accent,
    borderRadius: 13,
    height: 26,
    justifyContent: 'center',
    width: 26,
  },
  brandText: { color: yt.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.6 },
  topActions: { alignItems: 'center', flexDirection: 'row', gap: 2 },
  iconButton: { alignItems: 'center', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  searchField: {
    backgroundColor: yt.surface,
    borderRadius: 20,
    color: yt.text,
    flex: 1,
    fontSize: 15,
    height: 40,
    paddingHorizontal: 16,
  },

  switcher: { gap: 8, paddingBottom: 8, paddingHorizontal: 12 },
  switcherItem: {
    alignItems: 'center',
    backgroundColor: yt.surfaceAlt,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switcherItemActive: { backgroundColor: yt.chipActive },
  switcherText: { color: yt.text, fontSize: 13, fontWeight: '600' },

  chipBar: { paddingBottom: 10 },
  chipRow: { gap: 8, paddingHorizontal: 12 },
  chip: { backgroundColor: yt.surfaceAlt, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  chipActive: { backgroundColor: yt.chipActive },
  chipText: { color: yt.text, fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: yt.chipActiveText },

  body: { flex: 1 },
  bodyContent: { paddingBottom: 24 },

  notice: {
    alignItems: 'center',
    backgroundColor: yt.surface,
    borderRadius: 10,
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    marginHorizontal: 12,
    padding: 12,
  },
  noticeText: { color: yt.text, flex: 1, fontSize: 13, lineHeight: 18 },
  noticeAction: { backgroundColor: yt.chipActive, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  noticeActionText: { color: yt.chipActiveText, fontSize: 12, fontWeight: '700' },

  shelfTitle: { color: yt.text, fontSize: 16, fontWeight: '700', paddingBottom: 10, paddingHorizontal: 12 },
  shelf: { gap: 12, paddingBottom: 20, paddingHorizontal: 12 },

  channelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  channelRowText: { flex: 1, gap: 2 },
  channelRowName: { color: yt.text, fontSize: 15, fontWeight: '600' },
  channelRowMeta: { color: yt.textDim, fontSize: 12.5 },

  backRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 8 },
  backText: { color: yt.text, fontSize: 15, fontWeight: '600' },
  channelHero: { alignItems: 'center', gap: 6, paddingBottom: 18, paddingTop: 10 },
  channelHeroName: { color: yt.text, fontSize: 19, fontWeight: '700' },
  channelHeroMeta: { color: yt.textDim, fontSize: 13 },

  ask: { paddingHorizontal: 12 },
  askTitle: { color: yt.text, fontSize: 16, fontWeight: '700', paddingBottom: 10 },
  askBody: { color: yt.textDim, fontSize: 13, lineHeight: 19, paddingBottom: 14 },
  askForm: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  askInput: {
    backgroundColor: yt.surface,
    borderRadius: 22,
    color: yt.text,
    flex: 1,
    fontSize: 14,
    height: 44,
    paddingHorizontal: 16,
  },
  askSend: {
    alignItems: 'center',
    backgroundColor: yt.chipActive,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  askSendDisabled: { opacity: 0.4 },
  askSendText: { color: yt.chipActiveText, fontSize: 14, fontWeight: '700' },
  askError: { color: yt.accent, fontSize: 12.5, paddingTop: 8 },
  askSection: { color: yt.text, fontSize: 14, fontWeight: '700', paddingBottom: 6, paddingTop: 22 },
  askRow: {
    alignItems: 'center',
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  askRowText: { color: yt.text, flex: 1, fontSize: 14 },
  askRowButton: { backgroundColor: yt.surfaceAlt, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  askRowButtonText: { color: yt.text, fontSize: 13, fontWeight: '700' },
  askStatus: { color: yt.textDim, fontSize: 12, textTransform: 'capitalize' },

  empty: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingVertical: 48 },
  emptyTitle: { color: yt.text, fontSize: 15, fontWeight: '700', textAlign: 'center' },
  emptyBody: { color: yt.textDim, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  bottomNav: {
    backgroundColor: yt.bg,
    borderTopColor: yt.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingBottom: 6,
    paddingTop: 8,
  },
  navItem: { alignItems: 'center', borderWidth: 0, flex: 1, gap: 4 },
  navLabel: { color: yt.textDim, fontSize: 10.5 },
  navLabelActive: { color: yt.text, fontWeight: '700' },
  navBadge: {
    alignItems: 'center',
    backgroundColor: yt.accent,
    borderRadius: 8,
    justifyContent: 'center',
    minWidth: 16,
    paddingHorizontal: 4,
    position: 'absolute',
    right: -10,
    top: -4,
  },
  navBadgeText: { color: yt.onAccent, fontSize: 10, fontWeight: '700' },
});
