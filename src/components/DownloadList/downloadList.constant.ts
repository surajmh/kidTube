export const DOWNLOAD_LIST_COPY = {
  count: (n: number) => `${n} downloaded ${n === 1 ? 'video' : 'videos'}`,
  sort: 'Sort',
  removed: 'Removed from library',
  preparing: 'Getting ready…',
  failed: "Couldn't save",
  deleteReady: 'Delete download',
  cancelSaving: 'Cancel download',
  cancel: 'Cancel',
} as const;

export const SORT_LABELS = {
  recent: 'Recently saved',
  name: 'Name A–Z',
  size: 'Largest first',
} as const;

export const SORT_ORDER = ['recent', 'name', 'size'] as const;

export const RING = { size: 36, stroke: 4, track: '#3A3A3A', done: '#6FD38A' } as const;
