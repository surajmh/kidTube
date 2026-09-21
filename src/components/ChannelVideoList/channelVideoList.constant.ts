/**
 * Copy, split by audience.
 *
 * A child never sees the provider's wording, an error code or a host name: they get the plain
 * version plus a nudge to ask a grown-up.
 */
export const CHANNEL_LIST_COPY = {
  loadingParent: 'Fetching this channel’s uploads…',
  loadingKid: 'Getting videos ready…',
  loadingStatus: 'Loading videos…',
  errorTitle: "Couldn't load videos right now.",
  errorBodyKid: 'Ask a grown-up to refresh this channel for you.',
  staleKid: 'Showing saved videos. A grown-up can refresh this channel.',
  emptyTitleParent: 'No videos found',
  emptyTitleKid: 'Nothing here yet',
  emptyBodyParent:
    'This channel has no public uploads yet, or the provider could not read them. Press Refresh to try again.',
  emptyBodyKid: 'Ask a grown-up to refresh this channel.',
  /** Shown in place of a duration the provider never reported. */
  unknownDuration: '—',
} as const;

/** Parents scan longer lists than children do. */
export const CHANNEL_LIST_PAGE_SIZE = { parent: 20, kid: 12 } as const;
