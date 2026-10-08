import { useCallback, useMemo, useState } from 'react';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { ParentFilters } from '../ParentFilter/parentFilter.type';
import { emptyParentFilters } from '../ParentFilter/parentFilter.constant';
import { filterChannels, filterVideos, sortChannels } from './parentContent.helper';
import type { AddContentKind, ChannelSort, ContentTab } from './parentContent.type';
import type { UseParentContentInput } from './parentContent.type';

/**
 * Parent content state and derivation.
 *
 * Filtering is memoised on the inputs that actually affect it: the lists can run to hundreds of
 * rows, and re-filtering on every keystroke elsewhere in the panel is wasted work.
 */
export function useParentContent({
  videos,
  channels,
  mode,
  selectedChannelId,
  accessFor,
}: UseParentContentInput) {
  const [filters, setFilters] = useState<ParentFilters>(emptyParentFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [adding, setAdding] = useState<AddContentKind | null>(null);
  const [channelSort, setChannelSort] = useState<ChannelSort>('recent');

  /** The nav picks the page; the lists are still written in terms of a tab. */
  const tab: ContentTab =
    mode === 'videos' || mode === 'categories' ? mode : 'channels';

  const filteredVideos = useMemo(
    () => filterVideos(videos, filters, accessFor),
    [videos, filters, accessFor],
  );

  const filteredChannels = useMemo(
    () => sortChannels(filterChannels(channels, filters, accessFor), channelSort),
    [channels, filters, accessFor, channelSort],
  );

  const selectedChannel = useMemo(
    () => (selectedChannelId ? channels.find((channel) => channel.channelId === selectedChannelId) : undefined),
    [channels, selectedChannelId],
  );

  const recentlyAdded: Array<ApprovedVideo | ApprovedChannel> = useMemo(
    () => (tab === 'channels' ? channels : videos).slice(0, 3),
    [tab, channels, videos],
  );

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  const toggleChannelSort = useCallback(() => setChannelSort((current) => (current === 'recent' ? 'name' : 'recent')), []);

  const closeAdd = useCallback(() => setAdding(null), []);

  const openFilters = useCallback(() => setFiltersOpen(true), []);
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  return {
    tab,
    filters,
    setFilters,
    filtersOpen,
    openFilters,
    closeFilters,
    expandedId,
    toggleExpanded,
    filteredVideos,
    filteredChannels,
    selectedChannel,
    recentlyAdded,
    adding,
    channelSort,
    toggleChannelSort,
    openAdd: setAdding,
    closeAdd,
  };
}
