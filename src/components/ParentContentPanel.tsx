import React, { useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ApprovedChannel, ApprovedVideo, ChildProfile } from '../types';
import { ContentApproval, ContentCandidate, ContentCategory, resolvedCategoryIds } from '../phase4Types';
import { describeApprovalExpiry } from '../services/approvalRules';
import {
  ChannelSyncState,
  channelVideosFrom,
  describeChannelSync,
} from '../services/content/channelSyncRules';
import { colors, cardTints } from './theme';
import { FocusablePressable } from './tv';
import { PagedGrid } from './PagedGrid';
import { ChannelVideoList } from './ChannelVideoList';

export type ContentTab = 'channels' | 'videos' | 'categories' | 'requests';

const tabs: Array<{ id: ContentTab; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'channels', label: 'Channels', icon: 'radio' },
  { id: 'videos', label: 'Videos', icon: 'play-circle' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'requests', label: 'Requests', icon: 'inbox' },
];

function approveLabelFor(approvals: ContentApproval[], target: { videoId?: string; channelId?: string }) {
  const matching = approvals.filter((approval) =>
    approval.target.type === 'video'
      ? Boolean(target.videoId) && approval.target.youtubeVideoId === target.videoId
      : Boolean(target.channelId) && approval.target.youtubeChannelId === target.channelId,
  );
  return matching.map((approval) => describeApprovalExpiry(approval));
}

