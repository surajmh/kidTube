import { Feather } from '@expo/vector-icons';
import { ParentSection } from './parentShell.type';

export const SECTIONS: Array<{ id: ParentSection; label: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'channels', label: 'Channels', icon: 'users' },
  { id: 'videos', label: 'Videos', icon: 'play' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
  { id: 'requests', label: 'Requests', icon: 'inbox' },
];

/** Reached from the dashboard rather than the nav bar. */
export const SHORTCUTS: Array<{ id: ParentSection; label: string; hint: string; icon: keyof typeof Feather.glyphMap }> = [
  { id: 'children', label: 'Children', hint: 'Profiles, limits and rules', icon: 'users' },
  { id: 'activity', label: 'Activity', hint: 'What has been watched', icon: 'bar-chart-2' },
  { id: 'settings', label: 'Playback', hint: 'Screen time and bedtime', icon: 'sliders' },
  { id: 'security', label: 'Security', hint: 'Change the parent PIN', icon: 'lock' },
];

/**
 * How close to the bottom counts as "nearing the end", in pixels.
 *
 * Roughly a screen's worth, so the next page is already arriving by the time the parent reaches
 * the end rather than after a visible stall.
 */
export const NEAR_BOTTOM_THRESHOLD = 700;
