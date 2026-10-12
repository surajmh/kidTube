import { ApprovedVideo } from '../../types';
import { KidDestination } from './kidHome.type';

/** Four destinations. Categories live as filter chips on the feed instead. */
export const KID_DESTINATIONS: KidDestination[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'downloads', label: 'Downloads', icon: 'download' },
  { id: 'playlists', label: 'Playlists', icon: 'list' },
  { id: 'requests', label: 'Ask', icon: 'help-circle' },
];

/** Copy a child sees. Provider wording, error codes and host names never reach Kid Mode. */
export const KID_COPY = {
  searchPlaceholder: 'Search your videos',
  searchIdleTitle: 'Search your videos',
  searchIdleBody: 'Only videos a grown-up approved will show up.',
  searchEmptyTitle: 'No matches',
  searchEmptyBody: 'Try a different word, or ask a grown-up for it.',
  channelUnavailableTitle: "Couldn't load videos right now.",
  channelUnavailableBody: 'Check your connection and try opening this channel again.',
  channelStaleNotice: 'Showing saved videos. Try opening this channel again when you’re online.',
  channelNotLoadedTitle: 'Videos not loaded',
  channelNotLoadedBody: 'Open this channel when you’re online to load its videos.',
  feedEmptyTitle: 'Nothing here yet',
  feedEmptyCategoryTitle: 'Nothing in this category yet',
  feedEmptyBody: 'Ask a grown-up to add a video for you.',
  downloadsTitle: 'Downloads',
  downloadsEmptyTitle: 'Nothing downloaded yet',
  downloadsEmptyBody: 'Open a video and tap Download to watch it later without internet.',
  downloadsFailed: "Couldn't save",
  unknownChannel: 'Saved by a grown-up',
} as const;

/**
 * Icon colours.
 *
 * Feather takes a colour value rather than a class, so these mirror the Tailwind tokens in
 * tailwind.config.js. Keep the two in step.
 */
export const ICON = {
  ink: '#F1F1F1',
  inkDim: '#AAAAAA',
  accent: '#FF0033',
  onAccent: '#FFFFFF',
} as const;

/** Monogram tints for channels with no artwork. */
export const MONOGRAM_TINTS = ['#3D5AFE', '#00897B', '#8E24AA', '#F4511E', '#5E6BC0', '#00838F'] as const;

/** Stable empty list so FlatList data does not change identity between renders. */
export const EMPTY_VIDEOS: ApprovedVideo[] = [];
