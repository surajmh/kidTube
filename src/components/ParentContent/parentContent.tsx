import React from 'react';
import { Image, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { channelVideosFrom, describeChannelSync } from '../../services/content/channelSyncRules';
import { colors, cardTints } from '../theme';
import { FocusablePressable } from '../tv';
import { ParentFilterButton, ParentFilterDrawer } from '../ParentFilter';
import { PagedGrid } from '../PagedGrid';
import { ChannelVideoList } from '../ChannelVideoList';
import styles from './parentContent.style';
import { useParentContent } from './parentContent.hook';
import { approveLabelFor } from './parentContent.helper';
import { PARENT_CONTENT_COPY, PARENT_CONTENT_TITLES } from './parentContent.constant';
import { ContentTab, ParentContentMode, ParentContentProps } from './parentContent.type';

export type { ContentTab, ParentContentMode };

export function ParentContentPanel({
  profiles,
  categories,
  channels,
  videos,
  approvals,
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
  mode,
  selectedChannelId,
  onSelectChannel,
  onRefreshChannel,
  onLoadMoreChannel,
}: ParentContentProps) {
  const content = useParentContent({ videos, channels, mode, selectedChannelId, accessFor, onSearch });
  const {
    tab,
    filters,
    filtersOpen,
    expandedId,
    filteredVideos,
    filteredChannels,
    selectedChannel,
    recentlyAdded,
    searchQuery,
    setSearchQuery,
    results,
    searchError,
    searching,
    notice,
    titled,
    runSearch,
  } = content;

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
              <Feather name="radio" size={20} color={colors.ink} />
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
      {mode === 'dashboard' ? null : (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {PARENT_CONTENT_TITLES[mode === 'videos' ? 'videos' : mode === 'categories' ? 'categories' : 'channels']}
          </Text>
          {mode === 'categories' ? null : (
            <ParentFilterButton filters={filters} onPress={content.openFilters} />
          )}
        </View>
      )}

      {mode === 'categories' ? (
        categoriesSlot
      ) : mode === 'dashboard' ? null : (
        <>
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
                      <View style={styles.thumbFallback}><Feather name="radio" size={18} color={colors.ink} /></View>
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
                            <Feather name="play-circle" size={11} color={colors.ink} />
                            <Text style={styles.videoCountText}>
                              {channelVideos.length} {channelVideos.length === 1 ? 'video' : 'videos'}
                            </Text>
                          </View>
                        ) : channel.approved ? (
                          <View style={styles.expiryTag}>
                            <Text style={styles.expiryTagText}>{PARENT_CONTENT_COPY.videosNotLoaded}</Text>
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
                        <Feather name="chevron-right" size={18} color={colors.ink} />
                      </FocusablePressable>
                    ) : null}
                    <FocusablePressable
                      accessibilityLabel={`Edit categories for ${channel.name}`}
                      style={styles.iconButton}
                      onPress={() => content.toggleExpanded(channel.id)}
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
                      <View style={styles.thumbFallback}><Feather name="play" size={18} color={colors.ink} /></View>
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
                      onPress={() => content.toggleExpanded(video.id)}
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

      {mode !== 'dashboard' ? null : (
      <View style={styles.searchCard}>
        <View style={styles.searchHeader}>
          <View style={styles.searchIcon}><Feather name="search" size={18} color={colors.ink} /></View>
          <View style={styles.searchHeaderText}>
            <Text style={styles.searchTitle}>{PARENT_CONTENT_COPY.searchTitle}</Text>
            <Text style={styles.searchBody}>
              Only available in Parent Mode. Results are never playable until you approve them, and Kid Mode has no search at all.
            </Text>
          </View>
        </View>
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder={PARENT_CONTENT_COPY.searchPlaceholder}
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
                <Feather name={candidate.type === 'video' ? 'film' : 'radio'} size={18} color={colors.ink} />
              </View>
              <View style={styles.rowInfo}>
                <TextInput
                  value={titled(candidate).title}
                  onChangeText={(value) => content.setResultTitle(candidate, value)}
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
                    content.setNotice('Saved as an ask-a-parent item. It stays unplayable until you approve it.'),
                  )
                }
              >
                <Text style={styles.resultActionText}>Save</Text>
              </FocusablePressable>
              <FocusablePressable
                accessibilityLabel="Approve for everyone"
                style={styles.resultApprove}
                onPress={() =>
                  void onApproveCandidate(titled(candidate)).then(() => content.setNotice('Approved into the family library.'))
                }
              >
                <Text style={styles.resultApproveText}>Approve</Text>
              </FocusablePressable>
            </View>
          );
        })}
      </View>
      )}
      {mode === 'dashboard' && manualAddSlot ? <View style={styles.manualSlot}>{manualAddSlot}</View> : null}

      <ParentFilterDrawer
        visible={filtersOpen}
        label={tab === 'videos' ? 'videos' : 'channels'}
        filters={filters}
        profiles={profiles}
        categories={categories}
        onChange={content.setFilters}
        onClose={content.closeFilters}
      />
    </View>
  );
}
