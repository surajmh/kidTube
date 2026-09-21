import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../../types';
import { ContentRequest, RequestType } from '../../phase4Types';
import { FocusablePressable } from '../tv';
import { ChannelAvatar, VideoCard } from '../youtube/VideoCard';
import { ICON, KID_COPY, KID_DESTINATIONS } from './kidHome.constant';
import { useKidHome } from './kidHome.hook';
import { ChannelAvailability, KidHomeProps, KidSearchResults } from './kidHome.type';
import styles from './kidHome.style';

/**
 * Kid Mode.
 *
 * Presentation only: every derivation lives in `useKidHome`, and the rules it depends on live in
 * `helpers.ts` so they are covered by tests rather than only by rendering.
 */
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
              <View style={styles.brandMark}>
                <Feather name="feather" size={15} color={ICON.onAccent} />
              </View>
              <Text style={styles.brandText}>nestling</Text>
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

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
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
          <SearchResults
            query={kid.query}
            results={kid.results}
            onVideoPress={onVideoPress}
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
                    <VideoCard key={`recent-${video.id}`} video={video} compact onPress={() => onVideoPress(video)} />
                  ))}
                </ScrollView>
              </>
            ) : null}

            {kid.feedVideos.length ? (
              kid.feedVideos.map((video) => (
                <VideoCard key={video.id} video={video} onPress={() => onVideoPress(video)} />
              ))
            ) : (
              <Empty
                icon="play-circle"
                title={selectedCategoryId ? KID_COPY.feedEmptyCategoryTitle : KID_COPY.feedEmptyTitle}
                body={KID_COPY.feedEmptyBody}
              />
            )}
          </>
        ) : null}

        {!kid.searching && tab === 'channels' ? (
          kid.selectedChannel ? (
            <ChannelPage
              channel={kid.selectedChannel}
              videos={kid.channelVideos}
              availability={kid.availability}
              onBack={() => onSelectChannel(null)}
              onVideoPress={onVideoPress}
            />
          ) : library.channels.length ? (
            library.channels.map((channel) => (
              <ChannelRow
                key={channel.id}
                channel={channel}
                videoCount={library.videos.filter((video) => video.channelId === channel.channelId).length}
                onPress={() => onSelectChannel(channel.channelId)}
              />
            ))
          ) : (
            <Empty icon="users" title="No channels yet" body="Approved channels will appear here." />
          )
        ) : null}

        {!kid.searching && tab === 'recent' ? (
          library.recentVideos.length ? (
            library.recentVideos.map((video) => (
              <VideoCard key={`library-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
            ))
          ) : (
            <Empty icon="film" title="Nothing watched yet" body="Videos you watch show up here." />
          )
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
      </ScrollView>

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

function ChannelRow({
  channel,
  videoCount,
  onPress,
  subtitle,
}: {
  channel: ApprovedChannel;
  videoCount?: number;
  onPress: () => void;
  subtitle?: string;
}) {
  return (
    <FocusablePressable
      accessibilityLabel={`Open ${channel.name}`}
      style={styles.channelRow}
      onPress={onPress}
    >
      <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={48} />
      <View style={styles.channelRowText}>
        <Text style={styles.channelRowName} numberOfLines={1}>{channel.name}</Text>
        <Text style={styles.channelRowMeta}>{subtitle ?? `${videoCount ?? 0} videos`}</Text>
      </View>
      <Feather name="chevron-right" size={20} color={ICON.inkDim} />
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
          onPress={() => onSelectChannel(channel.channelId)}
        />
      ))}
      {results.videos.map((video) => (
        <VideoCard key={`result-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
      ))}
    </>
  );
}

/**
 * A channel's page. Reads cached sync state only -- refreshing is a Parent Mode control -- and
 * never shows provider wording, error codes or host names.
 */
function ChannelPage({
  channel,
  videos,
  availability,
  onBack,
  onVideoPress,
}: {
  channel: ApprovedChannel;
  videos: ApprovedVideo[];
  availability: ChannelAvailability;
  onBack: () => void;
  onVideoPress: (video: ApprovedVideo) => void;
}) {
  return (
    <>
      <FocusablePressable
        accessibilityLabel="Back to channels"
        style={styles.backRow}
        onPress={onBack}
      >
        <Feather name="arrow-left" size={20} color={ICON.ink} />
        <Text style={styles.channelRowName}>Channels</Text>
      </FocusablePressable>

      <View style={styles.channelHero}>
        <ChannelAvatar name={channel.name} uri={channel.thumbnailUrl} size={64} />
        <Text style={styles.channelHeroName}>{channel.name}</Text>
        <Text style={styles.channelHeroMeta}>{`${videos.length} videos`}</Text>
      </View>

      {availability === 'unavailable' ? (
        <Empty icon="wifi-off" title={KID_COPY.channelUnavailableTitle} body={KID_COPY.channelUnavailableBody} />
      ) : null}
      {availability === 'stale-with-cache' ? (
        <View style={styles.notice}>
          <Feather name="info" size={16} color={ICON.ink} />
          <Text style={styles.noticeText}>{KID_COPY.channelStaleNotice}</Text>
        </View>
      ) : null}
      {availability === 'not-loaded' ? (
        <Empty icon="clock" title={KID_COPY.channelNotLoadedTitle} body={KID_COPY.channelNotLoadedBody} />
      ) : null}

      {videos.map((video) => (
        <VideoCard key={`channel-${video.id}`} video={video} onPress={() => onVideoPress(video)} />
      ))}
    </>
  );
}

/** Ask a Parent. No browsing and no search: saved-but-unapproved items, or the child's own words. */
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
      <Text style={styles.askBody}>
        Tell them what you would like to watch. They decide what gets added.
      </Text>

      <View style={styles.askForm}>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="What would you like to watch?"
          placeholderTextColor={ICON.inkDim}
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
            <AskRow
              key={`ask-${video.id}`}
              label={video.title}
              busy={busy}
              onPress={() => run(() => onRequestVideo(video))}
            />
          ))}
        </>
      ) : null}

      {askableChannels.length > 0 ? (
        <>
          <Text style={styles.askSection}>Saved channels you can ask for</Text>
          {askableChannels.map((channel) => (
            <AskRow
              key={`ask-${channel.id}`}
              label={channel.name}
              busy={busy}
              onPress={() => run(() => onRequestChannel(channel))}
            />
          ))}
        </>
      ) : null}

      {mine.length > 0 ? (
        <>
          <Text style={styles.askSection}>What you asked for</Text>
          {mine.map((request) => (
            <View
              key={request.id}
              style={styles.askRow}
            >
              <Text style={styles.askRowLabel} numberOfLines={2}>{request.title}</Text>
              <Text style={styles.askStatus}>{request.status}</Text>
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}

function AskRow({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <View style={styles.askRow}>
      <Text style={styles.askRowLabel} numberOfLines={2}>{label}</Text>
      <FocusablePressable
        accessibilityLabel={`Ask for ${label}`}
        disabled={busy}
        style={styles.askRowButton}
        onPress={onPress}
      >
        <Text style={styles.askRowButtonText}>Ask</Text>
      </FocusablePressable>
    </View>
  );
}

function Empty({ icon, title, body }: { icon: keyof typeof Feather.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Feather name={icon} size={30} color={ICON.inkDim} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}
