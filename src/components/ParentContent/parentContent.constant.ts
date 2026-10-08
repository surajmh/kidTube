/** Parent-facing copy. Unlike Kid Mode, a parent may see provider wording and error detail. */
export const PARENT_CONTENT_COPY = {
  /** Never claim "0 videos": a channel that was never fetched is unknown, not empty. */
  videosNotLoaded: 'Videos not loaded',
  emptyTitle: 'Nothing matches yet',
  emptyBody: 'Try clearing the filters.',
} as const;

/** What each list page says it is for. */
export const PARENT_CONTENT_SUBTITLES = {
  channels: 'Manage the channels your children can watch.',
  videos: 'Manage the videos your children can watch.',
  categories: '',
} as const;

export const CHANNEL_BANNER = {
  title: 'Find great kids channels',
  body: 'Add safe and educational channels for your kids.',
  action: 'Add a channel',
} as const;

export const CHANNEL_SORT_LABELS = { recent: 'Recently added', name: 'A–Z' } as const;

/** Page headings, keyed by mode. */
export const PARENT_CONTENT_TITLES = {
  channels: 'Channels',
  videos: 'Videos',
  categories: 'Categories',
} as const;

/** Rows per page in the channel and video lists. */
export const PARENT_CONTENT_PAGE_SIZE = 20;