export function ParentContentPanel({
  profiles,
  categories,
  channels,
  videos,
  approvals,
  tab,
  onTabChange,
  categoriesSlot,
  requestsSlot,
  manualAddSlot,
  accessFor,
  onRemoveVideo,
  onRemoveChannel,
  onToggleVideoCategory,
  onToggleChannelCategory,
  onSearch,
  onSaveCandidate,
  onApproveCandidate,
  syncStateFor,
  channelBusy,
  onOpenChannelVideos,
  selectedChannelId,
  onSelectChannel,
  onRefreshChannel,
  onLoadMoreChannel,
}: {
  profiles: ChildProfile[];
  categories: ContentCategory[];
  channels: ApprovedChannel[];
  videos: ApprovedVideo[];
  approvals: ContentApproval[];
  tab: ContentTab;
  onTabChange: (tab: ContentTab) => void;
  categoriesSlot?: React.ReactNode;
  requestsSlot?: React.ReactNode;
  manualAddSlot?: React.ReactNode;
  accessFor: (profileId: string, target: { videoId?: string; channelId?: string }) => boolean;
  onRemoveVideo: (video: ApprovedVideo) => Promise<void>;
  onRemoveChannel: (channel: ApprovedChannel) => Promise<void>;
  onToggleVideoCategory: (video: ApprovedVideo, categoryId: string, assigned: boolean) => Promise<void>;
  onToggleChannelCategory: (channel: ApprovedChannel, categoryId: string, assigned: boolean) => Promise<void>;
  onSearch: (query: string) => Promise<ContentCandidate[]>;
  onSaveCandidate: (candidate: ContentCandidate) => Promise<void>;
  onApproveCandidate: (candidate: ContentCandidate) => Promise<void>;
  /** Per-channel fetch state for approved-channel video discovery. */
  syncStateFor: (channelId: string) => ChannelSyncState | undefined;
  channelBusy: (channelId: string) => boolean;
  /** Cache-respecting fetch, run when a parent opens a channel's videos (§7). */
  onOpenChannelVideos: (channel: ApprovedChannel) => void;
  /** Set while a channel's own page is open; the Channels tab otherwise lists channels only. */
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string | null) => void;
  onRefreshChannel: (channel: ApprovedChannel) => void;
  onLoadMoreChannel: (channel: ApprovedChannel) => void;
}) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [childFilter, setChildFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ContentCandidate[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('');
  const [resultTitles, setResultTitles] = useState<Record<string, string>>({});

  const filteredVideos = useMemo(
    () =>
      videos.filter((video) => {
        if (query && !video.title.toLowerCase().includes(query.toLowerCase()) && !(video.channelName ?? '').toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        if (categoryFilter && !resolvedCategoryIds(video.categoryIds).includes(categoryFilter)) return false;
        if (childFilter && !accessFor(childFilter, { videoId: video.youtubeVideoId, channelId: video.channelId })) return false;
        return true;
      }),
    [videos, query, categoryFilter, childFilter, accessFor],
  );

  const filteredChannels = useMemo(
    () =>
      channels.filter((channel) => {
        if (query && !channel.name.toLowerCase().includes(query.toLowerCase()) && !channel.channelId.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        if (categoryFilter && !resolvedCategoryIds(channel.categoryIds).includes(categoryFilter)) return false;
        if (childFilter && !accessFor(childFilter, { channelId: channel.channelId })) return false;
        return true;
      }),
    [channels, query, categoryFilter, childFilter, accessFor],
  );

  const recentlyAdded = (tab === 'channels' ? channels : videos).slice(0, 3);

  function titled(candidate: ContentCandidate): ContentCandidate {
    const key = candidate.youtubeVideoId ?? candidate.youtubeChannelId ?? candidate.title;
    const title = resultTitles[key]?.trim();
    return title ? { ...candidate, title } : candidate;
  }

  async function runSearch() {
    setSearching(true);
    setSearchError('');
    setNotice('');
    try {
      const found = await onSearch(searchQuery);
      setResults(found);
      if (!found.length) setSearchError('No YouTube ID found in that link. Paste a video or channel URL.');
    } catch (caught) {
      setResults(null);
      setSearchError(caught instanceof Error ? caught.message : 'That search could not run.');
    } finally {
      setSearching(false);
    }
  }

  const selectedChannel = selectedChannelId
    ? channels.find((channel) => channel.channelId === selectedChannelId)
    : undefined;

  // A channel's own page: just that channel and its uploads. More pages arrive as the parent
  // scrolls, so there is no bulk fetch when a channel is approved.
  if (selectedChannel) {
    const state = syncStateFor(selectedChannel.channelId);
    const channelVideos = channelVideosFrom(videos, selectedChannel.channelId);
    return (
      <View>
        <FocusablePressable
          accessibilityLabel="Back to channels"
          style={styles.backRow}
          onPress={() => onSelectChannel(null)}
        >
          <Feather name="arrow-left" size={18} color={colors.ink} />
          <Text style={styles.backText}>Channels</Text>
        </FocusablePressable>

        <View style={styles.channelHero}>
          {selectedChannel.thumbnailUrl ? (
            <Image source={{ uri: selectedChannel.thumbnailUrl }} style={styles.heroThumb} />
          ) : (
            <View style={styles.thumbFallback}>
              <Feather name="radio" size={20} color={colors.purple} />
            </View>
          )}
          <Text style={styles.heroName} numberOfLines={2}>{selectedChannel.name}</Text>
          <Text style={styles.heroMeta}>{describeChannelSync(state)}</Text>
        </View>

        <ChannelVideoList
          variant="parent"
          videos={channelVideos}
          state={state}
          busy={channelBusy(selectedChannel.channelId)}
          errorMessage={state?.lastError?.message}
          canLoadMore={Boolean(state?.nextPageToken)}
          onRefresh={() => onRefreshChannel(selectedChannel)}
          onLoadMore={() => onLoadMoreChannel(selectedChannel)}
        />
      </View>
    );
  }

  return (
    <View>
      <View style={styles.intro}>
        <View>
          <Text style={styles.title}>Content</Text>
          <Text style={styles.subtitle}>Everything your children can watch, decided by you.</Text>
        </View>
        <View style={styles.privacyBadge}>
          <Feather name="shield" size={13} color={colors.mintDark} />
          <Text style={styles.privacyText}>Local only</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        {tabs.map((item) => (
          <FocusablePressable
            key={item.id}
            accessibilityLabel={item.label}
            style={[styles.tab, tab === item.id && styles.tabActive]}
            onPress={() => onTabChange(item.id)}
          >
            <Feather name={item.icon} size={16} color={tab === item.id ? colors.purple : colors.muted} />
            <Text style={[styles.tabText, tab === item.id && styles.tabTextActive]}>{item.label}</Text>
          </FocusablePressable>
        ))}
      </View>

      {tab === 'categories' ? (
        categoriesSlot
      ) : tab === 'requests' ? (
        requestsSlot
      ) : (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search your approved ${tab}`}
            placeholderTextColor="#B8B1AA"
            style={styles.input}
            accessibilityLabel="Search approved content"
          />

          <Text style={styles.filterLabel}>FILTER BY CHILD</Text>
          <View style={styles.chipRow}>
            <FocusablePressable
              accessibilityLabel="All children"
              style={[styles.chip, childFilter === null && styles.chipActive]}
              onPress={() => setChildFilter(null)}
            >
              <Text style={[styles.chipText, childFilter === null && styles.chipTextActive]}>All children</Text>
            </FocusablePressable>
            {profiles.map((profile) => (
              <FocusablePressable
                key={profile.id}
                accessibilityLabel={`Filter by ${profile.name}`}
                style={[styles.chip, childFilter === profile.id && styles.chipActive]}
                onPress={() => setChildFilter(profile.id)}
              >
                <Text style={[styles.chipText, childFilter === profile.id && styles.chipTextActive]}>{profile.name}</Text>
              </FocusablePressable>
            ))}
          </View>

          <Text style={styles.filterLabel}>FILTER BY CATEGORY</Text>
          <View style={styles.chipRow}>
            <FocusablePressable
              accessibilityLabel="All categories"
              style={[styles.chip, categoryFilter === null && styles.chipActive]}
              onPress={() => setCategoryFilter(null)}
            >
              <Text style={[styles.chipText, categoryFilter === null && styles.chipTextActive]}>All</Text>
            </FocusablePressable>
            {categories.map((category) => (
              <FocusablePressable
                key={category.id}
                accessibilityLabel={category.name}
                style={[styles.chip, categoryFilter === category.id && styles.chipActive]}
                onPress={() => setCategoryFilter(category.id)}
              >
                <Text style={[styles.chipText, categoryFilter === category.id && styles.chipTextActive]}>{category.name}</Text>
              </FocusablePressable>
            ))}
          </View>

          {recentlyAdded.length > 0 ? (
            <>
              <Text style={styles.filterLabel}>RECENTLY ADDED</Text>
              <View style={styles.recentRow}>
                {recentlyAdded.map((item, index) => (
                  <View key={item.id} style={[styles.recentCard, { backgroundColor: cardTints[index % cardTints.length] }]}>
                    <Text style={styles.recentTitle} numberOfLines={2}>
                      {'title' in item ? item.title : item.name}
                    </Text>
                    <Text style={styles.recentMeta}>Most recent</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <Text style={styles.listLabel}>
            {tab === 'channels' ? `CHANNELS · ${filteredChannels.length}` : `VIDEOS · ${filteredVideos.length}`}
          </Text>

          {tab === 'channels' ? (
            <PagedGrid
              items={filteredChannels}
              pageSize={20}
              renderItem={(channel) => {
                const expanded = expandedId === channel.id;
                const expiry = approveLabelFor(approvals, { channelId: channel.channelId });
                const state = syncStateFor(channel.channelId);
                const channelVideos = channelVideosFrom(videos, channel.channelId);
                return (
                  <View key={channel.id} style={styles.row}>
                    {channel.thumbnailUrl ? (
                      <Image source={{ uri: channel.thumbnailUrl }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbFallback}><Feather name="radio" size={18} color={colors.purple} /></View>
                    )}
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{channel.name}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {channel.approved
                          ? describeChannelSync(state)
                          : `${channel.channelId} · awaiting approval`}
                      </Text>
                      <View style={styles.tagRow}>
                        <View style={styles.approvalTag}>
                          <Feather name={channel.approved ? 'check' : 'clock'} size={11} color={colors.mintDark} />
                          <Text style={styles.approvalTagText}>{channel.approved ? 'Approved' : 'Candidate'}</Text>
                        </View>
                        {/* Never claim "0 videos": an unloaded channel is unknown, not empty. */}
                        {channel.approved && (channelVideos.length > 0 || state?.fetchedAt) ? (
                          <View style={styles.videoCountTag}>
                            <Feather name="play-circle" size={11} color={colors.purple} />
                            <Text style={styles.videoCountText}>
                              {channelVideos.length} {channelVideos.length === 1 ? 'video' : 'videos'}
                            </Text>
                          </View>
                        ) : channel.approved ? (
                          <View style={styles.expiryTag}>
                            <Text style={styles.expiryTagText}>Videos not loaded</Text>
                          </View>
                        ) : null}
                        {expiry.map((label, index) => (
                          <View key={`${label}-${index}`} style={styles.expiryTag}>
                            <Text style={styles.expiryTagText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    {channel.approved ? (
                      <FocusablePressable
                        accessibilityLabel={`Open ${channel.name}`}
                        style={styles.iconButton}
                        onPress={() => {
                          onSelectChannel(channel.channelId);
                          // Opening the channel page refreshes it only if the cache is stale.
                          onOpenChannelVideos(channel);
                        }}
                      >
                        <Feather name="chevron-right" size={18} color={colors.purple} />
                      </FocusablePressable>
                    ) : null}
                    <FocusablePressable
                      accessibilityLabel={`Edit categories for ${channel.name}`}
                      style={styles.iconButton}
                      onPress={() => setExpandedId(expanded ? null : channel.id)}
                    >
                      <Feather name="tag" size={16} color={colors.muted} />
                    </FocusablePressable>
                    <FocusablePressable
                      accessibilityLabel={`Remove ${channel.name}`}
                      style={styles.iconButton}
                      onPress={() => void onRemoveChannel(channel)}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </FocusablePressable>
                    {expanded ? (
                      <View style={styles.categoryEditor}>
                        {categories.map((category) => {
                          const assigned = Boolean(channel.categoryIds?.includes(category.id));
                          return (
                            <FocusablePressable
                              key={category.id}
                              accessibilityLabel={`Toggle ${category.name}`}
                              style={[styles.chip, assigned && styles.chipActive]}
                              onPress={() => void onToggleChannelCategory(channel, category.id, assigned)}
                            >
                              <Text style={[styles.chipText, assigned && styles.chipTextActive]}>{category.name}</Text>
                            </FocusablePressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          ) : (
            <PagedGrid
              items={filteredVideos}
              pageSize={20}
              renderItem={(video) => {
                const expanded = expandedId === video.id;
                const expiry = approveLabelFor(approvals, { videoId: video.youtubeVideoId, channelId: video.channelId });
                return (
                  <View key={video.id} style={styles.row}>
                    {video.thumbnailUrl ? (
                      <Image source={{ uri: video.thumbnailUrl }} style={styles.thumb} />
                    ) : (
                      <View style={styles.thumbFallback}><Feather name="play" size={18} color={colors.purple} /></View>
                    )}
                    <View style={styles.rowInfo}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{video.title}</Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {video.channelName ?? video.youtubeVideoId}
                        {video.duration ? ` · ${Math.round(video.duration / 60)} min` : ''}
                      </Text>
                      <View style={styles.tagRow}>
                        <View style={styles.approvalTag}>
                          <Feather name={video.approved && !video.candidate ? 'check' : 'clock'} size={11} color={colors.mintDark} />
                          <Text style={styles.approvalTagText}>{video.approved && !video.candidate ? 'Approved' : 'Can be asked for'}</Text>
                        </View>
                        {expiry.map((label, index) => (
                          <View key={`${label}-${index}`} style={styles.expiryTag}>
                            <Text style={styles.expiryTagText}>{label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <FocusablePressable
                      accessibilityLabel={`Edit categories for ${video.title}`}
                      style={styles.iconButton}
                      onPress={() => setExpandedId(expanded ? null : video.id)}
                    >
                      <Feather name="tag" size={16} color={colors.muted} />
                    </FocusablePressable>
                    <FocusablePressable
                      accessibilityLabel={`Remove ${video.title}`}
                      style={styles.iconButton}
                      onPress={() => void onRemoveVideo(video)}
                    >
                      <Feather name="trash-2" size={16} color={colors.danger} />
                    </FocusablePressable>
                    {expanded ? (
                      <View style={styles.categoryEditor}>
                        {categories.map((category) => {
                          const assigned = Boolean(video.categoryIds?.includes(category.id));
                          return (
                            <FocusablePressable
                              key={category.id}
                              accessibilityLabel={`Toggle ${category.name}`}
                              style={[styles.chip, assigned && styles.chipActive]}
                              onPress={() => void onToggleVideoCategory(video, category.id, assigned)}
                            >
                              <Text style={[styles.chipText, assigned && styles.chipTextActive]}>{category.name}</Text>
                            </FocusablePressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              }}
            />
          )}

          {(tab === 'channels' ? filteredChannels.length : filteredVideos.length) === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.rowTitle}>Nothing matches yet</Text>
              <Text style={styles.rowMeta}>Try clearing the filters, or use parent search below.</Text>
            </View>
          ) : null}
        </>
      )}

      <View style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <View style={styles.searchIcon}><Feather name="search" size={18} color={colors.purple} /></View>
          <View style={styles.searchHeaderText}>
            <Text style={styles.searchTitle}>Parent content search</Text>
            <Text style={styles.searchBody}>
              Only available in Parent Mode. Results are never playable until you approve them, and Kid Mode has no search at all.
            </Text>
          </View>
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Paste a YouTube video or channel link"
          placeholderTextColor="#B8B1AA"
          autoCapitalize="none"
          style={styles.input}
          accessibilityLabel="Paste a YouTube link to approve"
        />
        <FocusablePressable accessibilityLabel="Look up link" style={styles.lookup} disabled={searching} onPress={() => void runSearch()}>
          <Feather name="link" size={16} color="#fff" />
          <Text style={styles.lookupText}>{searching ? 'Looking up…' : 'Look up link'}</Text>
        </FocusablePressable>
        {searchError ? <Text style={styles.error}>{searchError}</Text> : null}
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}
        {results?.map((candidate) => {
          const key = candidate.youtubeVideoId ?? candidate.youtubeChannelId ?? candidate.title;
          return (
            <View key={`${candidate.type}-${key}`} style={styles.resultRow}>
              <View style={styles.thumbFallback}>
                <Feather name={candidate.type === 'video' ? 'film' : 'radio'} size={18} color={colors.purple} />
              </View>
              <View style={styles.rowInfo}>
                <TextInput
                  value={resultTitles[key] ?? candidate.title}
                  onChangeText={(value) => setResultTitles((current) => ({ ...current, [key]: value }))}
                  style={styles.resultTitleInput}
                  accessibilityLabel="Approved title"
                  maxLength={80}
                />
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {candidate.type === 'video' ? candidate.youtubeVideoId : candidate.youtubeChannelId}
                  {candidate.alreadyKnown ? ' · already in your library' : ''}
                </Text>
              </View>
              <FocusablePressable
                accessibilityLabel="Save for children to ask about"
                style={styles.resultAction}
                onPress={() =>
                  void onSaveCandidate(titled(candidate)).then(() =>
                    setNotice('Saved as an ask-a-parent item. It stays unplayable until you approve it.'),
                  )
                }
              >
                <Text style={styles.resultActionText}>Save</Text>
              </FocusablePressable>
              <FocusablePressable
                accessibilityLabel="Approve for everyone"
                style={styles.resultApprove}
                onPress={() =>
                  void onApproveCandidate(titled(candidate)).then(() => setNotice('Approved into the family library.'))
                }
              >
                <Text style={styles.resultApproveText}>Approve</Text>
              </FocusablePressable>
            </View>
          );
        })}
      </View>
      {manualAddSlot ? <View style={styles.manualSlot}>{manualAddSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 26 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 4 },
  privacyBadge: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 12, flexDirection: 'row', gap: 5, paddingHorizontal: 10, paddingVertical: 8 },
  privacyText: { color: colors.mintDark, fontSize: 11, fontWeight: '800' },
  tabRow: { flexDirection: 'row', gap: 8, marginTop: 18 },
  tab: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 13, flexDirection: 'row', gap: 7, minHeight: 46, paddingHorizontal: 13 },
  tabActive: { backgroundColor: colors.lavender },
  tabText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  tabTextActive: { color: colors.purple },
  input: { backgroundColor: colors.canvas, borderRadius: 13, color: colors.ink, fontSize: 15, height: 50, marginTop: 14, paddingHorizontal: 13 },
  filterLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: colors.card, borderRadius: 12, justifyContent: 'center', minHeight: 42, paddingHorizontal: 11 },
  chipActive: { backgroundColor: colors.lavender },
  chipText: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  chipTextActive: { color: colors.purple },
  recentRow: { flexDirection: 'row', gap: 10 },
  recentCard: { borderRadius: 15, flex: 1, minHeight: 76, padding: 11 },
  recentTitle: { color: colors.ink, fontSize: 13, fontWeight: '800' },
  recentMeta: { color: colors.muted, fontSize: 11, marginTop: 6 },
  listLabel: { color: colors.muted, fontSize: 11, fontWeight: '900', letterSpacing: 1.1, marginBottom: 9, marginTop: 22 },
  row: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 15, flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8, minHeight: 74, padding: 9 },
  thumb: { borderRadius: 11, height: 52, width: 52 },
  thumbFallback: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 11, height: 52, justifyContent: 'center', width: 52 },
  rowInfo: { flex: 1, paddingHorizontal: 11 },
  rowTitle: { color: colors.ink, fontSize: 14, fontWeight: '800' },
  rowMeta: { color: colors.muted, fontSize: 12, marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 7 },
  approvalTag: { alignItems: 'center', backgroundColor: colors.mint, borderRadius: 9, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 4 },
  approvalTagText: { color: colors.mintDark, fontSize: 10, fontWeight: '800' },
  expiryTag: { backgroundColor: colors.peach, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4 },
  expiryTagText: { color: '#8A5340', fontSize: 10, fontWeight: '800' },
  videoCountTag: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 9, flexDirection: 'row', gap: 4, paddingHorizontal: 7, paddingVertical: 4 },
  videoCountText: { color: colors.purple, fontSize: 10, fontWeight: '800' },
  backRow: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingBottom: 6, paddingVertical: 8 },
  backText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  channelHero: { alignItems: 'center', gap: 6, paddingBottom: 18, paddingTop: 4 },
  heroThumb: { borderRadius: 32, height: 64, marginBottom: 4, width: 64 },
  heroName: { color: colors.ink, fontSize: 19, fontWeight: '800', textAlign: 'center' },
  heroMeta: { color: colors.muted, fontSize: 13 },
  channelVideos: { borderTopColor: colors.line, borderTopWidth: 1, marginTop: 12, paddingTop: 12, width: '100%' },
  iconButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 42 },
  categoryEditor: { borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 12, width: '100%' },
  empty: { backgroundColor: colors.card, borderRadius: 15, marginBottom: 8, padding: 16 },
  searchCard: { backgroundColor: colors.card, borderRadius: 20, marginTop: 26, padding: 15 },
  searchHeader: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  searchIcon: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  searchHeaderText: { flex: 1 },
  searchTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  searchBody: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 4 },
  lookup: { alignItems: 'center', backgroundColor: colors.purple, borderRadius: 13, flexDirection: 'row', gap: 8, height: 48, justifyContent: 'center', marginTop: 12 },
  lookupText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  error: { color: colors.danger, fontSize: 12, marginTop: 10 },
  notice: { color: colors.mintDark, fontSize: 12, fontWeight: '700', marginTop: 10 },
  resultRow: { alignItems: 'center', backgroundColor: colors.canvas, borderRadius: 14, flexDirection: 'row', marginTop: 10, minHeight: 68, padding: 9 },
  resultTitleInput: { color: colors.ink, fontSize: 14, fontWeight: '800', padding: 0 },
  manualSlot: { marginTop: 18 },
  resultAction: { alignItems: 'center', backgroundColor: colors.lavender, borderRadius: 11, height: 44, justifyContent: 'center', marginRight: 6, paddingHorizontal: 12 },
  resultActionText: { color: colors.purple, fontSize: 13, fontWeight: '800' },
  resultApprove: { alignItems: 'center', backgroundColor: colors.mintDark, borderRadius: 11, height: 44, justifyContent: 'center', paddingHorizontal: 12 },
  resultApproveText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
