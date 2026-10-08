import React from 'react';
import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ParentFilterButton, ParentFilterDrawer } from '../ParentFilter';
import { PagedGrid } from '../PagedGrid';
import { FocusablePressable } from '../tv';
import styles from './parentContent.style';
import { useParentContent } from './parentContent.hook';
import { PARENT_CONTENT_PAGE_SIZE, PARENT_CONTENT_SUBTITLES, PARENT_CONTENT_TITLES } from './parentContent.constant';
import { ContentTab, ParentContentMode, ParentContentProps } from './parentContent.type';
import { ParentChannelRow } from './parentContent.channelRow';
import { ParentVideoRow } from './parentContent.videoRow';
import { ParentChannelPage } from './parentContent.channelPage';
import { RecentlyAdded } from './parentContent.recent';
import { ParentContentBanner } from './parentContent.banner';
import { RecentChannels } from './parentContent.recentChannels';
import { ChannelListHeader } from './parentContent.listHeader';

export type { ContentTab, ParentContentMode };

export function ParentContentPanel({
  profiles,
  categories,
  channels,
  videos,
  approvals,
  categoriesSlot,
  addContentSlot,
  accessFor,
  onRemoveVideo,
  onRemoveChannel,
  onToggleVideoCategory,
  onToggleChannelCategory,
  syncStateFor,
  channelBusy,
  onOpenChannelVideos,
  mode,
  selectedChannelId,
  onSelectChannel,
  onRefreshChannel,
  onLoadMoreChannel,
}: ParentContentProps) {
  const content = useParentContent({ videos, channels, mode, selectedChannelId, accessFor });
  const {
    tab,
    filters,
    filtersOpen,
    expandedId,
    filteredVideos,
    filteredChannels,
    selectedChannel,
    recentlyAdded,
    adding,
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
          <View style={styles.pageHeading}>
            <Text style={styles.pageTitle}>{PARENT_CONTENT_TITLES[tab]}</Text>
            {PARENT_CONTENT_SUBTITLES[tab] ? <Text style={styles.pageSubtitle}>{PARENT_CONTENT_SUBTITLES[tab]}</Text> : null}
          </View>
          {mode === 'categories' ? null : (
            <View style={styles.pageActions}>
              {tab === 'channels' || tab === 'videos' ? (
                <FocusablePressable
                  accessibilityLabel={tab === 'channels' ? 'Add channel' : 'Add video'}
                  style={styles.addPill}
                  onPress={() => content.openAdd(tab === 'channels' ? 'channel' : 'video')}
                >
                  <Feather name="plus" size={16} color="#1A1A1A" />
                  <Text style={styles.addPillText}>Add</Text>
                </FocusablePressable>
              ) : null}
              <ParentFilterButton filters={filters} onPress={content.openFilters} />
            </View>
          )}
        </View>
      )}

      {mode === 'categories' ? categoriesSlot : null}
      {mode !== 'categories' && mode !== 'dashboard' ? (
        <>
          {tab === 'channels' ? (
            <>
              <ParentContentBanner onAdd={() => content.openAdd('channel')} />
              {channels.length > 0 ? <RecentChannels channels={channels.slice(0, 3)} videos={videos} syncStateFor={syncStateFor} /> : null}
              <ChannelListHeader count={filteredChannels.length} sort={content.channelSort} onToggleSort={content.toggleChannelSort} />
            </>
          ) : (
            <>
              {recentlyAdded.length > 0 ? <RecentlyAdded items={recentlyAdded} /> : null}
              <Text style={styles.listLabel}>{`VIDEOS · ${filteredVideos.length}`}</Text>
            </>
          )}

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
              <Text style={styles.rowMeta}>Try clearing the filters.</Text>
            </View>
          ) : null}
        </>
      ) : null}

      {adding && addContentSlot ? addContentSlot(adding, content.closeAdd) : null}

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
