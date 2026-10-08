/** Parent-facing copy. Unlike Kid Mode, a parent may see provider wording and error detail. */
export const PARENT_CONTENT_COPY = {
  /** Never claim "0 videos": a channel that was never fetched is unknown, not empty. */
  videosNotLoaded: 'Videos not loaded',
  emptyTitle: 'Nothing matches yet',
  emptyBody: 'Try clearing the filters.',
} as const;

/** Page headings, keyed by mode. */
export const PARENT_CONTENT_TITLES = {
  channels: 'Channels',
  videos: 'Videos',
  categories: 'Categories',
} as const;

/** Rows per page in the channel and video lists. */
export const PARENT_CONTENT_PAGE_SIZE = 20;
