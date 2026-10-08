import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApprovedVideo } from '../../types';
import { channelAvailability, searchLibrary, videosForChannel, videosInCategory } from './kidHome.helper';
import { KidTab } from './kidHome.type';
import type { UseKidHomeInput } from './kidHome.type';

/** Long enough to skip the search scan on every keystroke of a fast typer, short enough to feel instant. */
const SEARCH_DEBOUNCE_MS = 200;

/**
 * All of Kid Mode's view state and derivation.
 *
 * The screen itself stays presentational. Keeping the derivation here means the filtering rules
 * are exercised by tests rather than only by rendering, and the memoisation keeps the feed from
 * re-filtering the whole library on unrelated state changes such as opening the profile switcher.
 */
export function useKidHome({
  library,
  tab,
  onTabChange,
  selectedCategoryId,
  selectedChannelId,
  onSelectChannel,
  channelSyncStateFor,
}: UseKidHomeInput) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // The library scan runs once typing pauses, not on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(
    () => searchLibrary(library.videos, library.channels, debouncedQuery),
    [library.videos, library.channels, debouncedQuery],
  );

  const feedVideos = useMemo(
    () => videosInCategory(library.videos, selectedCategoryId),
    [library.videos, selectedCategoryId],
  );

  const selectedChannel = useMemo(
    () => library.channels.find((channel) => channel.channelId === selectedChannelId),
    [library.channels, selectedChannelId],
  );

  const channelVideos = useMemo(
    () => (selectedChannel ? videosForChannel(library.videos, selectedChannel) : []),
    [library.videos, selectedChannel],
  );

  const availability = useMemo(
    () =>
      selectedChannel
        ? channelAvailability(channelSyncStateFor(selectedChannel.channelId), channelVideos.length)
        : 'ready',
    [selectedChannel, channelVideos.length, channelSyncStateFor],
  );

  const openSearch = useCallback(() => setSearching(true), []);

  const closeSearch = useCallback(() => {
    setSearching(false);
    setQuery('');
    setDebouncedQuery('');
  }, []);

  const toggleSwitcher = useCallback(() => setSwitcherOpen((open) => !open), []);
  const closeSwitcher = useCallback(() => setSwitcherOpen(false), []);

  /** Opening a channel from a search result leaves search and lands on the channel page. */
  const openChannelFromSearch = useCallback(
    (channelId: string) => {
      onSelectChannel(channelId);
      onTabChange('channels');
      setSearching(false);
      setQuery('');
      setDebouncedQuery('');
    },
    [onSelectChannel, onTabChange],
  );

  const changeTab = useCallback(
    (next: KidTab) => {
      setSearching(false);
      onTabChange(next);
    },
    [onTabChange],
  );

  /** `categories` is not a destination; selecting a chip keeps the child on the feed. */
  const onFeed = tab === 'home' || tab === 'categories';

  const keepWatching: ApprovedVideo[] = useMemo(
    () => (selectedCategoryId ? [] : library.recentVideos),
    [library.recentVideos, selectedCategoryId],
  );

  return {
    searching,
    query,
    setQuery,
    switcherOpen,
    results,
    feedVideos,
    selectedChannel,
    channelVideos,
    availability,
    onFeed,
    keepWatching,
    openSearch,
    closeSearch,
    toggleSwitcher,
    closeSwitcher,
    openChannelFromSearch,
    changeTab,
  };
}
