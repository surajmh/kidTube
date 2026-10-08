/** Parent-facing copy. Unlike Kid Mode, a parent may see provider wording and error detail. */
export const PARENT_CONTENT_COPY = {
  searchTitle: 'Parent content search',
  searchBody:
    'Only available in Parent Mode. Results are never playable until you approve them, and Kid Mode has no search at all.',
  searchPlaceholder: 'Paste a YouTube video or channel link',
  searchAction: 'Look up link',
  noIdFound: 'No YouTube ID found in that link. Paste a video or channel URL.',
  searchFailed: 'That search could not run.',
  approved: 'Approved into the family library.',
  saved: 'Saved for children to ask about.',
  /** Never claim "0 videos": a channel that was never fetched is unknown, not empty. */
  videosNotLoaded: 'Videos not loaded',
  emptyTitle: 'Nothing matches yet',
  emptyBody: 'Try clearing the filters, or use parent search below.',
} as const;

/** Page headings, keyed by mode. */
export const PARENT_CONTENT_TITLES = {
  channels: 'Channels',
  videos: 'Videos',
  categories: 'Categories',
} as const;

/** Rows per page in the channel and video lists. */
export const PARENT_CONTENT_PAGE_SIZE = 20;
