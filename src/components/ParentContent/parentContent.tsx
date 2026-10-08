import React from 'react';
import { Text, View } from 'react-native';
import { ParentFilterButton, ParentFilterDrawer } from '../ParentFilter';
import { PagedGrid } from '../PagedGrid';
import styles from './parentContent.style';
import { useParentContent } from './parentContent.hook';
import { PARENT_CONTENT_PAGE_SIZE, PARENT_CONTENT_TITLES } from './parentContent.constant';
import { ContentTab, ParentContentMode, ParentContentProps } from './parentContent.type';
import { ParentChannelRow } from './parentContent.channelRow';
import { ParentVideoRow } from './parentContent.videoRow';
import { ParentChannelPage } from './parentContent.channelPage';
import { ParentContentSearch } from './parentContent.search';
import { RecentlyAdded } from './parentContent.recent';

export type { ContentTab, ParentContentMode };

export function ParentContentPanel({
  profiles,
  categories,
  channels,
  videos,
  approvals,
  categoriesSlot,
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
  } = content;

  if (selectedChannel) {
    return (
      <ParentChannelPage
        channel={selectedChannel}
        videos={videos}
        state={syncStateFor(selectedChannel.channelId)}
        busy={channelBusy(selectedChannel.channelId)}
        onBack={() => onSelectChannel(null)}
        onRefresh={() => onRefreshChannel(selectedChannel)}
        onLoadMore={() => onLoadMoreChannel(selectedChannel)}
      />
    );
  }

  return (
    <View>
      {mode === 'dashboard' ? null : (
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>
            {PARENT_CONTENT_TITLES[tab]}
          </Text>
          {mode === 'categories' ? null : (
            <ParentFilterButton filters={filters} onPress={content.openFilters} />
          )}
        </View>
      )}

      {mode === 'categories' ? categoriesSlot : null}
      {mode !== 'categories' && mode !== 'dashboard' ? (
        <>
          {recentlyAdded.length > 0 ? <RecentlyAdded items={recentlyAdded} /> : null}

          <Text style={styles.listLabel}>
            {tab === 'channels' ? `CHANNELS · ${filteredChannels.length}` : `VIDEOS · ${filteredVideos.length}`}
          </Text>

          {tab === 'channels' ? (
            <PagedGrid
              items={filteredChannels}
              pageSize={PARENT_CONTENT_PAGE_SIZE}
              renderItem={(channel) => (
                <ParentChannelRow
                  key={channel.id}
                  channel={channel}
                  videos={videos}
                  approvals={approvals}
                  categories={categories}
                  expanded={expandedId === channel.id}
                  syncState={syncStateFor(channel.channelId)}
                  onOpenChannel={(target) => {
                    onSelectChannel(target.channelId);
                    // Opening the channel page refreshes it only if the cache is stale.
                    onOpenChannelVideos(target);
                  }}
                  onToggleExpanded={content.toggleExpanded}
                  onToggleCategory={(target, categoryId, assigned) =>
                    void onToggleChannelCategory(target, categoryId, assigned)
                  }
                  onRemove={onRemoveChannel}
                />
              )}
            />
          ) : (
            <PagedGrid
              items={filteredVideos}
              pageSize={PARENT_CONTENT_PAGE_SIZE}
              renderItem={(video) => (
                <ParentVideoRow
                  key={video.id}
                  video={video}
                  approvals={approvals}
                  categories={categories}
                  expanded={expandedId === video.id}
                  onToggleExpanded={content.toggleExpanded}
                  onToggleCategory={(target, categoryId, assigned) =>
                    void onToggleVideoCategory(target, categoryId, assigned)
                  }
                  onRemove={onRemoveVideo}
                />
              )}
            />
          )}

          {(tab === 'channels' ? filteredChannels.length : filteredVideos.length) === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.rowTitle}>Nothing matches yet</Text>
              <Text style={styles.rowMeta}>Try clearing the filters, or use parent search below.</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {mode !== 'dashboard' ? null : (
        <ParentContentSearch
          content={content}
          onSaveCandidate={onSaveCandidate}
          onApproveCandidate={onApproveCandidate}
        />
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
