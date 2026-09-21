/** Daily screen-time choices, in minutes. */
export const LIMIT_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Day-of-week chips, indexed to `Date.getDay()`. */
export const DAY_LABELS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

/** Shown when a day has no window yet: a plausible after-school slot, not midnight-to-midnight. */
export const DEFAULT_WINDOW = { startMinutes: 16 * 60, endMinutes: 19 * 60 };

export const MINUTES_IN_DAY = 24 * 60;

export const PARENT_CHILDREN_COPY = {
  title: 'Children',
  subtitle: 'Rules, limits and temporary permissions per child.',
  noProfiles: 'Add a child profile first.',
} as const;
