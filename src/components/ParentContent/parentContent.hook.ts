import { useCallback, useMemo, useState } from 'react';
import { ApprovedChannel, ApprovedVideo } from '../../types';
import { ContentCandidate } from '../../parentalControlsTypes';
import { ParentFilters } from '../ParentFilter/parentFilter.type';
import { emptyParentFilters } from '../ParentFilter/parentFilter.constant';
import { PARENT_CONTENT_COPY } from './parentContent.constant';
import { applyResultTitle, candidateKey, filterChannels, filterVideos } from './parentContent.helper';
import { AccessCheck, ContentTab, ParentContentProps } from './parentContent.type';

type UseParentContentInput = Pick<
  ParentContentProps,
  'videos' | 'channels' | 'mode' | 'selectedChannelId' | 'accessFor' | 'onSearch'
>;

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
  onSearch,
}: UseParentContentInput) {
  const [filters, setFilters] = useState<ParentFilters>(emptyParentFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<ContentCandidate[] | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState('');
  const [resultTitles, setResultTitles] = useState<Record<string, string>>({});

  /** The nav picks the page; the lists are still written in terms of a tab. */
  const tab: ContentTab =
    mode === 'videos' ? 'videos' : mode === 'categories' ? 'categories' : 'channels';

  const filteredVideos = useMemo(
    () => filterVideos(videos, filters, accessFor),
    [videos, filters, accessFor],
  );

  const filteredChannels = useMemo(
    () => filterChannels(channels, filters, accessFor),
    [channels, filters, accessFor],
  );

  const selectedChannel = useMemo(
    () => (selectedChannelId ? channels.find((channel) => channel.channelId === selectedChannelId) : undefined),
    [channels, selectedChannelId],
  );

  const recentlyAdded: Array<ApprovedVideo | ApprovedChannel> = useMemo(
    () => (tab === 'channels' ? channels : videos).slice(0, 3),
    [tab, channels, videos],
  );

  /** A candidate carrying whatever title the parent typed over it. */
  const titled = useCallback(
    (candidate: ContentCandidate) => applyResultTitle(candidate, resultTitles),
    [resultTitles],
  );

  const setResultTitle = useCallback((candidate: ContentCandidate, title: string) => {
    setResultTitles((current) => ({ ...current, [candidateKey(candidate)]: title }));
  }, []);

  const runSearch = useCallback(async () => {
    setSearching(true);
    setSearchError('');
    setNotice('');
    try {
      const found = await onSearch(searchQuery);
      setResults(found);
      if (!found.length) setSearchError(PARENT_CONTENT_COPY.noIdFound);
    } catch (caught) {
      // A failed lookup must not leave stale results on screen looking approvable.
      setResults(null);
      setSearchError(caught instanceof Error ? caught.message : PARENT_CONTENT_COPY.searchFailed);
    } finally {
      setSearching(false);
    }
  }, [onSearch, searchQuery]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

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
    searchQuery,
    setSearchQuery,
    results,
    searchError,
    searching,
    notice,
    setNotice,
    titled,
    setResultTitle,
    runSearch,
  };
}

export type UseParentContent = ReturnType<typeof useParentContent>;
export type { AccessCheck };
