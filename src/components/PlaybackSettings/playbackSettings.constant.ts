import type { SponsorBlockCategory } from '../../types';


/** Daily screen-time choices, in minutes. */
export const LIMIT_OPTIONS = [15, 30, 45, 60, 90, 120];

/** Shown for a day with no window set: a plausible after-school slot. */
export const DEFAULT_SETTINGS_WINDOW = { startMinutes: 16 * 60, endMinutes: 19 * 60 };

export const CATEGORY_LABELS: Array<[SponsorBlockCategory, string]> = [
  ['sponsor', 'Sponsorship'],
  ['intro', 'Intro'],
  ['outro', 'Outro'],
  ['selfpromo', 'Self promotion'],
  ['interaction', 'Interaction reminder'],
  ['music', 'Music'],
];

export const QUALITY_HEIGHTS = [144, 240, 360, 480, 720, 1080];

export const DAY_LABELS = [['0', 'Sun'], ['1', 'Mon'], ['2', 'Tue'], ['3', 'Wed'], ['4', 'Thu'], ['5', 'Fri'], ['6', 'Sat']];
