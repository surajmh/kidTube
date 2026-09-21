import { KidDestination } from './kidHome.type';

/** Four destinations. Categories live as filter chips on the feed instead. */
export const KID_DESTINATIONS: KidDestination[] = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'recent', label: 'Library', icon: 'film' },
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
  channelUnavailableBody: 'Ask a grown-up to refresh this channel for you.',
  channelStaleNotice: 'Showing saved videos. A grown-up can refresh this channel.',
  channelNotLoadedTitle: 'Videos not loaded',
  channelNotLoadedBody: 'Ask a grown-up to load this channel.',
  feedEmptyTitle: 'Nothing here yet',
  feedEmptyCategoryTitle: 'Nothing in this category yet',
  feedEmptyBody: 'Ask a grown-up to add a video for you.',
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
